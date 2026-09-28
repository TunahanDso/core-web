import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createNotificationAction, markNotificationReadAction } from "@/app/portal/actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalMembers, listPortalNotifications } from "@/lib/portal/db";
import { portalNotificationKindLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalNotificationsPage() {
  const member = await requirePortalMember();
  const [notifications, members] = await Promise.all([
    listPortalNotifications(member.id),
    listPortalMembers(),
  ]);
  const canWrite = member.role === "admin" || member.role === "lead";

  return (
    <>
      <PortalPageHeader code="NT / NOTIFICATIONS" title="Bildirim Merkezi" lead="Takım duyuruları, stok uyarıları, test değişiklikleri ve üyeye özel hatırlatmalar." />
      {canWrite ? (
        <section className="portalPanel portalCreatePanel">
          <div className="portalPanelHead"><span>YENİ BİLDİRİM</span><small>LİDER / ADMİN</small></div>
          <form className="portalFormGrid" action={createNotificationAction}>
            <label><span>Başlık</span><input name="title" required /></label>
            <label><span>Tür</span><select name="kind"><option>info</option><option>warning</option><option>action</option><option>success</option></select></label>
            <label>
              <span>Alıcı</span>
              <select name="memberId" defaultValue="">
                <option value="">Tüm üyeler</option>
                {members.filter((item) => String(item.status) === "active").map((item) => <option value={String(item.id)} key={String(item.id)}>{String(item.full_name || item.email)}</option>)}
              </select>
            </label>
            <label><span>Bağlantı</span><input name="href" placeholder="/portal/tasks" /></label>
            <label className="portalFormWide"><span>Mesaj</span><textarea name="body" rows={3} /></label>
            <button className="portalPrimaryButton" type="submit">BİLDİRİMİ YAYINLA →</button>
          </form>
        </section>
      ) : null}
      {notifications.length ? (
        <div className="portalNotificationList">
          {notifications.map((item) => (
            <article className={item.read_at ? "read" : ""} key={String(item.id)}>
              <span>{portalNotificationKindLabel(String(item.kind))}</span>
              <div><h3>{String(item.title)}</h3><p>{String(item.body || "")}</p><small>{String(item.created_at)}</small></div>
              {item.href ? <a href={String(item.href)}>AÇ →</a> : null}
              {!item.read_at ? (
                <form action={markNotificationReadAction}>
                  <input type="hidden" name="id" value={String(item.id)} />
                  <button type="submit">OKUNDU İŞARETLE</button>
                </form>
              ) : <small>OKUNDU</small>}
            </article>
          ))}
        </div>
      ) : <PortalEmpty title="Bildirim yok." text="Güncelsin." />}
    </>
  );
}
