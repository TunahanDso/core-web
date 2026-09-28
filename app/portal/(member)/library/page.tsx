import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createResourceAction, uploadLibraryFileAction } from "@/app/portal/actions";
import { listPortalResources } from "@/lib/portal/db";
import { listPortalFiles } from "@/lib/portal/files";
import { portalResourceKindLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

function formatBytes(value: unknown) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B","KB","MB","GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / Math.pow(1024,index);
  return amount.toFixed(index === 0 ? 0 : amount >= 10 ? 1 : 2) + " " + units[index];
}

export default async function PortalLibraryPage() {
  const [files, resources] = await Promise.all([
    listPortalFiles({ limit: 250 }),
    listPortalResources(),
  ]);

  const linkedOnly = resources.filter((item) => item.external_url && !item.object_key);

  return (
    <>
      <PortalPageHeader
        code="KB / CORE VAULT"
        title="Mühendislik Kütüphanesi"
        lead="Dosyanın aslı CORE'da kalır. Raporlar, kod, CAD, PCB, BOM, veri setleri ve test kanıtları R2 üzerinde sürümlenir; D1 proje, takım ve teknik bağlamını tutar."
      />

      <section className="portalLibraryHealth">
        <article><span>CORE DOSYALARI</span><b>{files.length}</b><small>R2 üzerinde saklanan kayıt</small></article>
        <article><span>SÜRÜMLÜ</span><b>{files.filter((file) => Number(file.version_count || 0) > 1).length}</b><small>birden fazla revizyon</small></article>
        <article><span>3B / CAD</span><b>{files.filter((file) => ["stl","cad"].includes(String(file.preview_kind))).length}</b><small>mekanik kaynak</small></article>
        <article><span>PCB</span><b>{files.filter((file) => ["kicad-pcb","pcb"].includes(String(file.preview_kind))).length}</b><small>elektronik kaynak</small></article>
        <article><span>HARİCİ BAĞLANTI</span><b>{linkedOnly.length}</b><small>legacy / referans kayıt</small></article>
      </section>

      <section className="portalPanel portalLibraryUpload">
        <div className="portalPanelHead"><span>CORE'A DOSYA YÜKLE</span><small>R2 STORAGE · D1 INDEX · VERSION READY</small></div>
        <form className="portalFormGrid" action={uploadLibraryFileAction}>
          <label className="portalFormWide">
            <span>Dosya · en fazla 25 MB</span>
            <input name="file" type="file" required />
          </label>
          <label>
            <span>Tür</span>
            <select name="kind" defaultValue="document">
              <option value="document">Doküman</option>
              <option value="archive">Arşiv</option>
              <option value="library">Kütüphane</option>
              <option value="drawing">CAD / Çizim</option>
              <option value="pcb">PCB / Şema</option>
              <option value="bom">BOM</option>
              <option value="code">Kod</option>
              <option value="procedure">Prosedür</option>
              <option value="dataset">Veri Seti</option>
              <option value="media">Medya</option>
            </select>
          </label>
          <label><span>Başlık</span><input name="title" placeholder="Boş bırakılırsa dosya adı kullanılır" /></label>
          <label><span>Takım</span><input name="teamCode" placeholder="MAR / SYS / EMB / IND..." /></label>
          <label><span>Proje slug</span><input name="projectSlug" placeholder="hydronom" /></label>
          <label className="portalFormWide"><span>Açıklama</span><textarea name="description" rows={3} placeholder="Bu dosya neyi temsil ediyor, hangi karar/test/üretim adımıyla ilişkili?" /></label>
          <label><span>İlk sürüm notu</span><input name="versionNote" placeholder="Rev.A · ilk tasarım" /></label>
          <label><span>Etiketler</span><input name="tags" placeholder="imu, pcb, power, test, cad" /></label>
          <button type="submit" className="portalPrimaryButton">CORE VAULT'A YÜKLE →</button>
        </form>
      </section>

      <section className="portalLibraryToolbar">
        <div><span>DESTEKLENEN ÖNİZLEME</span><b>PDF · IMAGE · TEXT/CODE · CSV · STL/OBJ · KICAD PCB</b></div>
        <div><span>NATIVE STORAGE</span><b>STEP · IGES · SLDPRT · F3D · GERBER · ZIP · BINARY</b></div>
      </section>

      {files.length ? (
        <div className="portalVaultGrid">
          {files.map((file) => (
            <a className="portalVaultCard" href={"/portal/files/" + encodeURIComponent(String(file.id))} key={String(file.id)}>
              <header>
                <span>{String(file.preview_kind || "file").toUpperCase()}</span>
                <small>{formatBytes(file.size_bytes)}</small>
              </header>
              <div className={"portalFileGlyph " + String(file.preview_kind || "download")}>
                {String(file.extension || "FILE").slice(0,8).toUpperCase()}
              </div>
              <h3>{String(file.name)}</h3>
              <p>{String(file.project_slug || file.team_code || "CORE")}</p>
              <footer>
                <small>v{String(file.version_count || 1)} · {String(file.uploader_name || "CORE")}</small>
                <b>ÖNİZLE →</b>
              </footer>
            </a>
          ))}
        </div>
      ) : (
        <PortalEmpty title="CORE Vault boş." text="İlk teknik dosyayı yukarıdan yükle; dosyanın aslı artık portal içinde tutulacak." />
      )}

      <section className="portalPanel portalLegacyLinks">
        <div className="portalPanelHead"><span>HARİCİ REFERANS KAYDI</span><small>İKİNCİL · LEGACY / DIŞ KAYNAK</small></div>
        <form className="portalFormGrid" action={createResourceAction}>
          <label>
            <span>Tür</span>
            <select name="kind" defaultValue="document">
              <option value="document">Doküman</option><option value="archive">Arşiv</option>
              <option value="drawing">Çizim</option><option value="pcb">PCB</option>
              <option value="bom">BOM</option><option value="code">Kod</option>
              <option value="procedure">Prosedür</option><option value="dataset">Veri Seti</option>
            </select>
          </label>
          <label><span>Başlık</span><input name="title" required /></label>
          <label><span>Takım</span><input name="teamCode" /></label>
          <label><span>Proje</span><input name="projectSlug" /></label>
          <label className="portalFormWide"><span>Harici URL</span><input name="externalUrl" type="url" required /></label>
          <label className="portalFormWide"><span>Açıklama</span><textarea name="description" rows={2} /></label>
          <label className="portalFormWide"><span>Etiketler</span><input name="tags" /></label>
          <button type="submit" className="portalSecondaryButton">REFERANS EKLE →</button>
        </form>
      </section>

      {linkedOnly.length ? (
        <div className="portalReferenceList">
          {linkedOnly.map((item) => (
            <a href={String(item.external_url)} target="_blank" rel="noreferrer" key={String(item.id)}>
              <span>{portalResourceKindLabel(String(item.kind))}</span>
              <div><b>{String(item.title)}</b><small>{String(item.project_slug || item.team_code || "CORE")}</small></div>
              <em>HARİCİ ↗</em>
            </a>
          ))}
        </div>
      ) : null}
    </>
  );
}
