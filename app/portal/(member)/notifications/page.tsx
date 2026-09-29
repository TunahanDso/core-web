import Link from "next/link";
import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createNotificationAction, markAllNotificationsReadAction, markNotificationReadAction } from "@/app/portal/actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalMembers, listPortalNotifications } from "@/lib/portal/db";
import { portalNotificationKindLabel } from "@/lib/portal/labels";

export const dynamic="force-dynamic";

export default async function PortalNotificationsPage({
  searchParams,
}:{
  searchParams?:Promise<{filter?:string;create?:string}>;
}){
  const query=searchParams ? await searchParams : {};
  const member=await requirePortalMember();
  const [notifications,members]=await Promise.all([listPortalNotifications(member.id),listPortalMembers()]);
  const canWrite=member.role==="admin"||member.role==="lead";
  const unreadCount=notifications.filter((item)=>!item.read_at).length;
  const filter=String(query.filter||"all")==="unread"?"unread":"all";
  const visible=filter==="unread"?notifications.filter((item)=>!item.read_at):notifications;

  return (
    <>
      <PortalPageHeader
        code="BİLDİRİMLER"
        title="Bildirim Merkezi"
        lead="Toplantı davetleri, oylamalar, görevler, stok ve sistem uyarılarını tek kayıt akışında gör."
        action={canWrite?<Link prefetch={false} className="portalPrimaryButton" href="/portal/notifications?create=1">+ BİLDİRİM YAYINLA</Link>:undefined}
      />

      <section className="portalRegistryToolbar">
        <nav className="portalSegmentedControl">
          <Link prefetch={false} className={filter==="all"?"active":""} href="/portal/notifications">Tümü · {notifications.length}</Link>
          <Link prefetch={false} className={filter==="unread"?"active":""} href="/portal/notifications?filter=unread">Okunmamış · {unreadCount}</Link>
        </nav>
        <div className="portalRegistrySummary"><span>OKUNMAMIŞ</span><b>{unreadCount}</b><small>bildirim</small></div>
        {unreadCount?<form action={markAllNotificationsReadAction}><button className="portalRegistryActionButton" type="submit">Tümünü okundu yap</button></form>:null}
      </section>

      {query.create==="1"&&canWrite?(
        <section className="portalToolSurface">
          <div className="portalToolBody">
            <div className="portalInlineToolHead"><div><b>Bildirim yayınla</b><small>Doğrudan bir üyeye veya tüm CORE'a.</small></div><Link prefetch={false} href="/portal/notifications">Kapat</Link></div>
            <form className="portalFormGrid" action={createNotificationAction}>
              <label><span>Başlık</span><input name="title" required autoFocus/></label>
              <label><span>Tür</span><select name="kind"><option value="info">Bilgi</option><option value="warning">Uyarı</option><option value="action">İşlem</option><option value="success">Başarılı</option></select></label>
              <label><span>Alıcı</span><select name="memberId" defaultValue=""><option value="">Tüm üyeler</option>{members.filter(i=>String(i.status)==="active").map(i=><option value={String(i.id)} key={String(i.id)}>{String(i.full_name||i.email)}</option>)}</select></label>
              <label><span>Bağlantı</span><input name="href" placeholder="/portal/tasks"/></label>
              <label className="portalFormWide"><span>Mesaj</span><textarea name="body" rows={3}/></label>
              <button className="portalPrimaryButton" type="submit">Yayınla</button>
            </form>
          </div>
        </section>
      ):null}

      {visible.length?(
        <div className="portalDataTableShell">
          <table className="portalDataTable portalNotificationDataTable">
            <thead><tr><th scope="col">Bildirim</th><th scope="col">Tür</th><th scope="col">Zaman</th><th scope="col">Durum</th><th scope="col">İşlem</th></tr></thead>
            <tbody>{visible.map((item)=>(
              <tr key={String(item.id)}>
                <td className="primaryCell"><div><b>{String(item.title)}</b><small>{String(item.body||"")}</small></div></td>
                <td>{portalNotificationKindLabel(String(item.kind))}</td>
                <td className="mono">{String(item.created_at)}</td>
                <td><span className={"portalStatusText "+(item.read_at?"done":"review")}>{item.read_at?"Okundu":"Yeni"}</span></td>
                <td className="rowActions">
                  {item.href?<a href={String(item.href)}>Aç</a>:null}
                  {!item.read_at?<form action={markNotificationReadAction}><input type="hidden" name="id" value={String(item.id)}/><button type="submit">Okundu</button></form>:null}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ):<PortalEmpty title={filter==="unread"?"Okunmamış bildirim yok.":"Bildirim yok."} text="Güncelsin."/>}
    </>
  );
}
