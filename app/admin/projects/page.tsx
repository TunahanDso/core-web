import { getAdminIdentity } from "@/lib/cms/auth";
import { listProjects } from "@/lib/cms/db";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const [projects, identity] = await Promise.all([
    listProjects(),
    getAdminIdentity(),
  ]);

  return (
    <main className="admin">
      <div className="adminTopline">
        <div>
          <a className="adminBreadcrumb" href="/admin">CORE CONTROL / ADMIN</a>
          <p className="eyebrow">PROJECT PORTFOLIO · LIVE D1</p>
        </div>
        <span className="cmsHealth online">
          <i />
          {identity.authenticated ? "WRITE ENABLED" : "READ ONLY"}
        </span>
      </div>

      <h1>Projects</h1>
      <p>
        Project records are read directly from production D1. Every mutation
        requires a verified Cloudflare Access JWT and writes an audit event.
      </p>

      {projects.length === 0 ? (
        <section className="emptyState">
          <span>DATABASE ONLINE</span>
          <h2>No project records yet.</h2>
          <p>
            Return to the admin dashboard and load the prepared showcase seed.
          </p>
        </section>
      ) : (
        <div className="adminProjectList">
          {projects.map((project) => (
            <article className="adminProjectRow" key={project.id}>
              <div className="adminProjectIdentity">
                <span>{project.domain ?? "UNASSIGNED"}</span>
                <h2>{project.titleTr || project.titleEn || project.slug}</h2>
                <small>{project.slug}</small>
              </div>

              <div className="adminProjectProgress">
                <strong>{project.progress === null ? "—" : `${project.progress}%`}</strong>
                <span>PROGRESS</span>
              </div>

              <div className="adminProjectMeta">
                <span>{project.owner ?? "No owner metadata"}</span>
                <span>{project.status.toUpperCase()}</span>
                <a className="adminEditLink" href={`/admin/projects/${encodeURIComponent(project.id)}`}>
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
        <small>EVERY PROJECT UPDATE IS RECORDED IN AUDIT_LOG</small>
      </div>
    </main>
  );
}
