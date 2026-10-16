import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import { r2Configured, r2Put, r2Get, r2Delete } from "./r2";


// STORAGE STRATEGY:
// On Vercel (production), we use the Neon Postgres database already
// connected to this project (Storage tab). Everything — the whole app
// database, and every uploaded photo — lives in one simple key/value
// table, so the rest of the app never has to think about SQL.
//
// THE IMPORTANT PART — WHY updateDB EXISTS:
// The whole app's data is one JSON blob. If two people save something at
// almost the same moment (a teacher marking attendance while a parent
// uploads a receipt, say), a naive "read it, change it, write it all
// back" approach can silently lose one of the two changes — whichever
// write lands second overwrites the first with its own, now-stale, copy
// of everything else. This is exactly what was happening: attendance a
// teacher just saved would vanish, or absenceRemarks would end up as the
// wrong shape, because another request's write clobbered it.
//
// updateDB() fixes this with a version number on the row: it reads the
// latest data + version, lets the caller change just what it needs, and
// saves only if the version hasn't moved. If someone else saved first, it
// re-reads and redoes the change on top of theirs. Every route that
// changes data should use updateDB(), never a separate read + write pair.
//
// When running locally with plain `next dev` and no DATABASE_URL set,
// Postgres calls throw, so we fall back to reading/writing the local
// data/db.json file (no real locking there, but that's fine — local dev
// is single-user).

function findDatabaseUrl() {
  const exactNames = [
    "DATABASE_URL",
    "POSTGRES_URL",
    "POSTGRES_DATABASE_URL",
    "PORTGRES_DATABASE_URL",
  ];
  for (const name of exactNames) {
    if (process.env[name]) return process.env[name];
  }

  const candidates = Object.keys(process.env).filter(
    (k) => /(POSTGRES|PORTGRES|DATABASE)_URL/i.test(k) && !/UNPOOLED/i.test(k)
  );
  if (candidates.length) return process.env[candidates[0]];

  const unpooledCandidates = Object.keys(process.env).filter((k) =>
    /(POSTGRES|PORTGRES|DATABASE)_URL/i.test(k)
  );
  if (unpooledCandidates.length) return process.env[unpooledCandidates[0]];

  return null;
}

let sqlClient = null;
function getSql() {
  if (sqlClient) return sqlClient;
  const url = findDatabaseUrl();
  if (!url) {
    throw new Error("No database connected (no *_DATABASE_URL / POSTGRES_URL environment variable found).");
  }
  sqlClient = neon(url);
  return sqlClient;
}

let tableReady = false;
async function ensureTable(sql = getSql()) {
  if (tableReady) return;
  await sql`CREATE TABLE IF NOT EXISTS app_store (key text PRIMARY KEY, value jsonb NOT NULL)`;
  // "ver" is a version counter used by updateDB() to detect that someone
  // else saved in between (optimistic locking) — see updateDB below.
  await sql`ALTER TABLE app_store ADD COLUMN IF NOT EXISTS ver bigint NOT NULL DEFAULT 0`;
  tableReady = true;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Neon can be "asleep" (auto-suspend) and the first request after a break
// may fail with a network-level error. Reads are always safe to repeat,
// so we simply try again a few times before giving up.
async function withRetry(fn, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await sleep(250 * (i + 1));
    }
  }
  throw lastErr;
}

async function kvGet(key) {
  await ensureTable();
  const sql = getSql();
  const rows = await sql`SELECT value FROM app_store WHERE key = ${key}`;
  return rows.length ? rows[0].value : null;
}

async function kvSet(key, value) {
  await ensureTable();
  const sql = getSql();
  const json = JSON.stringify(value);
  await sql`
    INSERT INTO app_store (key, value) VALUES (${key}, ${json}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
}

async function kvDel(key) {
  await ensureTable();
  const sql = getSql();
  await sql`DELETE FROM app_store WHERE key = ${key}`;
}

const KEY = "database";
const LOCAL_DB_PATH = path.join(process.cwd(), "data", "db.json");

function readLocalFallback() {
  const raw = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeLocalFallback(db) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

const LOCAL_IMAGES_DIR = path.join(process.cwd(), "data", "images");

// PERFORMANCE NOTE:
// Images live under their own keys (image:<key>) in the same table,
// served through /api/image with long-lived caching — the main database
// row stays small and fast no matter how many photos exist. Each image
// key is unique to that one photo, so there's no concurrent-write risk
// here — no locking needed for these.

// Every image/PDF the school uploads lives in Cloudflare R2, under the
// exact same "key" that used to be its Postgres row id — so every link
// already saved anywhere in the database (fee vouchers, remarks, online
// test pages...) keeps working with zero changes there.
//
// Old images saved BEFORE this change are still sitting in Postgres under
// `image:<key>` rows. loadImage() checks R2 first, then quietly falls
// back to that old Postgres row so nothing breaks before the one-time
// migration (see /api/admin/migrate-images) has moved them over.

export async function saveImage(key, dataUrl) {
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid image data.");
  const [, contentType, base64] = match;
  const buffer = Buffer.from(base64, "base64");

  if (r2Configured()) {
    await r2Put(key, buffer, contentType);
    return;
  }
  // Local `next dev` with no R2 configured yet — save to disk instead.
  fs.mkdirSync(LOCAL_IMAGES_DIR, { recursive: true });
  fs.writeFileSync(path.join(LOCAL_IMAGES_DIR, `${key}.bin`), buffer);
  fs.writeFileSync(path.join(LOCAL_IMAGES_DIR, `${key}.type`), contentType, "utf-8");
}

export async function loadImage(key) {
  if (r2Configured()) {
    const found = await r2Get(key);
    if (found) return found;
    // Not on R2 yet — maybe it's an old image not migrated over yet.
    try {
      const legacy = await kvGet(`image:${key}`);
      if (legacy) return { data: Buffer.from(legacy.base64, "base64"), contentType: legacy.contentType || "image/jpeg" };
    } catch (err) {
      // ignore — fall through to "not found"
    }
    return null;
  }

  try {
    const data = fs.readFileSync(path.join(LOCAL_IMAGES_DIR, `${key}.bin`));
    const contentType = fs.readFileSync(path.join(LOCAL_IMAGES_DIR, `${key}.type`), "utf-8");
    return { data, contentType };
  } catch {
    return null;
  }
}

export async function deleteImage(key) {
  if (r2Configured()) {
    await r2Delete(key);
    try {
      await kvDel(`image:${key}`); // clean up the old copy too, if one is still there
    } catch (err) {}
    return;
  }
  try {
    fs.unlinkSync(path.join(LOCAL_IMAGES_DIR, `${key}.bin`));
    fs.unlinkSync(path.join(LOCAL_IMAGES_DIR, `${key}.type`));
  } catch {
    // already gone, nothing to do
  }
}

// Read-only access to the whole database. Safe to call any time — use
// this for GET routes and reports that only display data. Never pair
// this with a later writeDB()-style save; use updateDB() for that.
export async function readDB() {
  const url = getDatabaseUrlCached();
  if (!url) {
    // Local `next dev` without a database configured.
    return readLocalFallback();
  }

  // A database IS configured: never silently fall back to the starter
  // data on an error (that would show old/empty data). Retry, and if it
  // still fails let the error surface so it is visible.
  const existing = await withRetry(() => kvGet(KEY));
  if (existing) return existing;

  // First time ever running on this site: seed the database from the
  // checked-in starter data, so the site isn't empty on first load.
  const seed = readLocalFallback();
  await kvSet(KEY, seed);
  return seed;
}

let cachedDatabaseUrl;
function getDatabaseUrlCached() {
  if (cachedDatabaseUrl === undefined) cachedDatabaseUrl = findDatabaseUrl();
  return cachedDatabaseUrl;
}

// The ONLY way to change the database. Pass a function that receives the
// current, up-to-the-moment data and mutates it in place (or returns a
// new object to replace it entirely). While your function runs, no other
// updateDB() call anywhere can read or write — they queue up and wait,
// so two changes can never stomp on each other. Returns whatever your
// mutator function returns.
//
//   await updateDB((db) => {
//     db.attendance[className][date] = records;
//   });
// Throw this from inside an updateDB() mutator to make the route return a
// specific HTTP status + message (e.g. "not found", "not allowed") while
// still inside the lock — the transaction rolls back automatically.
export class RouteError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function updateDB(mutator) {
  const url = getDatabaseUrlCached();

  if (!url) {
    // Local dev fallback — no real locking, fine for single-user local work.
    const db = readLocalFallback();
    const result = await mutator(db);
    writeLocalFallback(db);
    return result;
  }

  // Optimistic locking over Neon's plain HTTPS driver (no WebSocket, no
  // connection pool — those were what caused "Connection terminated
  // unexpectedly" on Vercel). Every save is:
  //   1. read the latest data + its version number
  //   2. let the caller change it
  //   3. write it back ONLY IF the version is still the same
  // If someone else saved in between, step 3 changes nothing, and we
  // simply redo steps 1-3 on top of their newest data. So two saves at
  // the same moment can never overwrite each other.
  const sql = getSql();
  await withRetry(() => ensureTable(sql));

  for (let attempt = 0; attempt < 10; attempt++) {
    const rows = await withRetry(() => sql`SELECT value, ver FROM app_store WHERE key = ${KEY}`);
    let db;
    let ver = null;
    if (rows.length) {
      db = rows[0].value;
      ver = Number(rows[0].ver);
    } else {
      db = readLocalFallback();
    }

    // The mutator changes `db` in place. Whatever it returns is handed
    // back to the caller only — the database saved is always `db` itself.
    const result = await mutator(db);
    const json = JSON.stringify(db);

    let saved;
    if (ver === null) {
      saved = await sql`
        INSERT INTO app_store (key, value, ver) VALUES (${KEY}, ${json}::jsonb, 1)
        ON CONFLICT (key) DO NOTHING
        RETURNING ver
      `;
    } else {
      saved = await sql`
        UPDATE app_store SET value = ${json}::jsonb, ver = ver + 1
        WHERE key = ${KEY} AND ver = ${ver}
        RETURNING ver
      `;
    }
    if (saved.length > 0) return result;

    // Someone else saved first — wait a moment and redo on the newest data.
    await sleep(40 + Math.floor(Math.random() * 120) * (attempt + 1));
  }

  throw new Error("The server is busy right now. Please press Save again.");
}

// ---------------------------------------------------------------------
// Separate "documents" (used by the Online Test system).
//
// The main database is ONE row that is rewritten on every change. That is
// perfect for the small, rarely-changing school data, but online tests
// autosave every few seconds for many students at once — if all of that
// went through the one big row, everyone would keep colliding. So every
// test and every student's attempt is stored as its own small row, and a
// student only ever writes their own row.
// ---------------------------------------------------------------------

export async function docGet(key) {
  return withRetry(() => kvGet(key));
}

export async function docSet(key, value) {
  await kvSet(key, value);
}

export async function docDelete(key) {
  await kvDel(key);
}

// All documents whose key starts with `prefix`, as [{ key, value }].
export async function docList(prefix) {
  await withRetry(() => ensureTable());
  const sql = getSql();
  const like = prefix.replace(/[\\%_]/g, (c) => "\\" + c) + "%";
  const rows = await withRetry(() => sql`SELECT key, value FROM app_store WHERE key LIKE ${like} ORDER BY key`);
  return rows.map((r) => ({ key: r.key, value: r.value }));
}

// ---------------------------------------------------------------------
// One-time migration: move old images/PDFs (saved as base64 rows in
// Postgres, under "image:<key>") over to Cloudflare R2. Safe to run
// repeatedly — each batch only touches rows still left in Postgres, and
// deletes them from Postgres only after the R2 upload succeeds.
// ---------------------------------------------------------------------
export async function migrateImagesBatch(limit = 20) {
  if (!r2Configured()) {
    throw new Error("R2 is not configured yet — add the R2_* environment variables first.");
  }
  const rows = await docList("image:");
  const batch = rows.slice(0, limit);
  let migrated = 0;
  const errors = [];

  for (const row of batch) {
    const key = row.key.slice("image:".length);
    try {
      const { contentType, base64 } = row.value || {};
      if (!base64) throw new Error("empty row");
      await r2Put(key, Buffer.from(base64, "base64"), contentType || "application/octet-stream");
      await kvDel(row.key);
      migrated++;
    } catch (err) {
      errors.push({ key, message: err.message });
    }
  }

  return { migrated, remaining: rows.length - migrated, totalFound: rows.length, errors };
}
