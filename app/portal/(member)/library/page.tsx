import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createResourceAction } from "@/app/portal/actions";
import { listPortalResources } from "@/lib/portal/db";
import { portalResourceKindLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalKütüphanePage() {
  const resources = await listPortalResources();

  return (
    <>
      <PortalPageHeader
        code="KB / KÜTÜPHANE"
        title="Bilgi Kütüphanesi"
        lead="CORE tarafından üretilen rapor, prosedür, veri seti, çizim, kod referansı ve kanıtların aranabilir indeksi."
      />

      <section className="portalPanel portalCreatePanel">
        <div className="portalPanelHead"><span>BİLGİ KAYDI EKLE</span><small>ÖNCE BAĞLANTI / İNDEKS · R2 YÜKLEME SONRA</small></div>
        <form className="portalFormGrid" action={createResourceAction}>
          <label>
            <span>Tür</span>
            <select name="kind" defaultValue="document">
              <option value="document">Doküman</option><option value="archive">Arşiv</option>
              <option value="library">Kütüphane</option><option value="drawing">Çizim</option>
              <option value="pcb">PCB</option><option value="bom">BOM</option>
              <option value="code">Kod</option><option value="procedure">Prosedür</option>
              <option value="dataset">Veri Seti</option><option value="media">Medya</option>
            </select>
          </label>
          <label><span>Başlık</span><input name="title" required /></label>
          <label><span>Takım</span><input name="teamKod" placeholder="MAR / SYS / EMB" /></label>
          <label><span>Proje slug</span><input name="projectSlug" placeholder="hydronom" /></label>
          <label className="portalFormWide"><span>Harici URL</span><input name="externalUrl" type="url" placeholder="https://..." /></label>
          <label className="portalFormWide"><span>Açıklama</span><textarea name="description" rows={3} /></label>
          <label className="portalFormWide"><span>Etiketler</span><input name="tags" placeholder="navigation, imu, smoke-test" /></label>
          <button type="submit" className="portalPrimaryButton">KÜTÜPHANEYE EKLE →</button>
        </form>
      </section>

      {resources.length ? (
        <div className="portalResourceGrid">
          {resources.map((item) => (
            <article key={String(item.id)}>
              <div><span>{portalResourceKindLabel(String(item.kind))}</span><small>{String(item.team_code || "CORE")}</small></div>
              <h3>{String(item.title)}</h3>
              <p>{String(item.description || "")}</p>
              <footer>
                <small>{String(item.project_slug || "institutional")}</small>
                {item.external_url ? <a href={String(item.external_url)} target="_blank" rel="noreferrer">AÇ ↗</a> : <span>İNDEKSLENDİ</span>}
              </footer>
            </article>
          ))}
        </div>
      ) : <PortalEmpty title="Kütüphane hazır." text="İlk raporu, çizimi, prosedürü veya veri setini yukarıdan kaydet." />}
    </>
  );
}
