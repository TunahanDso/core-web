import { portalModuleCards } from "@/lib/portal/modules";
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
          <h1>Good engineering<br />needs a memory.</h1>
          <p>
            One operating surface for the work students usually scatter across
            drives, chats, spreadsheets, repositories and notebooks.
          </p>
        </div>
        <div className="portalHeroStatus">
          <span>SYSTEM STATUS</span>
          <b>PORTAL ONLINE</b>
          <small>PUBLIC CMS SEPARATE · VEHICLE COMMAND ISOLATED</small>
        </div>
      </section>

      <section className="portalMetrics">
        <article><span>ACTIVE MEMBERS</span><b>{metrics.members}</b><small>student network</small></article>
        <article><span>OPEN TASKS</span><b>{metrics.openTasks}</b><small>needs attention</small></article>
        <article><span>KNOWLEDGE ITEMS</span><b>{metrics.resources}</b><small>library + archive</small></article>
        <article><span>LOW STOCK</span><b>{metrics.lowStock}</b><small>inventory alerts</small></article>
        <article><span>NOTIFICATIONS</span><b>{metrics.unread}</b><small>unread</small></article>
        <article><span>VEHICLES LIVE</span><b>{metrics.vehiclesOnline}</b><small>read-only telemetry</small></article>
      </section>

      <section className="portalSection">
        <div className="portalSectionHead">
          <div><span>MODULE MAP</span><h2>Everything CORE needs to keep moving.</h2></div>
          <p>Each module owns one kind of operational memory. Cross-links keep projects, hardware, people and evidence connected.</p>
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
          <div className="portalPanelHead"><span>WORK QUEUE</span><a href="/portal/tasks">All tasks →</a></div>
          <div className="portalCompactList">
            {tasks.length ? tasks.map((task) => (
              <div key={String(task.id)}>
                <span className={"portalPriority " + String(task.priority)}>{String(task.priority).toUpperCase()}</span>
                <div><b>{String(task.title)}</b><small>{String(task.project_slug || task.team_code || "CORE")}</small></div>
                <em>{String(task.status).toUpperCase()}</em>
              </div>
            )) : <p className="portalMuted">No tasks yet. Create the first engineering work item.</p>}
          </div>
        </div>

        <div className="portalPanel">
          <div className="portalPanelHead"><span>VEHICLE LAYER</span><a href="/portal/ops">Live view →</a></div>
          <div className="portalCompactList">
            {vehicles.map((vehicle) => (
              <div key={String(vehicle.id)}>
                <span className={"portalVehicleDot " + String(vehicle.status)} />
                <div><b>{String(vehicle.name)}</b><small>{String(vehicle.domain)}</small></div>
                <em>{String(vehicle.status).toUpperCase()}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="portalPanel portalActivityPanel">
        <div className="portalPanelHead"><span>RECENT ACTIVITY</span><a href="/portal/activity">Full trail →</a></div>
        <div className="portalActivityList">
          {activity.length ? activity.map((item) => (
            <div key={String(item.id)}>
              <span>{String(item.action)}</span>
              <b>{String(item.actor)}</b>
              <small>{String(item.created_at)}</small>
            </div>
          )) : <p className="portalMuted">Activity will appear as the team starts using the portal.</p>}
        </div>
      </section>
    </>
  );
}
