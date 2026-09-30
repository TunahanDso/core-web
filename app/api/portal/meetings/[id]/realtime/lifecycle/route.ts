import { getPortalMember } from "@/lib/portal/auth";
import { getMeeting } from "@/lib/portal/collaboration";
import { syncEndedRealtimeKitSession } from "@/lib/portal/meeting-realtime";

export const dynamic="force-dynamic";

export async function POST(
  request:Request,
  {params}:{params:Promise<{id:string}>}
) {
  const member=await getPortalMember();
  if(!member) return Response.json({error:"unauthorized"},{status:401});

  const {id}=await params;
  const meetingId=decodeURIComponent(id);
  const data=await getMeeting(meetingId,member.id);
  if(!data) return Response.json({error:"not_found"},{status:404});

  const participant=data.participants.find((item)=>String(item.member_id)===member.id);
  const elevated=String(data.meeting.created_by)===member.id
    || ["host","moderator"].includes(String(participant?.participant_role || ""));
  if(!elevated) return Response.json({error:"forbidden"},{status:403});

  const payload=await request.json().catch(()=>({})) as {state?:unknown};
  if(String(payload.state || "").toLowerCase()!=="ended"){
    return Response.json({error:"invalid_state"},{status:400});
  }

  try {
    const result=await syncEndedRealtimeKitSession(meetingId,member.email);
    return Response.json(result,{headers:{"Cache-Control":"no-store, private"}});
  } catch(error) {
    return Response.json(
      {error:error instanceof Error?error.message:"sync_failed"},
      {status:502,headers:{"Cache-Control":"no-store, private"}}
    );
  }
}
