import PortalHome from "@/components/portal/PortalHome";
import { portalPriorityLabel, portalTaskStatusLabel } from "@/lib/portal/labels";
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

  const firstName=(member.fullName||member.email).trim().split(/\s+/)[0]||"CORE";
  const activeMeetings=meetings.filter(m=>["scheduled","live"].includes(String(m.status)));
  const dateLabel=(value:unknown)=>{
    const raw=String(value||"");
    const date=new Date(raw);
    return Number.isNaN(date.getTime())?raw:new Intl.DateTimeFormat("tr-TR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Istanbul"}).format(date);
  };
  return <PortalHome data={{
    name:firstName,
    stats:[
      {label:"Açık görev",value:Number(metrics.openTasks),detail:"İş kuyruğunda",href:"/portal/tasks"},
      {label:"Bildirim",value:Number(metrics.unread),detail:"Okunmamış",href:"/portal/notifications"},
      {label:"Toplantı",value:activeMeetings.length,detail:"Planlanan / canlı",href:"/portal/meetings"},
      {label:"Düşük stok",value:Number(metrics.lowStock),detail:"Kontrol bekliyor",href:"/portal/inventory"},
    ],
    tasks:tasks.map(t=>({id:String(t.id),title:String(t.title),meta:String(t.project_slug||t.team_code||"CORE")+" · "+portalTaskStatusLabel(String(t.status)),href:"/portal/tasks/"+encodeURIComponent(String(t.id)),badge:portalPriorityLabel(String(t.priority)),tone:["high","critical"].includes(String(t.priority))?"warning":undefined})),
    agenda:activeMeetings.length?activeMeetings.slice(0,4).map(m=>({id:String(m.id),title:String(m.title),meta:dateLabel(m.starts_at)+" · "+String(m.space_name||m.team_code||"CORE"),href:"/portal/meetings/"+encodeURIComponent(String(m.id))})):calendar.slice(0,4).map(e=>({id:String(e.id),title:String(e.title),meta:dateLabel(e.starts_at)+" · "+String(e.location||e.team_code||"CORE"),href:"/portal/calendar"})),
    notifications:notifications.filter(n=>!n.read_at).slice(0,4).map(n=>({id:String(n.id),title:String(n.title),meta:String(n.body||""),href:n.href?String(n.href):"/portal/notifications"})),
    stock:inventory.filter(i=>Number(i.available_quantity)<=Number(i.minimum_quantity)).slice(0,4).map(i=>({id:String(i.id),title:String(i.name),meta:String(i.sku)+" · "+String(i.location||"Konum yok"),href:"/portal/inventory",badge:String(i.available_quantity)+" "+String(i.unit),tone:"warning"})),
    activity:activity.map(a=>({id:String(a.id),title:String(a.action),meta:String(a.actor)+" · "+dateLabel(a.created_at)})),
    openPolls:polls.filter(p=>String(p.status)==="open").length,
    pendingBudget:budgetEntries.filter(e=>String(e.status)==="pending").length,
    vehicles:vehicles.filter(v=>String(v.status)!=="offline").length,
  }}/>;
}
