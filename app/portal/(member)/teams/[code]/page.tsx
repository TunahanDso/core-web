import { notFound } from "next/navigation";
import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import {
  getPortalTeam,
  listPortalProjectRegistry,
  listPortalTeamMembers,
  listPortalVehicleProfiles,
} from "@/lib/portal/control";
import {
  canAccessPortalTeam,
  canManagePortalTeam,
  canManageTeamProjects,
  memberHasPortalCapability,
  canManageTeamVehicles,
  portalRoleLabelDetailed,
} from "@/lib/portal/governance";
import {
  createPortalTeamProjectAction,
  createPortalTeamVehicleAction,
  deletePortalTeamAction,
  removePortalTeamMembershipScopedAction,
  updatePortalTeamAction,
  upsertPortalTeamMembershipScopedAction,
} from "@/app/portal/control-actions";
import { listPortalMembers, listPortalRepositories, listPortalTasks } from "@/lib/portal/db";
import { listPortalVaultFiles } from "@/lib/portal/vault";
import { portalPriorityLabel, portalTaskStatusLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalTeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams?: Promise<{ created?: string; updated?: string; membership?: string }>;
}) {
  const member = await requirePortalMember();
  const { code: rawCode } = await params;
  const teamCode = decodeURIComponent(rawCode).trim().toUpperCase();
  const team = await getPortalTeam(teamCode);
  if (!team || !(await canAccessPortalTeam(member,teamCode))) notFound();

  const [members, allPortalMembers, projects, vehicles, tasks, repositories, vaultFiles, canManageMembers, canManageProjects, canManageVehicles, canDeleteTeam] = await Promise.all([
    listPortalTeamMembers(teamCode),
    listPortalMembers(),
    listPortalProjectRegistry(),
    listPortalVehicleProfiles(),
    listPortalTasks(500),
    listPortalRepositories(),
    listPortalVaultFiles({
      lifecycle: "active",
      limit: 300,
      viewer: { role: member.role, teams: Array.from(new Set([...member.teams,teamCode])) },
    }),
    canManagePortalTeam(member,teamCode),
    canManageTeamProjects(member,teamCode),
    canManageTeamVehicles(member,teamCode),
    memberHasPortalCapability(member,"teams.manage"),
  ]);
  const query: { created?: string; updated?: string; membership?: string } = searchParams ? await searchParams : {};

  const activePortalMembers = allPortalMembers.filter((item) => String(item.status) === "active");
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

      {query.created === "1" ? <div className="portalSuccess">Takım registry kaydı oluşturuldu.</div> : null}
      {query.updated === "1" ? <div className="portalSuccess">Takım bilgileri güncellendi.</div> : null}
      {query.membership === "removed" ? <div className="portalSuccess">Takım üyeliği kaldırıldı.</div> : null}

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

      {canManageMembers || canManageProjects || canManageVehicles ? (
        <section className="portalTeamLocalControl">
          <div className="portalPanelHead">
            <span>TAKIM CONTROL SURFACE</span>
            <small>{teamCode} SCOPE · yalnız bu takım</small>
          </div>

          <div className="portalTeamLocalControlGrid">
            {canManageMembers ? (
              <section className="portalTeamSettingsPanel">
                <h3>Takım bilgileri</h3>
                <form className="portalFormGrid compact" action={updatePortalTeamAction}>
                  <input type="hidden" name="code" value={teamCode} />
                  <label><span>Kod</span><input value={teamCode} readOnly disabled /></label>
                  <label><span>Ad</span><input name="name" defaultValue={String(team.name)} required /></label>
                  <label><span>Domain</span><input name="domain" defaultValue={String(team.domain || "")} /></label>
                  <label><span>Görünürlük</span><select name="visibility" defaultValue={String(team.visibility || "restricted")}><option value="restricted">Yalnız yetkililer / üyeler</option><option value="members">Tüm CORE üyeleri</option></select></label>
                  <label className="portalFormWide"><span>Açıklama</span><textarea name="description" rows={4} defaultValue={String(team.description || "")} /></label>
                  <button className="portalPrimaryButton" type="submit">TAKIMI GÜNCELLE →</button>
                </form>
              </section>
            ) : null}
            {canManageProjects ? (
              <section>
                <h3>Yeni proje</h3>
                <form className="portalFormGrid compact" action={createPortalTeamProjectAction}>
                  <input type="hidden" name="teamCode" value={teamCode} />
                  <label><span>Slug</span><input name="slug" placeholder="marine-autonomy-v1" required /></label>
                  <label><span>Ad</span><input name="title" required /></label>
                  <label><span>Domain</span><input name="domain" defaultValue={String(team.domain || "")} /></label>
                  <label><span>Durum</span><select name="status" defaultValue="concept"><option value="concept">Concept</option><option value="design">Design</option><option value="prototype">Prototype</option><option value="testing">Testing</option><option value="operational">Operational</option><option value="paused">Paused</option></select></label>
                  <label><span>Risk</span><select name="riskLevel" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
                  <label><span>Readiness</span><input name="readiness" type="number" min="0" max="100" defaultValue="0" /></label>
                  <label><span>Başlangıç</span><input name="startAt" type="date" /></label>
                  <label><span>Hedef</span><input name="targetAt" type="date" /></label>
                  <label className="portalFormWide"><span>Özet</span><textarea name="summary" rows={3} /></label>
                  <button className="portalPrimaryButton" type="submit">PROJE OLUŞTUR →</button>
                </form>
              </section>
            ) : null}

            {canManageVehicles ? (
              <section>
                <h3>Yeni araç</h3>
                <form className="portalFormGrid compact" action={createPortalTeamVehicleAction}>
                  <input type="hidden" name="teamCode" value={teamCode} />
                  <label><span>Kod</span><input name="code" placeholder="MAR-01" required /></label>
                  <label><span>Ad</span><input name="name" required /></label>
                  <label><span>Platform</span><input name="platformType" placeholder="USV / ROV / UAV..." /></label>
                  <label><span>Domain</span><input name="domain" defaultValue={String(team.domain || "")} /></label>
                  <label><span>Proje</span><select name="projectSlug" defaultValue=""><option value="">Atanmadı</option>{teamProjects.map((project) => <option value={String(project.slug)} key={String(project.slug)}>{String(project.title)}</option>)}</select></label>
                  <label><span>Lifecycle</span><select name="lifecycle" defaultValue="prototype"><option value="concept">Concept</option><option value="prototype">Prototype</option><option value="testing">Testing</option><option value="operational">Operational</option><option value="maintenance">Maintenance</option></select></label>
                  <label><span>Kritiklik</span><select name="criticality" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
                  <label><span>Seri</span><input name="serialNumber" /></label>
                  <label className="portalFormWide"><span>Açıklama</span><textarea name="description" rows={3} /></label>
                  <button className="portalPrimaryButton" type="submit">ARAÇ EKLE →</button>
                </form>
              </section>
            ) : null}

            {canManageMembers ? (
              <section>
                <h3>Üyelik / takım rolü</h3>
                <form className="portalFormGrid compact" action={upsertPortalTeamMembershipScopedAction}>
                  <input type="hidden" name="teamCode" value={teamCode} />
                  <label className="portalFormWide"><span>Portal üyesi</span><select name="memberId" required>{activePortalMembers.map((item) => <option value={String(item.id)} key={String(item.id)}>{String(item.full_name || item.email)}</option>)}</select></label>
                  <label className="portalFormWide"><span>Takım rolü</span><select name="teamRole" defaultValue="engineer"><option value="owner">Takım Sahibi</option><option value="captain">Kaptan</option><option value="lead">Takım Lideri</option><option value="engineer">Mühendis</option><option value="contributor">Katkıcı</option><option value="observer">Gözlemci</option></select></label>
                  <button className="portalPrimaryButton" type="submit">TAKIM ROLÜNÜ UYGULA →</button>
                </form>
                <p className="portalMuted">Bu form mevcut takım üyelerinin scoped rolünü değiştirir. Yeni portal hesabı Admin → Üyeler üzerinden davet edilir.</p>
                {members.length ? (
                  <form className="portalMembershipRemove" action={removePortalTeamMembershipScopedAction}>
                    <input type="hidden" name="teamCode" value={teamCode} />
                    <label><span>Üyeliği kaldır</span><select name="memberId" required>{members.map((item) => <option value={String(item.id)} key={String(item.id)}>{String(item.full_name || item.email)} · {portalRoleLabelDetailed(String(item.team_role))}</option>)}</select></label>
                    <button className="portalDangerButton" type="submit">TAKIMDAN ÇIKAR</button>
                  </form>
                ) : null}
              </section>
            ) : null}
          </div>
        </section>
      ) : null}

      {canDeleteTeam ? (
        <section className="portalDangerZone">
          <div>
            <span>DANGER ZONE</span>
            <h3>Takımı kalıcı olarak sil</h3>
            <p>Takım üyelikleri silinir. Proje, araç, repository, görev, Vault ve takvim kayıtları silinmez; yalnızca bu takım bağlantıları kaldırılır.</p>
          </div>
          <form action={deletePortalTeamAction}>
            <input type="hidden" name="teamCode" value={teamCode} />
            <label><span>Onay için {teamCode} yaz</span><input name="confirmation" autoComplete="off" required /></label>
            <button className="portalDangerButton" type="submit">TAKIMI KALICI SİL</button>
          </form>
        </section>
      ) : null}

      {!teamProjects.length && !teamVehicles.length && !teamTasks.length && !teamVault.length ? (
        <PortalEmpty title="Takım alanı henüz boş." text="Control Plane üzerinden proje, araç ve takım üyeliği bağlandıkça bu sayfa dolacak." />
      ) : null}
    </>
  );
}
