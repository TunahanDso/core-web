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
        code="VAULT"
        title="Mühendislik Dosyaları"
        lead="Dosyaları revizyon, tür, kapsam, onay durumu ve boyut bilgisiyle tek registry içinde yönet."
        action={<a className="portalPrimaryButton" href="/portal/library?upload=1#upload">+ DOSYA YÜKLE</a>}
      />

      <section className="portalRegistryToolbar vaultLibraryToolbar">
        <form method="get" action="/portal/library">
          <label className="grow">
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
          {(q || kind || lifecycle !== "active") ? <a className="subtle" href="/portal/library">Temizle</a> : null}
        </form>
        <div className="portalRegistrySummary">
          <span>SONUÇ</span>
          <b>{vaultFiles.length}</b>
          <small>{lifecycle === "active" ? "aktif" : lifecycle === "archived" ? "arşiv" : "çöp"}</small>
        </div>
      </section>

      {vaultFiles.length ? (
        <div className="portalDataTableShell">
          <table className="portalDataTable portalVaultDataTable">
            <thead>
              <tr>
                <th scope="col">Dosya</th>
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
              {vaultFiles.map((item)=>(
                <tr key={String(item.id)}>
                  <td className="primaryCell">
                    <a href={"/portal/library/" + encodeURIComponent(String(item.id))}>
                      <b>{String(item.title)}</b>
                      <small>{String(item.original_name || item.description || "")}</small>
                    </a>
                  </td>
                  <td><div className="portalFileTypeCell"><span>{String(item.extension || "FILE").slice(0,8).toUpperCase()}</span><small>{String(item.kind)}</small></div></td>
                  <td className="mono">R{String(item.revision)}</td>
                  <td className="mono">{String(item.project_slug || item.team_code || "CORE")}</td>
                  <td className="numeric">{formatVaultBytes(item.size_bytes)}</td>
                  <td><span className={"portalStatusText "+String(item.approval_state)}>{String(item.approval_state)}</span></td>
                  <td>{String(item.preview_kind || "—")}</td>
                  <td className="rowActions"><a href={"/portal/library/" + encodeURIComponent(String(item.id))}>İncele</a></td>
                </tr>
              ))}
            </tbody>
          </table>
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
        <details className="portalToolSurface portalLegacyRegistry">
          <summary>
            <div><b>Eski bağlantı kayıtları</b><small>V1 · {legacyResources.length} referans</small></div>
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
                  {legacyResources.slice(0,80).map((item)=>(
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
