import { PortalPageHeader } from "@/components/portal/PortalPage";
import { getPortalAnalytics, listPortalInventory, listPortalTasks } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalAnalyticsPage() {
  const [analytics, tasks, inventory] = await Promise.all([
    getPortalAnalytics(),
    listPortalTasks(),
    listPortalInventory(),
  ]);
  const totalTasks = Number(analytics.tasks_total || 0);
  const doneTasks = Number(analytics.tasks_done || 0);
  const completion = totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0;
  const low = inventory.filter((item) => Number(item.available_quantity) <= Number(item.minimum_quantity)).length;

  return (
    <>
      <PortalPageHeader code="AN / ANALYTICS" title="CORE Analytics" lead="Operational signals for people, work, knowledge, hardware and communication. No vanity metrics required." />
      <section className="portalAnalyticsGrid">
        <article><span>MEMBERS</span><b>{String(analytics.members_active || 0)}</b><small>{String(analytics.members_total || 0)} total records</small></article>
        <article><span>TASK COMPLETION</span><b>{completion}%</b><small>{doneTasks} / {totalTasks} done</small></article>
        <article><span>KNOWLEDGE</span><b>{String(analytics.resources_total || 0)}</b><small>indexed resources</small></article>
        <article><span>INVENTORY</span><b>{String(analytics.inventory_total || 0)}</b><small>{low} low-stock items</small></article>
        <article><span>CHAT</span><b>{String(analytics.messages_total || 0)}</b><small>messages retained</small></article>
        <article><span>ACTIVITY</span><b>{String(analytics.portal_activity_total || 0)}</b><small>portal events</small></article>
      </section>
      <section className="portalPanel">
        <div className="portalPanelHead"><span>WORK DISTRIBUTION</span><small>LIVE D1</small></div>
        <div className="portalStatusBars">
          {["backlog","todo","doing","review","blocked","done"].map((status) => {
            const count = tasks.filter((task) => String(task.status) === status).length;
            const width = totalTasks ? Math.max(3, Math.round(count / totalTasks * 100)) : 0;
            return <div key={status}><span>{status.toUpperCase()}</span><i><b style={{ width: width + "%" }} /></i><strong>{count}</strong></div>;
          })}
        </div>
      </section>
    </>
  );
}
