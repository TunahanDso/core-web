import PendingSubmitButton from "@/components/portal/PendingSubmitButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import MeetingTransportPanel from "@/components/portal/MeetingTransportPanel";
import {
  addMeetingNoteAction,
  closePollAction,
  createMeetingPollAction,
  generateMeetingReportAction,
  setMeetingStatusAction,
  votePollAction,
} from "@/app/portal/collaboration-actions";
import { getMeeting, getMeetingTransportStatus } from "@/lib/portal/collaboration";

export const dynamic="force-dynamic";

export default async function PortalMeetingRoomPage({
  params,
  searchParams,
}:{
  params:Promise<{id:string}>;
  searchParams?:Promise<{tool?:string;created?:string;report?:string;status?:string;noted?:string;pollCreated?:string}>;
}){
  const {id}=await params;
  const query=searchParams ? await searchParams : {};
  const member=await requirePortalMember();
  const data=await getMeeting(id,member.id);
  if(!data) notFound();

  const meeting=data.meeting;
  const transport=getMeetingTransportStatus(String(meeting.transport_room));
  const canManage=String(meeting.created_by)===member.id || data.participants.some(
    (item)=>String(item.member_id)===member.id && ["host","moderator"].includes(String(item.participant_role))
  );
  const meetingStatus=String(meeting.status);
  const statusLabel=({scheduled:"Planlandı",live:"Devam ediyor",completed:"Tamamlandı",cancelled:"İptal edildi"} as Record<string,string>)[meetingStatus]||meetingStatus;
  const returnTo="/portal/meetings/"+encodeURIComponent(id);

  return (
    <section className="meetingWorkbench">
      <header className="meetingWorkbenchTop">
        <div>
          <span>{String(meeting.space_name||"CORE MEETING")}</span>
          <h1>{String(meeting.title)}</h1>
          <p>{String(meeting.starts_at).replace("T"," ").slice(0,16)} · {String(meeting.team_code||meeting.project_slug||"CORE")}</p>
        </div>
        <div className="meetingWorkbenchActions">
          <span className={"portalStatusText "+String(meeting.status)}>{statusLabel}</span>
          {canManage && meetingStatus==="scheduled"?(
            <form action={setMeetingStatusAction}>
              <input type="hidden" name="meetingId" value={id}/>
              <PendingSubmitButton name="status" value="live" type="submit">Toplantıyı başlat</PendingSubmitButton>
            </form>
          ):null}
          {canManage && meetingStatus==="live"?(
            <form action={setMeetingStatusAction}>
              <input type="hidden" name="meetingId" value={id}/>
              <PendingSubmitButton name="status" value="completed" type="submit">Tamamla</PendingSubmitButton>
            </form>
          ):null}
          <Link prefetch={false} href="/portal/meetings">Listeye dön</Link>
        </div>
      </header>

      {query.noted==="1" || query.report==="generated" || query.created==="1" || query.pollCreated==="1" ? <p className="meetingFeedback" role="status">{query.noted==="1"?"Not toplantı kaydına eklendi.":query.report==="generated"?"Rapor oluşturuldu ve arşivlendi.":query.pollCreated==="1"?"Oylama açıldı.":"Toplantı oluşturuldu."}</p> : null}
      <div className="meetingWorkbenchBody">
        <main className="meetingMediaPane">
          <MeetingTransportPanel
            ended={["completed","cancelled"].includes(meetingStatus)}
            configured={transport.configured}
            joinUrl={transport.joinUrl}
            provider={transport.provider}
            room={String(meeting.transport_room)}
            mode={String(meeting.transport_mode)}
          />

          <section className="meetingAgendaPane">
            <header><span>GÜNDEM</span><b>{String(meeting.project_slug||meeting.team_code||"CORE")}</b></header>
            <p>{String(meeting.agenda||"Gündem eklenmedi.")}</p>
          </section>
        </main>

        <aside className="meetingContextPane">
          <section className="meetingContextSection">
            <header><b>Katılımcılar</b><span>{data.participants.length}</span></header>
            <div className="meetingParticipantList">
              {data.participants.map((person)=>(
                <article key={String(person.member_id)}>
                  <span>{String(person.full_name||person.email).split(/\s+/).slice(0,2).map((x)=>x[0]).join("").toUpperCase()}</span>
                  <div><b>{String(person.full_name||person.email)}</b><small>{String(person.participant_role)} · {String(person.invite_state)}</small></div>
                </article>
              ))}
            </div>
          </section>

          <section className="meetingContextSection">
            <header>
              <b>Toplantı oylamaları</b>
              <Link prefetch={false} href={returnTo+"?tool=poll"}>+ Oylama</Link>
            </header>

            {query.tool==="poll"?(
              <form className="meetingPollCreate" action={createMeetingPollAction}>
                <input type="hidden" name="meetingId" value={id}/>
                <label><span>Başlık</span><input name="title" required autoFocus/></label>
                <label><span>Açıklama</span><input name="description"/></label>
                <label><span>Seçenekler · her satır bir seçenek</span><textarea name="options" rows={4} required/></label>
                <label><span>Kapanış</span><input name="closesAt" type="datetime-local"/></label>
                <div><PendingSubmitButton type="submit">Oylamayı aç</PendingSubmitButton><Link prefetch={false} href={returnTo}>Vazgeç</Link></div>
              </form>
            ):null}

            <div className="meetingPollList">
              {data.polls.length?data.polls.map((poll)=>{
                const total=Number(poll.vote_count||0);
                return (
                  <article key={String(poll.id)}>
                    <header><b>{String(poll.title)}</b><span>{String(poll.status)}</span></header>
                    <p>{String(poll.description||"")}</p>
                    <form action={votePollAction}>
                      <input type="hidden" name="pollId" value={String(poll.id)}/>
                      <input type="hidden" name="returnTo" value={returnTo}/>
                      <div>
                        {(poll.options as Record<string,unknown>[]).map((option)=>{
                          const votes=Number(option.votes||0);
                          const pct=total?Math.round(votes/total*100):0;
                          return (
                            <label key={String(option.id)}>
                              <input type="radio" name="optionId" value={String(option.id)} required disabled={String(poll.status)!=="open"}/>
                              <span><b>{String(option.label)}</b><small>{votes} oy · %{pct}</small></span>
                            </label>
                          );
                        })}
                      </div>
                      {String(poll.status)==="open"?<PendingSubmitButton type="submit">Oy ver / değiştir</PendingSubmitButton>:null}
                    </form>
                    {String(poll.created_by)===member.id && String(poll.status)==="open"?(
                      <form action={closePollAction}>
                        <input type="hidden" name="pollId" value={String(poll.id)}/>
                        <input type="hidden" name="returnTo" value={returnTo}/>
                        <PendingSubmitButton type="submit">Oylamayı kapat</PendingSubmitButton>
                      </form>
                    ):null}
                  </article>
                );
              }):<p className="portalMuted">Bu toplantıda oylama yok.</p>}
            </div>
          </section>
        </aside>

        <section className="meetingRecordPane">
          <header className="meetingRecordHeader">
            <div><b>Toplantı kaydı</b><small>Not · karar · aksiyon · transcript</small></div>
            {canManage ? <form action={generateMeetingReportAction}>
              <input type="hidden" name="meetingId" value={id}/>
              <PendingSubmitButton type="submit">{data.report?"Raporu yeniden üret":"Rapor üret & arşivle"}</PendingSubmitButton>
            </form> : <small>Raporu toplantı yöneticisi oluşturabilir.</small>}
          </header>

          <div className="meetingRecordBody">
            <div className="meetingNotes">
              {data.notes.map((note)=>(
                <article className={"kind-"+String(note.kind)} key={String(note.id)}>
                  <header><span>{String(note.kind).toUpperCase()}</span><b>{String(note.full_name||note.email)}</b><small>{String(note.created_at)}</small></header>
                  <p>{String(note.body)}</p>
                </article>
              ))}
              {!data.notes.length?<p className="portalMuted">Henüz toplantı kaydı yok.</p>:null}
            </div>

            <form className="meetingNoteComposer" action={addMeetingNoteAction}>
              <input type="hidden" name="meetingId" value={id}/>
              <select aria-label="Kayıt türü" name="kind" defaultValue="note">
                <option value="note">Not</option>
                <option value="decision">Karar</option>
                <option value="action">Aksiyon</option>
                <option value="transcript">Transcript</option>
              </select>
              <textarea name="body" rows={3} aria-label="Toplantı notu" placeholder="Toplantı kaydına ekle..." required/>
              <PendingSubmitButton type="submit">Kayda ekle</PendingSubmitButton>
            </form>

            {data.report?(
              <section className="meetingReportPreview">
                <header><b>Arşiv raporu</b><Link prefetch={false} href="/portal/archive">Arşiv →</Link></header>
                <pre>{String(data.report.summary)}</pre>
              </section>
            ):null}
          </div>
        </section>
      </div>
    </section>
  );
}
