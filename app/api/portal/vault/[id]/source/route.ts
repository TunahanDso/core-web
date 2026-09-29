import { NextRequest } from "next/server";
import { requirePortalMember } from "@/lib/portal/auth";
import {
  getPortalVaultFile,
  readPortalVaultTextChunk,
} from "@/lib/portal/vault";

export const dynamic = "force-dynamic";

function canRead(
  member: Awaited<ReturnType<typeof requirePortalMember>>,
  file: Record<string,unknown>
) {
  const visibility = String(file.visibility || "members");
  if (visibility === "members") return true;
  if (visibility === "admins") return member.role === "admin";
  if (visibility === "leads") return member.role === "admin" || member.role === "lead";
  if (visibility === "team") {
    const team = String(file.team_code || "").trim().toUpperCase();
    return !team || member.role === "admin" || member.teams.some((item)=>item.toUpperCase()===team);
  }
  return false;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id:string }> }
) {
  const member = await requirePortalMember();
  const { id } = await context.params;
  const fileId = decodeURIComponent(id);
  const file = await getPortalVaultFile(fileId);
  if (!file) return Response.json({ error:"not_found" }, { status:404 });
  if (!canRead(member,file)) return Response.json({ error:"forbidden" }, { status:403 });

  const revisionRaw = request.nextUrl.searchParams.get("revision");
  const revision = revisionRaw ? Number(revisionRaw) : null;
  const offset = Number(request.nextUrl.searchParams.get("offset") || 0);
  const limit = Number(request.nextUrl.searchParams.get("limit") || 196608);

  const chunk = await readPortalVaultTextChunk(
    fileId,
    Number.isFinite(revision) ? revision : null,
    Number.isFinite(offset) ? offset : 0,
    Number.isFinite(limit) ? limit : 196608
  );
  if (!chunk) return Response.json({ error:"not_found" }, { status:404 });

  return Response.json(chunk,{
    headers:{
      "Cache-Control":"private, no-store, max-age=0",
      "X-Content-Type-Options":"nosniff",
    },
  });
}
