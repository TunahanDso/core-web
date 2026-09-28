import { getAdminIdentity } from "@/lib/cms/auth";
import { listCompetitions } from "@/lib/cms/db";

export const dynamic = "force-dynamic";

const labels = {
  confirmed: "CONFIRMED",
  target: "TARGET",
  evaluation: "EVALUATION",
} as const;

export default async function AdminCompetitionsPage() {
  const [competitions, identity] = await Promise.all([
    listCompetitions(),
    getAdminIdentity(),
  ]);

  return (
    <main className="admin">
      <div className="adminTopline">
        <div>
          <a className="adminBreadcrumb" href="/admin">CORE CONTROL / ADMIN</a>
          <p className="eyebrow">COMPETITIONS · LIVE D1</p>
        </div>
        <span className="cmsHealth online">
          <i />
          {identity.authenticated ? "WRITE ENABLED" : "READ ONLY"}
        </span>
      </div>

      <h1>Competitions</h1>
      <p>
        Competition and field-target records are read directly from production
        D1. Dates, locations, planning state and publication status can be
        maintained here.
      </p>

      {competitions.length === 0 ? (
        <section className="emptyState">
          <span>DATABASE ONLINE</span>
          <h2>No competition records yet.</h2>
          <p>Return to the admin dashboard and load the showcase seed.</p>
        </section>
      ) : (
        <div className="adminCompetitionList">
          {competitions.map((competition) => (
            <article className="adminCompetitionRow" key={competition.id}>
              <div className="adminCompetitionIdentity">
                <span>{competition.domain ?? "UNASSIGNED"}</span>
                <h2>{competition.titleTr || competition.titleEn || competition.slug}</h2>
                <small>{competition.slug}</small>
              </div>

              <div className="adminCompetitionTarget">
                <strong>{labels[competition.targetStatus]}</strong>
                <span>{competition.dateTr || "DATE TBA"}</span>
              </div>

              <div className="adminCompetitionMeta">
                <span>{competition.locationTr || "Location pending"}</span>
                <span>{competition.status.toUpperCase()}</span>
                <a
                  className="adminEditLink"
                  href={`/admin/competitions/${encodeURIComponent(competition.id)}`}
                >
                  EDIT →
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="terminal">
        <span>WRITE AUTHORITY</span>
        <b>{identity.authenticated ? "Cloudflare Access JWT verified" : "Disabled"}</b>
        <small>EVERY COMPETITION UPDATE IS RECORDED IN AUDIT_LOG</small>
      </div>
    </main>
  );
}
