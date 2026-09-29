import { getPortalMember } from "@/lib/portal/auth";
import { proxyPortalCodeTerminalSocket } from "@/lib/portal/code-lab";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const member = await getPortalMember();
  if (!member) return Response.json({ error:"unauthorized" }, { status:401 });

  const { id } = await context.params;
  return proxyPortalCodeTerminalSocket(member,decodeURIComponent(id),request);
}
