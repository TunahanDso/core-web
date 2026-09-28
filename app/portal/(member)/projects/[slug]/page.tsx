import { PortalPageHeader } from "@/components/portal/PortalPage";
import { createTaskAction } from "@/app/portal/actions";
import { listProjects } from "@/lib/cms/db";
import { getPortalProjectWorkspace, listPortalMembers } from "@/lib/portal/db";
import { portalPriorityLabel, portalTaskStatusLabel, portalResourceKindLabel } from "@/lib/portal/labels";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortalProjectWorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const projects = await listProjects();
  const project = projects.find((item) => item.slug === decodeURIComponent(slug));
  if (!project) notFound();

  const [workspace, members] = await Promise.all([
    getPortalProjectWorkspace(project.slug),
    listPortalMembers(),
  ]);
  const activeMembers = members.filter((member) => String(member.status) === "active");
  const openTasks = workspace.tasks.filter((task) => String(task.status) !== "done");

  return (
    <>
      <PortalPageHeader
        code={(project.domain || "CORE") + " / " + project.slug.toUpperCase()}
        title={project.titleTr || project.slug}
        lead={project.summaryTr || "Bu proje için iç çalışma alanı."}
        action={<a className="portalOutlineButton" href={"/tr/projects/" + project.slug} target="_blank">VİTRİNDE AÇ ↗</a>}
      />

      <section className="portalProjectOverview">
        <article>
          <span>İLERLEME</span>
          <b>{project.progress ?? 0}%</b>
          <i><em style={{ width: (project.progress ?? 0) + "%" }} /></i>
        </article>
        <article><span>AÇIK GÖREV</span><b>{openTasks.length}</b><small>{workspace.tasks.length} toplam</small></article>
        <article><span>BİLGİ KAYDI</span><b>{workspace.resources.length}</b><small>doküman / PCB / veri</small></article>
        <article><span>REPO</span><b>{workspace.repositories.length}</b><small>kod & entegrasyon</small></article>
        <article><span>SORUMLU</span><b className="text">{project.owner || "Atanmadı"}</b><small>{project.domain || "CORE"}</small></article>
      </section>

      <section className="portalSplit portalProjectWork">
        <div className="portalPanel">
          <div className="portalPanelHead"><span>AKTİF GÖREVLER</span><a href="/portal/tasks">Tüm görevler →</a></div>
          <div className="portalProfessionalList">
            {openTasks.length ? openTasks.slice(0, 12).map((task) => (
              <a href={"/portal/tasks/" + encodeURIComponent(String(task.id))} key={String(task.id)}>
                <span className={"portalPriority " + String(task.priority)}>{portalPriorityLabel(String(task.priority))}</span>
                <div><b>{String(task.title)}</b><small>{String(task.assignee_name || "Atanmamış")}</small></div>
                <em>{portalTaskStatusLabel(String(task.status))}</em>
              </a>
            )) : <p className="portalMuted">Bu projede açık görev yok.</p>}
          </div>
        </div>

        <div className="portalPanel">
          <div className="portalPanelHead"><span>HIZLI GÖREV</span><small>{project.slug}</small></div>
          <form className="portalFormGrid compact" action={createTaskAction}>
            <input type="hidden" name="projectSlug" value={project.slug} />
            <label className="portalFormWide"><span>Görev başlığı</span><input name="title" required /></label>
            <label>
              <span>Öncelik</span>
              <select name="priority" defaultValue="medium">
                <option value="low">Düşük</option><option value="medium">Orta</option>
                <option value="high">Yüksek</option><option value="critical">Kritik</option>
              </select>
            </label>
            <label>
              <span>Sorumlu</span>
              <select name="assigneeId" defaultValue="">
                <option value="">Atanmamış</option>
                {activeMembers.map((member) => <option value={String(member.id)} key={String(member.id)}>{String(member.full_name || member.email)}</option>)}
              </select>
            </label>
            <label><span>Son tarih</span><input name="dueAt" type="datetime-local" /></label>
            <label><span>Takım</span><input name="teamCode" defaultValue={project.domain || ""} /></label>
            <label className="portalFormWide"><span>Açıklama</span><textarea name="description" rows={3} /></label>
            <button type="submit" className="portalPrimaryButton">GÖREV OLUŞTUR →</button>
          </form>
        </div>
      </section>

      <section className="portalProjectColumns">
        <div className="portalPanel">
          <div className="portalPanelHead"><span>TEKNİK KAYNAKLAR</span><a href="/portal/library">Kütüphane →</a></div>
          <div className="portalProfessionalList">
            {workspace.resources.length ? workspace.resources.slice(0, 12).map((item) => (
              <div key={String(item.id)}>
                <span>{portalResourceKindLabel(String(item.kind))}</span>
                <div><b>{String(item.title)}</b><small>{String(item.description || "")}</small></div>
                {item.external_url ? <a href={String(item.external_url)} target="_blank" rel="noreferrer">AÇ ↗</a> : <em>İNDEKS</em>}
              </div>
            )) : <p className="portalMuted">Bu projeye bağlı teknik kaynak henüz yok.</p>}
          </div>
        </div>

        <div className="portalPanel">
          <div className="portalPanelHead"><span>REPOLAR</span><a href="/portal/repositories">Repo servisi →</a></div>
          <div className="portalProfessionalList">
            {workspace.repositories.length ? workspace.repositories.map((repo) => (
              <a href={String(repo.repo_url)} target="_blank" rel="noreferrer" key={String(repo.id)}>
                <span>GIT</span>
                <div><b>{String(repo.name)}</b><small>{String(repo.default_branch || "main")} · {String(repo.visibility)}</small></div>
                <em>{String(repo.health || "unverified").toUpperCase()}</em>
              </a>
            )) : <p className="portalMuted">Bu projeye bağlı repo kaydı henüz yok.</p>}
          </div>
        </div>
      </section>
    </>
  );
}
