import { PortalPageHeader } from "@/components/portal/PortalPage";
import { getPortalMemberProfile, listMyPortalTasks } from "@/lib/portal/db";
import {
  portalPriorityLabel,
  portalRoleLabel,
  portalTaskStatusLabel,
} from "@/lib/portal/labels";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortalMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, tasks] = await Promise.all([
    getPortalMemberProfile(decodeURIComponent(id)),
    listMyPortalTasks(decodeURIComponent(id), 12),
  ]);
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
        action={<a className="portalOutlineButton" href="/portal/members">← ÜYE DİZİNİ</a>}
      />

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

      <section className="portalPanel">
        <div className="portalPanelHead"><span>ATANMIŞ AÇIK GÖREVLER</span><small>{tasks.length} kayıt</small></div>
        <div className="portalProfessionalList">
          {tasks.length ? tasks.map((task) => (
            <a href={"/portal/tasks/" + encodeURIComponent(String(task.id))} key={String(task.id)}>
              <span className={"portalPriority " + String(task.priority)}>{portalPriorityLabel(String(task.priority))}</span>
              <div><b>{String(task.title)}</b><small>{String(task.project_slug || task.team_code || "CORE")}</small></div>
              <em>{portalTaskStatusLabel(String(task.status))}</em>
            </a>
          )) : <p className="portalMuted">Bu üyeye atanmış açık görev yok.</p>}
        </div>
      </section>
    </>
  );
}
