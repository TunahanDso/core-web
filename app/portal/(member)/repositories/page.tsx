import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createRepositoryAction } from "@/app/portal/actions";
import { createNativeRepositoryAction } from "@/app/portal/engineering-actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalRepositories } from "@/lib/portal/db";
import {
  getEngineeringServiceStatus,
  listNativeRepositories,
} from "@/lib/portal/engineering-services";

export const dynamic = "force-dynamic";

export default async function PortalRepositoriesPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string }>;
}) {
  const [member, externalRepositories, nativeRepositories, services] = await Promise.all([
    requirePortalMember(),
    listPortalRepositories(),
    listNativeRepositories(),
    Promise.resolve(getEngineeringServiceStatus()),
  ]);
  const query: { created?: string } = searchParams ? await searchParams : {};
  const canWrite = member.role === "admin" || member.role === "lead";

  return (
    <>
      <PortalPageHeader
        code="RP / CORE REPOSITORIES"
        title="Repository Servisi"
        lead="GitHub'ı kaynak-of-truth olmaktan çıkaran, portalın kimlik ve proje katmanına bağlı native Git servis sınırı."
        action={<a className="portalOutlineButton" href="/portal/code-lab">CODE LAB →</a>}
      />

      {query.created === "native" ? <div className="portalSuccess">Native repository CORE Repo Service üzerinde oluşturuldu.</div> : null}

      <section className="repositoryBoundary">
        <article>
          <span>PORTAL CATALOG</span>
          <b>D1 · ownership · permission · audit</b>
          <small>Git object database burada tutulmaz.</small>
        </article>
        <i>→</i>
        <article className={services.repository.configured ? "ready" : "offline"}>
          <span>CORE REPO SERVICE</span>
          <b>{services.repository.configured ? "BAĞLI" : "HENÜZ BAĞLI DEĞİL"}</b>
          <small>Git protocol · refs · commits · diffs · releases</small>
        </article>
        <i>→</i>
        <article>
          <span>OPTIONAL MIRRORS</span>
          <b>GitHub / import / export</b>
          <small>Portalın çalışması için zorunlu değil.</small>
        </article>
      </section>

      {canWrite ? (
        <section className="portalPanel portalCreatePanel">
          <div className="portalPanelHead"><span>NATIVE REPOSITORY OLUŞTUR</span><small>LİDER / ADMİN · AYRI GIT SERVİSİ</small></div>
          <form className="portalFormGrid" action={createNativeRepositoryAction}>
            <label><span>Ad</span><input name="name" placeholder="Hydronom Runtime" required /></label>
            <label><span>Slug</span><input name="slug" placeholder="hydronom-runtime" /></label>
            <label><span>Proje slug</span><input name="projectSlug" placeholder="hydronom" /></label>
            <label><span>Takım</span><input name="teamCode" placeholder="SYS / MAR" /></label>
            <label><span>Görünürlük</span><select name="visibility" defaultValue="private"><option value="private">Özel</option><option value="internal">CORE içi</option><option value="public">Public</option></select></label>
            <button type="submit" className="portalPrimaryButton" disabled={!services.repository.configured}>
              {services.repository.configured ? "CORE REPO OLUŞTUR →" : "REPO SERVİSİ BEKLENİYOR"}
            </button>
          </form>
        </section>
      ) : null}

      {nativeRepositories.length ? (
        <div className="nativeRepoGrid">
          {nativeRepositories.map((item) => (
            <article key={String(item.id)}>
              <header><span>CORE GIT</span><em>{String(item.status).toUpperCase()}</em></header>
              <h3>{String(item.name)}</h3>
              <p>{String(item.project_slug || item.team_code || "CORE")}</p>
              <footer><code>{String(item.slug)}</code><small>{String(item.visibility).toUpperCase()} · {String(item.default_branch)}</small></footer>
            </article>
          ))}
        </div>
      ) : <PortalEmpty title="Native repository henüz yok." text="Repo Service bağlandıktan sonra repository burada oluşturulur; GitHub yalnızca opsiyonel mirror olur." />}

      {canWrite ? (
        <section className="portalPanel portalCreatePanel externalRepoRegistry">
          <div className="portalPanelHead"><span>HARİCİ MIRROR / LEGACY KAYIT</span><small>OPSİYONEL</small></div>
          <form className="portalFormGrid" action={createRepositoryAction}>
            <label><span>Ad</span><input name="name" required /></label>
            <label><span>Harici repo URL</span><input name="repoUrl" type="url" required /></label>
            <label><span>Proje slug</span><input name="projectSlug" /></label>
            <label><span>Takım</span><input name="teamCode" /></label>
            <label><span>Görünürlük</span><select name="visibility" defaultValue="private"><option value="private">Özel</option><option value="internal">İç</option><option value="public">Public</option></select></label>
            <button type="submit" className="portalOutlineButton">MIRROR KAYDI EKLE</button>
          </form>
        </section>
      ) : null}

      {externalRepositories.length ? (
        <section className="portalPanel externalRepoRegistry">
          <div className="portalPanelHead"><span>HARİCİ REPO KAYITLARI</span><small>{externalRepositories.length} MIRROR / LEGACY</small></div>
          <div className="portalRepoList">
            {externalRepositories.map((item) => (
              <a href={String(item.repo_url)} target="_blank" rel="noreferrer" key={String(item.id)}>
                <span>EXT</span>
                <div><b>{String(item.name)}</b><small>{String(item.project_slug || item.team_code || "CORE")}</small></div>
                <em>{String(item.visibility).toUpperCase()}</em>
                <strong>{String(item.health).toUpperCase()}</strong>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
