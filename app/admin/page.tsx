import { applyShowcaseSeedAction } from "@/app/admin/actions";
import { getAdminIdentity } from "@/lib/cms/auth";
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

export default async function Admin({
  searchParams,
}: {
  searchParams?: Promise<{ seed?: string }>;
}) {
  const [stats, identity, query] = await Promise.all([
    getCmsStats(),
    getAdminIdentity(),
    searchParams ?? Promise.resolve<{ seed?: string }>({}),
  ]);
  const databaseOnline = stats.connection === "online";
  const writeEnabled = databaseOnline && identity.authenticated;

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
        Live control surface for the public YTÜ CORE website. Cloudflare Access
        identity verification is active and authenticated CMS mutations are now
        available. Vehicle command authority remains isolated from this CMS.
      </p>

      <div className="adminStats">
        <div><strong>{stats.contentCount}</strong><span>CONTENT ITEMS</span></div>
        <div><strong>{stats.projectCount}</strong><span>PROJECTS</span></div>
        <div><strong>{stats.competitionCount}</strong><span>COMPETITIONS</span></div>
        <div><strong>{stats.mediaCount}</strong><span>MEDIA RECORDS</span></div>
        <div><strong>{stats.auditCount}</strong><span>AUDIT EVENTS</span></div>
      </div>

      <div className="bindingStrip">
        <span><b>DB</b> {databaseOnline ? "core-web-cms · connected" : "not available"}</span>
        <span><b>MEDIA</b> {stats.mediaBinding ? "core-web-media · bound" : "not available"}</span>
        <span>
          <b>ACCESS</b>{" "}
          {identity.authenticated
            ? `JWT VERIFIED${identity.email ? ` · ${identity.email}` : ""}`
            : identity.configured
              ? "JWT NOT VERIFIED"
              : "RUNTIME CONFIG REQUIRED"}
        </span>
        <span><b>MODE</b> {writeEnabled ? "AUTHENTICATED WRITE" : "READ ONLY"}</span>
      </div>

      {query.seed === "applied" ? (
        <div className="cmsSuccess">
          <b>Showcase seed applied.</b>
          <span>D1 content has been synchronized and an audit event was recorded.</span>
        </div>
      ) : null}

      {stats.error ? (
        <div className="cmsWarning">
          <b>CMS connection notice</b>
          <span>{stats.error}</span>
        </div>
      ) : null}

      {writeEnabled && stats.contentCount === 0 ? (
        <section className="cmsActionPanel">
          <div>
            <span>INITIALIZE CONTENT</span>
            <h2>Load the CORE showcase into D1</h2>
            <p>
              Inserts the prepared 10 projects and 10 competition targets with
              TR/EN localizations. The operation is idempotent and records the
              authenticated Access identity in the audit log.
            </p>
          </div>
          <form action={applyShowcaseSeedAction}>
            <button className="adminPrimaryButton" type="submit">
              LOAD SHOWCASE SEED →
            </button>
          </form>
        </section>
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
        <b>
          {writeEnabled
            ? "Cloudflare Access JWT verified · authenticated CMS writes enabled"
            : "CMS mutations remain disabled without a verified Access identity"}
        </b>
        <small>PUBLIC CMS ≠ CORE OPS ≠ VEHICLE COMMAND AUTHORITY</small>
      </div>

      <a className="adminBack" href="/">← Return to public site</a>
    </main>
  );
}
