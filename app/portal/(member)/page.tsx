import Link from "next/link";
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
import { listBudgetEntries, listMeetings, listPolls } from "@/lib/portal/collaboration";

export const dynamic="force-dynamic";

export default async function PortalDashboard(){
  const member=await requirePortalMember();
  const [metrics,tasks,vehicles,activity,calendar,notifications,inventory,meetings,polls,budgetEntries]=await Promise.all([
    getPortalMetrics(member.id),
    listMyPortalTasks(member.id,6),
    listPortalVehicles(),
    listPortalActivity(6),
    listPortalCalendar(),
    listPortalNotifications(member.id),
    listPortalInventory(),
    listMeetings(member.id,12),
    listPolls(member.id),
    member.role==="admin"||member.role==="lead" ? listBudgetEntries() : Promise.resolve([]),
  ]);

  const lowStock=inventory.filter(item=>Number(item.available_quantity)<=Number(item.minimum_quantity)).slice(0,4);
  const unread=notifications.filter(item=>!item.read_at).slice(0,4);
  const upcoming=calendar.slice(0,4);
  const upcomingMeetings=meetings.filter(m=>["scheduled","live"].includes(String(m.status))).slice(0,4);
  const openPolls=polls.filter(p=>String(p.status)==="open");
  const pendingBudget=budgetEntries.filter(e=>String(e.status)==="pending").length;
  const vehiclesOnline=vehicles.filter(v=>String(v.status)!=="offline");
  const firstName=(member.fullName||member.email).trim().split(/\s+/)[0]||"CORE";

  return (
    <>
      <section className="portalNativeHome" aria-label="Mobil CORE ana sayfası">
        <header>
          <div><span>CORE / MOBILE</span><h1>Merhaba, {firstName}.</h1><p>Bugün neye odaklanıyoruz?</p></div>
          <Link prefetch={false} href="/portal/profile" className="portalNativeHomeProfile">PROFİL →</Link>
        </header>
        <div className="portalNativeMetricGrid">
          <Link prefetch={false} href="/portal/tasks"><span>AÇIK GÖREV</span><b>{metrics.openTasks}</b><small>iş kuyruğu</small></Link>
          <Link prefetch={false} href="/portal/notifications"><span>BİLDİRİM</span><b>{metrics.unread}</b><small>okunmamış</small></Link>
          <Link prefetch={false} href="/portal/meetings"><span>TOPLANTI</span><b>{upcomingMeetings.length}</b><small>yaklaşan / canlı</small></Link>
          <Link prefetch={false} href="/portal/polls"><span>OYLAMA</span><b>{openPolls.length}</b><small>açık</small></Link>
        </div>
        <div className="portalNativeQuickRail">
          <Link prefetch={false} href="/portal/tasks"><span>PM</span><b>Görevler</b><small>Planla ve ilerlet</small></Link>
          <Link prefetch={false} href="/portal/chat"><span>CH</span><b>Sohbet</b><small>Takımla konuş</small></Link>
          <Link prefetch={false} href="/portal/meetings"><span>MT</span><b>Toplantılar</b><small>Karar ve rapor</small></Link>
          <Link prefetch={false} href="/portal/library"><span>VA</span><b>Vault</b><small>Teknik hafıza</small></Link>
          <Link prefetch={false} href="/portal/budget"><span>BG</span><b>Bütçe</b><small>Takım finansı</small></Link>
        </div>
      </section>

      <header className="portalDashboardHeader">
        <div>
          <span>CORE / TODAY</span>
          <h1>Merhaba, {firstName}.</h1>
          <p>Bugünün işlerini, toplantılarını ve dikkat isteyen operasyonları tek bakışta gör.</p>
        </div>
        <div className="portalDashboardStatus">
          <span>SİSTEM</span><b>Çevrimiçi</b><small>Araç komut otoritesi izole</small>
        </div>
      </header>

      <section className="portalDashboardMetricStrip">
        <Link prefetch={false} href="/portal/tasks"><span>AÇIK GÖREV</span><b>{metrics.openTasks}</b><small>iş kuyruğu</small></Link>
        <Link prefetch={false} href="/portal/notifications"><span>OKUNMAMIŞ</span><b>{metrics.unread}</b><small>bildirim</small></Link>
        <Link prefetch={false} href="/portal/meetings"><span>TOPLANTI</span><b>{upcomingMeetings.length}</b><small>yaklaşan / canlı</small></Link>
        <Link prefetch={false} href="/portal/inventory"><span>DÜŞÜK STOK</span><b>{metrics.lowStock}</b><small>kontrol et</small></Link>
      </section>

      <nav className="portalDashboardQuickLinks" aria-label="Hızlı modüller">
        <Link prefetch={false} href="/portal/projects">Projeler</Link>
        <Link prefetch={false} href="/portal/tasks">Görevler</Link>
        <Link prefetch={false} href="/portal/chat">Chat</Link>
        <Link prefetch={false} href="/portal/meetings">Toplantılar</Link>
        <Link prefetch={false} href="/portal/calendar">Takvim</Link>
        <Link prefetch={false} href="/portal/library">Vault</Link>
        <Link prefetch={false} href="/portal/polls">Oylamalar · {openPolls.length}</Link>
        <Link prefetch={false} href="/portal/budget">Bütçe{pendingBudget ? " · "+pendingBudget+" onay" : ""}</Link>
      </nav>

      <section className="portalDashboardGrid">
        <article className="portalDashboardPane">
          <header><b>Bana atanan işler</b><Link prefetch={false} href="/portal/tasks">Tümü →</Link></header>
          <div className="portalCompactList">
            {tasks.length?tasks.map(task=>(
              <div key={String(task.id)}>
                <span className={"portalPriority "+String(task.priority)}>{portalPriorityLabel(String(task.priority))}</span>
                <div><Link prefetch={false} href={"/portal/tasks/"+encodeURIComponent(String(task.id))}><b>{String(task.title)}</b></Link><small>{String(task.project_slug||task.team_code||"CORE")}</small></div>
                <em>{portalTaskStatusLabel(String(task.status))}</em>
              </div>
            )):<p className="portalMuted">Açık atanmış görevin yok.</p>}
          </div>
        </article>

        <article className="portalDashboardPane">
          <header><b>Toplantılar & takvim</b><Link prefetch={false} href="/portal/meetings">Toplantılar →</Link></header>
          <div className="portalAgendaList">
            {upcomingMeetings.length?upcomingMeetings.map(m=>(
              <article key={String(m.id)}>
                <span>{String(m.starts_at).slice(0,16).replace("T"," ")}</span>
                <div><Link prefetch={false} href={"/portal/meetings/"+encodeURIComponent(String(m.id))}><b>{String(m.title)}</b></Link><small>{String(m.space_name||m.team_code||"CORE")}</small></div>
              </article>
            )):upcoming.map(event=>(
              <article key={String(event.id)}>
                <span>{String(event.starts_at).slice(0,16).replace("T"," ")}</span>
                <div><b>{String(event.title)}</b><small>{String(event.location||event.team_code||"CORE")}</small></div>
              </article>
            ))}
            {!upcomingMeetings.length && !upcoming.length ? <p className="portalMuted">Yaklaşan kayıt yok.</p> : null}
          </div>
        </article>

        <article className="portalDashboardPane">
          <header><b>Bildirimler</b><Link prefetch={false} href="/portal/notifications">Tümü →</Link></header>
          <div className="portalAlertList">
            {unread.length?unread.map(item=>(
              <article key={String(item.id)}>
                <span>{String(item.kind).toUpperCase()}</span>
                <div><b>{String(item.title)}</b><small>{String(item.body||"")}</small></div>
                {item.href?<a href={String(item.href)}>Aç</a>:null}
              </article>
            )):<p className="portalMuted">Okunmamış bildirim yok.</p>}
          </div>
        </article>

        <article className="portalDashboardPane">
          <header><b>Operasyon</b><Link prefetch={false} href="/portal/ops">Canlı görünüm →</Link></header>
          <div className="portalDashboardOps">
            <div>
              <span>ARAÇ</span>
              <b>{vehiclesOnline.length}</b>
              <small>çevrimiçi / hazır</small>
            </div>
            <div>
              <span>OYLAMA</span>
              <b>{openPolls.length}</b>
              <small>açık karar</small>
            </div>
            <div>
              <span>BÜTÇE</span>
              <b>{pendingBudget}</b>
              <small>bekleyen onay</small>
            </div>
          </div>
          <div className="portalAlertList portalDashboardLowStock">
            {lowStock.length?lowStock.map(item=>(
              <article key={String(item.id)}>
                <span>{String(item.sku)}</span>
                <div><b>{String(item.name)}</b><small>{String(item.location||"Konum yok")}</small></div>
                <strong>{String(item.available_quantity)} {String(item.unit)}</strong>
              </article>
            )):<p className="portalMuted">Minimum seviyenin altında stok yok.</p>}
          </div>
        </article>
      </section>

      <section className="portalDashboardActivityBar">
        <header><b>Son etkinlik</b><Link prefetch={false} href="/portal/activity">Geçmiş →</Link></header>
        <div>
          {activity.length?activity.map(item=>(
            <span key={String(item.id)}><b>{String(item.action)}</b><small>{String(item.actor)} · {String(item.created_at)}</small></span>
          )):<p className="portalMuted">Henüz etkinlik kaydı yok.</p>}
        </div>
      </section>
    </>
  );
}
