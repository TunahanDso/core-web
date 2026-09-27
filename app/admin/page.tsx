import { getCmsStats } from "@/lib/cms/db";

export const dynamic = "force-dynamic";

const modules = [
  ["Projects", "Products, integrations, status and completion percentage", "/admin/projects", true],
  ["Competitions", "Target competitions, official dates and planning state", "#", false],
  ["Content", "TR/EN pages, announcements and institutional copy", "#", false],
  ["Publications", "Research reports, papers and technical releases", "#", false],
  ["Media", "Images, project media, documents and public assets", "#", false],
  ["Team", "Domain teams, shared service units and public profiles", "#", false],
  ["Operations", "Read-only public status and approved telemetry exposure", "#", false],
  ["Settings", "Homepage, navigation, SEO and publication settings", "#", false],
] as const;

export default async function Admin() {
  const stats = await getCmsStats();
  const databaseOnline = stats.connection === "online";

  return (
    <main className="admin">
      <div className="adminTopline">
        <p className="eyebrow">CORE CONTROL · PUBLIC CMS</p>
        <span className={`cmsHealth ${databaseOnline ? "online" : "offline"}`}>
          <i />
          D1 {databaseOnline ? "ONLINE" : stats.connection.toUpperCase()}
        </span>
      </div>

      <h1>Site Administration</h1>
      <p>
        Live control surface for the public YTÜ CORE website. The database is
        now connected in read-only mode while authentication is being completed.
        Vehicle command authority remains isolated from this CMS.
      </p>

      <div className="adminStats">
        <div>
          <strong>{stats.contentCount}</strong>
          <span>CONTENT ITEMS</span>
        </div>
        <div>
          <strong>{stats.projectCount}</strong>
          <span>PROJECTS</span>
        </div>
        <div>
          <strong>{stats.competitionCount}</strong>
          <span>COMPETITIONS</span>
        </div>
        <div>
          <strong>{stats.mediaCount}</strong>
          <span>MEDIA RECORDS</span>
        </div>
        <div>
          <strong>{stats.auditCount}</strong>
          <span>AUDIT EVENTS</span>
        </div>
      </div>

      <div className="bindingStrip">
        <span>
          <b>DB</b> {databaseOnline ? "core-web-cms · connected" : "not available"}
        </span>
        <span>
          <b>MEDIA</b> {stats.mediaBinding ? "core-web-media · bound" : "not available"}
        </span>
        <span>
          <b>MODE</b> READ ONLY
        </span>
      </div>

      {stats.error ? (
        <div className="cmsWarning">
          <b>CMS connection notice</b>
          <span>{stats.error}</span>
        </div>
      ) : null}

      <div className="adminGrid">
        {modules.map(([name, description, href, enabled]) => (
          <a
            className={`adminCard ${enabled ? "enabled" : "disabled"}`}
            href={href}
            key={name}
            aria-disabled={!enabled}
          >
            <span>{enabled ? "LIVE MODULE" : "NEXT MODULE"}</span>
            <h2>{name}</h2>
            <p>{description}</p>
            <small>{enabled ? "OPEN →" : "READ LAYER PENDING"}</small>
          </a>
        ))}
      </div>

      <div className="terminal">
        <span>SECURITY BOUNDARY</span>
        <b>Writes remain disabled until Cloudflare Access is configured</b>
        <small>PUBLIC CMS ≠ CORE OPS ≠ VEHICLE COMMAND AUTHORITY</small>
      </div>

      <a className="adminBack" href="/">
        ← Return to public site
      </a>
    </main>
  );
}
