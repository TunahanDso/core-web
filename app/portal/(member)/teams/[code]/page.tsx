import { notFound } from "next/navigation";
import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import {
  getPortalTeam,
  listPortalProjectRegistry,
  listPortalTeamMembers,
  listPortalVehicleProfiles,
} from "@/lib/portal/control";
import { canAccessPortalTeam, portalRoleLabelDetailed } from "@/lib/portal/governance";
import { listPortalRepositories, listPortalTasks } from "@/lib/portal/db";
import { listPortalVaultFiles } from "@/lib/portal/vault";
import { portalPriorityLabel, portalTaskStatusLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalTeamDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const member = await requirePortalMember();
  const { code: rawCode } = await params;
  const teamCode = decodeURIComponent(rawCode).trim().toUpperCase();
  const team = await getPortalTeam(teamCode);
  if (!team || !(await canAccessPortalTeam(member,teamCode))) notFound();

  const [members, projects, vehicles, tasks, repositories, vaultFiles] = await Promise.all([
    listPortalTeamMembers(teamCode),
    listPortalProjectRegistry(),
    listPortalVehicleProfiles(),
    listPortalTasks(500),
    listPortalRepositories(),
    listPortalVaultFiles({
      lifecycle: "active",
      limit: 300,
      viewer: { role: member.role, teams: Array.from(new Set([...member.teams,teamCode])) },
    }),
  ]);

  const teamProjects = projects.filter((item) => String(item.team_code || "") === teamCode && String(item.status) !== "archived");
  const teamVehicles = vehicles.filter((item) => String(item.team_code || "") === teamCode);
  const teamTasks = tasks.filter((item) => String(item.team_code || "") === teamCode || teamProjects.some((p) => String(p.slug) === String(item.project_slug || "")));
  const teamRepos = repositories.filter((item) => String(item.team_code || "") === teamCode || teamProjects.some((p) => String(p.slug) === String(item.project_slug || "")));
  const teamVault = vaultFiles.filter((item) => String(item.team_code || "") === teamCode || teamProjects.some((p) => String(p.slug) === String(item.project_slug || "")));

  return (
    <>
      <PortalPageHeader
        code={"TM / " + teamCode}
        title={String(team.name)}
        lead={String(team.description || team.domain || "CORE takım çalışma alanı.")}
        action={<a className="portalOutlineButton" href="/portal/teams">← TAKIMLAR</a>}
      />

      <section className="portalTeamHeroFacts">
        <article><span>DOMAIN</span><b>{String(team.domain || "CORE")}</b></article>
        <article><span>ÜYE</span><b>{members.length}</b></article>
        <article><span>PROJE</span><b>{teamProjects.length}</b></article>
        <article><span>ARAÇ</span><b>{teamVehicles.length}</b></article>
        <article><span>AÇIK GÖREV</span><b>{teamTasks.filter((item) => String(item.status) !== "done").length}</b></article>
        <article><span>VAULT</span><b>{teamVault.length}</b></article>
      </section>

      <section className="portalTeamWorkspaceGrid">
        <section className="portalPanel">
          <div className="portalPanelHead"><span>PROJELER</span><small>{teamProjects.length}</small></div>
          <div className="portalTeamProjectList">
            {teamProjects.length ? teamProjects.map((project) => (
              <a href={"/portal/projects/" + encodeURIComponent(String(project.slug))} key={String(project.slug)}>
                <span>{String(project.status).toUpperCase()}</span>
                <div><b>{String(project.title)}</b><small>{String(project.summary || project.domain || "")}</small></div>
                <em>{String(project.readiness || 0)}%</em>
              </a>
            )) : <p className="portalMuted">Takıma bağlı internal proje yok.</p>}
          </div>
        </section>

        <section className="portalPanel">
          <div className="portalPanelHead"><span>ARAÇLAR</span><small>{teamVehicles.length}</small></div>
          <div className="portalTeamVehicleList">
            {teamVehicles.length ? teamVehicles.map((vehicle) => (
              <article key={String(vehicle.id)}>
                <span>{String(vehicle.code)}</span>
                <div><b>{String(vehicle.name)}</b><small>{String(vehicle.platform_type || vehicle.domain || "vehicle")}</small></div>
                <em className={"state " + String(vehicle.lifecycle || vehicle.status)}>{String(vehicle.lifecycle || vehicle.status).toUpperCase()}</em>
              </article>
            )) : <p className="portalMuted">Takıma bağlı araç yok.</p>}
          </div>
        </section>
      </section>

      <section className="portalTeamWorkspaceGrid">
        <section className="portalPanel">
          <div className="portalPanelHead"><span>AKTİF GÖREVLER</span><small>{teamTasks.length}</small></div>
          <div className="portalTeamTaskList">
            {teamTasks.filter((item) => String(item.status) !== "done").slice(0,12).map((task) => (
              <a href={"/portal/tasks/" + encodeURIComponent(String(task.id))} key={String(task.id)}>
                <span className={"portalPriority " + String(task.priority)}>{portalPriorityLabel(String(task.priority))}</span>
                <div><b>{String(task.title)}</b><small>{String(task.assignee_name || "Atanmamış")}</small></div>
                <em>{portalTaskStatusLabel(String(task.status))}</em>
              </a>
            ))}
          </div>
        </section>

        <section className="portalPanel">
          <div className="portalPanelHead"><span>TAKIM ÜYELERİ</span><small>{members.length}</small></div>
          <div className="portalTeamMemberList">
            {members.length ? members.map((item) => (
              <a href={"/portal/members/" + encodeURIComponent(String(item.id))} key={String(item.id)}>
                <span>{String(item.full_name || item.email).split(/\s+/).slice(0,2).map((part) => part[0]).join("").toUpperCase()}</span>
                <div><b>{String(item.full_name || item.email)}</b><small>{String(item.email)}</small></div>
                <em>{portalRoleLabelDetailed(String(item.team_role))}</em>
              </a>
            )) : <p className="portalMuted">V6 takım üyeliği henüz atanmadı.</p>}
          </div>
        </section>
      </section>

      <section className="portalTeamWorkspaceGrid">
        <section className="portalPanel">
          <div className="portalPanelHead"><span>VAULT / SON DOSYALAR</span><small>{teamVault.length}</small></div>
          <div className="portalTeamVaultList">
            {teamVault.slice(0,10).map((file) => (
              <a href={"/portal/library/" + encodeURIComponent(String(file.id))} key={String(file.id)}>
                <span>{String(file.extension || file.kind).toUpperCase()}</span>
                <div><b>{String(file.title)}</b><small>R{String(file.revision)} · {String(file.approval_state)}</small></div>
              </a>
            ))}
          </div>
        </section>

        <section className="portalPanel">
          <div className="portalPanelHead"><span>REPOLAR</span><small>{teamRepos.length}</small></div>
          <div className="portalTeamVaultList">
            {teamRepos.length ? teamRepos.map((repo) => (
              <a href="/portal/repositories" key={String(repo.id)}>
                <span>GIT</span>
                <div><b>{String(repo.name)}</b><small>{String(repo.visibility || "private")}</small></div>
              </a>
            )) : <p className="portalMuted">Takıma bağlı repo kaydı yok.</p>}
          </div>
        </section>
      </section>

      {!teamProjects.length && !teamVehicles.length && !teamTasks.length && !teamVault.length ? (
        <PortalEmpty title="Takım alanı henüz boş." text="Control Plane üzerinden proje, araç ve takım üyeliği bağlandıkça bu sayfa dolacak." />
      ) : null}
    </>
  );
}
