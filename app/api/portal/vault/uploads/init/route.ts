import { getPortalMember } from "@/lib/portal/auth";
import { getPortalVaultFile, PORTAL_VAULT_MAX_BYTES } from "@/lib/portal/vault";
import { createVaultUploadSession } from "@/lib/portal/vault-upload";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const member = await getPortalMember();
  if (!member) return Response.json({ error:"unauthorized" }, { status:401 });

  const body = await request.json().catch(() => null) as Record<string,unknown> | null;
  if (!body) return Response.json({ error:"invalid_json" }, { status:400 });

  const mode = body.mode === "revision" ? "revision" : "new";
  const fileName = String(body.fileName || "").trim();
  const mimeType = String(body.mimeType || "application/octet-stream").trim();
  const sizeBytes = Number(body.sizeBytes || 0);
  if (!fileName || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return Response.json({ error:"Dosya adı ve boyutu gerekli." }, { status:400 });
  }
  if (sizeBytes > PORTAL_VAULT_MAX_BYTES) {
    return Response.json({ error:"Tek dosya üst sınırı 25 MB." }, { status:413 });
  }

  const targetFileId = mode === "revision" ? String(body.targetFileId || "").trim() : null;
  if (mode === "revision") {
    const current = await getPortalVaultFile(targetFileId || "");
    if (!current) return Response.json({ error:"Vault kaydı bulunamadı." }, { status:404 });
    const canManage =
      member.role === "admin" ||
      member.role === "lead" ||
      String(current.created_by || "") === member.email;
    if (!canManage) {
      return Response.json({ error:"Bu Vault kaydına revision ekleme yetkin yok." }, { status:403 });
    }
  }

  const metadata = body.metadata && typeof body.metadata === "object"
    ? body.metadata as Record<string,unknown>
    : {};

  try {
    const session = await createVaultUploadSession({
      memberId:member.id,
      actorEmail:member.email,
      mode,
      targetFileId,
      fileName,
      mimeType,
      sizeBytes,
      metadata,
    });
    return Response.json(session,{
      status:201,
      headers:{ "Cache-Control":"no-store, private" },
    });
  } catch (error) {
    return Response.json({
      error:error instanceof Error ? error.message : "Vault upload session oluşturulamadı.",
    }, {
      status:400,
      headers:{ "Cache-Control":"no-store, private" },
    });
  }
}
