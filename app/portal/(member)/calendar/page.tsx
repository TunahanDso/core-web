import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createCalendarEventAction } from "@/app/portal/actions";
import { listPortalCalendar } from "@/lib/portal/db";

export const dynamic="force-dynamic";

export default async function PortalCalendarPage({
  searchParams,
}:{
  searchParams?:Promise<{create?:string;q?:string;scope?:string}>;
}){
  const query=searchParams ? await searchParams : {};
  const events=await listPortalCalendar();
  const q=String(query.q||"").trim().toLocaleLowerCase("tr-TR");
  const scope=String(query.scope||"");
  const visible=events.filter((event)=>{
    const eventScope=String(event.team_code||event.project_slug||"CORE");
    if(scope && eventScope!==scope)return false;
    if(q){
      const haystack=[event.title,event.description,event.location,event.team_code,event.project_slug].map(v=>String(v||"")).join(" ").toLocaleLowerCase("tr-TR");
      if(!haystack.includes(q))return false;
    }
    return true;
  });
  const scopes=Array.from(new Set(events.map(e=>String(e.team_code||e.project_slug||"CORE")))).sort();

  return (
    <>
      <PortalPageHeader
        code="TAKVİM"
        title="Operasyon Takvimi"
        lead="Toplantılar, saha testleri, incelemeler, teslimler ve yarışma kilometre taşlarını aynı zaman registry'sinde izle."
        action={<a className="portalPrimaryButton" href="/portal/calendar?create=1">+ ETKİNLİK EKLE</a>}
      />

      <section className="portalRegistryToolbar">
        <form action="/portal/calendar" method="get">
          <label className="grow"><span>ARA</span><input name="q" defaultValue={String(query.q||"")} placeholder="Etkinlik, toplantı, konum..."/></label>
          <label><span>KAPSAM</span><select name="scope" defaultValue={scope}><option value="">Tümü</option>{scopes.map(s=><option value={s} key={s}>{s}</option>)}</select></label>
          <button type="submit">UYGULA</button>
          {(q||scope)?<a className="subtle" href="/portal/calendar">Temizle</a>:null}
        </form>
        <div className="portalRegistrySummary"><span>ETKİNLİK</span><b>{visible.length}</b><small>takvim kaydı</small></div>
        <a className="subtle" href="/portal/meetings">Toplantılar</a>
      </section>

      {query.create==="1"?(
        <section className="portalToolSurface">
          <div className="portalToolBody">
            <div className="portalInlineToolHead"><div><b>Etkinlik ekle</b><small>Toplantı planlamak için Toplantılar modülünü kullan; oradan takvime otomatik düşer.</small></div><a href="/portal/calendar">Kapat</a></div>
            <form className="portalFormGrid" action={createCalendarEventAction}>
              <label><span>Başlık</span><input name="title" required autoFocus/></label>
              <label><span>Konum</span><input name="location"/></label>
              <label><span>Başlangıç</span><input name="startsAt" type="datetime-local" required/></label>
              <label><span>Bitiş</span><input name="endsAt" type="datetime-local"/></label>
              <label><span>Takım</span><input name="teamCode"/></label>
              <label><span>Proje</span><input name="projectSlug"/></label>
              <label className="portalFormWide"><span>Açıklama</span><textarea name="description" rows={3}/></label>
              <button className="portalPrimaryButton" type="submit">Etkinliği ekle</button>
            </form>
          </div>
        </section>
      ):null}

      {visible.length?(
        <div className="portalDataTableShell">
          <table className="portalDataTable portalCalendarDataTable">
            <thead><tr><th scope="col">Etkinlik</th><th scope="col">Başlangıç</th><th scope="col">Bitiş</th><th scope="col">Kapsam</th><th scope="col">Konum / Kaynak</th></tr></thead>
            <tbody>{visible.map(event=>(
              <tr key={String(event.id)}>
                <td className="primaryCell"><div><b>{String(event.title)}</b><small>{String(event.description||"")}</small></div></td>
                <td className="mono">{String(event.starts_at)}</td>
                <td className="mono">{String(event.ends_at||"—")}</td>
                <td className="mono">{String(event.team_code||event.project_slug||"CORE")}</td>
                <td><span className={"portalStatusText "+(String(event.location)==="CORE Meeting"?"active":"")}>{String(event.location||"CORE")}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ):<PortalEmpty title="Takvim boş." text="Yeni etkinlik ekle veya Toplantılar modülünden toplantı planla."/>}
    </>
  );
}
