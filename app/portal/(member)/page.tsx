import { portalModuleCards } from "@/lib/portal/modules";
import { portalPriorityLabel, portalTaskStatusLabel, portalVehicleStatusLabel } from "@/lib/portal/labels";
import { requirePortalMember } from "@/lib/portal/auth";
import {
  getPortalMetrics,
  listMyPortalTasks,
  listPortalActivity,
  listPortalCalendar,
  listPortalInventory,
  listPortalNotifications,
  listPortalVehicles,
} from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalDashboard() {
  const member = await requirePortalMember();
  const [metrics, tasks, vehicles, activity, calendar, notifications, inventory] = await Promise.all([
    getPortalMetrics(member.id),
    listMyPortalTasks(member.id, 8),
    listPortalVehicles(),
    listPortalActivity(7),
    listPortalCalendar(),
    listPortalNotifications(member.id),
    listPortalInventory(),
  ]);
  const lowStock = inventory.filter((item) => Number(item.available_quantity) <= Number(item.minimum_quantity)).slice(0, 6);
  const unreadNotifications = notifications.filter((item) => !item.read_at).slice(0, 5);
  const upcoming = calendar.slice(0, 5);

  return (
    <>
      <section className="portalHero">
        <div>
          <span>CORE / ANA SAYFA</span>
          <h1>İyi mühendislik<br />hafıza ister.</h1>
          <p>
            Görevleri, teknik hafızayı, stokları, haberleşmeyi ve saha görünürlüğünü
            farklı araçlara dağıtmak yerine CORE'un kendi çalışma sisteminde bir araya getiriyoruz.
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
        <article><span>BİLDİRİMLER</span><b>{metrics.unread}</b><small>okunmamış</small></article>
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
              <small>AÇ →</small>
            </a>
          ))}
        </div>
      </section>

      <section className="portalDashboardFocus">
        <div className="portalPanel">
          <div className="portalPanelHead"><span>BANA ATANAN İŞLER</span><a href="/portal/tasks">Görev panosu →</a></div>
          <div className="portalCompactList">
            {tasks.length ? tasks.map((task) => (
              <div key={String(task.id)}>
                <span className={"portalPriority " + String(task.priority)}>{portalPriorityLabel(String(task.priority))}</span>
                <div><a href={"/portal/tasks/" + encodeURIComponent(String(task.id))}><b>{String(task.title)}</b></a><small>{String(task.project_slug || task.team_code || "CORE")}</small></div>
                <em>{portalTaskStatusLabel(String(task.status))}</em>
              </div>
            )) : <p className="portalMuted">Şu anda sana atanmış açık görev yok.</p>}
          </div>
        </div>

        <div className="portalPanel">
          <div className="portalPanelHead"><span>YAKLAŞAN TAKVİM</span><a href="/portal/calendar">Takvim →</a></div>
          <div className="portalAgendaList">
            {upcoming.length ? upcoming.map((event) => (
              <article key={String(event.id)}>
                <span>{String(event.starts_at).slice(0,16).replace("T"," ")}</span>
                <div><b>{String(event.title)}</b><small>{String(event.location || event.team_code || "CORE")}</small></div>
              </article>
            )) : <p className="portalMuted">Yaklaşan etkinlik bulunmuyor.</p>}
          </div>
        </div>

        <div className="portalPanel">
          <div className="portalPanelHead"><span>DÜŞÜK STOK</span><a href="/portal/inventory">Envanter →</a></div>
          <div className="portalAlertList">
            {lowStock.length ? lowStock.map((item) => (
              <article key={String(item.id)}>
                <span>{String(item.sku)}</span>
                <div><b>{String(item.name)}</b><small>{String(item.location || "Konum yok")}</small></div>
                <strong>{String(item.available_quantity)} {String(item.unit)}</strong>
              </article>
            )) : <p className="portalMuted">Minimum seviyenin altında stok yok.</p>}
          </div>
        </div>

        <div className="portalPanel">
          <div className="portalPanelHead"><span>BİLDİRİMLER</span><a href="/portal/notifications">Tümü →</a></div>
          <div className="portalAlertList">
            {unreadNotifications.length ? unreadNotifications.map((item) => (
              <article key={String(item.id)}>
                <span>{String(item.kind).toUpperCase()}</span>
                <div><b>{String(item.title)}</b><small>{String(item.body || "")}</small></div>
                {item.href ? <a href={String(item.href)}>AÇ →</a> : null}
              </article>
            )) : <p className="portalMuted">Okunmamış bildirim yok.</p>}
          </div>
        </div>
      </section>

      <section className="portalPanel portalVehicleStrip">
        <div className="portalPanelHead"><span>ARAÇ KATMANI</span><a href="/portal/ops">Canlı görünüm →</a></div>
        <div className="portalVehicleStripGrid">
          {vehicles.map((vehicle) => (
            <article key={String(vehicle.id)}>
              <span className={"portalVehicleDot " + String(vehicle.status)} />
              <div><b>{String(vehicle.name)}</b><small>{String(vehicle.domain)}</small></div>
              <em>{portalVehicleStatusLabel(String(vehicle.status))}</em>
            </article>
          ))}
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
