import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createRepositoryAction } from "@/app/portal/actions";
import { createNativeRepositoryAction } from "@/app/portal/engineering-actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { getEngineeringServiceStatus } from "@/lib/portal/engineering-services";
import { listAccessibleRepositoryCatalog } from "@/lib/portal/repositories";

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
  const [catalog, services] = await Promise.all([
    listAccessibleRepositoryCatalog(member),
    Promise.resolve(getEngineeringServiceStatus()),
  ]);
  const query = searchParams ? await searchParams : {};
  const canWrite = member.role === "admin" || member.role === "lead";
  const scope=["workspace","external"].includes(String(query.scope)) ? String(query.scope) : "all";
  const visibleCatalog=scope==="all" ? catalog : catalog.filter((item)=>item.kind===scope);
  const action=canWrite && ["native","external"].includes(String(query.action)) ? String(query.action) : "";

  return (
    <>
      <PortalPageHeader
        code="REPOSITORIES"
        title="Repository Servisi"
        lead="CORE workspace ve harici Git kaynaklarını tek katalogda karşılaştır; gerçek Git remote ile R2 snapshot fallback arasındaki sınırı açık tut."
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
            services.repository.mode === "snapshot-r2"
              ? "R2 SNAPSHOT FALLBACK"
              : services.repository.configured
                ? "External service bağlı"
                : "Servis bağlı değil"
          }</b>
          <small>{
            services.repository.mode === "snapshot-r2"
              ? "revision snapshots · browser workspace · clone/push yok"
              : "refs · commits · diffs · releases"
          }</small>
        </article>
        <article>
          <span>MIRROR</span>
          <b>Git remote / mirror</b>
          <small>Clone/push yalnız gerçek CORE Repo Service veya harici Git kaynağında</small>
        </article>
      </section>

      <section className="portalRegistryToolbar">
        <nav className="portalSegmentedControl" aria-label="Repository kapsamı">
          <a className={scope === "all" ? "active" : ""} href="/portal/repositories">Tümü</a>
          <a className={scope === "workspace" ? "active" : ""} href="/portal/repositories?scope=workspace">CORE Workspace</a>
          <a className={scope === "external" ? "active" : ""} href="/portal/repositories?scope=external">Harici Git</a>
        </nav>

        <div className="portalRegistrySummary">
          <span>KATALOG</span>
          <b>{visibleCatalog.length}</b>
          <small>repository kaydı</small>
        </div>

        {canWrite ? (
          <div className="portalInlineTags">
            <a className="primary" href={repoHref({scope,action:"native"})}>+ Workspace</a>
            <a className="portalOutlineButton" href={repoHref({scope,action:"external"})}>+ Harici Git</a>
          </div>
        ) : null}
      </section>

      {action === "native" ? (
        <section className="portalToolSurface">
          <div className="portalToolBody">
            <div className="portalInlineToolHead">
              <div><b>CORE workspace oluştur</b><small>Gerçek Repo Service bağlıysa Git backend kullanılır; aksi halde R2 snapshot workspace oluşturulur ve clone/push sunulmaz.</small></div>
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
                {services.repository.configured ? "Workspace oluştur" : "Repo servisi bekleniyor"}
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

      {visibleCatalog.length ? (
        <div className="portalDataTableShell">
          <table className="portalDataTable portalRepositoryDataTable">
            <thead>
              <tr>
                <th scope="col">Repository</th>
                <th scope="col">Tür</th>
                <th scope="col">Kapsam</th>
                <th scope="col">Görünürlük</th>
                <th scope="col">Durum</th>
                <th scope="col">Branch</th>
                <th scope="col">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {visibleCatalog.map((item)=>(
                <tr key={item.id}>
                  <td className="primaryCell">
                    <div><b>{item.name}</b><small>{item.slug || item.source}</small></div>
                  </td>
                  <td>{item.kind === "workspace" ? "CORE Workspace" : "Harici Git"}</td>
                  <td className="mono">{item.projectSlug || item.teamCode || "CORE"}</td>
                  <td>{item.visibility}</td>
                  <td><span className={"portalStatusText "+(item.status==="ready"||item.status==="healthy"?"ready":"")}>{item.status}</span></td>
                  <td className="mono">{item.defaultBranch || "—"}</td>
                  <td className="rowActions">
                    {item.href ? (
                      <a href={item.href} target={item.kind==="external"?"_blank":undefined} rel={item.kind==="external"?"noreferrer":undefined}>
                        {item.kind==="workspace"?"Workspace":"Git kaynağını aç ↗"}
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <PortalEmpty title="Repository kataloğu boş." text="CORE workspace veya harici Git kaydı eklediğinde tek katalogda görünür." />
      )}
    </>
  );
}
