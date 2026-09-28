import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createResourceAction } from "@/app/portal/actions";
import { listPortalResources } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalLibraryPage() {
  const resources = await listPortalResources();

  return (
    <>
      <PortalPageHeader
        code="KB / LIBRARY"
        title="Knowledge Library"
        lead="The searchable index for reports, procedures, datasets, drawings, code references and evidence produced by CORE."
      />

      <section className="portalPanel portalCreatePanel">
        <div className="portalPanelHead"><span>REGISTER KNOWLEDGE</span><small>LINK OR INDEX FIRST · R2 UPLOAD NEXT</small></div>
        <form className="portalFormGrid" action={createResourceAction}>
          <label>
            <span>Type</span>
            <select name="kind" defaultValue="document">
              <option value="document">Document</option><option value="archive">Archive</option>
              <option value="library">Library</option><option value="drawing">Drawing</option>
              <option value="pcb">PCB</option><option value="bom">BOM</option>
              <option value="code">Code</option><option value="procedure">Procedure</option>
              <option value="dataset">Dataset</option><option value="media">Media</option>
            </select>
          </label>
          <label><span>Title</span><input name="title" required /></label>
          <label><span>Team</span><input name="teamCode" placeholder="MAR / SYS / EMB" /></label>
          <label><span>Project slug</span><input name="projectSlug" placeholder="hydronom" /></label>
          <label className="portalFormWide"><span>External URL</span><input name="externalUrl" type="url" placeholder="https://..." /></label>
          <label className="portalFormWide"><span>Description</span><textarea name="description" rows={3} /></label>
          <label className="portalFormWide"><span>Tags</span><input name="tags" placeholder="navigation, imu, smoke-test" /></label>
          <button type="submit" className="portalPrimaryButton">ADD TO LIBRARY →</button>
        </form>
      </section>

      {resources.length ? (
        <div className="portalResourceGrid">
          {resources.map((item) => (
            <article key={String(item.id)}>
              <div><span>{String(item.kind).toUpperCase()}</span><small>{String(item.team_code || "CORE")}</small></div>
              <h3>{String(item.title)}</h3>
              <p>{String(item.description || "")}</p>
              <footer>
                <small>{String(item.project_slug || "institutional")}</small>
                {item.external_url ? <a href={String(item.external_url)} target="_blank" rel="noreferrer">OPEN ↗</a> : <span>INDEXED</span>}
              </footer>
            </article>
          ))}
        </div>
      ) : <PortalEmpty title="The library is ready." text="Register the first report, drawing, procedure or dataset above." />}
    </>
  );
}
