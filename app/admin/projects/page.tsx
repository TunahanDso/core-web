import { listProjects } from "@/lib/cms/db";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const projects = await listProjects();

  return (
    <main className="admin">
      <div className="adminTopline">
        <div>
          <a className="adminBreadcrumb" href="/admin">
            CORE CONTROL / ADMIN
          </a>
          <p className="eyebrow">PROJECT PORTFOLIO · LIVE D1</p>
        </div>
        <span className="cmsHealth online">
          <i />
          READ ONLY
        </span>
      </div>

      <h1>Projects</h1>
      <p>
        Project records are being read directly from the production D1 database.
        Editing, publishing and deletion will be enabled after Cloudflare Access
        protects the administration surface.
      </p>

      {projects.length === 0 ? (
        <section className="emptyState">
          <span>DATABASE ONLINE</span>
          <h2>No project records yet.</h2>
          <p>
            The schema is live, but the showcase portfolio has not been seeded
            into D1 yet. The public website is still using its current source
            data until CMS migration is completed.
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
                <strong>
                  {project.progress === null ? "—" : `${project.progress}%`}
                </strong>
                <span>PROGRESS</span>
              </div>

              <div className="adminProjectMeta">
                <span>{project.owner ?? "No owner metadata"}</span>
                <span>{project.status.toUpperCase()}</span>
                <span>{project.updatedAt}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="terminal">
        <span>WRITE AUTHORITY</span>
        <b>Disabled</b>
        <small>CLOUDFLARE ACCESS MUST BE ACTIVE BEFORE MUTATIONS ARE EXPOSED</small>
      </div>
    </main>
  );
}
