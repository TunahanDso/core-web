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
    listMyPortalTasks(member.id,8),
    listPortalVehicles(),
    listPortalActivity(8),
    listPortalCalendar(),
    listPortalNotifications(member.id),
    listPortalInventory(),
    listMeetings(member.id,20),
    listPolls(member.id),
    listBudgetEntries(),
  ]);
  const lowStock=inventory.filter(item=>Number(item.available_quantity)<=Number(item.minimum_quantity)).slice(0,5);
  const unread=notifications.filter(item=>!item.read_at).slice(0,5);
  const upcoming=calendar.slice(0,5);
  const upcomingMeetings=meetings.filter(m=>["scheduled","live"].includes(String(m.status))).slice(0,4);
  const openPolls=polls.filter(p=>String(p.status)==="open");
  const pendingBudget=budgetEntries.filter(e=>String(e.status)==="pending").length;
  const firstName=(member.fullName||member.email).trim().split(/s+/)[0]||"CORE";

  return (
    <>
      <section className="portalNativeHome" aria-label="Mobil CORE ana sayfası">
        <header><div><span>CORE / MOBILE</span><h1>Merhaba, {firstName}.</h1><p>Bugün neye odaklanıyoruz?</p></div><a href="/portal/profile" className="portalNativeHomeProfile">PROFİL →</a></header>
        <div className="portalNativeMetricGrid">
          <a href="/portal/tasks"><span>AÇIK GÖREV</span><b>{metrics.openTasks}</b><small>iş kuyruğu</small></a>
          <a href="/portal/notifications"><span>BİLDİRİM</span><b>{metrics.unread}</b><small>okunmamış</small></a>
          <a href="/portal/meetings"><span>TOPLANTI</span><b>{upcomingMeetings.length}</b><small>yaklaşan / canlı</small></a>
          <a href="/portal/polls"><span>OYLAMA</span><b>{openPolls.length}</b><small>açık</small></a>
        </div>
        <div className="portalNativeQuickRail">
          <a href="/portal/tasks"><span>PM</span><b>Görevler</b><small>Planla ve ilerlet</small></a>
          <a href="/portal/chat"><span>CH</span><b>Sohbet</b><small>Takımla konuş</small></a>
          <a href="/portal/meetings"><span>MT</span><b>Toplantılar</b><small>Karar ve rapor</small></a>
          <a href="/portal/library"><span>VA</span><b>Vault</b><small>Teknik hafıza</small></a>
          <a href="/portal/budget"><span>BG</span><b>Bütçe</b><small>Takım finansı</small></a>
        </div>
      </section>

      <header className="portalDashboardHeader">
        <div><span>CORE / TODAY</span><h1>Merhaba, {firstName}.</h1><p>Önce durum, sonra iş. Portal ana ekranı yalnız karar vermen gereken şeyleri öne çıkarır.</p></div>
        <div className="portalDashboardStatus"><span>SİSTEM</span><b>Çevrimiçi</b><small>Araç komut otoritesi izole</small></div>
      </header>

      <section className="portalDashboardMetricStrip">
        <a href="/portal/tasks"><span>AÇIK GÖREV</span><b>{metrics.openTasks}</b><small>iş kuyruğu</small></a>
        <a href="/portal/notifications"><span>OKUNMAMIŞ</span><b>{metrics.unread}</b><small>bildirim</small></a>
        <a href="/portal/meetings"><span>TOPLANTI</span><b>{upcomingMeetings.length}</b><small>yaklaşan / canlı</small></a>
        <a href="/portal/polls"><span>AÇIK OYLAMA</span><b>{openPolls.length}</b><small>karar bekliyor</small></a>
        <a href="/portal/inventory"><span>DÜŞÜK STOK</span><b>{metrics.lowStock}</b><small>kontrol et</small></a>
        <a href="/portal/budget"><span>BÜTÇE ONAYI</span><b>{pendingBudget}</b><small>bekleyen hareket</small></a>
      </section>

      <nav className="portalDashboardQuickLinks" aria-label="Hızlı modüller">
        <a href="/portal/projects">Projeler</a><a href="/portal/tasks">Görevler</a><a href="/portal/chat">Chat</a>
        <a href="/portal/mail">Mail</a><a href="/portal/meetings">Toplantılar</a><a href="/portal/calendar">Takvim</a>
        <a href="/portal/library">Vault</a><a href="/portal/repositories">Repo</a><a href="/portal/budget">Bütçe</a>
      </nav>

      <section className="portalDashboardGrid">
        <article className="portalDashboardPane">
          <header><b>Bana atanan işler</b><a href="/portal/tasks">Tümü →</a></header>
          <div className="portalCompactList">{tasks.length?tasks.map(task=>(
            <div key={String(task.id)}><span className={"portalPriority "+String(task.priority)}>{portalPriorityLabel(String(task.priority))}</span><div><a href={"/portal/tasks/"+encodeURIComponent(String(task.id))}><b>{String(task.title)}</b></a><small>{String(task.project_slug||task.team_code||"CORE")}</small></div><em>{portalTaskStatusLabel(String(task.status))}</em></div>
          )):<p className="portalMuted">Açık atanmış görevin yok.</p>}</div>
        </article>

        <article className="portalDashboardPane">
          <header><b>Toplantılar & takvim</b><a href="/portal/meetings">Toplantılar →</a></header>
          <div className="portalAgendaList">
            {upcomingMeetings.length?upcomingMeetings.map(m=><article key={String(m.id)}><span>{String(m.starts_at).slice(0,16).replace("T"," ")}</span><div><a href={"/portal/meetings/"+encodeURIComponent(String(m.id))}><b>{String(m.title)}</b></a><small>{String(m.space_name||m.team_code||"CORE")}</small></div></article>):upcoming.map(event=><article key={String(event.id)}><span>{String(event.starts_at).slice(0,16).replace("T"," ")}</span><div><b>{String(event.title)}</b><small>{String(event.location||event.team_code||"CORE")}</small></div></article>)}
          </div>
        </article>

        <article className="portalDashboardPane">
          <header><b>Bildirimler</b><a href="/portal/notifications">Tümü →</a></header>
          <div className="portalAlertList">{unread.length?unread.map(item=><article key={String(item.id)}><span>{String(item.kind).toUpperCase()}</span><div><b>{String(item.title)}</b><small>{String(item.body||"")}</small></div>{item.href?<a href={String(item.href)}>Aç</a>:null}</article>):<p className="portalMuted">Okunmamış bildirim yok.</p>}</div>
        </article>

        <article className="portalDashboardPane">
          <header><b>Düşük stok</b><a href="/portal/inventory">Envanter →</a></header>
          <div className="portalAlertList">{lowStock.length?lowStock.map(item=><article key={String(item.id)}><span>{String(item.sku)}</span><div><b>{String(item.name)}</b><small>{String(item.location||"Konum yok")}</small></div><strong>{String(item.available_quantity)} {String(item.unit)}</strong></article>):<p className="portalMuted">Minimum seviyenin altında stok yok.</p>}</div>
        </article>
      </section>

      <section className="portalDashboardBottomStrip">
        <article>
          <header><b>Araç durumu</b><a href="/portal/ops">Canlı görünüm →</a></header>
          <div>{vehicles.slice(0,6).map(v=><span key={String(v.id)}><i className={"portalVehicleDot "+String(v.status)}/><b>{String(v.name)}</b><small>{portalVehicleStatusLabel(String(v.status))}</small></span>)}</div>
        </article>
        <article>
          <header><b>Son etkinlik</b><a href="/portal/activity">Geçmiş →</a></header>
          <div>{activity.slice(0,6).map(a=><span key={String(a.id)}><b>{String(a.action)}</b><small>{String(a.actor)} · {String(a.created_at)}</small></span>)}</div>
        </article>
      </section>
    </>
  );
}
