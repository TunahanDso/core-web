import InviteMemberForm from "@/components/admin/InviteMemberForm";
import { portalBootstrapStatus } from "@/lib/portal/bootstrap";
import { listPortalMembers } from "@/lib/portal/db";
import { setPortalMemberStatusAdminAction } from "@/app/admin/portal-actions";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const status = await portalBootstrapStatus();
  const members = status.ready ? await listPortalMembers() : [];

  return (
    <main className="admin adminLight">
      <div className="adminTopline">
        <div>
          <a className="adminBreadcrumb" href="/admin">CORE CONTROL / ADMIN</a>
          <p className="eyebrow">MEMBER ACCESS · INVITATION ONLY</p>
        </div>
        <span className={"cmsHealth " + (status.ready ? "online" : "offline")}><i />{status.ready ? "PORTAL READY" : "NOT INITIALIZED"}</span>
      </div>

      <h1>Members & Access</h1>
      <p>Create student accounts internally. Invitation codes are generated once, stored only as hashes, expire after 72 hours and are tied to the student email address.</p>

      {status.ready ? (
        <>
          <InviteMemberForm />
          <section className="adminMemberTable">
            <header><span>MEMBER</span><span>ROLE</span><span>TEAMS</span><span>STATUS</span><span>ACTION</span></header>
            {members.map((member) => {
              let teams: string[] = [];
              try { teams = JSON.parse(String(member.teams_json || "[]")); } catch { teams = []; }
              return (
                <article key={String(member.id)}>
                  <div><b>{String(member.full_name || "Invited member")}</b><small>{String(member.email)}</small></div>
                  <span>{String(member.role).toUpperCase()}</span>
                  <div className="adminTeamChips">{teams.length ? teams.map((team) => <small key={team}>{team}</small>) : <small>CORE</small>}</div>
                  <b className={"memberState " + String(member.status)}>{String(member.status).toUpperCase()}</b>
                  <form action={setPortalMemberStatusAdminAction}>
                    <input type="hidden" name="memberId" value={String(member.id)} />
                    <select name="status" defaultValue={String(member.status) === "invited" ? "active" : String(member.status)}>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="archived">Archived</option>
                    </select>
                    <button type="submit">APPLY</button>
                  </form>
                </article>
              );
            })}
          </section>
        </>
      ) : (
        <section className="cmsWarning">
          <b>Portal foundation is not initialized.</b>
          <span>Return to the Admin overview and initialize the internal portal first.</span>
        </section>
      )}
    </main>
  );
}
