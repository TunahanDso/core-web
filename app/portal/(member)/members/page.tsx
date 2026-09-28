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

export default async function PortalMembersPage({
  searchParams,
}: {
  searchParams?: Promise<{ roleProfile?: string }>;
}) {
  const viewer=await requirePortalMember();
  const canManageRoles=await memberHasPortalCapability(viewer,"roles.manage");
  const [members,roleProfiles] = await Promise.all([
    listPortalMembers(),
    canManageRoles ? listPortalRoleProfiles() : Promise.resolve([]),
  ]);
  const query: { roleProfile?: string } = searchParams ? await searchParams : {};

  return (
    <>
      <PortalPageHeader
        code="MB / ÜYELER"
        title="CORE Üyeleri"
        lead="İnsanları yalnız bir isim kutusu olarak değil; rol, takım kapsamı, erişim durumu ve çalışma bağlamıyla gösteren iç ekip dizini."
      />

      {query.roleProfile === "updated" ? <div className="portalSuccess">Rol profili ve capability politikası güncellendi.</div> : null}

      {members.length ? (
        <section className="portalEntityGrid portalMemberDirectory">
          {members.map((member) => {
            const teams=safeArray(member.teams_json);
            const name=String(member.full_name || "Davetli üye");
            const initials=name.split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]).join("").toUpperCase() || "MB";
            const status=String(member.status || "invited");
            return (
              <a className="portalEntityCard portalMemberEntityCard" href={"/portal/members/" + encodeURIComponent(String(member.id))} key={String(member.id)}>
                <header className="portalEntityHeader">
                  <div className="portalEntityMark member">{initials}</div>
                  <div className="portalEntityIdentity">
                    <span className="portalEntityEyebrow">CORE MEMBER</span>
                    <b>{portalRoleLabel(String(member.role))}</b>
                  </div>
                  <span className={"portalEntityState " + status}>{portalMemberStatusLabel(status)}</span>
                </header>

                <div className="portalEntityBody">
                  <h2>{name}</h2>
                  <p className="portalEntityMono">{String(member.email)}</p>
                </div>

                <div className="portalEntityTags">
                  {teams.length
                    ? teams.slice(0,5).map((team)=><span key={team}>{team}</span>)
                    : <span>CORE</span>}
                  {teams.length > 5 ? <span>+{teams.length - 5}</span> : null}
                </div>

                <div className="portalEntityInfoRow">
                  <div><span>GLOBAL ROLE</span><b>{portalRoleLabelDetailed(String(member.role))}</b></div>
                  <div><span>LAST ACCESS</span><b>{shortLastSeen(member.last_login_at)}</b></div>
                </div>

                <footer className="portalEntityFooter">
                  <small>{status === "active" ? "Hesap aktif" : portalMemberStatusLabel(status)}</small>
                  <strong>PROFİL →</strong>
                </footer>
              </a>
            );
          })}
        </section>
      ) : <PortalEmpty title="Üye kaydı yok." text="Yöneticiler ilk öğrenci davetini Admin → Üyeler ekranından oluşturabilir." />}

      {canManageRoles ? (
        <section className="portalRoleStudio">
          <header>
            <div>
              <span>ROLE STUDIO</span>
              <h2>Rol & capability politikası</h2>
              <p>Buradaki capability seçimleri artık yalnız açıklama değil; portalın gerçek server-side authorization motoruna uygulanır.</p>
            </div>
            <small>ADMIN · ROLES.MANAGE</small>
          </header>

          <div className="portalRoleProfileGrid">
            {roleProfiles.map((profile) => {
              const roleKey=String(profile.role_key);
              const scope=String(profile.scope || "global");
              const selected=new Set(safeArray(profile.capabilities_json));
              const capabilities=PORTAL_CAPABILITY_OPTIONS.filter((capability)=>
                scope === "team" ? capability.startsWith("team.") : !capability.startsWith("team.")
              );
              return (
                <form className="portalRoleProfileCard" action={updatePortalRoleProfileAction} key={roleKey}>
                  <input type="hidden" name="roleKey" value={roleKey} />
                  <div className="portalRoleProfileHead">
                    <div>
                      <span>{scope.toUpperCase()} · {roleKey}</span>
                      <h3>{String(profile.label || portalRoleLabelDetailed(roleKey))}</h3>
                    </div>
                    <em>{selected.size} CAP</em>
                  </div>
                  <label className="portalRoleDescription">
                    <span>Açıklama</span>
                    <textarea name="description" rows={3} defaultValue={String(profile.description || "")} />
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
                  <button className="portalOutlineButton" type="submit">ROL POLİTİKASINI KAYDET</button>
                </form>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
