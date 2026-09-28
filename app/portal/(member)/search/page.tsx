import { PortalPageHeader } from "@/components/portal/PortalPage";
import { searchPortal } from "@/lib/portal/db";
import { requirePortalMember } from "@/lib/portal/auth";
import { formatVaultBytes, listPortalVaultFiles } from "@/lib/portal/vault";
import { listNativeRepositories } from "@/lib/portal/engineering-services";
import { portalResourceKindLabel, portalTaskStatusLabel, portalRoleLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalSearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const q = String(query.q || "").trim();
  const member = await requirePortalMember();
  const [results, vaultFiles, nativeRepositories] = q
    ? await Promise.all([
        searchPortal(q),
        listPortalVaultFiles({ query: q, lifecycle: "active", limit: 40, viewer: member }),
        listNativeRepositories(),
      ])
    : [
        { tasks: [], resources: [], repositories: [], inventory: [], members: [] },
        [],
        [],
      ];
  const nativeMatches = q
    ? nativeRepositories.filter((item) =>
        [item.name,item.slug,item.project_slug,item.team_code].some((value) => String(value || "").toLowerCase().includes(q.toLowerCase()))
      )
    : [];
  const total = results.tasks.length + results.resources.length + results.repositories.length + results.inventory.length + results.members.length + vaultFiles.length + nativeMatches.length;

  return (
    <>
      <PortalPageHeader
        code="⌕ / GLOBAL SEARCH"
        title={q ? "“" + q + "” için sonuçlar" : "CORE içinde ara"}
        lead="Görevleri, Vault dosyalarını, native/harici repoları, stok kayıtlarını ve üyeleri tek arama yüzeyinden bul."
      />

      <form className="portalSearchHero" action="/portal/search" method="get">
        <input name="q" defaultValue={q} placeholder="Örn. Hydronom, BNO055, STM32, güç kartı..." autoFocus />
        <button type="submit">ARA →</button>
      </form>

      {q ? <div className="portalSearchCount"><b>{total}</b><span>sonuç bulundu</span></div> : null}

      {q && total === 0 ? <div className="portalEmpty"><span>SONUÇ YOK</span><h3>Bu sorguyla eşleşen kayıt bulunamadı.</h3><p>Farklı bir proje adı, parça kodu, kişi veya teknik terim dene.</p></div> : null}

      {vaultFiles.length ? <section className="portalSearchSection"><h2>CORE Vault</h2><div className="portalSearchResults">
        {vaultFiles.map((item) => <a href={"/portal/library/" + encodeURIComponent(String(item.id))} key={String(item.id)}><span>{String(item.extension || item.kind || "FILE").toUpperCase()}</span><div><b>{String(item.title)}</b><small>{String(item.description || item.original_name || "")}</small></div><em>R{String(item.revision)} · {formatVaultBytes(item.size_bytes)}</em></a>)}
      </div></section> : null}

      {results.tasks.length ? <section className="portalSearchSection"><h2>Görevler</h2><div className="portalSearchResults">
        {results.tasks.map((item) => <a href={"/portal/tasks/" + item.id} key={String(item.id)}><span>TASK</span><div><b>{String(item.title)}</b><small>{String(item.description || "")}</small></div><em>{portalTaskStatusLabel(String(item.status))}</em></a>)}
      </div></section> : null}

      {results.resources.length ? <section className="portalSearchSection"><h2>Bilgi & Doküman</h2><div className="portalSearchResults">
        {results.resources.map((item) => <a href={item.external_url ? String(item.external_url) : "/portal/library"} key={String(item.id)}><span>{portalResourceKindLabel(String(item.kind))}</span><div><b>{String(item.title)}</b><small>{String(item.description || "")}</small></div><em>{String(item.project_slug || "CORE")}</em></a>)}
      </div></section> : null}

      {nativeMatches.length ? <section className="portalSearchSection"><h2>CORE Native Repolar</h2><div className="portalSearchResults">
        {nativeMatches.map((item) => <a href="/portal/repositories" key={String(item.id)}><span>CORE GIT</span><div><b>{String(item.name)}</b><small>{String(item.project_slug || item.team_code || "CORE")}</small></div><em>{String(item.status || "")}</em></a>)}
      </div></section> : null}

      {results.repositories.length ? <section className="portalSearchSection"><h2>Repolar</h2><div className="portalSearchResults">
        {results.repositories.map((item) => <a href={String(item.repo_url)} target="_blank" rel="noreferrer" key={String(item.id)}><span>GIT</span><div><b>{String(item.name)}</b><small>{String(item.project_slug || item.team_code || "CORE")}</small></div><em>{String(item.health || "")}</em></a>)}
      </div></section> : null}

      {results.inventory.length ? <section className="portalSearchSection"><h2>Stok</h2><div className="portalSearchResults">
        {results.inventory.map((item) => <a href="/portal/inventory" key={String(item.id)}><span>{String(item.sku)}</span><div><b>{String(item.name)}</b><small>{String(item.category)} · {String(item.location || "Konum yok")}</small></div><em>{String(item.quantity)} {String(item.unit)}</em></a>)}
      </div></section> : null}

      {results.members.length ? <section className="portalSearchSection"><h2>Üyeler</h2><div className="portalSearchResults">
        {results.members.map((item) => <a href={"/portal/members/" + encodeURIComponent(String(item.id))} key={String(item.id)}><span>ÜYE</span><div><b>{String(item.full_name || item.email)}</b><small>{String(item.email)}</small></div><em>{portalRoleLabel(String(item.role))}</em></a>)}
      </div></section> : null}
    </>
  );
}
