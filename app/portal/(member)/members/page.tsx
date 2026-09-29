import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { updatePortalRoleProfileAction } from "@/app/portal/control-actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalMembers } from "@/lib/portal/db";
import { listPortalRoleProfiles } from "@/lib/portal/control";
import {
  memberHasPortalCapability,
  PORTAL_CAPABILITY_OPTIONS,
  portalRoleLabelDetailed,
} from "@/lib/portal/governance";
import { portalMemberStatusLabel, portalRoleLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

function safeArray(value: unknown) {
  try {
    const parsed=JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.map((item)=>String(item)) : [];
  } catch {
    return [];
  }
}

function shortLastSeen(value: unknown) {
  const text=String(value || "");
  if (!text) return "Henüz giriş yok";
  const date=new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("tr-TR",{
    dateStyle:"medium",
    timeStyle:"short",
    timeZone:"Europe/Istanbul",
  }).format(date);
}

function memberHref(input: Record<string,string | undefined>) {
  const params=new URLSearchParams();
  Object.entries(input).forEach(([key,value])=>{ if(value) params.set(key,value); });
  const query=params.toString();
  return "/portal/members"+(query?"?"+query:"");
}

export default async function PortalMembersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    roleProfile?: string;
    q?: string;
    status?: string;
    role?: string;
    roles?: string;
  }>;
}) {
  const viewer=await requirePortalMember();
  const canManageRoles=await memberHasPortalCapability(viewer,"roles.manage");
  const [members,roleProfiles] = await Promise.all([
    listPortalMembers(),
    canManageRoles ? listPortalRoleProfiles() : Promise.resolve([]),
  ]);
  const query = searchParams ? await searchParams : {};

  const q=String(query.q || "").trim().toLocaleLowerCase("tr-TR");
  const statusFilter=["active","invited","disabled"].includes(String(query.status)) ? String(query.status) : "";
  const roleFilter=String(query.role || "").trim();
  const rolesOpen=canManageRoles && String(query.roles || "") === "1";

  const roleOptions=Array.from(new Set(members.map((item)=>String(item.role || "")).filter(Boolean))).sort();
  const filtered=members.filter((item)=>{
    if(statusFilter && String(item.status || "") !== statusFilter) return false;
    if(roleFilter && String(item.role || "") !== roleFilter) return false;
    if(q){
      const haystack=[item.full_name,item.email,item.role,item.teams_json]
        .map((value)=>String(value || ""))
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      if(!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <>
      <PortalPageHeader
        code="ÜYELER"
        title="CORE Üyeleri"
        lead="Rol, takım, hesap durumu ve son erişimi tek bakışta karşılaştır."
        action={canManageRoles
          ? <a className="portalOutlineButton" href={memberHref({roles:rolesOpen?undefined:"1",q:query.q,status:statusFilter||undefined,role:roleFilter||undefined})}>
              {rolesOpen ? "ÜYE DİZİNİNE DÖN" : "ROL POLİTİKALARI"}
            </a>
          : undefined}
      />

      {query.roleProfile === "updated" ? <div className="portalSuccess">Rol politikası güncellendi.</div> : null}

      {!rolesOpen ? (
        <>
          <section className="portalRegistryToolbar">
            <form action="/portal/members" method="get">
              <label className="grow">
                <span>ARA</span>
                <input name="q" defaultValue={String(query.q || "")} placeholder="İsim, e-posta, rol veya takım..." />
              </label>
              <label>
                <span>DURUM</span>
                <select name="status" defaultValue={statusFilter}>
                  <option value="">Tümü</option>
                  <option value="active">Aktif</option>
                  <option value="invited">Davetli</option>
                  <option value="disabled">Devre dışı</option>
                </select>
              </label>
              <label>
                <span>ROL</span>
                <select name="role" defaultValue={roleFilter}>
                  <option value="">Tümü</option>
                  {roleOptions.map((role)=><option value={role} key={role}>{portalRoleLabel(role)}</option>)}
                </select>
              </label>
              <button type="submit">UYGULA</button>
              {(q || statusFilter || roleFilter) ? <a className="subtle" href="/portal/members">Temizle</a> : null}
            </form>
            <div className="portalRegistrySummary">
              <span>SONUÇ</span>
              <b>{filtered.length}</b>
              <small>{members.length} üye</small>
            </div>
          </section>

          {filtered.length ? (
            <div className="portalDataTableShell">
              <table className="portalDataTable portalMemberDataTable">
                <thead>
                  <tr>
                    <th scope="col">Üye</th>
                    <th scope="col">Durum</th>
                    <th scope="col">Rol</th>
                    <th scope="col">Takımlar</th>
                    <th scope="col">Son erişim</th>
                    <th scope="col">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item)=>{
                    const teams=safeArray(item.teams_json);
                    const name=String(item.full_name || "Davetli üye");
                    const status=String(item.status || "invited");
                    const initials=name.split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]).join("").toUpperCase() || "MB";
                    return (
                      <tr key={String(item.id)}>
                        <td className="primaryCell">
                          <a className="portalMemberTableIdentity" href={"/portal/members/" + encodeURIComponent(String(item.id))}>
                            <span>{initials}</span>
                            <div><b>{name}</b><small>{String(item.email)}</small></div>
                          </a>
                        </td>
                        <td><span className={"portalStatusText "+status}>{portalMemberStatusLabel(status)}</span></td>
                        <td><b>{portalRoleLabelDetailed(String(item.role))}</b></td>
                        <td>
                          <div className="portalInlineTags">
                            {teams.length ? teams.slice(0,3).map((team)=><span key={team}>{team}</span>) : <span>CORE</span>}
                            {teams.length > 3 ? <span>+{teams.length-3}</span> : null}
                          </div>
                        </td>
                        <td className="mono">{shortLastSeen(item.last_login_at)}</td>
                        <td className="rowActions"><a href={"/portal/members/" + encodeURIComponent(String(item.id))}>Profili aç</a></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <PortalEmpty
              title={members.length ? "Bu filtrelerle üye yok." : "Üye kaydı yok."}
              text={members.length ? "Filtreleri temizle veya daha geniş bir arama dene." : "Yöneticiler ilk öğrenci davetini Admin → Üyeler ekranından oluşturabilir."}
            />
          )}
        </>
      ) : (
        <section className="portalRoleStudio portalRoleStudioCompact">
          <header>
            <div>
              <span>ROL POLİTİKALARI</span>
              <h2>Yetki profilleri</h2>
              <p>Rol açıklamalarını ve server-side capability setlerini burada yönet. Günlük üye dizininden ayrı tutulur.</p>
            </div>
            <small>{roleProfiles.length} profil</small>
          </header>

          <div className="portalRoleProfileList">
            {roleProfiles.map((profile)=>{
              const roleKey=String(profile.role_key);
              const scope=String(profile.scope || "global");
              const selected=new Set(safeArray(profile.capabilities_json));
              const capabilities=PORTAL_CAPABILITY_OPTIONS.filter((capability)=>
                scope === "team" ? capability.startsWith("team.") : !capability.startsWith("team.")
              );
              return (
                <details className="portalToolSurface" key={roleKey}>
                  <summary>
                    <div>
                      <b>{String(profile.label || portalRoleLabelDetailed(roleKey))}</b>
                      <small>{scope === "team" ? "Takım kapsamı" : "Global"} · {selected.size} yetki</small>
                    </div>
                    <span>Yönet</span>
                  </summary>
                  <div className="portalToolBody">
                    <form className="portalRoleProfileEditor" action={updatePortalRoleProfileAction}>
                      <input type="hidden" name="roleKey" value={roleKey} />
                      <label className="portalRoleDescription">
                        <span>Açıklama</span>
                        <textarea name="description" rows={2} defaultValue={String(profile.description || "")} />
                      </label>
                      <div className="portalCapabilityMatrix">
                        {capabilities.map((capability)=>(
                          <label key={capability}>
                            <input
                              type="checkbox"
                              name="capability"
                              value={capability}
                              defaultChecked={roleKey === "admin" && capability === "portal.admin" ? true : selected.has(capability)}
                              disabled={roleKey === "admin" && capability === "portal.admin"}
                            />
                            <span>{capability}</span>
                            {roleKey === "admin" && capability === "portal.admin" ? <input type="hidden" name="capability" value="portal.admin" /> : null}
                          </label>
                        ))}
                      </div>
                      <label className="portalRoleDescription">
                        <span>Yüksek yetki ekleme onayı</span>
                        <input name="confirmation" autoComplete="off" placeholder={"Gerekirse: APPLY " + roleKey} />
                        <small>portal.admin, roles.manage, teams.manage, control.*, project.map.edit veya vault.approve ekleniyorsa bu ifade zorunludur.</small>
                      </label>
                      <button className="portalOutlineButton" type="submit">Rol politikasını kaydet</button>
                    </form>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
