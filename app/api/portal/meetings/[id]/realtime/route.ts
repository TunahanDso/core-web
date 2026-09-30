import { getPortalMember } from "@/lib/portal/auth";
import { getMeeting, markMeetingParticipantAttended } from "@/lib/portal/collaboration";
import { provisionRealtimeKitJoin } from "@/lib/portal/meeting-realtime";

export const dynamic="force-dynamic";

export async function POST(
  _request:Request,
  {params}:{params:Promise<{id:string}>}
) {
  const member=await getPortalMember();
  if(!member) return new Response("Unauthorized",{status:401});

  const {id}=await params;
  const meetingId=decodeURIComponent(id);
  const data=await getMeeting(meetingId,member.id);
  if(!data) return new Response("Not found",{status:404});

  const meeting=data.meeting;
  const mode=String(meeting.transport_mode || "none");
  if(!["audio_video","audio"].includes(mode)){
    return Response.json({error:"Bu toplantı CORE gerçek zamanlı medya modunda değil."},{status:409});
  }
  if(["completed","cancelled"].includes(String(meeting.status))){
    return Response.json({error:"Toplantı sona erdi."},{status:409});
  }

  const participant=data.participants.find((item)=>String(item.member_id)===member.id);
  const elevated=String(meeting.created_by)===member.id
    || ["host","moderator"].includes(String(participant?.participant_role || ""));
  const memberName=String(member.fullName || member.email || "CORE Member");

  try {
    const join=await provisionRealtimeKitJoin({
      portalMeetingId:meetingId,
      title:String(meeting.title || "CORE Meeting"),
      memberId:member.id,
      memberName,
      role:elevated?"host":"participant",
      mode,
    });
    await markMeetingParticipantAttended(meetingId,member.id);
    return Response.json(join,{
      headers:{
        "Cache-Control":"private, no-store, max-age=0",
        "Pragma":"no-cache",
      },
    });
  } catch(error) {
    const message=error instanceof Error ? error.message : "Toplantı servisine bağlanılamadı.";
    return Response.json({error:message},{status:502});
  }
}
