import { updatePageAction } from "@/app/admin/actions";
import { getPage } from "@/lib/cms/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminContentEditPage({
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

  const page = await getPage(decodeURIComponent(id));
  if (!page) notFound();

  return (
    <main className="admin">
      <div className="adminTopline">
        <div>
          <a className="adminBreadcrumb" href="/admin/content">
            CORE CONTROL / CONTENT
          </a>
          <p className="eyebrow">PAGE EDITOR · AUTHENTICATED WRITE</p>
        </div>
        <span className="cmsHealth online"><i />LIVE D1</span>
      </div>

      <h1>{page.slug === "home" ? "Homepage" : page.titleTr || page.slug}</h1>
      <p>
        Editing <code>{page.id}</code>. Published content overrides the built-in
        public copy while static text remains available as a runtime fallback.
      </p>

      {query.saved === "1" ? (
        <div className="cmsSuccess">
          <b>Page saved.</b>
          <span>Public page copy and audit log were updated successfully.</span>
        </div>
      ) : null}

      <form className="adminEditor" action={updatePageAction}>
        <input type="hidden" name="id" value={page.id} />

        <div className="editorGrid">
          <label>
            <span>Page code</span>
            <input name="code" defaultValue={page.code} maxLength={30} />
          </label>
          <label>
            <span>Publication status</span>
            <select name="status" defaultValue={page.status}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label>
            <span>Eyebrow · TR</span>
            <input name="eyebrowTr" defaultValue={page.eyebrowTr} maxLength={180} />
          </label>
          <label>
            <span>Eyebrow · EN</span>
            <input name="eyebrowEn" defaultValue={page.eyebrowEn} maxLength={180} />
          </label>

          <label>
            <span>Title · TR</span>
            <input name="titleTr" defaultValue={page.titleTr} required maxLength={220} />
          </label>
          <label>
            <span>Title · EN</span>
            <input name="titleEn" defaultValue={page.titleEn} maxLength={220} />
          </label>

          <label>
            <span>Accent title · TR</span>
            <input name="accentTr" defaultValue={page.accentTr} maxLength={120} />
          </label>
          <label>
            <span>Accent title · EN</span>
            <input name="accentEn" defaultValue={page.accentEn} maxLength={120} />
          </label>

          <label className="editorWide">
            <span>Hero summary · TR</span>
            <textarea name="summaryTr" defaultValue={page.summaryTr} rows={5} maxLength={1400} />
          </label>
          <label className="editorWide">
            <span>Hero summary · EN</span>
            <textarea name="summaryEn" defaultValue={page.summaryEn} rows={5} maxLength={1400} />
          </label>

          <label className="editorWide">
            <span>Primary body / statement · TR</span>
            <textarea name="bodyTr" defaultValue={page.bodyTr} rows={6} maxLength={4000} />
          </label>
          <label className="editorWide">
            <span>Primary body / statement · EN</span>
            <textarea name="bodyEn" defaultValue={page.bodyEn} rows={6} maxLength={4000} />
          </label>

          <label>
            <span>SEO title · TR</span>
            <input name="seoTitleTr" defaultValue={page.seoTitleTr} maxLength={180} />
          </label>
          <label>
            <span>SEO title · EN</span>
            <input name="seoTitleEn" defaultValue={page.seoTitleEn} maxLength={180} />
          </label>

          <label className="editorWide">
            <span>SEO description · TR</span>
            <textarea name="seoDescriptionTr" defaultValue={page.seoDescriptionTr} rows={3} maxLength={500} />
          </label>
          <label className="editorWide">
            <span>SEO description · EN</span>
            <textarea name="seoDescriptionEn" defaultValue={page.seoDescriptionEn} rows={3} maxLength={500} />
          </label>
        </div>

        <div className="editorActions">
          <a className="adminSecondaryButton" href="/admin/content">CANCEL</a>
          <button className="adminPrimaryButton" type="submit">SAVE PAGE →</button>
        </div>
      </form>

      <div className="terminal">
        <span>AUDIT</span>
        <b>page.update</b>
        <small>ACTOR + PAGE ID + PUBLICATION STATUS ARE RECORDED ON SAVE</small>
      </div>
    </main>
  );
}
