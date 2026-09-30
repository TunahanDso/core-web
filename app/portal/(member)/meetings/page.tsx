import PortalDataTable from "@/components/portal/PortalDataTable";
import PortalDateTime from "@/components/portal/PortalDateTime";
import Link from "next/link";
import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalMembers } from "@/lib/portal/db";
import { listAccessiblePortalTeams, listPortalProjectRegistry } from "@/lib/portal/control";
import { createMeetingAction, createMeetingSpaceAction } from "@/app/portal/collaboration-actions";
import { listMeetingSpaces, listMeetings } from "@/lib/portal/collaboration";
import { getRealtimeKitRuntimeStatus } from "@/lib/portal/meeting-realtime";

export const dynamic="force-dynamic";

const meetingStatusLabels: Record<string, string> = { scheduled:"Planlandı", live:"Canlı", completed:"Tamamlandı", cancelled:"İptal" };

function href(input:Record<string,string|undefined>){
  const params=new URLSearchParams();
  Object.entries(input).forEach(([k,v])=>{if(v)params.set(k,v)});
  const q=params.toString();
  return "/portal/meetings"+(q?"?"+q:"");
}

export default async function PortalMeetingsPage({
  searchParams,
}:{
  searchParams?:Promise<{section?:string;create?:string;q?:string;status?:string;created?:string}>;
}){
  const query=searchParams ? await searchParams : {};
  const member=await requirePortalMember();
  const [meetings,spaces,members,teams,projects]=await Promise.all([
    listMeetings(member.id),
    listMeetingSpaces(member.id),
    listPortalMembers(),
    listAccessiblePortalTeams(member),
    listPortalProjectRegistry(),
  ]);
  const section=String(query.section||"meetings")==="spaces"?"spaces":"meetings";
  const create=String(query.create||"");
  const q=String(query.q||"").trim().toLocaleLowerCase("tr-TR");
  const status=["scheduled","live","completed","cancelled"].includes(String(query.status))?String(query.status):"";
  const filtered=meetings.filter((item)=>{
    if(status && String(item.status)!==status)return false;
    if(q){
      const haystack=[item.title,item.agenda,item.space_name,item.team_code,item.project_slug,item.creator_name].map(v=>String(v||"")).join(" ").toLocaleLowerCase("tr-TR");
      if(!haystack.includes(q))return false;
    }
    return true;
  });
  const activeMembers=members.filter((item)=>String(item.status)==="active" && String(item.id)!==member.id);
  const realtime=getRealtimeKitRuntimeStatus();

  return (
    <>
      <PortalPageHeader
        code="TOPLANTILAR"
        title="CORE Toplantıları"
        lead="Toplantı alanları, takvim, katılımcılar, kararlar, oylamalar ve arşiv raporları aynı çalışma zincirinde."
        action={<a className="portalPrimaryButton" href={href({create:"meeting"})}>+ TOPLANTI PLANLA</a>}
      />

      {query.created ? <div className="portalSuccess">Toplantı kaydı oluşturuldu ve takvime eklendi.</div> : null}

      <section className="portalCompactServiceStrip" aria-label="Toplantı servis durumu">
        <article>
          <span>CORE REALTIME</span>
          <b>{realtime.configured?"READY · CLOUDFLARE REALTIMEKIT":"SETUP REQUIRED"}</b>
          <small>{realtime.configured?"Managed WebRTC / SFU aktif":"Account ID + App ID + Worker secret bekleniyor"}</small>
        </article>
        <article>
          <span>MEDYA</span>
          <b>Ses · görüntü · ekran paylaşımı</b>
          <small>Toplantı setup ekranı ve cihaz izinleri</small>
        </article>
        <article>
          <span>ERİŞİM</span>
          <b>CORE oturumu · kişi bazlı token</b>
          <small>Provider API tokenı tarayıcıya gönderilmez</small>
        </article>
      </section>

      <section className="portalRegistryToolbar">
        <nav className="portalSegmentedControl">
          <Link prefetch={false} className={section==="meetings"?"active":""} href="/portal/meetings">Toplantılar</Link>
          <Link prefetch={false} className={section==="spaces"?"active":""} href="/portal/meetings?section=spaces">Alanlar</Link>
        </nav>

        {section==="meetings"?(
          <form action="/portal/meetings" method="get">
            <label className="grow">
              <span>ARA</span>
              <input name="q" defaultValue={String(query.q||"")} placeholder="Başlık, alan, takım, proje..." />
            </label>
            <label>
              <span>DURUM</span>
              <select name="status" defaultValue={status}>
                <option value="">Tümü</option>
                <option value="scheduled">Planlandı</option>
                <option value="live">Canlı</option>
                <option value="completed">Tamamlandı</option>
                <option value="cancelled">İptal</option>
              </select>
            </label>
            <button type="submit">UYGULA</button>
            {(q||status)?<Link prefetch={false} className="subtle" href="/portal/meetings">Temizle</Link>:null}
          </form>
        ):(
          <div className="portalRegistryTabs"><span className="portalMuted">Ayrı ekipler ve çalışma grupları için kalıcı meeting space'ler.</span></div>
        )}

        <div className="portalRegistrySummary">
          <span>{section==="meetings"?"TOPLANTI":"ALAN"}</span>
          <b>{section==="meetings"?filtered.length:spaces.length}</b>
          <small>kayıt</small>
        </div>

        {section==="spaces"?<Link prefetch={false} className="primary" href="/portal/meetings?section=spaces&create=space">+ Alan oluştur</Link>:null}
      </section>

      {create==="meeting"?(
        <section className="portalToolSurface meetingCreateSurface">
          <div className="portalToolBody">
            <div className="portalInlineToolHead">
              <div><b>Toplantı planla</b><small>Takvim kaydı ve katılımcı bildirimleri otomatik oluşturulur.</small></div>
              <Link prefetch={false} href="/portal/meetings">Kapat</Link>
            </div>
            <form className="portalFormGrid" action={createMeetingAction}>
              <label className="portalFormWide"><span>Başlık</span><input name="title" required autoFocus /></label>
              <label>
                <span>Toplantı alanı</span>
                <select name="spaceId" defaultValue="">
                  <option value="">Genel CORE toplantısı</option>
                  {spaces.map((space)=><option value={String(space.id)} key={String(space.id)}>{String(space.name)}</option>)}
                </select>
              </label>
              <label>
                <span>Medya modu</span>
                <select name="transportMode" defaultValue="audio_video">
                  <option value="audio_video">Ses + görüntü</option>
                  <option value="audio">Yalnız ses</option>
                  <option value="external">Harici provider</option>
                  <option value="none">Medya yok</option>
                </select>
              </label>
              <label><span>Başlangıç</span><input name="startsAt" type="datetime-local" required /></label>
              <label><span>Bitiş</span><input name="endsAt" type="datetime-local" /></label>
              <label>
                <span>Takım</span>
                <select name="teamCode" defaultValue="">
                  <option value="">CORE geneli</option>
                  {teams.map((team)=><option value={String(team.code)} key={String(team.code)}>{String(team.code)} · {String(team.name)}</option>)}
                </select>
              </label>
              <label>
                <span>Proje</span>
                <select name="projectSlug" defaultValue="">
                  <option value="">Proje yok</option>
                  {projects.map((project)=><option value={String(project.slug)} key={String(project.slug)}>{String(project.title)}</option>)}
                </select>
              </label>
              <label className="portalFormWide"><span>Gündem</span><textarea name="agenda" rows={4} placeholder="Konuşulacak başlıklar, hedefler, beklenen kararlar..." /></label>
              <fieldset className="portalFormWide meetingParticipantPicker">
                <legend>Katılımcılar</legend>
                <div>
                  {activeMembers.map((person)=>(
                    <label key={String(person.id)}>
                      <input type="checkbox" name="participantId" value={String(person.id)} />
                      <span><b>{String(person.full_name||person.email)}</b><small>{String(person.email)}</small></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button className="portalPrimaryButton" type="submit">Toplantıyı planla</button>
            </form>
          </div>
        </section>
      ):null}

      {create==="space" && section==="spaces"?(
        <section className="portalToolSurface">
          <div className="portalToolBody">
            <div className="portalInlineToolHead">
              <div><b>Toplantı alanı oluştur</b><small>Örn. CORE Marine Weekly, Elektronik Tasarım Kurulu, Yönetim.</small></div>
              <Link prefetch={false} href="/portal/meetings?section=spaces">Kapat</Link>
            </div>
            <form className="portalFormGrid" action={createMeetingSpaceAction}>
              <label><span>Alan adı</span><input name="name" required autoFocus /></label>
              <label>
                <span>Görünürlük</span>
                <select name="visibility" defaultValue="members">
                  <option value="members">Tüm CORE üyeleri</option>
                  <option value="team">Takım üyeleri</option>
                  <option value="private">Özel / davetli</option>
                </select>
              </label>
              <label>
                <span>Takım</span>
                <select name="teamCode" defaultValue="">
                  <option value="">CORE</option>
                  {teams.map((team)=><option value={String(team.code)} key={String(team.code)}>{String(team.code)} · {String(team.name)}</option>)}
                </select>
              </label>
              <label>
                <span>Proje</span>
                <select name="projectSlug" defaultValue="">
                  <option value="">Proje yok</option>
                  {projects.map((project)=><option value={String(project.slug)} key={String(project.slug)}>{String(project.title)}</option>)}
                </select>
              </label>
              <label className="portalFormWide"><span>Açıklama</span><textarea name="description" rows={3} /></label>
              <button className="portalPrimaryButton" type="submit">Alanı oluştur</button>
            </form>
          </div>
        </section>
      ):null}

      {section==="meetings"?(
        filtered.length?(
          <div className="portalDataTableShell">
            <PortalDataTable className="portalMeetingDataTable" columns={["Toplantı","Zaman","Alan","Katılımcı","Karar","Oylama","Rapor","Durum","İşlem"]}>
                {filtered.map((item)=>(
                  <tr key={String(item.id)}>
                    <td className="primaryCell"><Link prefetch={false} href={"/portal/meetings/"+encodeURIComponent(String(item.id))}><b>{String(item.title)}</b><small>{String(item.team_code||item.project_slug||item.creator_name||"CORE")}</small></Link></td>
                    <td><PortalDateTime value={item.starts_at} /></td>
                    <td>{String(item.space_name||"Genel")}</td>
                    <td className="numeric">{String(item.participant_count||0)}</td>
                    <td className="numeric">{String(item.decision_count||0)}</td>
                    <td className="numeric">{String(item.poll_count||0)}</td>
                    <td><span className={"portalStatusText "+(Number(item.report_count)>0?"done":"")}>{Number(item.report_count)>0?"Hazır":"Bekliyor"}</span></td>
                    <td><span className={"portalStatusText "+String(item.status)}>{meetingStatusLabels[String(item.status)] || String(item.status)}</span></td>
                    <td className="rowActions"><Link prefetch={false} href={"/portal/meetings/"+encodeURIComponent(String(item.id))}>Odayı aç</Link></td>
                  </tr>
                ))}
              </PortalDataTable>
          </div>
        ):<PortalEmpty title="Toplantı bulunamadı." text="Filtreleri temizle veya yeni bir toplantı planla." />
      ):(
        spaces.length?(
          <div className="portalDataTableShell">
            <PortalDataTable className="portalMeetingSpaceTable" columns={["Alan","Görünürlük","Takım","Proje","Toplantı"]}>
                {spaces.map((space)=>(
                  <tr key={String(space.id)}>
                    <td className="primaryCell"><div><b>{String(space.name)}</b><small>{String(space.description||"")}</small></div></td>
                    <td>{String(space.visibility)}</td>
                    <td className="mono">{String(space.team_code||"CORE")}</td>
                    <td className="mono">{String(space.project_slug||"—")}</td>
                    <td className="numeric">{String(space.meeting_count||0)}</td>
                  </tr>
                ))}
              </PortalDataTable>
          </div>
        ):<PortalEmpty title="Toplantı alanı yok." text="Kalıcı ekip veya çalışma grubu için ilk meeting space'i oluştur." />
      )}
    </>
  );
}
