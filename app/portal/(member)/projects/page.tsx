import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { listProjects } from "@/lib/cms/db";
import {
  listPortalRepositories,
  listPortalResources,
  listPortalTasks,
} from "@/lib/portal/db";
import { listPortalProjectRegistry } from "@/lib/portal/control";
import { requirePortalMember } from "@/lib/portal/auth";
import { canAccessPortalTeam } from "@/lib/portal/governance";
import { cmsStatusLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalProjectsPage() {
  const member = await requirePortalMember();
  const [publicProjects, registry, tasks, resources, repositories] = await Promise.all([
    listProjects(),
    listPortalProjectRegistry(),
    listPortalTasks(500),
    listPortalResources(),
    listPortalRepositories(),
  ]);

  const internalProjects = [];
  for (const project of registry) {
    const visibility = String(project.visibility || "team");
    const teamCode = String(project.team_code || "");
    const allowed =
      member.role === "admin" ||
      visibility === "members" ||
      (visibility === "leads" && member.role === "lead") ||
      (visibility === "team" && Boolean(teamCode) && await canAccessPortalTeam(member,teamCode));
    if (allowed) internalProjects.push(project);
  }

  const internalSlugs = new Set(internalProjects.map((item) => String(item.slug)));
  const cards = [
    ...internalProjects.map((project) => ({
      id: "internal:" + String(project.slug),
      slug: String(project.slug),
      title: String(project.title),
      summary: String(project.summary || ""),
      domain: String(project.domain || project.team_name || "CORE"),
      owner: String(project.owner_name || "Sorumlu atanmadı"),
      status: String(project.status || "concept"),
      progress: Number(project.readiness || 0),
      internal: true,
      risk: String(project.risk_level || "medium"),
    })),
    ...publicProjects
      .filter((project) => !internalSlugs.has(project.slug))
      .map((project) => ({
        id: "cms:" + String(project.id),
        slug: project.slug,
        title: project.titleTr || project.slug,
        summary: project.summaryTr || "",
        domain: project.domain || "CORE",
        owner: project.owner || "Sorumlu atanmadı",
        status: project.status,
        progress: project.progress ?? 0,
        internal: false,
        risk: "public",
      })),
  ];

  return (
    <>
      <PortalPageHeader
        code="PJ / PROJELER"
        title="Proje Çalışma Alanları"
        lead="Internal mühendislik projeleri ile vitrin projeleri tek görünümde; erişim kontrollü registry kayıtları yalnızca yetkili üyelerde görünür."
        action={<a className="portalOutlineButton" href="/portal/project-map">PROJECT MAP →</a>}
      />

      {cards.length ? (
        <section className="portalProjectGrid">
          {cards.map((project) => {
            const projectTasks = tasks.filter((task) => String(task.project_slug || "") === project.slug);
            const openTasks = projectTasks.filter((task) => String(task.status) !== "done").length;
            const projectResources = resources.filter((item) => String(item.project_slug || "") === project.slug).length;
            const projectRepos = repositories.filter((item) => String(item.project_slug || "") === project.slug).length;

            return (
              <a className="portalProjectCard" href={"/portal/projects/" + encodeURIComponent(project.slug)} key={project.id}>
                <header>
                  <span>{project.domain}</span>
                  <b>{project.internal ? String(project.status).toUpperCase() : cmsStatusLabel(project.status)}</b>
                </header>
                <div className="portalProjectSourceTag">{project.internal ? "INTERNAL CONTROL PLANE" : "PUBLIC CMS"}</div>
                <h2>{project.title}</h2>
                <p>{project.summary || "Proje açıklaması henüz eklenmedi."}</p>
                <div className="portalProjectProgress">
                  <div><span>{project.internal ? "READINESS" : "İLERLEME"}</span><strong>{project.progress}%</strong></div>
                  <i><b style={{ width: Math.max(0, Math.min(100, project.progress)) + "%" }} /></i>
                </div>
                <div className="portalProjectFacts">
                  <div><b>{openTasks}</b><span>açık görev</span></div>
                  <div><b>{projectResources}</b><span>kaynak</span></div>
                  <div><b>{projectRepos}</b><span>repo</span></div>
                </div>
                <footer>
                  <span>{project.owner}</span>
                  <b>{project.internal ? project.risk.toUpperCase() + " RISK" : "ÇALIŞMA ALANINI AÇ →"}</b>
                </footer>
              </a>
            );
          })}
        </section>
      ) : (
        <PortalEmpty title="Erişilebilir proje kaydı bulunamadı." text="Control Plane veya vitrin CMS içindeki proje kayıtları burada çalışma alanına dönüşür." />
      )}
    </>
  );
}
