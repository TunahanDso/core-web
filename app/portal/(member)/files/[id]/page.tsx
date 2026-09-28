import { PortalPageHeader } from "@/components/portal/PortalPage";
import { uploadFileVersionAction } from "@/app/portal/actions";
import {
  getPortalFile,
  listPortalFileVersions,
  readPortalTextFile,
} from "@/lib/portal/files";
import StlPreview from "@/components/portal/StlPreview";
import KiCadPcbPreview from "@/components/portal/KiCadPcbPreview";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function formatBytes(value: unknown) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B","KB","MB","GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / Math.pow(1024,index);
  return amount.toFixed(index === 0 ? 0 : amount >= 10 ? 1 : 2) + " " + units[index];
}

export default async function PortalFilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ uploaded?: string; versioned?: string }>;
}) {
  const [{ id }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<{ uploaded?: string; versioned?: string }>({}),
  ]);
  const fileId = decodeURIComponent(id);
  const file = await getPortalFile(fileId);
  if (!file) notFound();

  const versions = await listPortalFileVersions(fileId);
  const previewKind = String(file.preview_kind || "download");
  const text = ["text","csv","kicad-pcb"].includes(previewKind)
    ? await readPortalTextFile(fileId)
    : null;
  const src = "/portal/api/files/" + encodeURIComponent(fileId);

  return (
    <>
      <PortalPageHeader
        code={"FILE / " + String(file.extension || "DATA").toUpperCase()}
        title={String(file.name)}
        lead={[
          String(file.kind || "file"),
          String(file.project_slug || file.team_code || "CORE"),
          formatBytes(file.size_bytes),
          "v" + String(versions[0]?.version_no || 1),
        ].join(" · ")}
        action={<a className="portalOutlineButton" href={src + "?download=1"}>DOSYAYI İNDİR ↓</a>}
      />

      {query.uploaded === "1" ? <div className="portalSuccess">Dosya CORE R2 deposuna kaydedildi.</div> : null}
      {query.versioned === "1" ? <div className="portalSuccess">Yeni dosya sürümü kaydedildi.</div> : null}

      <section className="portalFileWorkspace">
        <div className="portalFilePreview">
          <div className="portalPanelHead">
            <span>TEKNİK ÖNİZLEME</span>
            <small>{String(file.mime_type)} · {previewKind.toUpperCase()}</small>
          </div>

          {previewKind === "image" ? (
            <div className="portalImagePreview"><img src={src} alt={String(file.name)} /></div>
          ) : null}

          {previewKind === "pdf" ? (
            <iframe className="portalPdfPreview" src={src} title={String(file.name)} />
          ) : null}

          {previewKind === "stl" ? <StlPreview src={src} /> : null}

          {previewKind === "kicad-pcb" && text ? <KiCadPcbPreview source={text} /> : null}

          {["text","csv"].includes(previewKind) && text !== null ? (
            <pre className="portalCodePreview"><code>{text}</code></pre>
          ) : null}

          {previewKind === "cad" ? (
            <div className="portalPreviewNotice engineering">
              <span>CAD / NATIVE</span>
              <b>{String(file.extension).toUpperCase()} dosyası CORE deposunda sürümlü olarak tutuluyor.</b>
              <p>STEP / IGES / SolidWorks / Fusion / Inventor kaynakları kaybolmadan saklanır. Tarayıcı mesh türevi üretme hattı V3 mühendislik dönüştürücüsüne bağlanacak; STL/OBJ bugün doğrudan 3B görüntülenebilir.</p>
            </div>
          ) : null}

          {previewKind === "pcb" ? (
            <div className="portalPreviewNotice engineering">
              <span>PCB / FABRICATION</span>
              <b>Gerber üretim dosyası CORE deposunda.</b>
              <p>KiCad <code>.kicad_pcb</code> kaynakları doğrudan teknik önizlenir. Gerber/Drill setleri sürümlü saklanır ve fabrication derivative hattına hazırdır.</p>
            </div>
          ) : null}

          {previewKind === "download" ? (
            <div className="portalPreviewNotice">
              <b>Bu dosya türü için tarayıcı önizlemesi yok.</b>
              <span>Dosya yine de CORE içinde saklanıyor, sürümleniyor ve yetkili üyeler tarafından indirilebiliyor.</span>
            </div>
          ) : null}
        </div>

        <aside className="portalFileInspector">
          <section className="portalPanel">
            <div className="portalPanelHead"><span>DOSYA KİMLİĞİ</span><small>R2 + D1</small></div>
            <dl className="portalFileFacts">
              <div><dt>Ad</dt><dd>{String(file.name)}</dd></div>
              <div><dt>Boyut</dt><dd>{formatBytes(file.size_bytes)}</dd></div>
              <div><dt>Tür</dt><dd>{String(file.mime_type)}</dd></div>
              <div><dt>Proje</dt><dd>{String(file.project_slug || "—")}</dd></div>
              <div><dt>Takım</dt><dd>{String(file.team_code || "—")}</dd></div>
              <div><dt>Yükleyen</dt><dd>{String(file.uploader_name || file.uploader_email || "—")}</dd></div>
              <div><dt>Güncelleme</dt><dd>{String(file.updated_at)}</dd></div>
            </dl>
          </section>

          <section className="portalPanel">
            <div className="portalPanelHead"><span>YENİ SÜRÜM</span><small>AYNI DOSYA KİMLİĞİ</small></div>
            <form className="portalVersionForm" action={uploadFileVersionAction}>
              <input type="hidden" name="fileId" value={fileId} />
              <input type="hidden" name="projectSlug" value={String(file.project_slug || "")} />
              <input type="hidden" name="teamCode" value={String(file.team_code || "")} />
              <label><span>Dosya</span><input name="file" type="file" required /></label>
              <label><span>Sürüm notu</span><input name="versionNote" placeholder="Rev.B · connector footprint düzeltildi" /></label>
              <button className="portalPrimaryButton" type="submit">YENİ SÜRÜM YÜKLE →</button>
            </form>
          </section>
        </aside>
      </section>

      <section className="portalPanel portalVersionHistory">
        <div className="portalPanelHead"><span>SÜRÜM GEÇMİŞİ</span><small>{versions.length} sürüm</small></div>
        <div className="portalVersionList">
          {versions.map((version) => (
            <article key={String(version.id)}>
              <b>v{String(version.version_no)}</b>
              <div><strong>{String(version.note || "Sürüm kaydı")}</strong><small>{String(version.creator_name || version.creator_email || "—")}</small></div>
              <span>{formatBytes(version.size_bytes)}</span>
              <code>{String(version.checksum || "").slice(0,16)}…</code>
              <small>{String(version.created_at)}</small>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
