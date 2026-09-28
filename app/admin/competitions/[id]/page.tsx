import { updateCompetitionAction } from "@/app/admin/actions";
import { getCompetition } from "@/lib/cms/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminCompetitionEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ saved?: string }>;
}) {
  const [{ id }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<{ saved?: string }>({}),
  ]);

  const competition = await getCompetition(decodeURIComponent(id));
  if (!competition) notFound();

  return (
    <main className="admin adminLight">
      <div className="adminTopline">
        <div>
          <a className="adminBreadcrumb" href="/admin/competitions">
            CORE CONTROL / YARIŞMALAR
          </a>
          <p className="eyebrow">YARIŞMA EDİTÖRÜ · DOĞRULANMIŞ YAZMA</p>
        </div>
        <span className="cmsHealth online"><i />CANLI D1</span>
      </div>

      <h1>{competition.titleTr || competition.titleEn || competition.slug}</h1>
      <p>
        Düzenleniyor: <code>{competition.id}</code>. Saving updates production D1 and
        appends an audit record with the verified Cloudflare Access identity.
      </p>

      {query.saved === "1" ? (
        <div className="cmsSuccess">
          <b>Yarışma kaydedildi.</b>
          <span>D1 kaydı ve denetim günlüğü başarıyla güncellendi.</span>
        </div>
      ) : null}

      <form className="adminEditor" action={updateCompetitionAction}>
        <input type="hidden" name="id" value={competition.id} />

        <div className="editorGrid">
          <label>
            <span>Başlık · TR</span>
            <input name="titleTr" defaultValue={competition.titleTr} required maxLength={160} />
          </label>
          <label>
            <span>Başlık · EN</span>
            <input name="titleEn" defaultValue={competition.titleEn} maxLength={160} />
          </label>

          <label className="editorWide">
            <span>Not / Özet · TR</span>
            <textarea name="summaryTr" defaultValue={competition.summaryTr} rows={4} maxLength={900} />
          </label>
          <label className="editorWide">
            <span>Not / Özet · EN</span>
            <textarea name="summaryEn" defaultValue={competition.summaryEn} rows={4} maxLength={900} />
          </label>

          <label>
            <span>Alan</span>
            <input name="domain" defaultValue={competition.domain ?? ""} maxLength={100} />
          </label>
          <label>
            <span>Planlama durumu</span>
            <select name="targetStatus" defaultValue={competition.targetStatus}>
              <option value="confirmed">Kesinleşti</option>
              <option value="target">Hedef</option>
              <option value="evaluation">Değerlendirme</option>
            </select>
          </label>

          <label>
            <span>Tarih · TR</span>
            <input name="dateTr" defaultValue={competition.dateTr} maxLength={160} />
          </label>
          <label>
            <span>Tarih · EN</span>
            <input name="dateEn" defaultValue={competition.dateEn} maxLength={160} />
          </label>

          <label>
            <span>Konum · TR</span>
            <input name="locationTr" defaultValue={competition.locationTr} maxLength={180} />
          </label>
          <label>
            <span>Konum · EN</span>
            <input name="locationEn" defaultValue={competition.locationEn} maxLength={180} />
          </label>

          <label>
            <span>Yayın durumu</span>
            <select name="status" defaultValue={competition.status}>
              <option value="draft">Taslak</option>
              <option value="published">Yayında</option>
              <option value="archived">Arşiv</option>
            </select>
          </label>
        </div>

        <div className="editorActions">
          <a className="adminSecondaryButton" href="/admin/competitions">İPTAL</a>
          <button className="adminPrimaryButton" type="submit">YARIŞMAYI KAYDET →</button>
        </div>
      </form>

      <div className="terminal">
        <span>DENETİM</span>
        <b>competition.update</b>
        <small>KAYITTA AKTÖR + DURUM + TARİH + KONUM + ALAN KAYDEDİLİR</small>
      </div>
    </main>
  );
}
