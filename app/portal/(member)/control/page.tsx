import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
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

type ControlSection = "projects" | "vehicles" | "teams" | "roles";

type ControlQuery = {
  section?: string;
  tool?: string;
  edit?: string;
  delete?: string;
  saved?: string;
  deleted?: string;
  reset?: string;
  vehicle?: string;
  membership?: string;
  capability?: string;
};

function controlHref(section: ControlSection, extra: Record<string,string | undefined> = {}) {
  const params=new URLSearchParams({ section });
  Object.entries(extra).forEach(([key,value])=>{ if(value) params.set(key,value); });
  return "/portal/control?"+params.toString();
}

function parseCapabilities(value: unknown) {
  try {
    const parsed=JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.map((item)=>String(item)) : [];
  } catch {
    return [];
  }
}

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

  const allowedSections: ControlSection[] = [
    ...(canProjects ? ["projects" as const] : []),
    ...(canVehicles ? ["vehicles" as const] : []),
    ...(canTeams ? ["teams" as const] : []),
    ...(canRoles ? ["roles" as const] : []),
  ];

  const inferredSection =
    query.edit || query.delete || query.saved || query.deleted || query.reset ? "projects"
    : query.vehicle ? "vehicles"
    : query.membership ? "teams"
    : query.capability ? "roles"
    : String(query.section || "");

  const section = allowedSections.includes(inferredSection as ControlSection)
    ? inferredSection as ControlSection
    : allowedSections[0];

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
        risk: String(internal?.risk_level || "public"),
        owner: String(internal?.owner_name || internal?.owner_member_id || showcase?.owner || "Atanmadı"),
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
        code="CONTROL PLANE"
        title="CORE Ağır Kontrol"
        lead="Yönetişim araçlarını tek sayfaya yığmak yerine proje, araç, takım ve rol bağlamlarına ayır."
        action={<Link prefetch={false} className="portalOutlineButton" href="/portal/project-map">Project Map</Link>}
      />

      <section className="portalCompactServiceStrip portalControlSummaryStrip">
        <article><span>PROJECT</span><b>{projectCatalog.length} kayıt</b><small>{projects.length} internal · {publicProjects.length} showcase</small></article>
        <article><span>VEHICLE</span><b>{vehicles.length} araç</b><small>identity · lifecycle · telemetry</small></article>
        <article><span>TEAM</span><b>{teams.length} takım</b><small>{teamMemberships.length} explicit üyelik</small></article>
        <article><span>ROLE</span><b>{roleProfiles.length} profil</b><small>{capabilityGrants.length} explicit grant</small></article>
      </section>

      <section className="portalControlBoundary portalControlBoundaryCompact">
        <span>KRİTİK SINIR</span>
        <b>CONTROL PLANE METADATA ≠ ARAÇ KOMUTU</b>
        <p>Bu yüzey sahiplik, lifecycle, readiness, yayın ve erişim yönetir. Aktüatör, mission veya remote-control otoritesi burada verilmez.</p>
      </section>

      <section className="portalControlModeBar">
        <nav className="portalSegmentedControl" aria-label="Control Plane bölümü">
          {canProjects ? <a className={section==="projects"?"active":""} href={controlHref("projects")}>Projeler</a> : null}
          {canVehicles ? <a className={section==="vehicles"?"active":""} href={controlHref("vehicles")}>Araçlar</a> : null}
          {canTeams ? <a className={section==="teams"?"active":""} href={controlHref("teams")}>Takımlar</a> : null}
          {canRoles ? <a className={section==="roles"?"active":""} href={controlHref("roles")}>Roller</a> : null}
        </nav>
        <span>Yalnız seçili yönetişim alanı gösterilir.</span>
      </section>

      {query.saved === "1" ? <div className="portalSuccess">Proje registry ve vitrin kaydı güncellendi.</div> : null}
      {query.deleted ? <div className="portalSuccess">{query.deleted} projesi registry ve vitrinden kaldırıldı.</div> : null}
      {query.reset ? <div className="portalSuccess">Proje kataloğu temizlendi.</div> : null}
      {query.vehicle ? <div className="portalSuccess">Araç registry kaydı güncellendi.</div> : null}
      {query.membership ? <div className="portalSuccess">Takım üyeliği güncellendi.</div> : null}
      {query.capability ? <div className="portalSuccess">Capability kaydı güncellendi.</div> : null}

      {section === "projects" && canProjects ? (
        <>
          <section className="portalRegistryToolbar">
            <div className="portalRegistryTabs">
              <span className="portalMuted">Internal registry + public showcase kataloğu</span>
            </div>
            <div className="portalRegistrySummary">
              <span>PROJE</span><b>{projectCatalog.length}</b><small>katalog kaydı</small>
            </div>
            <a className="primary" href={controlHref("projects",{tool:"project"})}>+ Proje oluştur</a>
            {canAdminReset ? <a className="subtle" href={controlHref("projects",{tool:"reset"})}>Katalog reset</a> : null}
          </section>

          {(String(query.tool || "") === "project" || Boolean(editSlug)) ? (
            <section className="portalToolSurface">
              <div className="portalToolBody">
                <div className="portalInlineToolHead">
                  <div>
                    <b>{editSlug ? "Projeyi düzenle" : "Yeni proje oluştur"}</b>
                    <small>Internal registry ve vitrin senkronunu tek işlemde yönet.</small>
                  </div>
                  <a href={controlHref("projects")}>Kapat</a>
                </div>

                <form className="portalFormGrid controlDense" action={upsertPortalProjectControlAction}>
                  <label><span>Slug</span><input name="slug" placeholder="hydronom-v3" defaultValue={editSlug} readOnly={Boolean(editSlug)} required autoFocus /></label>
                  <label><span>Proje adı</span><input name="title" placeholder="Hydronom V3" defaultValue={editTitle} required /></label>
                  <label><span>Domain</span><input name="domain" placeholder="USV / autonomy" defaultValue={editDomain} /></label>
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
                      <option value="concept">Concept</option><option value="design">Design</option><option value="prototype">Prototype</option>
                      <option value="testing">Testing</option><option value="operational">Operational</option><option value="paused">Paused</option><option value="archived">Archived</option>
                    </select>
                  </label>
                  <label>
                    <span>Görünürlük</span>
                    <select name="visibility" defaultValue={String(editInternal?.visibility || "team")}>
                      <option value="team">Yalnız takım</option><option value="members">Tüm üyeler</option><option value="leads">Liderler</option><option value="admins">Yöneticiler</option>
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
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </label>
                  <label><span>Readiness %</span><input name="readiness" type="number" min="0" max="100" defaultValue={editReadiness} /></label>
                  <label><span>Başlangıç</span><input name="startAt" type="date" defaultValue={String(editInternal?.start_at || "")} /></label>
                  <label><span>Hedef</span><input name="targetAt" type="date" defaultValue={String(editInternal?.target_at || "")} /></label>
                  <label className="portalFormWide"><span>İç proje özeti</span><textarea name="summary" rows={3} defaultValue={editSummary} placeholder="Teknik hedef, sınır, çıktı..." /></label>

                  <div className="portalFormWide portalFormSectionLabel"><span>VİTRİN SENKRONU</span><small>D1 PUBLIC CMS</small></div>
                  <label>
                    <span>Vitrin durumu</span>
                    <select name="showcaseStatus" defaultValue={editShowcase?.status || "draft"}>
                      <option value="draft">Taslak / görünmez</option><option value="published">Yayında</option><option value="archived">Arşiv / görünmez</option>
                    </select>
                  </label>
                  <label><span>Vitrin sahibi</span><input name="showcaseOwner" defaultValue={editShowcase?.owner || editTeamCode || ""} /></label>
                  <label><span>Kategori · TR</span><input name="categoryTr" defaultValue={editShowcase?.categoryTr || editDomain} /></label>
                  <label><span>Category · EN</span><input name="categoryEn" defaultValue={editShowcase?.categoryEn || editDomain} /></label>
                  <label><span>Durum metni · TR</span><input name="statusTr" defaultValue={editShowcase?.statusTr || ""} /></label>
                  <label><span>Status text · EN</span><input name="statusEn" defaultValue={editShowcase?.statusEn || ""} /></label>
                  <label><span>Başlık · TR</span><input name="titleTr" defaultValue={editShowcase?.titleTr || editTitle} /></label>
                  <label><span>Title · EN</span><input name="titleEn" defaultValue={editShowcase?.titleEn || editTitle} /></label>
                  <label className="portalFormWide"><span>Özet · TR</span><textarea name="summaryTr" rows={3} defaultValue={editShowcase?.summaryTr || editSummary} /></label>
                  <label className="portalFormWide"><span>Summary · EN</span><textarea name="summaryEn" rows={3} defaultValue={editShowcase?.summaryEn || ""} /></label>
                  <label className="portalFormWide"><span>Entegrasyonlar · virgülle ayır</span><input name="integrations" defaultValue={editShowcase?.integrations.join(", ") || ""} /></label>

                  <div className="editorActions portalFormWide">
                    {editSlug ? <a className="portalOutlineButton" href={controlHref("projects",{tool:"project"})}>Yeni proje modu</a> : null}
                    <button className="portalPrimaryButton" type="submit">{editSlug ? "Değişiklikleri uygula" : "Projeyi oluştur"}</button>
                  </div>
                </form>
              </div>
            </section>
          ) : null}

          {projectCatalog.length ? (
            <div className="portalDataTableShell">
              <table className="portalDataTable portalControlProjectTable">
                <thead>
                  <tr>
                    <th scope="col">Proje</th><th scope="col">Kaynak</th><th scope="col">Takım</th><th scope="col">Durum</th>
                    <th scope="col">Readiness</th><th scope="col">Risk</th><th scope="col">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {projectCatalog.map((project)=>(
                    <tr key={project.slug}>
                      <td className="primaryCell"><Link prefetch={false} href={"/portal/projects/"+encodeURIComponent(project.slug)}><b>{project.title}</b><small>{project.slug}</small></Link></td>
                      <td>{project.internal ? "Internal" : "Showcase"}</td>
                      <td className="mono">{project.team}</td>
                      <td><span className={"portalStatusText "+project.status}>{project.status}</span></td>
                      <td className="numeric">{project.readiness}%</td>
                      <td><span className={"portalStatusText "+(project.risk==="critical"?"critical":"")}>{project.risk}</span></td>
                      <td className="rowActions">
                        <a href={controlHref("projects",{edit:project.slug})}>Düzenle</a>
                        <a href={controlHref("projects",{delete:project.slug})}>Sil</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <PortalEmpty title="Proje kataloğu boş." text="Yeni proje oluşturduğunda burada registry satırı olarak görünür." />}

          {deleteProject ? (
            <section className="portalToolSurface portalDangerTool">
              <div className="portalToolBody">
                <div className="portalInlineToolHead">
                  <div><b>{deleteProject.title} projesini kalıcı sil</b><small>Görev ve mühendislik kayıtları korunur; proje bağlantıları kaldırılır.</small></div>
                  <a href={controlHref("projects")}>Vazgeç</a>
                </div>
                <form className="portalFormGrid compact" action={deletePortalProjectControlAction}>
                  <input type="hidden" name="slug" value={deleteProject.slug} />
                  <label className="portalFormWide"><span>Onay için {deleteProject.slug} yaz</span><input name="confirmation" autoComplete="off" required /></label>
                  <button className="portalPrimaryButton" type="submit">Projeyi kalıcı sil</button>
                </form>
              </div>
            </section>
          ) : null}

          {canAdminReset && String(query.tool || "") === "reset" ? (
            <section className="portalToolSurface portalDangerTool">
              <div className="portalToolBody">
                <div className="portalInlineToolHead">
                  <div><b>Project Catalog Reset</b><small>Proje registry ve public project kayıtları temizlenir; bağlı varlıklar korunur.</small></div>
                  <a href={controlHref("projects")}>Vazgeç</a>
                </div>
                <form className="portalFormGrid compact" action={resetPortalProjectCatalogAction}>
                  <label className="portalFormWide"><span>Onay için RESET PROJECTS yaz</span><input name="confirmation" autoComplete="off" required /></label>
                  <button className="portalPrimaryButton" type="submit">Project Catalog Reset</button>
                </form>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {section === "vehicles" && canVehicles ? (
        <>
          <section className="portalRegistryToolbar">
            <div className="portalRegistryTabs"><span className="portalMuted">Araç kimliği, lifecycle ve sahiplik registry'si</span></div>
            <div className="portalRegistrySummary"><span>ARAÇ</span><b>{vehicles.length}</b><small>registry kaydı</small></div>
            <a className="primary" href={controlHref("vehicles",{tool:"vehicle"})}>+ Araç kaydet</a>
          </section>

          {String(query.tool || "") === "vehicle" ? (
            <section className="portalToolSurface">
              <div className="portalToolBody">
                <div className="portalInlineToolHead">
                  <div><b>Araç kaydı oluştur / güncelle</b><small>Kimlik, lifecycle ve ilişki metadata'sı; araç komut otoritesi değildir.</small></div>
                  <a href={controlHref("vehicles")}>Kapat</a>
                </div>
                <form className="portalFormGrid controlDense" action={upsertPortalVehicleControlAction}>
                  <label><span>Araç kodu</span><input name="code" placeholder="HYD-03" required autoFocus /></label>
                  <label><span>Araç adı</span><input name="name" placeholder="Hydronom Mk III" required /></label>
                  <label><span>Domain</span><input name="domain" placeholder="CORE Marine" /></label>
                  <label><span>Takım</span><select name="teamCode" defaultValue=""><option value="">Atanmadı</option>{teams.map((team)=><option value={String(team.code)} key={String(team.code)}>{String(team.code)} · {String(team.name)}</option>)}</select></label>
                  <label><span>Proje</span><select name="projectSlug" defaultValue=""><option value="">Atanmadı</option>{projects.map((project)=><option value={String(project.slug)} key={String(project.slug)}>{String(project.title)}</option>)}</select></label>
                  <label><span>Platform tipi</span><input name="platformType" placeholder="USV / AUV / UAV / UGV" /></label>
                  <label><span>Lifecycle</span><select name="lifecycle" defaultValue="prototype"><option value="concept">Concept</option><option value="prototype">Prototype</option><option value="testing">Testing</option><option value="operational">Operational</option><option value="maintenance">Maintenance</option><option value="retired">Retired</option></select></label>
                  <label><span>Kritiklik</span><select name="criticality" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
                  <label><span>Seri / hull no</span><input name="serialNumber" /></label>
                  <label><span>Sorumlu</span><select name="ownerMemberId" defaultValue=""><option value="">Atanmadı</option>{activeMembers.map((item)=><option value={String(item.id)} key={String(item.id)}>{String(item.full_name || item.email)}</option>)}</select></label>
                  <label className="portalFormWide"><span>Açıklama</span><textarea name="description" rows={3} /></label>
                  <button className="portalPrimaryButton" type="submit">Araç kaydını uygula</button>
                </form>
              </div>
            </section>
          ) : null}

          {vehicles.length ? (
            <div className="portalDataTableShell">
              <table className="portalDataTable portalVehicleDataTable">
                <thead>
                  <tr>
                    <th scope="col">Araç</th><th scope="col">Platform</th><th scope="col">Takım</th><th scope="col">Proje</th>
                    <th scope="col">Lifecycle</th><th scope="col">Kritiklik</th><th scope="col">Sorumlu</th><th scope="col">Telemetri</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle)=>(
                    <tr key={String(vehicle.id)}>
                      <td className="primaryCell"><div><b>{String(vehicle.name)}</b><small>{String(vehicle.code)} · {String(vehicle.serial_number || "seri yok")}</small></div></td>
                      <td>{String(vehicle.platform_type || vehicle.domain || "—")}</td>
                      <td className="mono">{String(vehicle.team_code || "CORE")}</td>
                      <td className="mono">{String(vehicle.project_slug || "—")}</td>
                      <td><span className={"portalStatusText "+String(vehicle.lifecycle || vehicle.status)}>{String(vehicle.lifecycle || vehicle.status)}</span></td>
                      <td><span className={"portalStatusText "+(String(vehicle.criticality)==="critical"?"critical":"")}>{String(vehicle.criticality || "medium")}</span></td>
                      <td>{String(vehicle.owner_name || "Atanmadı")}</td>
                      <td><div className="portalCellStack"><b>{vehicle.battery == null ? "—" : String(vehicle.battery)+"%"}</b><small>{String(vehicle.telemetry_mode || vehicle.last_seen_at || "telemetri yok")}</small></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <PortalEmpty title="Araç registry boş." text="İlk araç kaydı oluşturulduğunda lifecycle ve sahiplik bilgisiyle burada görünür." />}
        </>
      ) : null}

      {section === "teams" && canTeams ? (
        <>
          <section className="portalRegistryToolbar">
            <div className="portalRegistryTabs"><span className="portalMuted">Takım üyeliği ve takım içi rol atamaları</span></div>
            <div className="portalRegistrySummary"><span>ÜYELİK</span><b>{teamMemberships.length}</b><small>aktif atama</small></div>
            <a className="primary" href={controlHref("teams",{tool:"membership"})}>+ Üyelik ata</a>
          </section>

          {String(query.tool || "") === "membership" ? (
            <section className="portalToolSurface">
              <div className="portalToolBody">
                <div className="portalInlineToolHead">
                  <div><b>Takım üyeliği ata</b><small>Takım rolü ve ek capability değerleri erişim sınırını etkiler.</small></div>
                  <a href={controlHref("teams")}>Kapat</a>
                </div>
                <form className="portalFormGrid controlDense" action={upsertPortalTeamMembershipAction}>
                  <label><span>Takım</span><select name="teamCode" required>{teams.map((team)=><option value={String(team.code)} key={String(team.code)}>{String(team.code)} · {String(team.name)}</option>)}</select></label>
                  <label><span>Üye</span><select name="memberId" required>{activeMembers.map((item)=><option value={String(item.id)} key={String(item.id)}>{String(item.full_name || item.email)}</option>)}</select></label>
                  <label><span>Takım rolü</span><select name="teamRole" defaultValue="engineer"><option value="owner">Takım Sahibi</option><option value="captain">Kaptan</option><option value="lead">Takım Lideri</option><option value="engineer">Mühendis</option><option value="contributor">Katkıcı</option><option value="observer">Gözlemci</option></select></label>
                  <label className="portalFormWide"><span>Ek capability</span><input name="capabilities" placeholder="team.project.manage, team.vehicle.manage" /></label>
                  <button className="portalPrimaryButton" type="submit">Üyeliği uygula</button>
                </form>
              </div>
            </section>
          ) : null}

          {teamMemberships.length ? (
            <div className="portalDataTableShell">
              <table className="portalDataTable portalTeamMembershipTable">
                <thead>
                  <tr><th scope="col">Takım</th><th scope="col">Üye</th><th scope="col">Takım rolü</th><th scope="col">Ek capability</th><th scope="col">Durum</th></tr>
                </thead>
                <tbody>
                  {teamMemberships.map((assignment)=>(
                    <tr key={String(assignment.team_code)+":"+String(assignment.member_id)}>
                      <td className="mono"><b>{String(assignment.team_code)}</b><br/><small>{String(assignment.team_name)}</small></td>
                      <td className="primaryCell"><div><b>{String(assignment.full_name || assignment.email)}</b><small>{String(assignment.email)}</small></div></td>
                      <td>{portalRoleLabelDetailed(String(assignment.team_role))}</td>
                      <td><div className="portalInlineTags">{parseCapabilities(assignment.capabilities_json).slice(0,4).map((cap)=><span key={cap}>{cap}</span>)}</div></td>
                      <td><span className={"portalStatusText "+String(assignment.status || "active")}>{String(assignment.status || "active")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <PortalEmpty title="Takım rol ataması yok." text="İlk üyelik ataması burada takım, üye ve rol bilgisiyle görünür." />}
        </>
      ) : null}

      {section === "roles" && canRoles ? (
        <>
          <section className="portalRegistryToolbar">
            <div className="portalRegistryTabs"><Link prefetch={false} href="/portal/members?roles=1">Rol politikalarını düzenle</Link></div>
            <div className="portalRegistrySummary"><span>GRANT</span><b>{capabilityGrants.length}</b><small>explicit capability</small></div>
            <a className="primary" href={controlHref("roles",{tool:"grant"})}>+ Capability grant</a>
          </section>

          <div className="portalDataTableShell">
            <table className="portalDataTable portalRoleProfileTable">
              <thead><tr><th scope="col">Rol</th><th scope="col">Kapsam</th><th scope="col">Açıklama</th><th scope="col">Capability</th><th scope="col">İşlem</th></tr></thead>
              <tbody>
                {roleProfiles.map((profile)=>{
                  const capabilities=parseCapabilities(profile.capabilities_json);
                  return (
                    <tr key={String(profile.role_key)}>
                      <td className="primaryCell"><div><b>{String(profile.label)}</b><small>{String(profile.role_key)}</small></div></td>
                      <td>{String(profile.scope)}</td>
                      <td>{String(profile.description || "—")}</td>
                      <td className="numeric">{capabilities.length}</td>
                      <td className="rowActions"><Link prefetch={false} href="/portal/members?roles=1">Politikayı aç</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {String(query.tool || "") === "grant" ? (
            <section className="portalToolSurface">
              <div className="portalToolBody">
                <div className="portalInlineToolHead">
                  <div><b>Explicit capability grant</b><small>Rol profilinin dışında kişiye özel yetki ekler.</small></div>
                  <a href={controlHref("roles")}>Kapat</a>
                </div>
                <form className="portalFormGrid compact portalCapabilityGrant" action={grantPortalCapabilityAction}>
                  <label><span>Üye</span><select name="memberId">{activeMembers.map((item)=><option value={String(item.id)} key={String(item.id)}>{String(item.full_name || item.email)} · {portalRoleLabelDetailed(String(item.role))}</option>)}</select></label>
                  <label><span>Capability</span><input name="capability" placeholder="teams.read_all" required /></label>
                  <label className="portalFormWide"><span>Kritik grant onayı</span><input name="confirmation" autoComplete="off" placeholder="Gerekirse: GRANT capability.adı" /><small>Kritik yetkilerde capability adını GRANT önekiyle aynen yaz.</small></label>
                  <button className="portalPrimaryButton" type="submit">Capability grant</button>
                </form>
              </div>
            </section>
          ) : null}

          {capabilityGrants.length ? (
            <div className="portalDataTableShell portalControlSecondaryTable">
              <table className="portalDataTable portalCapabilityGrantTable">
                <thead><tr><th scope="col">Üye</th><th scope="col">Capability</th><th scope="col">Veren</th><th scope="col">İşlem</th></tr></thead>
                <tbody>
                  {capabilityGrants.map((grant)=>(
                    <tr key={String(grant.member_id)+":"+String(grant.capability)}>
                      <td className="primaryCell"><div><b>{String(grant.full_name || grant.email)}</b><small>{String(grant.email)}</small></div></td>
                      <td className="mono">{String(grant.capability)}</td>
                      <td>{String(grant.granted_by)}</td>
                      <td className="rowActions">
                        <form action={revokePortalCapabilityAction}>
                          <input type="hidden" name="memberId" value={String(grant.member_id)} />
                          <input type="hidden" name="capability" value={String(grant.capability)} />
                          <button type="submit">Revoke</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <PortalEmpty title="Explicit capability grant yok." text="Rol dışı özel bir yetki gerektiğinde buradan eklenir." />}
        </>
      ) : null}
    </>
  );
}
