import { NextRequest } from "next/server";
import { requirePortalMember } from "@/lib/portal/auth";
import { getPortalVaultObject } from "@/lib/portal/vault";

export const dynamic = "force-dynamic";

function canReadVaultFile(
  member: Awaited<ReturnType<typeof requirePortalMember>>,
  file: Record<string, unknown>
) {
  const visibility = String(file.visibility || "members");
  if (visibility === "members") return true;
  if (visibility === "admins") return member.role === "admin";
  if (visibility === "leads") return member.role === "admin" || member.role === "lead";
  if (visibility === "team") {
    const team = String(file.team_code || "").trim().toUpperCase();
    if (!team) return true;
    return member.role === "admin" || member.teams.some((item) => item.toUpperCase() === team);
  }
  return false;
}

function contentDisposition(name: string, download: boolean) {
  const ascii = name.replace(/[^\x20-\x7E]/g, "_").replace(/[\\"]/g, "_");
  const encoded = encodeURIComponent(name);
  return `${download ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const member = await requirePortalMember();
  const { id } = await context.params;
  const revisionParam = request.nextUrl.searchParams.get("revision");
  const revision = revisionParam ? Number(revisionParam) : null;
  const download = request.nextUrl.searchParams.get("download") === "1";

  const result = await getPortalVaultObject(decodeURIComponent(id), Number.isFinite(revision) ? revision : null);
  if (!result) return new Response("Vault object not found.", { status: 404 });
  if (!canReadVaultFile(member, result.descriptor.file)) {
    return new Response("Forbidden.", { status: 403 });
  }

  return new Response(result.object.body, {
    headers: {
      "Content-Type": result.descriptor.mimeType || "application/octet-stream",
      "Content-Disposition": contentDisposition(result.descriptor.originalName, download),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-CORE-Vault-Revision": String(result.descriptor.revision),
    },
  });
}
