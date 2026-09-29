import { getPortalMember } from "@/lib/portal/auth";
import { getPortalCodeRunDetail } from "@/lib/portal/code-lab";

export const dynamic = "force-dynamic";

export async function GET(
  _request:Request,
  { params }:{ params:Promise<{ id:string }> }
) {
  const member=await getPortalMember();
  if(!member) return new Response("Unauthorized",{status:401});
  const {id}=await params;
  const detail=await getPortalCodeRunDetail(member,decodeURIComponent(id));
  if(!detail) return new Response("Not found",{status:404});
  return Response.json(
    { status:String(detail.run.status), updatedAt:String(detail.run.updated_at || "") },
    { headers:{ "Cache-Control":"private, no-store, max-age=0" } }
  );
}
