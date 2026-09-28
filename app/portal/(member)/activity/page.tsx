import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { listPortalActivity } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalActivityPage() {
  const activity = await listPortalActivity(150);
  return (
    <>
      <PortalPageHeader code="AC / ACTIVITY" title="Activity Trail" lead="A human-readable operational trail for account, task, resource, inventory and coordination events." />
      {activity.length ? (
        <div className="portalActivityTable">
          {activity.map((item) => (
            <article key={String(item.id)}>
              <span>{String(item.created_at)}</span><b>{String(item.action)}</b>
              <div>{String(item.actor)}</div><small>{String(item.entity_type)} / {String(item.entity_id)}</small>
            </article>
          ))}
        </div>
      ) : <PortalEmpty title="No portal activity yet." text="Operational events will accumulate here as members work." />}
    </>
  );
}
