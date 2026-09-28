import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createRepositoryAction } from "@/app/portal/actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalRepositories } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalRepositoriesPage() {
  const [member, repositories] = await Promise.all([
    requirePortalMember(),
    listPortalRepositories(),
  ]);
  const canWrite = member.role === "admin" || member.role === "lead";

  return (
    <>
      <PortalPageHeader
        code="RP / CORE REPOSITORIES"
        title="Repo Servisi"
        lead="Kodun asıl kaynağı CORE içinde tutulabilir. Harici GitHub bağlantısı artık zorunlu değil; istenirse yalnızca mirror olarak eklenir."
      />

      <section className="portalRepoHealth">
        <article><span>CORE NATIVE</span><b>{repositories.filter((repo) => String(repo.provider) === "core").length}</b><small>portal içinde yaşayan repo</small></article>
        <article><span>MIRROR / EXTERNAL</span><b>{repositories.filter((repo) => String(repo.provider) !== "core").length}</b><small>harici kaynak kaydı</small></article>
        <article><span>HEALTHY</span><b>{repositories.filter((repo) => String(repo.health) === "healthy").length}</b><small>CORE snapshot sağlıklı</small></article>
      </section>

      {canWrite ? (
        <section className="portalPanel portalCreatePanel">
          <div className="portalPanelHead"><span>YENİ REPO</span><small>CORE NATIVE DEFAULT</small></div>
          <form className="portalFormGrid" action={createRepositoryAction}>
            <label><span>Repo adı</span><input name="name" required placeholder="hydronom-runtime" /></label>
            <label><span>Proje slug</span><input name="projectSlug" placeholder="hydronom" /></label>
            <label><span>Takım</span><input name="teamCode" placeholder="SYS / EMB / MAR" /></label>
            <label>
              <span>Görünürlük</span>
              <select name="visibility" defaultValue="private">
                <option value="private">Özel</option>
                <option value="internal">İç</option>
                <option value="public">Public</option>
              </select>
            </label>
            <label className="portalFormWide">
              <span>Opsiyonel GitHub mirror URL</span>
              <input name="repoUrl" type="url" placeholder="Boş bırak → CORE Native repo oluştur" />
            </label>
            <button type="submit" className="portalPrimaryButton">REPO OLUŞTUR →</button>
          </form>
        </section>
      ) : null}

      {repositories.length ? (
        <div className="portalRepoCards">
          {repositories.map((repo) => {
            const core = String(repo.provider) === "core";
            return (
              <a href={"/portal/repositories/" + encodeURIComponent(String(repo.id))} key={String(repo.id)}>
                <header>
                  <span>{core ? "CORE NATIVE" : String(repo.provider || "MIRROR").toUpperCase()}</span>
                  <b>{String(repo.visibility).toUpperCase()}</b>
                </header>
                <div className="portalRepoIcon">{core ? "C/" : "GIT"}</div>
                <h3>{String(repo.name)}</h3>
                <p>{String(repo.project_slug || repo.team_code || "CORE")}</p>
                <footer>
                  <small>{String(repo.default_branch || "main")} · {String(repo.health || "unverified")}</small>
                  <b>ÇALIŞMA ALANINI AÇ →</b>
                </footer>
              </a>
            );
          })}
        </div>
      ) : (
        <PortalEmpty title="Henüz repo yok." text="İlk CORE Native repo'yu yukarıdan oluştur; GitHub hesabı gerekmiyor." />
      )}
    </>
  );
}
