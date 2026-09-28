import { env } from "cloudflare:workers";
import { getMediaAsset } from "@/lib/cms/extensions";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const asset = await getMediaAsset(decodeURIComponent(id));
  if (!asset || !env.MEDIA) return new Response("Not found", { status: 404 });

  const object = await env.MEDIA.get(String(asset.object_key));
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": String(asset.mime_type || object.httpMetadata?.contentType || "application/octet-stream"),
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
