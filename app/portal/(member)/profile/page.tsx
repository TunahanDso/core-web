import { PortalPageHeader } from "@/components/portal/PortalPage";
import { saveProfileAction } from "@/app/portal/actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { getPortalMemberProfile, listMyPortalTasks } from "@/lib/portal/db";
import { portalPriorityLabel, portalRoleLabel, portalTaskStatusLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string }>;
}) {
  const member = await requirePortalMember();
  const [data, tasks, query] = await Promise.all([
    getPortalMemberProfile(member.id),
    listMyPortalTasks(member.id, 8),
    searchParams ?? Promise.resolve<{ saved?: string }>({}),
  ]);
  if (!data) return null;

  const profile = data.profile || {};
  let skills: string[] = [];
  try {
    const parsed = JSON.parse(String(profile.skills_json || "[]"));
    if (Array.isArray(parsed)) skills = parsed.filter((item): item is string => typeof item === "string");
  } catch {
    skills = [];
  }

  return (
    <>
      <PortalPageHeader
        code="ID / PROFİL"
        title={member.fullName || member.email}
        lead={(profile.headline && String(profile.headline)) || portalRoleLabel(member.role) + " · " + (member.teams.length ? member.teams.join(" / ") : "CORE")}
      />

      {query.saved === "1" ? <div className="portalSuccess">Profilin güncellendi.</div> : null}

      <section className="portalProfileGrid">
        <div className="portalPanel">
          <div className="portalPanelHead"><span>PROFİL BİLGİLERİ</span><small>İÇ AĞ</small></div>
          <form className="portalFormGrid profileForm" action={saveProfileAction}>
            <label className="portalFormWide"><span>Profesyonel başlık</span><input name="headline" defaultValue={String(profile.headline || "")} placeholder="Örn. Otonom Sistemler · Gömülü Yazılım" /></label>
            <label className="portalFormWide"><span>Kısa biyografi</span><textarea name="bio" rows={5} defaultValue={String(profile.bio || "")} /></label>
            <label className="portalFormWide"><span>Yetenekler</span><input name="skills" defaultValue={skills.join(", ")} placeholder="C++, STM32, ROS, PCB, CAD..." /></label>
            <label><span>GitHub</span><input name="githubUrl" type="url" defaultValue={String(profile.github_url || "")} /></label>
            <label><span>LinkedIn</span><input name="linkedinUrl" type="url" defaultValue={String(profile.linkedin_url || "")} /></label>
            <label><span>Telefon · iç kullanım</span><input name="phone" defaultValue={String(profile.phone || "")} /></label>
            <label><span>Uygunluk / çalışma notu</span><input name="availability" defaultValue={String(profile.availability || "")} placeholder="Hafta içi 18:00 sonrası..." /></label>
            <button type="submit" className="portalPrimaryButton">PROFİLİ KAYDET →</button>
          </form>
        </div>

        <aside className="portalProfileAside">
          <article>
            <span>HESAP</span>
            <b>{member.email}</b>
            <small>{portalRoleLabel(member.role)} · {member.teams.join(" / ") || "CORE"}</small>
          </article>
          <article>
            <span>AKTİVASYON</span>
            <b>{member.activatedAt ? "AKTİF" : "BEKLİYOR"}</b>
            <small>{member.activatedAt || "—"}</small>
          </article>
          <article>
            <span>SON GİRİŞ</span>
            <b>{member.lastLoginAt ? "KAYITLI" : "İLK OTURUM"}</b>
            <small>{member.lastLoginAt || "—"}</small>
          </article>
        </aside>
      </section>

      <section className="portalPanel">
        <div className="portalPanelHead"><span>BANA ATANAN AÇIK İŞLER</span><a href="/portal/tasks">Tüm görevler →</a></div>
        <div className="portalProfessionalList">
          {tasks.length ? tasks.map((task) => (
            <a href={"/portal/tasks/" + encodeURIComponent(String(task.id))} key={String(task.id)}>
              <span className={"portalPriority " + String(task.priority)}>{portalPriorityLabel(String(task.priority))}</span>
              <div><b>{String(task.title)}</b><small>{String(task.project_slug || task.team_code || "CORE")}</small></div>
              <em>{portalTaskStatusLabel(String(task.status))}</em>
            </a>
          )) : <p className="portalMuted">Şu anda sana atanmış açık görev yok.</p>}
        </div>
      </section>
    </>
  );
}
