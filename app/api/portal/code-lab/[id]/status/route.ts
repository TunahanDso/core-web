import { getPortalMember } from "@/lib/portal/auth";
import { getPortalCodeRunStatus } from "@/lib/portal/code-lab";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const member = await getPortalMember();
  if (!member) {
    return Response.json({ error:"unauthorized" }, {
      status:401,
      headers:{ "Cache-Control":"no-store, private" },
    });
  }

  const { id } = await context.params;
  const run = await getPortalCodeRunStatus(member,decodeURIComponent(id));
  if (!run) {
    return Response.json({ error:"not_found" }, {
      status:404,
      headers:{ "Cache-Control":"no-store, private" },
    });
  }

  return Response.json(run,{
    headers:{ "Cache-Control":"no-store, private" },
  });
}
