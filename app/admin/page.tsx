import { applyShowcaseSeedAction } from "@/app/admin/actions";
import { initializePortalAction } from "@/app/admin/portal-actions";
import { getAdminIdentity } from "@/lib/cms/auth";
import { getCmsStats } from "@/lib/cms/db";
import { portalBootstrapStatus } from "@/lib/portal/bootstrap";

export const dynamic = "force-dynamic";

const publicModules = [
  ["Projects", "Portfolio, integrations, ownership and completion.", "/admin/projects", true, "PJ"],
  ["Competitions", "Field targets, dates, locations and planning state.", "/admin/competitions", true, "CP"],
  ["Content", "TR/EN public pages, hero copy and SEO.", "/admin/content", true, "CT"],
  ["Publications", "Research reports, papers and technical releases.", "/admin/publications", true, "PB"],
  ["Media", "Images, project media and public files in R2.", "/admin/media", true, "MD"],
  ["Team Showcase", "Domain teams, services and public profiles.", "/admin/team", false, "TM"],
  ["Settings", "Navigation, homepage, metadata and site controls.", "/admin/settings", true, "ST"],
] as const;

const portalModules = [
  ["Members & Access", "Issue invitations, roles and member lifecycle.", "/admin/members", true, "ID"],
  ["Open Portal", "Enter the student engineering workspace.", "/portal", true, "↗"],
  ["Tasks", "Project and work queue inside the portal.", "/portal/tasks", true, "PM"],
  ["Knowledge", "Library, documents and archive.", "/portal/library", true, "KB"],
  ["Inventory", "Components, tools and low-stock state.", "/portal/inventory", true, "IV"],
  ["Vehicle Live", "Read-only telemetry and operational awareness.", "/portal/ops", true, "OP"],
] as const;

export default async function Admin({
  searchParams,
}: {
  searchParams?: Promise<{
    seed?: "applied" | "failed";
    seedError?: string;
    portal?: "ready" | "failed";
    portalError?: string;
  }>;
}) {
  const [stats, identity, portal, query] = await Promise.all([
    getCmsStats(),
    getAdminIdentity(),
    portalBootstrapStatus(),
    searchParams ?? Promise.resolve<{
      seed?: "applied" | "failed";
      seedError?: string;
      portal?: "ready" | "failed";
      portalError?: string;
    }>({}),
  ]);

  const databaseOnline = stats.connection === "online";
  const writeEnabled = databaseOnline && identity.authenticated;

  return (
    <main className="admin adminLight adminControlCenter">
      <div className="adminTopline">
        <div>
          <p className="eyebrow">YTÜ CORE · CONTROL CENTER</p>
          <span className="adminSubtle">Public website + internal student operations</span>
        </div>
        <div className="adminQuickActions">
          <a href="/tr">PUBLIC SITE ↗</a>
          <a href="/portal">OPEN PORTAL →</a>
          <span className={"cmsHealth " + (databaseOnline ? "online" : "offline")}><i />D1 {databaseOnline ? "ONLINE" : stats.connection.toUpperCase()}</span>
        </div>
      </div>

      <section className="adminWelcome">
        <div>
          <span>CONTROL / 01</span>
          <h1>Everything CORE runs,<br />in one calm place.</h1>
          <p>
            Manage the public showcase and the private student engineering
            workspace without mixing them with vehicle command authority.
          </p>
        </div>
        <div className="adminIdentityCard">
          <span>AUTHENTICATED ADMIN</span>
          <b>{identity.authenticated ? identity.email || "Cloudflare Access" : "Access not verified"}</b>
          <small>{writeEnabled ? "WRITE AUTHORITY ENABLED" : "READ ONLY"}</small>
        </div>
      </section>

      <section className="adminModernStats">
        <article><span>PUBLIC CONTENT</span><b>{stats.contentCount}</b><small>{stats.pageCount} pages</small></article>
        <article><span>PROJECTS</span><b>{stats.projectCount}</b><small>showcase records</small></article>
        <article><span>COMPETITIONS</span><b>{stats.competitionCount}</b><small>field targets</small></article>
        <article><span>MEMBERS</span><b>{portal.memberCount}</b><small>{portal.ready ? "portal records" : "portal not initialized"}</small></article>
        <article><span>OPEN TASK ROOTS</span><b>{portal.taskCount}</b><small>internal work items</small></article>
        <article><span>KNOWLEDGE</span><b>{portal.resourceCount}</b><small>internal resources</small></article>
        <article><span>MEDIA</span><b>{stats.mediaCount}</b><small>R2 records</small></article>
        <article><span>AUDIT</span><b>{stats.auditCount}</b><small>public CMS events</small></article>
      </section>

      <section className="adminHealthBar">
        <span><b>DB</b> core-web-cms · {databaseOnline ? "connected" : "unavailable"}</span>
        <span><b>MEDIA</b> {stats.mediaBinding ? "core-web-media · bound" : "unavailable"}</span>
        <span><b>ACCESS</b> {identity.authenticated ? "JWT VERIFIED" : "NOT VERIFIED"}</span>
        <span><b>PORTAL</b> {portal.ready ? "SCHEMA READY" : "INITIALIZATION REQUIRED"}</span>
        <span><b>COMMAND PLANE</b> ISOLATED</span>
      </section>

      {query.seed === "applied" ? <div className="cmsSuccess"><b>Public content synchronized.</b><span>D1 and audit log updated.</span></div> : null}
      {query.seed === "failed" ? <div className="cmsWarning"><b>Public content sync failed.</b><span>{query.seedError || "D1 operation rolled back."}</span></div> : null}
      {query.portal === "ready" ? <div className="cmsSuccess"><b>CORE Portal foundation initialized.</b><span>Member access and collaboration tables are ready.</span></div> : null}
      {query.portal === "failed" ? <div className="cmsWarning"><b>Portal initialization failed.</b><span>{query.portalError || "Check D1 runtime logs."}</span></div> : null}

      {writeEnabled && !portal.ready ? (
        <section className="adminSetupPanel">
          <div>
            <span>ONE-TIME FOUNDATION</span>
            <h2>Initialize the internal CORE Portal</h2>
            <p>Creates invitation-based member access, sessions, tasks, knowledge, repository registry, inventory, chat, mail, calendar, notifications, vehicle telemetry and security-device foundations.</p>
          </div>
          <form action={initializePortalAction}>
            <button className="adminModernPrimary" type="submit">INITIALIZE PORTAL →</button>
          </form>
        </section>
      ) : null}

      {writeEnabled && (stats.contentCount === 0 || stats.pageCount < 7) ? (
        <section className="adminSetupPanel secondary">
          <div>
            <span>PUBLIC CONTENT</span>
            <h2>{stats.contentCount === 0 ? "Load the public showcase" : "Synchronize public page copy"}</h2>
            <p>Idempotently synchronizes project, competition and localized page records.</p>
          </div>
          <form action={applyShowcaseSeedAction}>
            <button className="adminModernSecondary" type="submit">{stats.contentCount === 0 ? "LOAD SHOWCASE →" : "SYNC PAGES →"}</button>
          </form>
        </section>
      ) : null}

      <section className="adminModuleSection">
        <div className="adminSectionTitle"><span>PUBLIC WEBSITE</span><h2>What the world sees.</h2><p>Editorial and showcase control for ytucore.com.</p></div>
        <div className="adminModernGrid">
          {publicModules.map(([name, description, href, enabled, code]) => (
            <a className={"adminModernCard " + (enabled ? "" : "future")} href={enabled ? href : "#"} key={name}>
              <span>{code}</span><h3>{name}</h3><p>{description}</p><small>{enabled ? "OPEN →" : "FOUNDATION NEXT"}</small>
            </a>
          ))}
        </div>
      </section>

      <section className="adminModuleSection portalAdminSection">
        <div className="adminSectionTitle"><span>INTERNAL PORTAL</span><h2>Where the team works.</h2><p>Identity, engineering memory, collaboration, inventory and field visibility.</p></div>
        <div className="adminModernGrid">
          {portalModules.map(([name, description, href, enabled, code]) => (
            <a className={"adminModernCard " + (!portal.ready && name !== "Open Portal" ? "future" : "")} href={portal.ready || name === "Open Portal" ? href : "#"} key={name}>
              <span>{code}</span><h3>{name}</h3><p>{description}</p><small>{portal.ready || name === "Open Portal" ? "OPEN →" : "INITIALIZE FIRST"}</small>
            </a>
          ))}
        </div>
      </section>

      <section className="adminBoundary">
        <span>SECURITY ARCHITECTURE</span>
        <div><b>PUBLIC CMS</b><i>≠</i><b>MEMBER PORTAL</b><i>≠</i><b>VEHICLE COMMAND AUTHORITY</b></div>
        <p>Telemetry may flow into the portal for observation. Command and mission authority remain a separate security boundary.</p>
      </section>
    </main>
  );
}
