import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalResources } from "@/lib/portal/db";
import { formatVaultBytes, listPortalVaultFiles } from "@/lib/portal/vault";
import { portalResourceKindLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalDokümanlarPage() {
  const member = await requirePortalMember();
  const [files, legacy] = await Promise.all([
    listPortalVaultFiles({ lifecycle: "active", limit: 250, viewer: member }),
    listPortalResources(),
  ]);
  const documents = files.filter((item) =>
    ["document","procedure","dataset","code","firmware","simulation","drawing"].includes(String(item.kind))
  );
  const legacyDocs = legacy.filter((item) =>
    ["document","procedure","dataset","code","drawing"].includes(String(item.kind))
  );

  return (
    <>
      <PortalPageHeader
        code="DC / DOKÜMANLAR"
        title="Teknik Dokümanlar"
        lead="Rapor, prosedür, veri seti, çizim ve kod kanıtlarını doğrudan CORE Vault revision'larından takip et."
        action={<a className="portalOutlineButton" href="/portal/library">VAULT →</a>}
      />

      {documents.length ? (
        <div className="vaultFileGrid">
          {documents.map((item) => (
            <a href={"/portal/library/" + encodeURIComponent(String(item.id))} key={String(item.id)}>
              <header><span>{String(item.kind).toUpperCase()}</span><small>R{String(item.revision)}</small></header>
              <div className="vaultFileIcon">{String(item.extension || "DOC").toUpperCase()}</div>
              <h3>{String(item.title)}</h3>
              <p>{String(item.description || item.original_name)}</p>
              <footer><span>{String(item.project_slug || item.team_code || "CORE")}</span><small>{formatVaultBytes(item.size_bytes)}</small></footer>
            </a>
          ))}
        </div>
      ) : <PortalEmpty title="Vault'ta teknik doküman yok." text="İlk rapor veya prosedürü Kütüphane / Vault ekranından yükle." />}

      {legacyDocs.length ? (
        <section className="portalPanel vaultLegacyIndex">
          <div className="portalPanelHead"><span>V1 DOKÜMAN İNDEKSİ</span><small>KORUNUYOR · MIGRATION SOURCE</small></div>
          <div className="portalResourceGrid">
            {legacyDocs.map((item) => (
              <article key={String(item.id)}>
                <div><span>{portalResourceKindLabel(String(item.kind))}</span><small>{String(item.team_code || "CORE")}</small></div>
                <h3>{String(item.title)}</h3><p>{String(item.description || "")}</p>
                <footer><small>{String(item.project_slug || "legacy")}</small>{item.external_url ? <a href={String(item.external_url)}>AÇ ↗</a> : <span>LEGACY</span>}</footer>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
