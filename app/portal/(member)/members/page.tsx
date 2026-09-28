import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { listPortalMembers } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalMembersPage() {
  const members = await listPortalMembers();
  return (
    <>
      <PortalPageHeader code="MB / MEMBERS" title="CORE Members" lead="The internal people map: role, account state, team membership and recent access." />
      {members.length ? (
        <div className="portalMemberGrid">
          {members.map((member) => {
            let teams: string[] = [];
            try { teams = JSON.parse(String(member.teams_json || "[]")); } catch { teams = []; }
            return (
              <article key={String(member.id)}>
                <div className="portalMemberAvatar">{String(member.full_name || member.email).slice(0,2).toUpperCase()}</div>
                <span>{String(member.role).toUpperCase()}</span>
                <h3>{String(member.full_name || "Invited member")}</h3>
                <p>{String(member.email)}</p>
                <div>{teams.map((team) => <small key={team}>{team}</small>)}</div>
                <footer><b>{String(member.status).toUpperCase()}</b><small>{member.last_login_at ? "Last " + String(member.last_login_at) : "No login yet"}</small></footer>
              </article>
            );
          })}
        </div>
      ) : <PortalEmpty title="No member records." text="Administrators can issue the first student invitation from Admin → Members." />}
    </>
  );
}
