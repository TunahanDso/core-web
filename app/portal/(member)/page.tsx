import { portalModuleCards } from "@/lib/portal/modules";
import { portalPriorityLabel, portalTaskStatusLabel, portalVehicleStatusLabel } from "@/lib/portal/labels";
import { requirePortalMember } from "@/lib/portal/auth";
import {
  getPortalMetrics,
  listPortalActivity,
  listPortalTasks,
  listPortalVehicles,
} from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalDashboard() {
  const member = await requirePortalMember();
  const [metrics, tasks, vehicles, activity] = await Promise.all([
    getPortalMetrics(member.id),
    listPortalTasks(6),
    listPortalVehicles(),
    listPortalActivity(7),
  ]);

  return (
    <>
      <section className="portalHero">
        <div>
          <span>CORE / HOME</span>
          <h1>İyi mühendislik<br />hafıza ister.</h1>
          <p>
            One operating surface for the work students usually scatter across
            drives, chats, spreadsheets, repositories and notebooks.
          </p>
        </div>
        <div className="portalHeroStatus">
          <span>SİSTEM DURUMU</span>
          <b>PORTAL ÇEVRİMİÇİ</b>
          <small>PUBLIC CMS AYRI · ARAÇ KOMUT OTORİTESİ İZOLE</small>
        </div>
      </section>

      <section className="portalMetrics">
        <article><span>AKTİF ÜYELER</span><b>{metrics.members}</b><small>öğrenci ağı</small></article>
        <article><span>AÇIK GÖREVLER</span><b>{metrics.openTasks}</b><small>ilgilenilmesi gerekiyor</small></article>
        <article><span>BİLGİ KAYITLARI</span><b>{metrics.resources}</b><small>kütüphane + arşiv</small></article>
        <article><span>DÜŞÜK STOK</span><b>{metrics.lowStock}</b><small>envanter uyarıları</small></article>
        <article><span>BİLDİRİMLER</span><b>{metrics.okunmamış}</b><small>okunmamış</small></article>
        <article><span>CANLI ARAÇLAR</span><b>{metrics.vehiclesOnline}</b><small>salt okunur telemetri</small></article>
      </section>

      <section className="portalSection">
        <div className="portalSectionHead">
          <div><span>MODÜL HARİTASI</span><h2>CORE'un çalışmaya devam etmesi için gereken her şey.</h2></div>
          <p>Her modül belirli bir operasyonel hafızayı taşır. Bağlantılar projeleri, donanımı, insanları ve kanıtları birbirine bağlar.</p>
        </div>
        <div className="portalModuleGrid">
          {portalModuleCards.map(([title, text, href, code]) => (
            <a href={href} key={href}>
              <span>{code}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <small>OPEN →</small>
            </a>
          ))}
        </div>
      </section>

      <section className="portalSplit">
        <div className="portalPanel">
          <div className="portalPanelHead"><span>İŞ KUYRUĞU</span><a href="/portal/tasks">Tüm görevler →</a></div>
          <div className="portalCompactList">
            {tasks.length ? tasks.map((task) => (
              <div key={String(task.id)}>
                <span className={"portalPriority " + String(task.priority)}>{portalPriorityLabel(String(task.priority))}</span>
                <div><b>{String(task.title)}</b><small>{String(task.project_slug || task.team_code || "CORE")}</small></div>
                <em>{portalTaskStatusLabel(String(task.status))}</em>
              </div>
            )) : <p className="portalMuted">Henüz görev yok. İlk mühendislik işini oluştur.</p>}
          </div>
        </div>

        <div className="portalPanel">
          <div className="portalPanelHead"><span>ARAÇ KATMANI</span><a href="/portal/ops">Canlı görünüm →</a></div>
          <div className="portalCompactList">
            {vehicles.map((vehicle) => (
              <div key={String(vehicle.id)}>
                <span className={"portalVehicleDot " + String(vehicle.status)} />
                <div><b>{String(vehicle.name)}</b><small>{String(vehicle.domain)}</small></div>
                <em>{portalVehicleStatusLabel(String(vehicle.status))}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="portalPanel portalActivityPanel">
        <div className="portalPanelHead"><span>SON ETKİNLİKLER</span><a href="/portal/activity">Tüm geçmiş →</a></div>
        <div className="portalActivityList">
          {activity.length ? activity.map((item) => (
            <div key={String(item.id)}>
              <span>{String(item.action)}</span>
              <b>{String(item.actor)}</b>
              <small>{String(item.created_at)}</small>
            </div>
          )) : <p className="portalMuted">Takım portalı kullandıkça etkinlikler burada birikecek.</p>}
        </div>
      </section>
    </>
  );
}
