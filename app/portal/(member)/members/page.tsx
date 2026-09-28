import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { listPortalMembers } from "@/lib/portal/db";
import { portalMemberStatusLabel, portalRoleLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalMembersPage() {
  const members = await listPortalMembers();
  return (
    <>
      <PortalPageHeader code="MB / ÜYELER" title="CORE Üyeleri" lead="Rol, hesap durumu, takım üyeliği ve son erişimi gösteren iç ekip haritası." />
      {members.length ? (
        <div className="portalMemberGrid">
          {members.map((member) => {
            let teams: string[] = [];
            try { teams = JSON.parse(String(member.teams_json || "[]")); } catch { teams = []; }
            return (
              <a className="portalMemberCard" href={"/portal/members/" + encodeURIComponent(String(member.id))} key={String(member.id)}>
                <div className="portalMemberAvatar">{String(member.full_name || member.email).slice(0,2).toUpperCase()}</div>
                <span>{portalRoleLabel(String(member.role))}</span>
                <h3>{String(member.full_name || "Davetli üye")}</h3>
                <p>{String(member.email)}</p>
                <div>{teams.map((team) => <small key={team}>{team}</small>)}</div>
                <footer><b>{portalMemberStatusLabel(String(member.status))}</b><small>{member.last_login_at ? "Last " + String(member.last_login_at) : "Henüz giriş yok"}</small></footer>
              </a>
            );
          })}
        </div>
      ) : <PortalEmpty title="Üye kaydı yok." text="Yöneticiler ilk öğrenci davetini Admin → Üyeler ekranından oluşturabilir." />}
    </>
  );
}
