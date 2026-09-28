import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { uploadPortalVaultAction } from "@/app/portal/vault-actions";
import { listPortalResources } from "@/lib/portal/db";
import { formatVaultBytes, listPortalVaultFiles } from "@/lib/portal/vault";
import { portalResourceKindLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalKütüphanePage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; kind?: string; state?: string }>;
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
        code="VA / CORE VAULT"
        title="Mühendislik Kütüphanesi"
        lead="Rapor, kod, PCB, CAD, veri seti ve test kanıtlarını CORE'un kendi R2 deposunda checksum, revision ve proje bağlamıyla sakla."
        action={<a className="portalOutlineButton" href="/portal/mechanical">MEKANİK / CAD →</a>}
      />

      <section className="vaultCapabilityRail">
        <span>R2 OBJECT STORAGE</span><i>+</i><span>D1 METADATA</span><i>+</i><span>SHA-256</span><i>+</i><span>REVISION HISTORY</span><i>+</i><span>BROWSER PREVIEW</span>
      </section>

      <section className="portalPanel portalCreatePanel vaultUploadPanel">
        <div className="portalPanelHead"><span>VAULT'A DOSYA YÜKLE</span><small>İLK DALGA · TEK DOSYA ≤ 25 MB</small></div>
        <form className="portalFormGrid" action={uploadPortalVaultAction}>
          <label>
            <span>Tür</span>
            <select name="kind" defaultValue="document">
              <option value="document">Doküman</option>
              <option value="library">Kütüphane</option>
              <option value="procedure">Prosedür</option>
              <option value="dataset">Veri Seti</option>
              <option value="code">Kod</option>
              <option value="firmware">Firmware</option>
              <option value="simulation">Simülasyon</option>
              <option value="drawing">Çizim</option>
              <option value="mechanical">Mekanik</option>
              <option value="cad">CAD</option>
              <option value="pcb">PCB</option>
              <option value="electronics">Elektronik</option>
              <option value="bom">BOM</option>
              <option value="media">Medya</option>
              <option value="archive">Arşiv</option>
            </select>
          </label>
          <label><span>Başlık</span><input name="title" placeholder="HYD-01 güç dağıtım kartı R1" required /></label>
          <label><span>Takım</span><input name="teamCode" placeholder="MAR / SYS / EMB" /></label>
          <label><span>Proje slug</span><input name="projectSlug" placeholder="hydronom" /></label>
          <label>
            <span>Görünürlük</span>
            <select name="visibility" defaultValue="members">
              <option value="members">Tüm üyeler</option>
              <option value="team">Takım</option>
              <option value="leads">Liderler</option>
              <option value="admins">Admin</option>
            </select>
          </label>
          <label className="portalFormWide"><span>Dosya</span><input name="file" type="file" required /></label>
          <label className="portalFormWide"><span>Açıklama</span><textarea name="description" rows={3} placeholder="Bu revision neyi içeriyor, hangi kararın kanıtı?" /></label>
          <label className="portalFormWide"><span>Etiketler</span><input name="tags" placeholder="navigation, imu, smoke-test, pcb-r1" /></label>
          <button type="submit" className="portalPrimaryButton">R2 VAULT'A YÜKLE →</button>
        </form>
      </section>

      <section className="vaultSearchBar">
        <form method="get" action="/portal/library">
          <input name="q" defaultValue={q} placeholder="Dosya, proje, takım veya etiket ara..." />
          <select name="kind" defaultValue={kind}>
            <option value="">Tüm türler</option>
            <option value="document">Doküman</option>
            <option value="cad">CAD</option>
            <option value="mechanical">Mekanik</option>
            <option value="pcb">PCB</option>
            <option value="electronics">Elektronik</option>
            <option value="code">Kod</option>
            <option value="dataset">Veri</option>
          </select>
          <select name="state" defaultValue={lifecycle}>
            <option value="active">Aktif</option>
            <option value="archived">Arşiv</option>
            <option value="trashed">Çöp</option>
          </select>
          <button type="submit">FİLTRELE</button>
        </form>
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
      ) : <PortalEmpty title="Bu rafta dosya yok." text="İlk teknik dosyayı yukarıdan yükle; R2 object ve revision kaydı birlikte oluşturulur." />}

      {legacyResources.length ? (
        <section className="portalPanel vaultLegacyIndex">
          <div className="portalPanelHead"><span>ESKİ BAĞLANTI İNDEKSİ</span><small>V1 KAYITLARI · SİLİNMEDİ</small></div>
          <div className="portalResourceGrid">
            {legacyResources.slice(0,24).map((item) => (
              <article key={String(item.id)}>
                <div><span>{portalResourceKindLabel(String(item.kind))}</span><small>{String(item.team_code || "CORE")}</small></div>
                <h3>{String(item.title)}</h3>
                <p>{String(item.description || "")}</p>
                <footer>
                  <small>{String(item.project_slug || "legacy")}</small>
                  {item.external_url ? <a href={String(item.external_url)} target="_blank" rel="noreferrer">HARİCİ AÇ ↗</a> : <span>LEGACY INDEX</span>}
                </footer>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
