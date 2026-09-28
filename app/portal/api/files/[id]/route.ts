import { getPortalMember } from "@/lib/portal/auth";
import { getPortalFileObject } from "@/lib/portal/files";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getPortalMember();
  if (!member) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const stored = await getPortalFileObject(decodeURIComponent(id));
  if (!stored) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const name = String(stored.metadata.name || "file").replace(/[\r\n"]/g, "_");
  const headers = new Headers({
    "Content-Type": String(stored.metadata.mime_type || "application/octet-stream"),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": (download ? "attachment" : "inline") + '; filename="' + name + '"',
  });

  return new Response(stored.object.body, { headers });
}
