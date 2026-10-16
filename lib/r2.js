// Cloudflare R2 (S3-compatible object storage) — every image and PDF the
// school uploads (fee receipts, achievement photos, absence proof,
// online-test paper pages) lives here instead of in Postgres.
//
// Needs 4 environment variables, set on Vercel:
//   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT
// If they aren't set (e.g. plain local `next dev`), every function below
// throws — callers fall back to local-disk storage, same as before.

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

let client = null;

function getConfig() {
  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT } = process.env;
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ENDPOINT) {
    return null;
  }
  return { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT };
}

function getClient() {
  const cfg = getConfig();
  if (!cfg) throw new Error("R2 is not configured (missing environment variables).");
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: cfg.R2_ENDPOINT,
      // R2's endpoint is account-wide (not one per bucket), so requests
      // must address the bucket in the URL PATH (path-style), not as a
      // subdomain (virtual-hosted style) — Cloudflare's own docs call
      // this out as required.
      forcePathStyle: true,
      credentials: { accessKeyId: cfg.R2_ACCESS_KEY_ID, secretAccessKey: cfg.R2_SECRET_ACCESS_KEY },
    });
  }
  return client;
}

export function r2Configured() {
  return !!getConfig();
}

export async function r2Put(key, buffer, contentType) {
  const cfg = getConfig();
  if (!cfg) throw new Error("R2 is not configured.");
  await getClient().send(
    new PutObjectCommand({ Bucket: cfg.R2_BUCKET_NAME, Key: key, Body: buffer, ContentType: contentType })
  );
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// Returns { data: Buffer, contentType } or null if the key doesn't exist.
export async function r2Get(key) {
  const cfg = getConfig();
  if (!cfg) throw new Error("R2 is not configured.");
  try {
    const res = await getClient().send(new GetObjectCommand({ Bucket: cfg.R2_BUCKET_NAME, Key: key }));
    const data = await streamToBuffer(res.Body);
    return { data, contentType: res.ContentType || "application/octet-stream" };
  } catch (err) {
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

export async function r2Delete(key) {
  const cfg = getConfig();
  if (!cfg) throw new Error("R2 is not configured.");
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: cfg.R2_BUCKET_NAME, Key: key }));
  } catch (err) {
    // already gone — fine
  }
}
