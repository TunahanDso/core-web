import { notFound } from "next/navigation";
import { PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { listProjects } from "@/lib/cms/db";
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
  deletePortalProjectControlAction,
  grantPortalCapabilityAction,
  resetPortalProjectCatalogAction,
  revokePortalCapabilityAction,
  upsertPortalProjectControlAction,
  upsertPortalTeamMembershipAction,
  upsertPortalVehicleControlAction,
} from "@/app/portal/control-actions";

export const dynamic = "force-dynamic";

type ControlQuery = {
  edit?: string;
  delete?: string;
  saved?: string;
  deleted?: string;
  reset?: string;
};

export default async function PortalControlPlanePage({
  searchParams,
}: {
  searchParams?: Promise<ControlQuery>;
}) {
  const member = await requirePortalMember();
  const query = searchParams ? await searchParams : {};
  const [
    canProjects,
    canVehicles,
    canTeams,
    canRoles,
    canAdminReset,
    teams,
    projects,
    publicProjects,
    vehicles,
    members,
    roleProfiles,
    capabilityGrants,
    teamMemberships,
  ] = await Promise.all([
    memberHasPortalCapability(member,"control.projects"),
    memberHasPortalCapability(member,"control.vehicles"),
    memberHasPortalCapability(member,"teams.manage"),
    memberHasPortalCapability(member,"roles.manage"),
    memberHasPortalCapability(member,"portal.admin"),
    listPortalTeams(),
    listPortalProjectRegistry(),
    listProjects(),
    listPortalVehicleProfiles(),
    listPortalMembers(),
    listPortalRoleProfiles(),
    listPortalCapabilityGrants(),
    listPortalAllTeamMemberships(),
  ]);

  if (!canProjects && !canVehicles && !canTeams && !canRoles) notFound();

  const activeMembers = members.filter((item) => String(item.status) === "active");
  const internalBySlug = new Map(projects.map((project) => [String(project.slug),project]));
  const publicBySlug = new Map(publicProjects.map((project) => [project.slug,project]));
  const projectSlugs = Array.from(new Set([...internalBySlug.keys(),...publicBySlug.keys()]));
  const projectCatalog = projectSlugs
    .map((projectSlug) => {
      const internal = internalBySlug.get(projectSlug);
      const showcase = publicBySlug.get(projectSlug);
      return {
        slug: projectSlug,
        title: String(internal?.title || showcase?.titleTr || showcase?.titleEn || projectSlug),
        team: String(internal?.team_code || showcase?.domain || "CORE"),
        status: String(internal?.status || "showcase-only"),
        readiness: Number(internal?.readiness ?? showcase?.progress ?? 0),
        internal,
        showcase,
      };
    })
    .sort((a,b) => a.title.localeCompare(b.title,"tr"));

  const editSlug = String(query.edit || "");
  const deleteSlug = String(query.delete || "");
  const editInternal = editSlug ? internalBySlug.get(editSlug) : undefined;
  const editShowcase = editSlug ? publicBySlug.get(editSlug) : undefined;
  const deleteProject = deleteSlug
    ? projectCatalog.find((project) => project.slug === deleteSlug)
    : undefined;

  const editTitle = String(editInternal?.title || editShowcase?.titleTr || editShowcase?.titleEn || "");
  const editSummary = String(editInternal?.summary || editShowcase?.summaryTr || "");
  const editDomain = String(editInternal?.domain || editShowcase?.domain || "");
  const editTeamCode = String(editInternal?.team_code || "");
  const editReadiness = Number(editInternal?.readiness ?? editShowcase?.progress ?? 0);

  return (
    <>
      <PortalPageHeader
        code="CTL / CONTROL PLANE"
        title="CORE Ağır Kontrol"
        lead="Proje, araç, takım üyeliği ve capability kayıtlarını tek bir yönetişim yüzeyinden yönet. Proje kataloğu artık vitrin yaşam döngüsünü de buradan besler; araç komut otoritesi hâlâ ayrı güvenlik sınırındadır."
        action={<a className="portalOutlineButton" href="/portal/project-map">PROJECT MAP →</a>}
      />

      <section className="portalControlHealth">
        <article><span>PROJECT CATALOG</span><b>{projectCatalog.length}</b><small>{projects.length} internal / {publicProjects.length} showcase</small></article>
        <article><span>VEHICLE UNIT</span><b>{vehicles.length}</b><small>profile + telemetry identity</small></article>
        <article><span>TEAM</span><b>{teams.length}</b><small>access boundary</small></article>
        <article><span>ROLE PROFILE</span><b>{roleProfiles.length}</b><small>global + team</small></article>
        <article><span>CONTROL AUTHORITY</span><b className="text">İZOLE</b><small>portal yalnız control-plane metadata</small></article>
      </section>

      <section className="portalControlBoundary">
        <span>KRİTİK SINIR</span>
        <b>PROJE / ARAÇ KAYDI ≠ ARAÇ KOMUTU</b>
        <p>Bu yüzey sahiplik, lifecycle, readiness, yayın ve erişim yönetir. Aktüatör, mission veya remote-control endpoint'i burada oluşturulmaz.</p>
      </section>

      {query.saved === "1" ? (
        <section className="portalControlBoundary">
          <span>KAYIT TAMAMLANDI</span>
          <b>Portal registry ve vitrin proje kaydı birlikte güncellendi.</b>
        </section>
      ) : null}
      {query.deleted ? (
        <section className="portalControlBoundary">
          <span>PROJE SİLİNDİ</span>
          <b>{query.deleted}</b>
          <p>İlişkili mühendislik kayıtları korunup projeden ayrıldı; portal registry ve vitrin kaydı kaldırıldı.</p>
        </section>
      ) : null}
      {query.reset ? (
        <section className="portalControlBoundary">
          <span>PROJECT CATALOG RESET</span>
          <b>Proje kataloğu temizlendi.</b>
          <p>Üyeler, takımlar, sohbet, mail, Vault dosyaları, stok ve araç kimlikleri korunmuştur.</p>
        </section>
      ) : null}

      {canProjects ? (
        <section className="portalPanel portalControlPanel" id="project-control">
          <div className="portalPanelHead">
            <span>PROJECT CONTROL</span>
            <small>{editSlug ? "EDIT / SYNC SHOWCASE" : "CREATE / SYNC SHOWCASE"}</small>
          </div>

          <form className="portalFormGrid controlDense" action={upsertPortalProjectControlAction}>
            <label>
              <span>Slug</span>
              <input name="slug" placeholder="hydronom-v3" defaultValue={editSlug} readOnly={Boolean(editSlug)} required />
            </label>
            <label>
              <span>Proje adı</span>
              <input name="title" placeholder="Hydronom V3" defaultValue={editTitle} required />
            </label>
            <label>
              <span>Domain</span>
              <input name="domain" placeholder="USV / autonomy" defaultValue={editDomain} />
            </label>
            <label>
              <span>Takım</span>
              <select name="teamCode" defaultValue={editTeamCode}>
                <option value="">Ortak / atanmadı</option>
                {teams.map((team) => <option value={String(team.code)} key={String(team.code)}>{String(team.code)} · {String(team.name)}</option>)}
              </select>
            </label>
            <label>
              <span>Durum</span>
              <select name="status" defaultValue={String(editInternal?.status || "concept")}>
                <option value="concept">Concept</option>
                <option value="design">Design</option>
                <option value="prototype">Prototype</option>
                <option value="testing">Testing</option>
                <option value="operational">Operational</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label>
              <span>Görünürlük</span>
              <select name="visibility" defaultValue={String(editInternal?.visibility || "team")}>
                <option value="team">Yalnız takım</option>
                <option value="members">Tüm üyeler</option>
                <option value="leads">Liderler</option>
                <option value="admins">Yöneticiler</option>
              </select>
            </label>
            <label>
              <span>Sorumlu</span>
              <select name="ownerMemberId" defaultValue={String(editInternal?.owner_member_id || "")}>
                <option value="">Atanmadı</option>
                {activeMembers.map((item) => <option value={String(item.id)} key={String(item.id)}>{String(item.full_name || item.email)}</option>)}
              </select>
            </label>
            <label>
              <span>Risk</span>
              <select name="riskLevel" defaultValue={String(editInternal?.risk_level || "medium")}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label>
              <span>Readiness %</span>
              <input name="readiness" type="number" min="0" max="100" defaultValue={editReadiness} />
            </label>
            <label>
              <span>Başlangıç</span>
              <input name="startAt" type="date" defaultValue={String(editInternal?.start_at || "")} />
            </label>
            <label>
              <span>Hedef</span>
              <input name="targetAt" type="date" defaultValue={String(editInternal?.target_at || "")} />
            </label>
            <label className="portalFormWide">
              <span>İç proje özeti</span>
              <textarea name="summary" rows={3} defaultValue={editSummary} placeholder="Teknik hedef, sınır, çıktı..." />
            </label>

            <div className="portalFormWide portalPanelHead">
              <span>VİTRİN SENKRONU</span>
              <small>D1 PUBLIC CMS</small>
            </div>
            <label>
              <span>Vitrin durumu</span>
              <select name="showcaseStatus" defaultValue={editShowcase?.status || "draft"}>
                <option value="draft">Taslak / görünmez</option>
                <option value="published">Yayında</option>
                <option value="archived">Arşiv / görünmez</option>
              </select>
            </label>
            <label><span>Vitrin sahibi</span><input name="showcaseOwner" defaultValue={editShowcase?.owner || editTeamCode || ""} /></label>
            <label><span>Kategori · TR</span><input name="categoryTr" defaultValue={editShowcase?.categoryTr || editDomain} /></label>
            <label><span>Category · EN</span><input name="categoryEn" defaultValue={editShowcase?.categoryEn || editDomain} /></label>
            <label><span>Durum metni · TR</span><input name="statusTr" defaultValue={editShowcase?.statusTr || ""} placeholder="Prototip geliştiriliyor" /></label>
            <label><span>Status text · EN</span><input name="statusEn" defaultValue={editShowcase?.statusEn || ""} placeholder="Prototype in development" /></label>
            <label><span>Başlık · TR</span><input name="titleTr" defaultValue={editShowcase?.titleTr || editTitle} /></label>
            <label><span>Title · EN</span><input name="titleEn" defaultValue={editShowcase?.titleEn || editTitle} /></label>
            <label className="portalFormWide"><span>Özet · TR</span><textarea name="summaryTr" rows={3} defaultValue={editShowcase?.summaryTr || editSummary} /></label>
            <label className="portalFormWide"><span>Summary · EN</span><textarea name="summaryEn" rows={3} defaultValue={editShowcase?.summaryEn || ""} /></label>
            <label className="portalFormWide"><span>Entegrasyonlar · virgülle ayır</span><input name="integrations" defaultValue={editShowcase?.integrations.join(", ") || ""} /></label>

            <div className="editorActions portalFormWide">
              {editSlug ? <a className="portalOutlineButton" href="/portal/control#project-control">YENİ PROJE MODU</a> : null}
              <button className="portalPrimaryButton" type="submit">{editSlug ? "DEĞİŞİKLİKLERİ UYGULA →" : "PROJEYİ OLUŞTUR →"}</button>
            </div>
          </form>

          <div className="portalControlRegistry">
            {projectCatalog.map((project) => (
              <article key={project.slug}>
                <span>{project.showcase ? String(project.showcase.status).toUpperCase() : "INTERNAL"}</span>
                <div>
                  <b>{project.title}</b>
                  <small>{project.team} · {project.internal ? project.status : "showcase-only"} · {project.readiness}%</small>
                </div>
                <em>
                  <a href={"/portal/projects/" + encodeURIComponent(project.slug)}>OPEN</a>
                  {" · "}
                  <a href={"/portal/control?edit=" + encodeURIComponent(project.slug) + "#project-control"}>EDIT</a>
                  {" · "}
                  <a href={"/portal/control?delete=" + encodeURIComponent(project.slug) + "#project-delete"}>DELETE</a>
                </em>
              </article>
            ))}
          </div>

          {deleteProject ? (
            <div className="portalControlBoundary" id="project-delete">
              <span>DANGER ZONE / HARD DELETE</span>
              <b>{deleteProject.title}</b>
              <p>
                Portal registry ve public CMS kaydı silinir. Görev, Vault, repo, stok hareketi ve araç kaydı korunur;
                yalnızca bu proje slug bağlantıları kaldırılır.
              </p>
              <form className="portalFormGrid compact" action={deletePortalProjectControlAction}>
                <input type="hidden" name="slug" value={deleteProject.slug} />
                <label className="portalFormWide">
                  <span>Onay için şu slug değerini yaz: {deleteProject.slug}</span>
                  <input name="confirmation" autoComplete="off" required />
                </label>
                <button className="portalPrimaryButton" type="submit">PROJEYİ KALICI SİL →</button>
              </form>
            </div>
          ) : null}

          {canAdminReset ? (
            <div className="portalControlBoundary">
              <span>GO-LIVE PROJECT RESET</span>
              <b>Tüm demo / hazırlık proje kataloğunu temizle</b>
              <p>
                Internal proje registry ve vitrindeki tüm project kayıtları temizlenir. Üyeler, takımlar, chat, mail,
                Vault dosyaları, repo kayıtları, stok ve araçlar silinmez; proje bağlantıları boşaltılır.
              </p>
              <form className="portalFormGrid compact" action={resetPortalProjectCatalogAction}>
                <label className="portalFormWide">
                  <span>Onay için RESET PROJECTS yaz</span>
                  <input name="confirmation" autoComplete="off" required />
                </label>
                <button className="portalPrimaryButton" type="submit">PROJECT CATALOG RESET →</button>
              </form>
            </div>
          ) : null}
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
