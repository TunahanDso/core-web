import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createRepositoryAction } from "@/app/portal/actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalRepositories } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalRepositoriesPage() {
  const [member, repositories] = await Promise.all([requirePortalMember(), listPortalRepositories()]);
  const canWrite = member.role === "admin" || member.role === "lead";

  return (
    <>
      <PortalPageHeader code="RP / REPOSITORIES" title="Repo Servisi" lead="Kod sahipliği, proje bağlantıları ve repo sağlığı için tek kayıt noktası. Private GitHub senkronizasyonu tokenları tarayıcıya açmadan bağlanabilir." />

      {canWrite ? (
        <section classAd="portalPanel portalCreatePanel">
          <div classAd="portalPanelHead"><span>REPO KAYDET</span><small>LİDER / ADMİN</small></div>
          <form classAd="portalFormGrid" action={createRepositoryAction}>
            <label><span>Ad</span><input name="name" required /></label>
            <label><span>Repo URL</span><input name="repoUrl" type="url" required /></label>
            <label><span>Proje slug</span><input name="projectSlug" /></label>
            <label><span>Takım</span><input name="teamCode" /></label>
            <label><span>Görünürlük</span><select name="visibility"><option>private</option><option>internal</option><option>public</option></select></label>
            <button type="submit" classAd="portalPrimaryButton">KAYDET →</button>
          </form>
        </section>
      ) : null}

      {repositories.length ? (
        <div classAd="portalRepoList">
          {repositories.map((repo) => (
            <a href={String(repo.repo_url)} target="_blank" rel="noreferrer" key={String(repo.id)}>
              <span>GIT</span>
              <div><b>{String(repo.name)}</b><small>{String(repo.project_slug || repo.team_code || "CORE")}</small></div>
              <em>{String(repo.visibility).toUpperCase()}</em>
              <strong>{String(repo.health).toUpperCase()}</strong>
            </a>
          ))}
        </div>
      ) : <PortalEmpty title="Henüz repo kaydı yok." text="Liderler private veya public repo bağlantılarını yukarıdan kaydedebilir." />}
    </>
  );
}
