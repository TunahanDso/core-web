import Link from "next/link";
import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalResources } from "@/lib/portal/db";
import { formatVaultBytes, listPortalVaultFiles } from "@/lib/portal/vault";
import { portalResourceKindLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

const DOCUMENT_KINDS=["document","procedure","dataset","code","firmware","simulation","drawing"];

export default async function PortalDokümanlarPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; kind?: string; project?: string }>;
}) {
  const query=searchParams ? await searchParams : {};
  const q=String(query.q || "").trim();
  const kind=DOCUMENT_KINDS.includes(String(query.kind)) ? String(query.kind) : "";
  const project=String(query.project || "").trim();

  const member = await requirePortalMember();
  const [files, legacy] = await Promise.all([
    listPortalVaultFiles({
      lifecycle:"active",
      limit:250,
      viewer:member,
      query:q || undefined,
      kind:kind || undefined,
    }),
    listPortalResources(),
  ]);

  const documents = files.filter((item) =>
    DOCUMENT_KINDS.includes(String(item.kind)) &&
    (!project || String(item.project_slug || item.team_code || "CORE") === project)
  );
  const legacyDocs = legacy.filter((item) =>
    ["document","procedure","dataset","code","drawing"].includes(String(item.kind))
  );
  const scopeOptions=Array.from(new Set(
    files
      .filter((item)=>DOCUMENT_KINDS.includes(String(item.kind)))
      .map((item)=>String(item.project_slug || item.team_code || "CORE"))
  )).sort();

  return (
    <>
      <PortalPageHeader
        code="DOKÜMANLAR"
        title="Teknik Dokümanlar"
        lead="Rapor, prosedür, veri seti, çizim ve kod kanıtlarını revizyon, kapsam ve dosya türüyle karşılaştır."
        action={<Link prefetch={false} className="portalOutlineButton" href="/portal/library">Vault</Link>}
      />

      <section className="portalRegistryToolbar">
        <form action="/portal/documents" method="get">
          <label className="grow">
            <span>ARA</span>
            <input name="q" defaultValue={q} placeholder="Başlık, dosya, proje veya açıklama..." />
          </label>
          <label>
            <span>TÜR</span>
            <select name="kind" defaultValue={kind}>
              <option value="">Tümü</option>
              <option value="document">Doküman</option>
              <option value="procedure">Prosedür</option>
              <option value="dataset">Veri seti</option>
              <option value="code">Kod</option>
              <option value="firmware">Firmware</option>
              <option value="simulation">Simülasyon</option>
              <option value="drawing">Çizim</option>
            </select>
          </label>
          <label>
            <span>KAPSAM</span>
            <select name="project" defaultValue={project}>
              <option value="">Tümü</option>
              {scopeOptions.map((item)=><option value={item} key={item}>{item}</option>)}
            </select>
          </label>
          <button type="submit">UYGULA</button>
          {(q || kind || project) ? <Link prefetch={false} className="subtle" href="/portal/documents">Temizle</Link> : null}
        </form>
        <div className="portalRegistrySummary">
          <span>SONUÇ</span>
          <b>{documents.length}</b>
          <small>teknik kayıt</small>
        </div>
      </section>

      {documents.length ? (
        <div className="portalDataTableShell">
          <table className="portalDataTable portalDocumentDataTable">
            <thead>
              <tr>
                <th scope="col">Doküman</th>
                <th scope="col">Tür</th>
                <th scope="col">Revizyon</th>
                <th scope="col">Kapsam</th>
                <th scope="col">Boyut</th>
                <th scope="col">Onay</th>
                <th scope="col">Preview</th>
                <th scope="col">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((item)=>(
                <tr key={String(item.id)}>
                  <td className="primaryCell">
                    <Link prefetch={false} href={"/portal/library/" + encodeURIComponent(String(item.id))}>
                      <b>{String(item.title)}</b>
                      <small>{String(item.description || item.original_name)}</small>
                    </Link>
                  </td>
                  <td><span className="portalStatusText">{String(item.kind)}</span></td>
                  <td className="mono">R{String(item.revision)}</td>
                  <td className="mono">{String(item.project_slug || item.team_code || "CORE")}</td>
                  <td className="numeric">{formatVaultBytes(item.size_bytes)}</td>
                  <td><span className={"portalStatusText "+String(item.approval_state)}>{String(item.approval_state)}</span></td>
                  <td>{String(item.preview_kind || "—")}</td>
                  <td className="rowActions"><Link prefetch={false} href={"/portal/library/" + encodeURIComponent(String(item.id))}>Aç</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <PortalEmpty
          title={files.length ? "Bu filtrelerle teknik doküman yok." : "Vault'ta teknik doküman yok."}
          text={files.length ? "Filtreleri temizle veya farklı bir arama yap." : "İlk rapor veya prosedürü Vault ekranından yükle."}
        />
      )}

      {legacyDocs.length ? (
        <details className="portalToolSurface portalLegacyRegistry">
          <summary>
            <div><b>Legacy doküman indeksi</b><small>V1 migration source · {legacyDocs.length} kayıt</small></div>
            <span>Göster</span>
          </summary>
          <div className="portalToolBody">
            <div className="portalDataTableShell">
              <table className="portalDataTable portalLegacyDocumentTable">
                <thead>
                  <tr>
                    <th scope="col">Kayıt</th>
                    <th scope="col">Tür</th>
                    <th scope="col">Takım</th>
                    <th scope="col">Proje</th>
                    <th scope="col">Kaynak</th>
                  </tr>
                </thead>
                <tbody>
                  {legacyDocs.map((item)=>(
                    <tr key={String(item.id)}>
                      <td className="primaryCell"><div><b>{String(item.title)}</b><small>{String(item.description || "")}</small></div></td>
                      <td>{portalResourceKindLabel(String(item.kind))}</td>
                      <td className="mono">{String(item.team_code || "CORE")}</td>
                      <td className="mono">{String(item.project_slug || "legacy")}</td>
                      <td className="rowActions">{item.external_url ? <a href={String(item.external_url)} target="_blank" rel="noreferrer">Harici aç ↗</a> : <span>Legacy</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      ) : null}
    </>
  );
}
