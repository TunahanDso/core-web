import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createNotificationAction, markNotificationReadAction } from "@/app/portal/actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalMembers, listPortalNotifications } from "@/lib/portal/db";

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
      <PortalPageHeader code="NT / NOTIFICATIONS" title="Notification Center" lead="Actionable team notices, stock alerts, test changes and member-specific reminders." />
      {canWrite ? (
        <section className="portalPanel portalCreatePanel">
          <div className="portalPanelHead"><span>NEW NOTIFICATION</span><small>LEAD / ADMIN</small></div>
          <form className="portalFormGrid" action={createNotificationAction}>
            <label><span>Title</span><input name="title" required /></label>
            <label><span>Kind</span><select name="kind"><option>info</option><option>warning</option><option>action</option><option>success</option></select></label>
            <label>
              <span>Recipient</span>
              <select name="memberId" defaultValue="">
                <option value="">All members</option>
                {members.filter((item) => String(item.status) === "active").map((item) => <option value={String(item.id)} key={String(item.id)}>{String(item.full_name || item.email)}</option>)}
              </select>
            </label>
            <label><span>Link</span><input name="href" placeholder="/portal/tasks" /></label>
            <label className="portalFormWide"><span>Message</span><textarea name="body" rows={3} /></label>
            <button className="portalPrimaryButton" type="submit">PUBLISH NOTICE →</button>
          </form>
        </section>
      ) : null}
      {notifications.length ? (
        <div className="portalNotificationList">
          {notifications.map((item) => (
            <article className={item.read_at ? "read" : ""} key={String(item.id)}>
              <span>{String(item.kind).toUpperCase()}</span>
              <div><h3>{String(item.title)}</h3><p>{String(item.body || "")}</p><small>{String(item.created_at)}</small></div>
              {item.href ? <a href={String(item.href)}>OPEN →</a> : null}
              {!item.read_at ? (
                <form action={markNotificationReadAction}>
                  <input type="hidden" name="id" value={String(item.id)} />
                  <button type="submit">MARK READ</button>
                </form>
              ) : <small>READ</small>}
            </article>
          ))}
        </div>
      ) : <PortalEmpty title="No notifications." text="You are all caught up." />}
    </>
  );
}
