import { getPortalMember } from "@/lib/portal/auth";
import {
  createPortalVaultVersion,
  getPortalVaultFile,
} from "@/lib/portal/vault";

export const dynamic = "force-dynamic";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const member = await getPortalMember();
  if (!member) {
    return Response.json({ error:"unauthorized" }, { status:401 });
  }

  const { id } = await context.params;
  const fileId = decodeURIComponent(id);
  const current = await getPortalVaultFile(fileId);
  if (!current) {
    return Response.json({ error:"Vault kaydı bulunamadı." }, { status:404 });
  }

  const canManage =
    member.role === "admin" ||
    member.role === "lead" ||
    String(current.created_by) === member.email;

  if (!canManage) {
    return Response.json({ error:"Bu Vault kaydına yeni revision ekleme yetkin yok." }, { status:403 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return Response.json({ error:"invalid_form" }, { status:400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error:"Yeni sürüm dosyası seçilmedi." }, { status:400 });
  }

  try {
    const revision = await createPortalVaultVersion({
      fileId,
      file,
      note:text(formData,"note"),
      actorEmail:member.email,
    });

    return Response.json({
      uploaded:true,
      fileId,
      revision,
      href:"/portal/library/" + encodeURIComponent(fileId) + "?versioned=1",
    }, {
      headers:{ "Cache-Control":"no-store, private" },
    });
  } catch (error) {
    return Response.json({
      uploaded:false,
      error:error instanceof Error ? error.message : "Vault revision yüklemesi başarısız.",
    }, {
      status:400,
      headers:{ "Cache-Control":"no-store, private" },
    });
  }
}
