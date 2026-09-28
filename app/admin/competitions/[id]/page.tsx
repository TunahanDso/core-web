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
    <main className="admin">
      <div className="adminTopline">
        <div>
          <a className="adminBreadcrumb" href="/admin/competitions">
            CORE CONTROL / COMPETITIONS
          </a>
          <p className="eyebrow">COMPETITION EDITOR · AUTHENTICATED WRITE</p>
        </div>
        <span className="cmsHealth online"><i />LIVE D1</span>
      </div>

      <h1>{competition.titleTr || competition.titleEn || competition.slug}</h1>
      <p>
        Editing <code>{competition.id}</code>. Saving updates production D1 and
        appends an audit record with the verified Cloudflare Access identity.
      </p>

      {query.saved === "1" ? (
        <div className="cmsSuccess">
          <b>Competition saved.</b>
          <span>The D1 record and audit log were updated successfully.</span>
        </div>
      ) : null}

      <form className="adminEditor" action={updateCompetitionAction}>
        <input type="hidden" name="id" value={competition.id} />

        <div className="editorGrid">
          <label>
            <span>Title · TR</span>
            <input name="titleTr" defaultValue={competition.titleTr} required maxLength={160} />
          </label>
          <label>
            <span>Title · EN</span>
            <input name="titleEn" defaultValue={competition.titleEn} maxLength={160} />
          </label>

          <label className="editorWide">
            <span>Note / Summary · TR</span>
            <textarea name="summaryTr" defaultValue={competition.summaryTr} rows={4} maxLength={900} />
          </label>
          <label className="editorWide">
            <span>Note / Summary · EN</span>
            <textarea name="summaryEn" defaultValue={competition.summaryEn} rows={4} maxLength={900} />
          </label>

          <label>
            <span>Domain</span>
            <input name="domain" defaultValue={competition.domain ?? ""} maxLength={100} />
          </label>
          <label>
            <span>Planning state</span>
            <select name="targetStatus" defaultValue={competition.targetStatus}>
              <option value="confirmed">Confirmed</option>
              <option value="target">Target</option>
              <option value="evaluation">Evaluation</option>
            </select>
          </label>

          <label>
            <span>Date · TR</span>
            <input name="dateTr" defaultValue={competition.dateTr} maxLength={160} />
          </label>
          <label>
            <span>Date · EN</span>
            <input name="dateEn" defaultValue={competition.dateEn} maxLength={160} />
          </label>

          <label>
            <span>Location · TR</span>
            <input name="locationTr" defaultValue={competition.locationTr} maxLength={180} />
          </label>
          <label>
            <span>Location · EN</span>
            <input name="locationEn" defaultValue={competition.locationEn} maxLength={180} />
          </label>

          <label>
            <span>Publication status</span>
            <select name="status" defaultValue={competition.status}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>

        <div className="editorActions">
          <a className="adminSecondaryButton" href="/admin/competitions">CANCEL</a>
          <button className="adminPrimaryButton" type="submit">SAVE COMPETITION →</button>
        </div>
      </form>

      <div className="terminal">
        <span>AUDIT</span>
        <b>competition.update</b>
        <small>ACTOR + STATUS + DATE + LOCATION + DOMAIN ARE RECORDED ON SAVE</small>
      </div>
    </main>
  );
}
