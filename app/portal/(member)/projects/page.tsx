import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { listProjects } from "@/lib/cms/db";
import {
  listPortalRepositories,
  listPortalResources,
  listPortalTasks,
} from "@/lib/portal/db";
import { cmsStatusLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalProjectsPage() {
  const [projects, tasks, resources, repositories] = await Promise.all([
    listProjects(),
    listPortalTasks(500),
    listPortalResources(),
    listPortalRepositories(),
  ]);

  return (
    <>
      <PortalPageHeader
        code="PJ / PROJELER"
        title="Proje Çalışma Alanları"
        lead="Her CORE projesi kendi görevlarını, teknik bilgisini ve repo bağlantılarını tek bir çalışma alanında toplar."
      />

      {projects.length ? (
        <section className="portalProjectGrid">
          {projects.map((project) => {
            const projectTasks = tasks.filter((task) => String(task.project_slug || "") === project.slug);
            const openTasks = projectTasks.filter((task) => String(task.status) !== "done").length;
            const projectResources = resources.filter((item) => String(item.project_slug || "") === project.slug).length;
            const projectRepos = repositories.filter((item) => String(item.project_slug || "") === project.slug).length;
            const progress = project.progress ?? 0;

            return (
              <a className="portalProjectCard" href={"/portal/projects/" + encodeURIComponent(project.slug)} key={project.id}>
                <header>
                  <span>{project.domain || "CORE"}</span>
                  <b>{cmsStatusLabel(project.status)}</b>
                </header>
                <h2>{project.titleTr || project.slug}</h2>
                <p>{project.summaryTr || "Proje açıklaması henüz eklenmedi."}</p>
                <div className="portalProjectProgress">
                  <div><span>İLERLEME</span><strong>{progress}%</strong></div>
                  <i><b style={{ width: Math.max(0, Math.min(100, progress)) + "%" }} /></i>
                </div>
                <div className="portalProjectFacts">
                  <div><b>{openTasks}</b><span>açık görev</span></div>
                  <div><b>{projectResources}</b><span>kaynak</span></div>
                  <div><b>{projectRepos}</b><span>repo</span></div>
                </div>
                <footer>
                  <span>{project.owner || "Sorumlu atanmadı"}</span>
                  <b>ÇALIŞMA ALANINI AÇ →</b>
                </footer>
              </a>
            );
          })}
        </section>
      ) : (
        <PortalEmpty title="Proje kaydı bulunamadı." text="Vitrin CMS içindeki proje kayıtları burada çalışma alanına dönüşür." />
      )}
    </>
  );
}
