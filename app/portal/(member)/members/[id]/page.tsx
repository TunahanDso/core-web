import Link from "next/link";
import { PortalPageHeader } from "@/components/portal/PortalPage";
import { updatePortalMemberGlobalRoleAction } from "@/app/portal/control-actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { getPortalMemberProfile, listMyPortalTasks } from "@/lib/portal/db";
import {
  portalPriorityLabel,
  portalRoleLabel,
  portalTaskStatusLabel,
} from "@/lib/portal/labels";
import { notFound } from "next/navigation";
import {
  listPortalMemberCapabilities,
  listPortalMemberTeamMemberships,
  memberHasPortalCapability,
  portalRoleLabelDetailed,
} from "@/lib/portal/governance";

export const dynamic = "force-dynamic";

export default async function PortalMemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ role?: string }>;
}) {
  const viewer = await requirePortalMember();
  const { id } = await params;
  const memberId = decodeURIComponent(id);
  const [data, tasks, memberships, capabilities, canManageRoles] = await Promise.all([
    getPortalMemberProfile(memberId),
    listMyPortalTasks(memberId, 12),
    listPortalMemberTeamMemberships(memberId),
    listPortalMemberCapabilities(memberId),
    memberHasPortalCapability(viewer,"roles.manage"),
  ]);
  const query: { role?: string } = searchParams ? await searchParams : {};
  if (!data) notFound();

  const member = data.member;
  const profile = data.profile || {};
  let teams: string[] = [];
  let skills: string[] = [];
  try {
    const parsed = JSON.parse(String(member.teams_json || "[]"));
    if (Array.isArray(parsed)) teams = parsed.filter((item): item is string => typeof item === "string");
  } catch { teams = []; }
  try {
    const parsed = JSON.parse(String(profile.skills_json || "[]"));
    if (Array.isArray(parsed)) skills = parsed.filter((item): item is string => typeof item === "string");
  } catch { skills = []; }

  return (
    <>
      <PortalPageHeader
        code="MB / ÜYE PROFİLİ"
        title={String(member.full_name || member.email)}
        lead={String(profile.headline || portalRoleLabel(String(member.role)))}
        action={<Link prefetch={false} className="portalOutlineButton" href="/portal/members">← ÜYE DİZİNİ</Link>}
      />

      {query.role === "updated" ? <div className="portalSuccess">Üyenin global portal rolü güncellendi.</div> : null}

      <section className="portalMemberProfileHero">
        <div className="portalMemberProfileMain">
          <span>HAKKINDA</span>
          <p>{String(profile.bio || "Bu üye henüz profil açıklaması eklemedi.")}</p>
          <div className="portalSkillCloud">
            {skills.length ? skills.map((skill) => <b key={skill}>{skill}</b>) : <small>Yetenek bilgisi eklenmemiş.</small>}
          </div>
        </div>
        <aside>
          <div><span>ROL</span><b>{portalRoleLabel(String(member.role))}</b></div>
          <div><span>TAKIMLAR</span><b>{teams.join(" / ") || "CORE"}</b></div>
          <div><span>E-POSTA</span><b>{String(member.email)}</b></div>
          <div><span>UYGUNLUK</span><b>{String(profile.availability || "Belirtilmedi")}</b></div>
          {profile.github_url ? <a href={String(profile.github_url)} target="_blank" rel="noreferrer">GitHub ↗</a> : null}
          {profile.linkedin_url ? <a href={String(profile.linkedin_url)} target="_blank" rel="noreferrer">LinkedIn ↗</a> : null}
        </aside>
      </section>

      <section className="portalMemberRoleGrid">
        <article className="portalGlobalRoleCard">
          <span>GLOBAL ROLE</span>
          <b>{portalRoleLabelDetailed(String(member.role))}</b>
          <p>Portalın genel yetki katmanı. Takım içi rol bundan bağımsız olarak scope bazında atanabilir.</p>
          {canManageRoles ? (
            <form className="portalInlineRoleEditor" action={updatePortalMemberGlobalRoleAction}>
              <input type="hidden" name="memberId" value={String(member.id)} />
              <select name="role" defaultValue={String(member.role)}>
                <option value="admin">Portal Yöneticisi</option>
                <option value="lead">Program / Takım Lideri</option>
                <option value="member">Mühendis / Üye</option>
                <option value="alumni">Mezun</option>
                <option value="viewer">Görüntüleyici</option>
              </select>
              <button className="portalOutlineButton" type="submit">GLOBAL ROLÜ UYGULA</button>
            </form>
          ) : null}
        </article>
        <article>
          <span>TEAM ROLES</span>
          <div className="portalMemberTeamRoles">
            {memberships.length ? memberships.map((membership) => (
              <Link prefetch={false} href={"/portal/teams/" + encodeURIComponent(String(membership.team_code))} key={String(membership.team_code)}>
                <b>{String(membership.team_code)}</b>
                <span>{portalRoleLabelDetailed(String(membership.team_role))}</span>
              </Link>
            )) : teams.length ? teams.map((team) => (
              <Link prefetch={false} href={"/portal/teams/" + encodeURIComponent(team)} key={team}>
                <b>{team}</b><span>Legacy üyelik</span>
              </Link>
            )) : <small>Takım scope'u atanmadı.</small>}
          </div>
        </article>
        <article>
          <span>EXPLICIT CAPABILITIES</span>
          <div className="portalMemberCapabilities">
            {capabilities.length
              ? capabilities.map((capability) => <code key={capability}>{capability}</code>)
              : <small>Ek capability grant'i yok.</small>}
          </div>
        </article>
      </section>

      <section className="portalPanel">
        <div className="portalPanelHead"><span>ATANMIŞ AÇIK GÖREVLER</span><small>{tasks.length} kayıt</small></div>
        <div className="portalProfessionalList">
          {tasks.length ? tasks.map((task) => (
            <Link prefetch={false} href={"/portal/tasks/" + encodeURIComponent(String(task.id))} key={String(task.id)}>
              <span className={"portalPriority " + String(task.priority)}>{portalPriorityLabel(String(task.priority))}</span>
              <div><b>{String(task.title)}</b><small>{String(task.project_slug || task.team_code || "CORE")}</small></div>
              <em>{portalTaskStatusLabel(String(task.status))}</em>
            </Link>
          )) : <p className="portalMuted">Bu üyeye atanmış açık görev yok.</p>}
        </div>
      </section>
    </>
  );
}
