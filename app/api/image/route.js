import { loadImage } from "../../../lib/data";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return new Response("Missing key", { status: 400 });
  }

  const result = await loadImage(key);
  if (!result) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(result.data, {
    headers: {
      "Content-Type": result.contentType,
      // Each image key is unique and never reused for different content,
      // so it's safe for browsers to cache these "forever" — this is what
      // makes repeat visits fast instead of re-downloading every photo
      // every time.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
