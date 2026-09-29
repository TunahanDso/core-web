import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import VaultUploadForm from "@/components/portal/VaultUploadForm";
import { listPortalResources } from "@/lib/portal/db";
import { formatVaultBytes, listPortalVaultFiles } from "@/lib/portal/vault";
import { portalResourceKindLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalKütüphanePage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; kind?: string; state?: string; upload?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const q = String(query.q || "").trim();
  const kind = String(query.kind || "").trim();
  const lifecycle = ["active","archived","trashed"].includes(String(query.state))
    ? String(query.state) as "active" | "archived" | "trashed"
    : "active";

  const member = await requirePortalMember();
  const [vaultFiles, legacyResources] = await Promise.all([
    listPortalVaultFiles({ query: q || undefined, kind: kind || undefined, lifecycle, viewer: member }),
    listPortalResources(),
  ]);

  return (
    <>
      <PortalPageHeader
        code="DOSYALAR"
        title="Mühendislik Dosyaları"
        lead="Teknik dosyaları proje, revizyon ve sahiplik bağlamıyla bul, incele ve sürümle."
        action={<a className="portalPrimaryButton" href="/portal/library?upload=1#upload">YÜKLE ↑</a>}
      />

      <section className="vaultLibraryToolbar portalWorkbenchToolbar">
        <form method="get" action="/portal/library">
          <label className="vaultSearchInput">
            <span>ARA</span>
            <input name="q" defaultValue={q} placeholder="Dosya, proje, takım veya etiket..." />
          </label>
          <label>
            <span>TÜR</span>
            <select name="kind" defaultValue={kind}>
              <option value="">Tümü</option>
              <option value="document">Doküman</option>
              <option value="cad">CAD</option>
              <option value="mechanical">Mekanik</option>
              <option value="pcb">PCB</option>
              <option value="electronics">Elektronik</option>
              <option value="code">Kod</option>
              <option value="dataset">Veri</option>
            </select>
          </label>
          <label>
            <span>DURUM</span>
            <select name="state" defaultValue={lifecycle}>
              <option value="active">Aktif</option>
              <option value="archived">Arşiv</option>
              <option value="trashed">Çöp</option>
            </select>
          </label>
          <button type="submit">UYGULA</button>
        </form>
        <div className="vaultLibrarySummary">
          <span>SONUÇ</span>
          <b>{vaultFiles.length}</b>
          <small>{lifecycle === "active" ? "aktif dosya" : lifecycle === "archived" ? "arşiv kaydı" : "çöp kaydı"}</small>
        </div>
      </section>

      {vaultFiles.length ? (
        <div className="vaultFileGrid">
          {vaultFiles.map((item) => (
            <a href={"/portal/library/" + encodeURIComponent(String(item.id))} key={String(item.id)}>
              <header>
                <span>{String(item.kind).toUpperCase()}</span>
                <small>R{String(item.revision)} · {String(item.approval_state).toUpperCase()}</small>
              </header>
              <div className="vaultFileIcon">{String(item.extension || "FILE").slice(0,8).toUpperCase()}</div>
              <h3>{String(item.title)}</h3>
              <p>{String(item.description || item.original_name)}</p>
              <footer>
                <span>{String(item.project_slug || item.team_code || "CORE")}</span>
                <small>{formatVaultBytes(item.size_bytes)} · {String(item.preview_kind)}</small>
              </footer>
            </a>
          ))}
        </div>
      ) : (
        <PortalEmpty
          title="Bu görünümde dosya yok."
          text={q || kind ? "Arama veya filtreyi değiştir; sonuç yoksa yeni dosya yükleyebilirsin." : "İlk teknik dosyayı yükle; revizyon ve checksum kaydı otomatik oluşur."}
        />
      )}

      <details className="portalPanel vaultUploadDrawer" id="upload" open={String(query.upload || "") === "1"}>
        <summary>
          <div><span>DOSYA YÜKLE</span><b>Yeni Vault kaydı oluştur</b></div>
          <small>R2 + REVISION + CHECKSUM</small>
        </summary>
        <div className="vaultUploadDrawerBody">
          <VaultUploadForm />
        </div>
      </details>

      {legacyResources.length ? (
        <details className="portalPanel vaultLegacyIndex">
          <summary>
            <div><span>ESKİ BAĞLANTI KAYITLARI</span><b>{legacyResources.length} legacy kayıt</b></div>
            <small>V1 · sadece referans</small>
          </summary>
          <div className="portalResourceGrid">
            {legacyResources.slice(0,24).map((item) => (
              <article key={String(item.id)}>
                <div><span>{portalResourceKindLabel(String(item.kind))}</span><small>{String(item.team_code || "CORE")}</small></div>
                <h3>{String(item.title)}</h3>
                <p>{String(item.description || "")}</p>
                <footer>
                  <small>{String(item.project_slug || "legacy")}</small>
                  {item.external_url ? <a href={String(item.external_url)} target="_blank" rel="noreferrer">HARİCİ AÇ ↗</a> : <span>LEGACY</span>}
                </footer>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </>
  );
}
