import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createCalendarEventAction } from "@/app/portal/actions";
import { listPortalCalendar } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalCalendarPage() {
  const events = await listPortalCalendar();
  return (
    <>
      <PortalPageHeader code="CL / CALENDAR" title="Operasyon Takvimi" lead="Toplantılar, saha testleri, incelemeler, son tarihler ve yarışma kilometre taşları tek mühendislik zaman çizgisinde." />
      <section className="portalPanel portalCreatePanel">
        <div className="portalPanelHead"><span>YENİ ETKİNLİK</span><small>TAKIM TAKVİMİ</small></div>
        <form className="portalFormGrid" action={createCalendarEventAction}>
          <label><span>Başlık</span><input name="title" required /></label>
          <label><span>Konum</span><input name="location" /></label>
          <label><span>Başlangıç</span><input name="startsAt" type="datetime-local" required /></label>
          <label><span>Bitiş</span><input name="endsAt" type="datetime-local" /></label>
          <label><span>Takım</span><input name="teamCode" /></label>
          <label><span>Proje</span><input name="projectSlug" /></label>
          <label className="portalFormWide"><span>Açıklama</span><textarea name="description" rows={3} /></label>
          <button className="portalPrimaryButton" type="submit">ETKİNLİK EKLE →</button>
        </form>
      </section>
      {events.length ? (
        <div className="portalTimeline">
          {events.map((event) => (
            <article key={String(event.id)}>
              <span>{String(event.starts_at)}</span>
              <div><h3>{String(event.title)}</h3><p>{String(event.description || "")}</p></div>
              <small>{String(event.location || event.team_code || "CORE")}</small>
            </article>
          ))}
        </div>
      ) : <PortalEmpty title="Takvim boş." text="İlk toplantıyı, testi veya son tarihi yukarıdan ekle." />}
    </>
  );
}
