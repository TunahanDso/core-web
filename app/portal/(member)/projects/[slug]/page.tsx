import { notFound } from "next/navigation";
import { PortalPageHeader } from "@/components/portal/PortalPage";
import { createTaskAction } from "@/app/portal/actions";
import { listProjects } from "@/lib/cms/db";
import { getPortalProjectWorkspace, listPortalMembers } from "@/lib/portal/db";
import {
  getPortalProjectRegistry,
  listPortalVehicleProfiles,
} from "@/lib/portal/control";
import { requirePortalMember } from "@/lib/portal/auth";
import { canAccessPortalTeam } from "@/lib/portal/governance";
import { listPortalVaultFiles } from "@/lib/portal/vault";
import { listNativeRepositories } from "@/lib/portal/engineering-services";
import { portalPriorityLabel, portalTaskStatusLabel, portalResourceKindLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalProjectWorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const member = await requirePortalMember();
  const { slug: rawSlug } = await params;
  const projectSlug = decodeURIComponent(rawSlug);

  const [publicProjects, internal] = await Promise.all([
    listProjects(),
    getPortalProjectRegistry(projectSlug),
  ]);
  const publicProject = publicProjects.find((item) => item.slug === projectSlug);

  if (!publicProject && !internal) notFound();

  if (internal) {
    const visibility = String(internal.visibility || "team");
    const teamCode = String(internal.team_code || "");
    const allowed =
      member.role === "admin" ||
      visibility === "members" ||
      (visibility === "leads" && member.role === "lead") ||
      (visibility === "team" && Boolean(teamCode) && await canAccessPortalTeam(member,teamCode));
    if (!allowed) notFound();
  }

  const [workspace, members, vehicles, vaultFiles, nativeRepositories] = await Promise.all([
    getPortalProjectWorkspace(projectSlug),
    listPortalMembers(),
    listPortalVehicleProfiles(),
    listPortalVaultFiles({
      lifecycle: "active",
      limit: 300,
      viewer: {
        role: member.role,
        teams: internal?.team_code
          ? Array.from(new Set([...member.teams,String(internal.team_code)]))
          : member.teams,
      },
    }),
    listNativeRepositories(),
  ]);

  const activeMembers = members.filter((item) => String(item.status) === "active");
  const openTasks = workspace.tasks.filter((task) => String(task.status) !== "done");
  const projectVehicles = vehicles.filter((vehicle) => String(vehicle.project_slug || "") === projectSlug);
  const projectVault = vaultFiles.filter((file) => String(file.project_slug || "") === projectSlug);
  const projectNativeRepos = nativeRepositories.filter((repo) => String(repo.project_slug || "") === projectSlug);

  const title = String(internal?.title || publicProject?.titleTr || projectSlug);
  const summary = String(internal?.summary || publicProject?.summaryTr || "Bu proje için iç çalışma alanı.");
  const domain = String(internal?.domain || publicProject?.domain || "CORE");
  const teamCode = String(internal?.team_code || "");
  const owner = String(internal?.owner_name || publicProject?.owner || "Atanmadı");
  const readiness = Number(internal?.readiness ?? publicProject?.progress ?? 0);

  return (
    <>
      <PortalPageHeader
        code={(teamCode || domain || "CORE") + " / " + projectSlug.toUpperCase()}
        title={title}
        lead={summary}
        action={
          publicProject
            ? <a className="portalOutlineButton" href={"/tr/projects/" + publicProject.slug} target="_blank">VİTRİNDE AÇ ↗</a>
            : <a className="portalOutlineButton" href="/portal/project-map">PROJECT MAP →</a>
        }
      />

      <section className="portalProjectOverview">
        <article>
          <span>{internal ? "READINESS" : "İLERLEME"}</span>
          <b>{readiness}%</b>
          <i><em style={{ width: Math.max(0,Math.min(100,readiness)) + "%" }} /></i>
        </article>
        <article><span>AÇIK GÖREV</span><b>{openTasks.length}</b><small>{workspace.tasks.length} toplam</small></article>
        <article><span>VAULT</span><b>{projectVault.length}</b><small>revisioned engineering file</small></article>
        <article><span>ARAÇ</span><b>{projectVehicles.length}</b><small>registry profile</small></article>
        <article><span>REPO</span><b>{workspace.repositories.length + projectNativeRepos.length}</b><small>legacy + CORE native</small></article>
        <article><span>SORUMLU</span><b className="text">{owner}</b><small>{teamCode || domain}</small></article>
      </section>

      {internal ? (
        <section className="portalInternalProjectStrip">
          <div><span>STATUS</span><b>{String(internal.status).toUpperCase()}</b></div>
          <div><span>RISK</span><b className={String(internal.risk_level)}>{String(internal.risk_level).toUpperCase()}</b></div>
          <div><span>VISIBILITY</span><b>{String(internal.visibility).toUpperCase()}</b></div>
          <div><span>START</span><b>{String(internal.start_at || "—")}</b></div>
          <div><span>TARGET</span><b>{String(internal.target_at || "—")}</b></div>
        </section>
      ) : null}

      <section className="portalSplit portalProjectWork">
        <div className="portalPanel">
          <div className="portalPanelHead"><span>AKTİF GÖREVLER</span><a href={"/portal/tasks?project=" + encodeURIComponent(projectSlug)}>Tüm görevler →</a></div>
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
          <div className="portalPanelHead"><span>HIZLI GÖREV</span><small>{projectSlug}</small></div>
          <form className="portalFormGrid compact" action={createTaskAction}>
            <input type="hidden" name="projectSlug" value={projectSlug} />
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
                {activeMembers.map((item) => <option value={String(item.id)} key={String(item.id)}>{String(item.full_name || item.email)}</option>)}
              </select>
            </label>
            <label><span>Son tarih</span><input name="dueAt" type="datetime-local" /></label>
            <label><span>Takım</span><input name="teamCode" defaultValue={teamCode} /></label>
            <label className="portalFormWide"><span>Açıklama</span><textarea name="description" rows={3} /></label>
            <button type="submit" className="portalPrimaryButton">GÖREV OLUŞTUR →</button>
          </form>
        </div>
      </section>

      <section className="portalProjectColumns">
        <div className="portalPanel">
          <div className="portalPanelHead"><span>CORE VAULT</span><a href={"/portal/library?q=" + encodeURIComponent(projectSlug)}>Vault →</a></div>
          <div className="portalProfessionalList">
            {projectVault.length ? projectVault.slice(0, 12).map((file) => (
              <a href={"/portal/library/" + encodeURIComponent(String(file.id))} key={String(file.id)}>
                <span>{String(file.extension || file.kind).toUpperCase()}</span>
                <div><b>{String(file.title)}</b><small>R{String(file.revision)} · {String(file.approval_state)}</small></div>
                <em>{String(file.lifecycle_state).toUpperCase()}</em>
              </a>
            )) : workspace.resources.length ? workspace.resources.slice(0, 12).map((item) => (
              <div key={String(item.id)}>
                <span>{portalResourceKindLabel(String(item.kind))}</span>
                <div><b>{String(item.title)}</b><small>{String(item.description || "")}</small></div>
                {item.external_url ? <a href={String(item.external_url)} target="_blank" rel="noreferrer">AÇ ↗</a> : <em>LEGACY</em>}
              </div>
            )) : <p className="portalMuted">Bu projeye bağlı teknik dosya henüz yok.</p>}
          </div>
        </div>

        <div className="portalPanel">
          <div className="portalPanelHead"><span>ARAÇLAR</span><a href="/portal/ops">Vehicle registry →</a></div>
          <div className="portalProfessionalList">
            {projectVehicles.length ? projectVehicles.map((vehicle) => (
              <a href="/portal/ops" key={String(vehicle.id)}>
                <span>{String(vehicle.code)}</span>
                <div><b>{String(vehicle.name)}</b><small>{String(vehicle.platform_type || vehicle.domain || "")}</small></div>
                <em>{String(vehicle.lifecycle || vehicle.status).toUpperCase()}</em>
              </a>
            )) : <p className="portalMuted">Projeye bağlı araç kaydı yok.</p>}
          </div>
        </div>
      </section>

      <section className="portalProjectColumns">
        <div className="portalPanel">
          <div className="portalPanelHead"><span>CORE NATIVE REPO</span><a href="/portal/repositories">Repo servisi →</a></div>
          <div className="portalProfessionalList">
            {projectNativeRepos.length ? projectNativeRepos.map((repo) => (
              <a href="/portal/repositories" key={String(repo.id)}>
                <span>CORE GIT</span>
                <div><b>{String(repo.name)}</b><small>{String(repo.default_branch || "main")} · {String(repo.visibility)}</small></div>
                <em>{String(repo.status || "").toUpperCase()}</em>
              </a>
            )) : workspace.repositories.length ? workspace.repositories.map((repo) => (
              <a href={String(repo.repo_url)} target="_blank" rel="noreferrer" key={String(repo.id)}>
                <span>GIT</span>
                <div><b>{String(repo.name)}</b><small>{String(repo.default_branch || "main")} · {String(repo.visibility)}</small></div>
                <em>{String(repo.health || "unverified").toUpperCase()}</em>
              </a>
            )) : <p className="portalMuted">Bu projeye bağlı repo kaydı henüz yok.</p>}
          </div>
        </div>

        <div className="portalPanel">
          <div className="portalPanelHead"><span>MAP CONTEXT</span><a href="/portal/project-map">Haritada aç →</a></div>
          <div className="portalProjectMapSummary">
            <b>{teamCode || "CORE"}</b>
            <span>→</span>
            <b>{projectSlug}</b>
            <span>→</span>
            <b>{projectVehicles.length} vehicle / {projectNativeRepos.length + workspace.repositories.length} repo</b>
          </div>
        </div>
      </section>
    </>
  );
}
