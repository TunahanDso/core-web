import InviteMemberForm from "@/components/admin/InviteMemberForm";
import { portalBootstrapStatus } from "@/lib/portal/bootstrap";
import { listPortalMembers } from "@/lib/portal/db";
import { setPortalMemberStatusAdminAction } from "@/app/admin/portal-actions";
import { portalMemberStatusLabel, portalRoleLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const status = await portalBootstrapStatus();
  const members = status.ready ? await listPortalMembers() : [];

  return (
    <main className="admin adminLight">
      <div className="adminTopline">
        <div>
          <a className="adminBreadcrumb" href="/admin">CORE CONTROL / ADMIN</a>
          <p className="eyebrow">ÜYE ERİŞİMİ · YALNIZCA DAVETLE</p>
        </div>
        <span className={"cmsHealth " + (status.ready ? "online" : "offline")}><i />{status.ready ? "PORTAL HAZIR" : "KURULMADI"}</span>
      </div>

      <h1>Üyeler & Erişim</h1>
      <p>Öğrenci hesaplarını içeriden oluştur. Davet kodları bir kez üretilir, yalnızca hash olarak saklanır, 72 saat sonra sona erer ve öğrenci e-postasına bağlıdır.</p>

      {status.ready ? (
        <>
          <InviteMemberForm />
          <section className="adminMemberTable">
            <header><span>ÜYE</span><span>ROL</span><span>TAKIMLAR</span><span>DURUM</span><span>İŞLEM</span></header>
            {members.map((member) => {
              let teams: string[] = [];
              try { teams = JSON.parse(String(member.teams_json || "[]")); } catch { teams = []; }
              return (
                <article key={String(member.id)}>
                  <div><b>{String(member.full_name || "Davetli üye")}</b><small>{String(member.email)}</small></div>
                  <span>{portalRoleLabel(String(member.role))}</span>
                  <div className="adminTeamChips">{teams.length ? teams.map((team) => <small key={team}>{team}</small>) : <small>CORE</small>}</div>
                  <b className={"memberState " + String(member.status)}>{portalMemberStatusLabel(String(member.status))}</b>
                  <form action={setPortalMemberStatusAdminAction}>
                    <input type="hidden" name="memberId" value={String(member.id)} />
                    <select name="status" defaultValue={String(member.status) === "invited" ? "active" : String(member.status)}>
                      <option value="active">Aktif</option>
                      <option value="suspended">Askıya Al</option>
                      <option value="archived">Arşivle</option>
                    </select>
                    <button type="submit">UYGULA</button>
                  </form>
                </article>
              );
            })}
          </section>
        </>
      ) : (
        <section className="cmsWarning">
          <b>Portal altyapısı kurulmamış.</b>
          <span>Admin ana ekranına dön ve önce iç portalı kur.</span>
        </section>
      )}
    </main>
  );
}
