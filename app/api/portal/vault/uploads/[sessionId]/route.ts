import { getPortalMember } from "@/lib/portal/auth";
import { writeVaultUploadBody } from "@/lib/portal/vault-upload";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const member = await getPortalMember();
  if (!member) return Response.json({ error:"unauthorized" }, { status:401 });

  const { sessionId } = await context.params;
  const capabilityToken = String(request.headers.get("x-core-upload-token") || "");
  if (!capabilityToken) return Response.json({ error:"missing_upload_capability" }, { status:401 });

  try {
    const result = await writeVaultUploadBody({
      sessionId:decodeURIComponent(sessionId),
      memberId:member.id,
      capabilityToken,
      request,
    });
    return Response.json(result,{
      headers:{ "Cache-Control":"no-store, private" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vault raw upload başarısız.";
    const status = /25 MB|boyutu/i.test(message) ? 413 : 400;
    return Response.json({ error:message }, {
      status,
      headers:{ "Cache-Control":"no-store, private" },
    });
  }
}
