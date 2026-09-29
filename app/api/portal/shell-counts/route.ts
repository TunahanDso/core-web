import { getPortalMember } from "@/lib/portal/auth";
import { getPortalShellCounts } from "@/lib/portal/db";

export const dynamic = "force-dynamic";
export async function GET() {
  const member = await getPortalMember();
  if (!member) return new Response("Unauthorized", { status:401, headers:{"Cache-Control":"no-store"} });
  return Response.json(await getPortalShellCounts(member.id), {
    headers:{"Cache-Control":"private, no-store, max-age=0"},
  });
}
