import { updateProjectAction } from "@/app/admin/actions";
import { getProject } from "@/lib/cms/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminProjectEditPage({
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
  const project = await getProject(decodeURIComponent(id));
  if (!project) notFound();

  return (
    <main className="admin">
      <div className="adminTopline">
        <div>
          <a className="adminBreadcrumb" href="/admin/projects">
            CORE CONTROL / PROJECTS
          </a>
          <p className="eyebrow">PROJECT EDITOR · AUTHENTICATED WRITE</p>
        </div>
        <span className="cmsHealth online"><i />LIVE D1</span>
      </div>

      <h1>{project.titleTr || project.titleEn || project.slug}</h1>
      <p>
        Editing <code>{project.id}</code>. Saving updates production D1 and
        appends an audit record with the verified Cloudflare Access identity.
      </p>

      {query.saved === "1" ? (
        <div className="cmsSuccess">
          <b>Project saved.</b>
          <span>The D1 record and audit log were updated successfully.</span>
        </div>
      ) : null}

      <form className="adminEditor" action={updateProjectAction}>
        <input type="hidden" name="id" value={project.id} />

        <div className="editorGrid">
          <label>
            <span>Title · TR</span>
            <input name="titleTr" defaultValue={project.titleTr} required maxLength={120} />
          </label>
          <label>
            <span>Title · EN</span>
            <input name="titleEn" defaultValue={project.titleEn} maxLength={120} />
          </label>

          <label className="editorWide">
            <span>Summary · TR</span>
            <textarea name="summaryTr" defaultValue={project.summaryTr} rows={4} maxLength={700} />
          </label>
          <label className="editorWide">
            <span>Summary · EN</span>
            <textarea name="summaryEn" defaultValue={project.summaryEn} rows={4} maxLength={700} />
          </label>

          <label>
            <span>Domain</span>
            <input name="domain" defaultValue={project.domain ?? ""} maxLength={100} />
          </label>
          <label>
            <span>Owner</span>
            <input name="owner" defaultValue={project.owner ?? ""} maxLength={100} />
          </label>

          <label>
            <span>Progress · %</span>
            <input
              name="progress"
              type="number"
              min="0"
              max="100"
              step="1"
              defaultValue={project.progress ?? 0}
              required
            />
          </label>
          <label>
            <span>Status</span>
            <select name="status" defaultValue={project.status}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label className="editorWide">
            <span>Integrations · comma separated</span>
            <input
              name="integrations"
              defaultValue={project.integrations.join(", ")}
              maxLength={1000}
            />
          </label>
        </div>

        <div className="editorActions">
          <a className="adminSecondaryButton" href="/admin/projects">CANCEL</a>
          <button className="adminPrimaryButton" type="submit">SAVE PROJECT →</button>
        </div>
      </form>

      <div className="terminal">
        <span>AUDIT</span>
        <b>project.update</b>
        <small>ACTOR + ENTITY + UPDATED METADATA ARE RECORDED ON SAVE</small>
      </div>
    </main>
  );
}
