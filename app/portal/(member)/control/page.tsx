import { notFound } from "next/navigation";
import { PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import {
  listPortalAllTeamMemberships,
  listPortalCapabilityGrants,
  listPortalProjectRegistry,
  listPortalRoleProfiles,
  listPortalTeams,
  listPortalVehicleProfiles,
} from "@/lib/portal/control";
import { listPortalMembers } from "@/lib/portal/db";
import {
  memberHasPortalCapability,
  portalRoleLabelDetailed,
} from "@/lib/portal/governance";
import {
  grantPortalCapabilityAction,
  revokePortalCapabilityAction,
  upsertPortalProjectControlAction,
  upsertPortalTeamMembershipAction,
  upsertPortalVehicleControlAction,
} from "@/app/portal/control-actions";

export const dynamic = "force-dynamic";

export default async function PortalControlPlanePage() {
  const member = await requirePortalMember();
  const [canProjects,canVehicles,canTeams,canRoles,teams,projects,vehicles,members,roleProfiles,capabilityGrants,teamMemberships] = await Promise.all([
    memberHasPortalCapability(member,"control.projects"),
    memberHasPortalCapability(member,"control.vehicles"),
    memberHasPortalCapability(member,"teams.manage"),
    memberHasPortalCapability(member,"roles.manage"),
    listPortalTeams(),
    listPortalProjectRegistry(),
    listPortalVehicleProfiles(),
    listPortalMembers(),
    listPortalRoleProfiles(),
    listPortalCapabilityGrants(),
    listPortalAllTeamMemberships(),
  ]);

  if (!canProjects && !canVehicles && !canTeams && !canRoles) notFound();
  const activeMembers = members.filter((item) => String(item.status) === "active");

  return (
    <>
      <PortalPageHeader
        code="CTL / CONTROL PLANE"
        title="CORE Ağır Kontrol"
        lead="Proje, araç, takım üyeliği ve capability kayıtlarını tek bir yönetişim yüzeyinden yönet. Bu ekran araç komut otoritesi değildir."
        action={<a className="portalOutlineButton" href="/portal/project-map">PROJECT MAP →</a>}
      />

      <section className="portalControlHealth">
        <article><span>INTERNAL PROJECT</span><b>{projects.length}</b><small>V6 registry</small></article>
        <article><span>VEHICLE UNIT</span><b>{vehicles.length}</b><small>profile + telemetry identity</small></article>
        <article><span>TEAM</span><b>{teams.length}</b><small>access boundary</small></article>
        <article><span>ROLE PROFILE</span><b>{roleProfiles.length}</b><small>global + team</small></article>
        <article><span>CONTROL AUTHORITY</span><b className="text">İZOLE</b><small>portal sadece control-plane metadata</small></article>
      </section>

      <section className="portalControlBoundary">
        <span>KRİTİK SINIR</span>
        <b>PROJE / ARAÇ KAYDI ≠ ARAÇ KOMUTU</b>
        <p>Bu yüzey sahiplik, lifecycle, readiness ve erişim yönetir. Aktüatör, mission veya remote-control endpoint'i burada oluşturulmaz.</p>
      </section>

      {canProjects ? (
        <section className="portalPanel portalControlPanel" id="project-control">
          <div className="portalPanelHead"><span>PROJECT CONTROL</span><small>CREATE / UPSERT</small></div>
          <form className="portalFormGrid controlDense" action={upsertPortalProjectControlAction}>
            <label><span>Slug</span><input name="slug" placeholder="hydronom-v3" required /></label>
            <label><span>Proje adı</span><input name="title" placeholder="Hydronom V3" required /></label>
            <label><span>Domain</span><input name="domain" placeholder="USV / autonomy" /></label>
            <label><span>Takım</span><select name="teamCode" defaultValue=""><option value="">Ortak / atanmadı</option>{teams.map((team) => <option value={String(team.code)} key={String(team.code)}>{String(team.code)} · {String(team.name)}</option>)}</select></label>
            <label><span>Durum</span><select name="status" defaultValue="concept"><option value="concept">Concept</option><option value="design">Design</option><option value="prototype">Prototype</option><option value="testing">Testing</option><option value="operational">Operational</option><option value="paused">Paused</option><option value="archived">Archived</option></select></label>
            <label><span>Görünürlük</span><select name="visibility" defaultValue="team"><option value="team">Yalnız takım</option><option value="members">Tüm üyeler</option><option value="leads">Liderler</option><option value="admins">Yöneticiler</option></select></label>
            <label><span>Sorumlu</span><select name="ownerMemberId" defaultValue=""><option value="">Atanmadı</option>{activeMembers.map((item) => <option value={String(item.id)} key={String(item.id)}>{String(item.full_name || item.email)}</option>)}</select></label>
            <label><span>Risk</span><select name="riskLevel" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
            <label><span>Readiness %</span><input name="readiness" type="number" min="0" max="100" defaultValue="0" /></label>
            <label><span>Başlangıç</span><input name="startAt" type="date" /></label>
            <label><span>Hedef</span><input name="targetAt" type="date" /></label>
            <label className="portalFormWide"><span>Özet</span><textarea name="summary" rows={3} placeholder="Teknik hedef, sınır, çıktı..." /></label>
            <button className="portalPrimaryButton" type="submit">PROJEYİ KAYDET →</button>
          </form>

          <div className="portalControlRegistry">
            {projects.slice(0,12).map((project) => (
              <a href={"/portal/projects/" + encodeURIComponent(String(project.slug))} key={String(project.slug)}>
                <span>{String(project.status).toUpperCase()}</span>
                <div><b>{String(project.title)}</b><small>{String(project.team_code || "CORE")} · {String(project.risk_level)} risk</small></div>
                <em>{String(project.readiness)}%</em>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {canVehicles ? (
        <section className="portalPanel portalControlPanel" id="vehicle-control">
          <div className="portalPanelHead"><span>VEHICLE REGISTRY</span><small>IDENTITY / LIFECYCLE</small></div>
          <form className="portalFormGrid controlDense" action={upsertPortalVehicleControlAction}>
            <label><span>Araç kodu</span><input name="code" placeholder="HYD-03" required /></label>
            <label><span>Araç adı</span><input name="name" placeholder="Hydronom Mk III" required /></label>
            <label><span>Domain</span><input name="domain" placeholder="CORE Marine" /></label>
            <label><span>Takım</span><select name="teamCode" defaultValue=""><option value="">Atanmadı</option>{teams.map((team) => <option value={String(team.code)} key={String(team.code)}>{String(team.code)} · {String(team.name)}</option>)}</select></label>
            <label><span>Proje</span><select name="projectSlug" defaultValue=""><option value="">Atanmadı</option>{projects.map((project) => <option value={String(project.slug)} key={String(project.slug)}>{String(project.title)}</option>)}</select></label>
            <label><span>Platform tipi</span><input name="platformType" placeholder="USV / AUV / UAV / UGV..." /></label>
            <label><span>Lifecycle</span><select name="lifecycle" defaultValue="prototype"><option value="concept">Concept</option><option value="prototype">Prototype</option><option value="testing">Testing</option><option value="operational">Operational</option><option value="maintenance">Maintenance</option><option value="retired">Retired</option></select></label>
            <label><span>Kritiklik</span><select name="criticality" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
            <label><span>Seri / hull no</span><input name="serialNumber" /></label>
            <label><span>Sorumlu</span><select name="ownerMemberId" defaultValue=""><option value="">Atanmadı</option>{activeMembers.map((item) => <option value={String(item.id)} key={String(item.id)}>{String(item.full_name || item.email)}</option>)}</select></label>
            <label className="portalFormWide"><span>Açıklama</span><textarea name="description" rows={3} /></label>
            <button className="portalPrimaryButton" type="submit">ARAÇ KAYDINI UYGULA →</button>
          </form>

          <div className="portalControlRegistry vehicles">
            {vehicles.slice(0,14).map((vehicle) => (
              <article key={String(vehicle.id)}>
                <span>{String(vehicle.code)}</span>
                <div><b>{String(vehicle.name)}</b><small>{String(vehicle.team_code || "CORE")} · {String(vehicle.platform_type || vehicle.domain)}</small></div>
                <em className={"state " + String(vehicle.lifecycle || vehicle.status)}>{String(vehicle.lifecycle || vehicle.status).toUpperCase()}</em>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {canTeams ? (
        <section className="portalPanel portalControlPanel" id="team-membership">
          <div className="portalPanelHead"><span>TEAM MEMBERSHIP</span><small>ACCESS BOUNDARY</small></div>
          <form className="portalFormGrid controlDense" action={upsertPortalTeamMembershipAction}>
            <label><span>Takım</span><select name="teamCode" required>{teams.map((team) => <option value={String(team.code)} key={String(team.code)}>{String(team.code)} · {String(team.name)}</option>)}</select></label>
            <label><span>Üye</span><select name="memberId" required>{activeMembers.map((item) => <option value={String(item.id)} key={String(item.id)}>{String(item.full_name || item.email)}</option>)}</select></label>
            <label><span>Takım rolü</span><select name="teamRole" defaultValue="engineer"><option value="owner">Takım Sahibi</option><option value="captain">Kaptan</option><option value="lead">Takım Lideri</option><option value="engineer">Mühendis</option><option value="contributor">Katkıcı</option><option value="observer">Gözlemci</option></select></label>
            <label className="portalFormWide"><span>Ek capability</span><input name="capabilities" placeholder="team.project.manage, team.vehicle.manage" /></label>
            <button className="portalPrimaryButton" type="submit">ÜYELİĞİ UYGULA →</button>
          </form>
        </section>
      ) : null}

      <section className="portalPanel portalControlPanel" id="role-catalog">
        <div className="portalPanelHead"><span>ROLE / CAPABILITY CATALOG</span><small>{roleProfiles.length} PROFILE</small></div>
        <div className="portalRoleCatalog">
          {roleProfiles.map((profile) => {
            let capabilities: string[] = [];
            try { capabilities = JSON.parse(String(profile.capabilities_json || "[]")); } catch { capabilities = []; }
            return (
              <article key={String(profile.role_key)}>
                <header><span>{String(profile.scope).toUpperCase()}</span><b>{String(profile.label)}</b></header>
                <p>{String(profile.description)}</p>
                <div>{capabilities.length ? capabilities.map((capability) => <code key={capability}>{capability}</code>) : <small>Varsayılan ek capability yok</small>}</div>
              </article>
            );
          })}
        </div>
        {canRoles ? (
          <>
            <form className="portalFormGrid compact portalCapabilityGrant" action={grantPortalCapabilityAction}>
              <label><span>Üye</span><select name="memberId">{activeMembers.map((item) => <option value={String(item.id)} key={String(item.id)}>{String(item.full_name || item.email)} · {portalRoleLabelDetailed(String(item.role))}</option>)}</select></label>
              <label><span>Capability</span><input name="capability" placeholder="teams.read_all" required /></label>
              <button className="portalPrimaryButton" type="submit">CAPABILITY GRANT →</button>
            </form>

            <div className="portalCapabilityGrantList">
              <div className="portalPanelHead"><span>EXPLICIT GRANTS</span><small>{capabilityGrants.length}</small></div>
              {capabilityGrants.length ? capabilityGrants.map((grant) => (
                <article key={String(grant.member_id) + ":" + String(grant.capability)}>
                  <div>
                    <b>{String(grant.full_name || grant.email)}</b>
                    <small>{String(grant.email)}</small>
                  </div>
                  <code>{String(grant.capability)}</code>
                  <small>by {String(grant.granted_by)}</small>
                  <form action={revokePortalCapabilityAction}>
                    <input type="hidden" name="memberId" value={String(grant.member_id)} />
                    <input type="hidden" name="capability" value={String(grant.capability)} />
                    <button type="submit">REVOKE</button>
                  </form>
                </article>
              )) : <p className="portalMuted">Explicit capability grant'i yok.</p>}
            </div>

            <div className="portalTeamAssignmentList">
              <div className="portalPanelHead"><span>TEAM ROLE ASSIGNMENTS</span><small>{teamMemberships.length}</small></div>
              {teamMemberships.length ? teamMemberships.slice(0,80).map((assignment) => (
                <article key={String(assignment.team_code) + ":" + String(assignment.member_id)}>
                  <span>{String(assignment.team_code)}</span>
                  <div><b>{String(assignment.full_name || assignment.email)}</b><small>{String(assignment.team_name)}</small></div>
                  <em>{portalRoleLabelDetailed(String(assignment.team_role))}</em>
                </article>
              )) : <p className="portalMuted">V6 takım rol ataması henüz yok.</p>}
            </div>
          </>
        ) : null}
      </section>
    </>
  );
}
