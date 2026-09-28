import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalResources } from "@/lib/portal/db";
import { formatVaultBytes, listPortalVaultFiles } from "@/lib/portal/vault";

export const dynamic = "force-dynamic";

export default async function PortalArchivePage() {
  const member = await requirePortalMember();
  const [archived, explicitArchive, legacy] = await Promise.all([
    listPortalVaultFiles({ lifecycle: "archived", limit: 300, viewer: member }),
    listPortalVaultFiles({ kind: "archive", lifecycle: "active", limit: 150, viewer: member }),
    listPortalResources("archive"),
  ]);

  const files = [...archived, ...explicitArchive.filter((candidate) =>
    !archived.some((item) => String(item.id) === String(candidate.id))
  )];

  return (
    <>
      <PortalPageHeader
        code="AR / ARŞİV"
        title="Mühendislik Arşivi"
        lead="Emekli tasarımlar, tarihsel test kanıtları ve eski revision kaynakları silinmeden CORE Vault yaşam döngüsünde korunur."
        action={<a className="portalOutlineButton" href="/portal/library?state=archived">VAULT ARŞİVİNİ AÇ →</a>}
      />

      {files.length ? (
        <div className="vaultFileGrid">
          {files.map((item) => (
            <a href={"/portal/library/" + encodeURIComponent(String(item.id))} key={String(item.id)}>
              <header><span>ARCHIVE</span><small>R{String(item.revision)}</small></header>
              <div className="vaultFileIcon">{String(item.extension || "ARC").toUpperCase()}</div>
              <h3>{String(item.title)}</h3>
              <p>{String(item.description || item.original_name)}</p>
              <footer><span>{String(item.project_slug || item.team_code || "CORE")}</span><small>{formatVaultBytes(item.size_bytes)}</small></footer>
            </a>
          ))}
        </div>
      ) : <PortalEmpty title="Vault arşivi boş." text="Bir tasarım veya dosya yaşam döngüsünü Arşiv yaptığında burada görünür." />}

      {legacy.length ? (
        <section className="portalPanel vaultLegacyIndex">
          <div className="portalPanelHead"><span>V1 TARİHSEL İNDEKS</span><small>{legacy.length} KAYIT · SİLİNMEDİ</small></div>
          <div className="portalResourceGrid">
            {legacy.map((item) => (
              <article key={String(item.id)}>
                <div><span>LEGACY</span><small>{String(item.team_code || "CORE")}</small></div>
                <h3>{String(item.title)}</h3><p>{String(item.description || "")}</p>
                <footer><small>{String(item.project_slug || "archive")}</small>{item.external_url ? <a href={String(item.external_url)}>AÇ ↗</a> : <span>INDEX</span>}</footer>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
