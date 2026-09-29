import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createRepositoryAction } from "@/app/portal/actions";
import { createNativeRepositoryAction } from "@/app/portal/engineering-actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { getEngineeringServiceStatus } from "@/lib/portal/engineering-services";
import {
  listAccessibleExternalRepositories,
  listAccessibleNativeRepositories,
} from "@/lib/portal/repositories";

export const dynamic = "force-dynamic";

function repoHref(input: Record<string,string | undefined>) {
  const params=new URLSearchParams();
  Object.entries(input).forEach(([key,value])=>{ if(value) params.set(key,value); });
  const query=params.toString();
  return "/portal/repositories"+(query?"?"+query:"");
}

export default async function PortalRepositoriesPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; scope?: string; action?: string }>;
}) {
  const member = await requirePortalMember();
  const [externalRepositories, nativeRepositories, services] = await Promise.all([
    listAccessibleExternalRepositories(member),
    listAccessibleNativeRepositories(member),
    Promise.resolve(getEngineeringServiceStatus()),
  ]);
  const query = searchParams ? await searchParams : {};
  const canWrite = member.role === "admin" || member.role === "lead";
  const scope=String(query.scope || "") === "external" ? "external" : "native";
  const action=canWrite && ["native","external"].includes(String(query.action)) ? String(query.action) : "";

  return (
    <>
      <PortalPageHeader
        code="REPOSITORIES"
        title="Repository Servisi"
        lead="Native repository'leri tek tabloda karşılaştır; servis mimarisini ve harici mirror kayıtlarını ayrı bağlamlarda yönet."
        action={<a className="portalOutlineButton" href="/portal/code-lab">Code Lab</a>}
      />

      {query.created === "native" ? <div className="portalSuccess">Native repository oluşturuldu.</div> : null}
      {query.created === "1" ? <div className="portalSuccess">Harici mirror kaydı eklendi.</div> : null}

      <section className="portalCompactServiceStrip" aria-label="Repository servis durumu">
        <article>
          <span>KATALOG</span>
          <b>D1 · ownership · permission · audit</b>
          <small>Metadata ve erişim politikası</small>
        </article>
        <article>
          <span>CORE REPO ENGINE</span>
          <b>{
            services.repository.mode === "embedded-r2"
              ? "R2 SOURCE OF TRUTH"
              : services.repository.configured
                ? "External service bağlı"
                : "Servis bağlı değil"
          }</b>
          <small>{
            services.repository.mode === "embedded-r2"
              ? "objects · refs · commits · diffs"
              : "refs · commits · diffs · releases"
          }</small>
        </article>
        <article>
          <span>MIRROR</span>
          <b>GitHub / import / export</b>
          <small>Opsiyonel; CORE'un çalışması için zorunlu değil</small>
        </article>
      </section>

      <section className="portalRegistryToolbar">
        <nav className="portalSegmentedControl" aria-label="Repository kapsamı">
          <a className={scope === "native" ? "active" : ""} href="/portal/repositories">Native</a>
          <a className={scope === "external" ? "active" : ""} href="/portal/repositories?scope=external">Harici</a>
        </nav>

        <div className="portalRegistrySummary">
          <span>{scope === "native" ? "NATIVE" : "HARİCİ"}</span>
          <b>{scope === "native" ? nativeRepositories.length : externalRepositories.length}</b>
          <small>repository</small>
        </div>

        {canWrite ? (
          <a
            className="primary"
            href={repoHref({scope,action:scope === "native" ? "native" : "external"})}
          >
            + {scope === "native" ? "Repository oluştur" : "Mirror ekle"}
          </a>
        ) : null}
      </section>

      {action === "native" ? (
        <section className="portalToolSurface">
          <div className="portalToolBody">
            <div className="portalInlineToolHead">
              <div><b>Native repository oluştur</b><small>CORE Repo Engine kaynak-of-truth olarak kullanılır.</small></div>
              <a href={repoHref({scope})}>Kapat</a>
            </div>
            <form className="portalFormGrid" action={createNativeRepositoryAction}>
              <label><span>Ad</span><input name="name" placeholder="Hydronom Runtime" required autoFocus /></label>
              <label><span>Slug</span><input name="slug" placeholder="hydronom-runtime" /></label>
              <label><span>Proje slug</span><input name="projectSlug" placeholder="hydronom" /></label>
              <label><span>Takım</span><input name="teamCode" placeholder="SYS / MAR" /></label>
              <label>
                <span>Görünürlük</span>
                <select name="visibility" defaultValue="private">
                  <option value="private">Özel</option>
                  <option value="internal">CORE içi</option>
                  <option value="public">Public</option>
                </select>
              </label>
              <button type="submit" className="portalPrimaryButton" disabled={!services.repository.configured}>
                {services.repository.configured ? "Repository oluştur" : "Repo engine bekleniyor"}
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {action === "external" ? (
        <section className="portalToolSurface">
          <div className="portalToolBody">
            <div className="portalInlineToolHead">
              <div><b>Harici mirror ekle</b><small>GitHub veya başka bir kaynak yalnız mirror / legacy kayıt olarak bağlanır.</small></div>
              <a href={repoHref({scope})}>Kapat</a>
            </div>
            <form className="portalFormGrid" action={createRepositoryAction}>
              <label><span>Ad</span><input name="name" required autoFocus /></label>
              <label><span>Harici repo URL</span><input name="repoUrl" type="url" required /></label>
              <label><span>Proje slug</span><input name="projectSlug" /></label>
              <label><span>Takım</span><input name="teamCode" /></label>
              <label>
                <span>Görünürlük</span>
                <select name="visibility" defaultValue="private">
                  <option value="private">Özel</option>
                  <option value="internal">İç</option>
                  <option value="public">Public</option>
                </select>
              </label>
              <button type="submit" className="portalOutlineButton">Mirror kaydı ekle</button>
            </form>
          </div>
        </section>
      ) : null}

      {scope === "native" ? (
        nativeRepositories.length ? (
          <div className="portalDataTableShell">
            <table className="portalDataTable portalRepositoryDataTable">
              <thead>
                <tr>
                  <th scope="col">Repository</th>
                  <th scope="col">Durum</th>
                  <th scope="col">Görünürlük</th>
                  <th scope="col">Branch</th>
                  <th scope="col">Sahiplik</th>
                  <th scope="col">Engine</th>
                  <th scope="col">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {nativeRepositories.map((item)=>(
                  <tr key={String(item.id)}>
                    <td className="primaryCell">
                      <a href={"/portal/repositories/" + encodeURIComponent(String(item.slug))}>
                        <b>{String(item.name)}</b>
                        <small>{String(item.slug)}</small>
                      </a>
                    </td>
                    <td><span className={"portalStatusText "+(String(item.status)==="ready"?"ready":"")}>{String(item.status)}</span></td>
                    <td>{String(item.visibility)}</td>
                    <td className="mono">{String(item.default_branch)}</td>
                    <td className="mono">{String(item.team_code || item.project_slug || "CORE")}</td>
                    <td>R2 Native</td>
                    <td className="rowActions"><a href={"/portal/repositories/" + encodeURIComponent(String(item.slug))}>Workspace</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PortalEmpty
            title="Native repository henüz yok."
            text="İlk repository oluşturulduğunda burada branch, görünürlük, sahiplik ve engine bilgisiyle listelenecek."
          />
        )
      ) : (
        externalRepositories.length ? (
          <div className="portalDataTableShell">
            <table className="portalDataTable portalRepositoryDataTable">
              <thead>
                <tr>
                  <th scope="col">Repository</th>
                  <th scope="col">Kapsam</th>
                  <th scope="col">Görünürlük</th>
                  <th scope="col">Sağlık</th>
                  <th scope="col">Kaynak</th>
                </tr>
              </thead>
              <tbody>
                {externalRepositories.map((item)=>(
                  <tr key={String(item.id)}>
                    <td className="primaryCell"><div><b>{String(item.name)}</b><small>{String(item.repo_url)}</small></div></td>
                    <td className="mono">{String(item.project_slug || item.team_code || "CORE")}</td>
                    <td>{String(item.visibility)}</td>
                    <td><span className={"portalStatusText "+(String(item.health)==="healthy"?"active":"")}>{String(item.health)}</span></td>
                    <td className="rowActions"><a href={String(item.repo_url)} target="_blank" rel="noreferrer">Harici aç ↗</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PortalEmpty title="Harici repository kaydı yok." text="Mirror veya legacy kaynak gerektiğinde bu görünümden eklenir." />
        )
      )}
    </>
  );
}
