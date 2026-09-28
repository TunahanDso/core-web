import { notFound } from "next/navigation";
import { PortalPageHeader } from "@/components/portal/PortalPage";
import VaultModelViewer from "@/components/portal/VaultModelViewer";
import KiCadBoardPreview from "@/components/portal/KiCadBoardPreview";
import VaultCodeReader from "@/components/portal/VaultCodeReader";
import { requirePortalMember } from "@/lib/portal/auth";
import {
  formatVaultBytes,
  getPortalVaultFile,
  listPortalDesignDerivatives,
  listPortalVaultVersions,
  readPortalVaultTextPreview,
} from "@/lib/portal/vault";
import {
  queuePortalDesignDerivativeAction,
  setPortalVaultApprovalAction,
  setPortalVaultLifecycleAction,
  uploadPortalVaultVersionAction,
} from "@/app/portal/vault-actions";

export const dynamic = "force-dynamic";

function canRead(
  member: Awaited<ReturnType<typeof requirePortalMember>>,
  file: Record<string, unknown>
) {
  const visibility = String(file.visibility || "members");
  if (visibility === "members") return true;
  if (visibility === "admins") return member.role === "admin";
  if (visibility === "leads") return member.role === "admin" || member.role === "lead";
  if (visibility === "team") {
    const team = String(file.team_code || "").trim().toUpperCase();
    return !team || member.role === "admin" || member.teams.some((item) => item.toUpperCase() === team);
  }
  return false;
}

export default async function VaultFilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const member = await requirePortalMember();
  const { id } = await params;
  const fileId = decodeURIComponent(id);
  const [file, versions, derivatives] = await Promise.all([
    getPortalVaultFile(fileId),
    listPortalVaultVersions(fileId),
    listPortalDesignDerivatives(fileId),
  ]);
  const query: Record<string, string | string[] | undefined> = searchParams ? await searchParams : {};
  if (!file || !canRead(member,file)) notFound();

  const previewKind = String(file.preview_kind || "download");
  const extension = String(file.extension || "").toLowerCase();
  const textPreview = ["text","pcb-source"].includes(previewKind)
    ? await readPortalVaultTextPreview(fileId)
    : null;
  const sourceUrl = "/api/portal/vault/" + encodeURIComponent(fileId);
  const canManage = member.role === "admin" || member.role === "lead" || String(file.created_by) === member.email;
  const canApprove = member.role === "admin" || member.role === "lead";
  const derivativeType = previewKind === "pcb-source" ? "pcb-3d" : "gltf";
  const needsDerivative = previewKind === "cad-source" || previewKind === "pcb-source";
  const tags = (() => {
    try {
      const parsed = JSON.parse(String(file.tags_json || "[]"));
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch { return []; }
  })();

  return (
    <>
      <PortalPageHeader
        code="VA / CORE VAULT"
        title={String(file.title)}
        lead={String(file.description || "CORE mühendislik hafızasında sürümlenen teknik dosya.")}
        action={<a className="portalOutlineButton" href="/portal/library">← VAULT</a>}
      />

      {query.uploaded ? <div className="portalSuccess">Dosya R2 Vault'a kaydedildi ve ilk revision oluşturuldu.</div> : null}
      {query.versioned ? <div className="portalSuccess">Yeni revision kaydedildi; önceki sürüm korunuyor.</div> : null}
      {query.derivative ? <div className="portalSuccess">Dönüştürme işi kuyruğa alındı. Converter servisi bağlı olduğunda türev bu kayda yazılacak.</div> : null}

      <section className="vaultMetaStrip">
        <article><span>REV</span><b>R{String(file.revision)}</b><small>{String(file.approval_state).toUpperCase()}</small></article>
        <article><span>FORMAT</span><b>{extension ? "." + extension : "BINARY"}</b><small>{String(file.mime_type)}</small></article>
        <article><span>BOYUT</span><b>{formatVaultBytes(file.size_bytes)}</b><small>R2 object</small></article>
        <article><span>PROJE</span><b>{String(file.project_slug || "CORE")}</b><small>{String(file.team_code || "ORTAK")}</small></article>
        <article><span>SHA-256</span><b className="vaultChecksum">{String(file.checksum_sha256).slice(0,12)}…</b><small>integrity</small></article>
      </section>

      <section className="vaultPreviewShell">
        <div className="portalPanelHead">
          <span>ÖNİZLEME / {previewKind.toUpperCase()}</span>
          <div className="vaultFileActions">
            <a className="portalOutlineButton" href={sourceUrl}>AÇ</a>
            <a className="portalOutlineButton" href={sourceUrl + "?download=1"}>İNDİR ↓</a>
          </div>
        </div>

        {previewKind === "pdf" ? (
          <iframe className="vaultPdfPreview" src={sourceUrl} title={String(file.title)} />
        ) : null}

        {previewKind === "image" ? (
          <div className="vaultImagePreview"><img src={sourceUrl} alt={String(file.title)} /></div>
        ) : null}

        {previewKind === "model3d" ? (
          <VaultModelViewer src={sourceUrl} filename={String(file.original_name)} />
        ) : null}

        {previewKind === "pcb-source" && extension === "kicad_pcb" && textPreview?.text ? (
          <KiCadBoardPreview source={textPreview.text} />
        ) : null}

        {["text","pcb-source"].includes(previewKind) && textPreview ? (
          <VaultCodeReader
            source={textPreview.text || "Önizleme boyut sınırını aşıyor; dosyayı indirerek aç."}
            filename={String(file.original_name)}
            extension={extension}
            truncated={Boolean(textPreview.truncated)}
          />
        ) : null}

        {previewKind === "cad-source" ? (
          <div className="vaultConversionPanel">
            <span>MEKANİK KAYNAK DOSYASI</span>
            <h3>STEP / IGES / 3MF / native CAD kaynağı Vault'ta korunuyor.</h3>
            <p>Tarayıcı türevi, ayrı güvenli converter servisinde glTF/GLB üretilerek bu dosyanın revision'ına bağlanacak. CMS Worker CAD dönüştürme çalıştırmaz.</p>
          </div>
        ) : null}

        {["download","archive"].includes(previewKind) ? (
          <div className="vaultConversionPanel">
            <span>HAM DOSYA</span>
            <h3>Bu format için doğrudan tarayıcı önizlemesi yok.</h3>
            <p>Kaynak dosya değişmeden R2 üzerinde tutulur; checksum ve revision geçmişi korunur.</p>
          </div>
        ) : null}
      </section>

      {needsDerivative ? (
        <section className="portalPanel vaultDerivativePanel">
          <div className="portalPanelHead"><span>TÜREV / CONVERSION PIPELINE</span><small>AYRI SECURITY BOUNDARY</small></div>
          <div className="vaultDerivativeGrid">
            <div>
              <h3>{previewKind === "pcb-source" ? "PCB 3B türevi" : "glTF / GLB tarayıcı türevi"}</h3>
              <p>Kaynak dosya değişmeden kalır. Converter sonucu yeni derivative object olarak R2'ye yazılır.</p>
            </div>
            <form action={queuePortalDesignDerivativeAction}>
              <input type="hidden" name="fileId" value={fileId} />
              <input type="hidden" name="derivativeType" value={derivativeType} />
              <button className="portalPrimaryButton" type="submit">TÜREV İŞİ KUYRUĞA AL →</button>
            </form>
          </div>
          <div className="vaultDerivativeHistory">
            {derivatives.length ? derivatives.map((item) => (
              <article key={String(item.id)}>
                <b>{String(item.derivative_type).toUpperCase()}</b>
                <span>R{String(item.source_revision)}</span>
                <em className={"state " + String(item.status)}>{String(item.status).toUpperCase()}</em>
                <small>{String(item.engine || "converter bekleniyor")}</small>
              </article>
            )) : <p className="portalMuted">Henüz türev işi yok.</p>}
          </div>
        </section>
      ) : null}

      <section className="vaultDetailGrid">
        <section className="portalPanel">
          <div className="portalPanelHead"><span>SÜRÜM GEÇMİŞİ</span><small>{versions.length} REVISION</small></div>
          <div className="vaultVersionList">
            {versions.map((version) => (
              <article key={String(version.id)}>
                <b>R{String(version.revision)}</b>
                <div>
                  <strong>{String(version.original_name)}</strong>
                  <small>{String(version.note || "Revision")} · {formatVaultBytes(version.size_bytes)}</small>
                </div>
                <code>{String(version.checksum_sha256).slice(0,12)}…</code>
                <a href={sourceUrl + "?revision=" + encodeURIComponent(String(version.revision)) + "&download=1"}>İNDİR</a>
              </article>
            ))}
          </div>
        </section>

        <aside className="portalPanel vaultGovernance">
          <div className="portalPanelHead"><span>YÖNETİŞİM</span><small>{String(file.visibility).toUpperCase()}</small></div>
          <div className="vaultTagCloud">{tags.length ? tags.map((tag) => <span key={tag}>{tag}</span>) : <small>Etiket yok.</small>}</div>
          <dl>
            <div><dt>Dosya</dt><dd>{String(file.original_name)}</dd></div>
            <div><dt>Sahip</dt><dd>{String(file.created_by)}</dd></div>
            <div><dt>Durum</dt><dd>{String(file.lifecycle_state)}</dd></div>
            <div><dt>Onay</dt><dd>{String(file.approval_state)}</dd></div>
            <div><dt>Güncelleme</dt><dd>{String(file.updated_at)}</dd></div>
          </dl>
        </aside>
      </section>

      {canManage ? (
        <section className="portalPanel vaultRevisionPanel">
          <div className="portalPanelHead"><span>YENİ REVISION</span><small>KAYNAK DOSYA GEÇMİŞİ KORUNUR</small></div>
          <form className="portalFormGrid" action={uploadPortalVaultVersionAction}>
            <input type="hidden" name="fileId" value={fileId} />
            <label className="portalFormWide"><span>Yeni dosya</span><input name="file" type="file" required /></label>
            <label className="portalFormWide"><span>Revision notu</span><input name="note" placeholder="R2: konnektör yerleşimi ve güç katı güncellendi" /></label>
            <button className="portalPrimaryButton" type="submit">YENİ REVISION YÜKLE →</button>
          </form>
          <div className="vaultGovernanceActions">
            <form action={setPortalVaultLifecycleAction}>
              <input type="hidden" name="fileId" value={fileId} />
              <select name="lifecycle" defaultValue={String(file.lifecycle_state)}>
                <option value="active">Aktif</option>
                <option value="archived">Arşiv</option>
                <option value="trashed">Çöp</option>
              </select>
              <button type="submit">YAŞAM DÖNGÜSÜNÜ UYGULA</button>
            </form>
            {canApprove ? (
              <form action={setPortalVaultApprovalAction}>
                <input type="hidden" name="fileId" value={fileId} />
                <select name="approval" defaultValue={String(file.approval_state)}>
                  <option value="draft">Taslak</option>
                  <option value="review">İncelemede</option>
                  <option value="approved">Onaylı</option>
                  <option value="rejected">Reddedildi</option>
                </select>
                <button type="submit">ONAY DURUMUNU UYGULA</button>
              </form>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
