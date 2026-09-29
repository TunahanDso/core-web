import { getPortalMember } from "@/lib/portal/auth";
import { completeVaultUploadSession } from "@/lib/portal/vault-upload";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const member = await getPortalMember();
  if (!member) return Response.json({ error:"unauthorized" }, { status:401 });

  const { sessionId } = await context.params;
  try {
    const result = await completeVaultUploadSession({
      sessionId:decodeURIComponent(sessionId),
      memberId:member.id,
    });
    return Response.json(result,{
      headers:{ "Cache-Control":"no-store, private" },
    });
  } catch (error) {
    return Response.json({
      error:error instanceof Error ? error.message : "Vault upload finalize edilemedi.",
    }, {
      status:400,
      headers:{ "Cache-Control":"no-store, private" },
    });
  }
}
