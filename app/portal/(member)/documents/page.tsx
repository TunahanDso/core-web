import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { listPortalResources } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalDocumentsPage() {
  const all = await listPortalResources();
  const resources = all.filter((item) => ["document","procedure","drawing","dataset"].includes(String(item.kind)));
  return (
    <>
      <PortalPageHeader code="DC / DOCUMENTS" title="Documents" lead="Reports, procedures, drawings and datasets that carry engineering decisions forward." />
      {resources.length ? (
        <div className="portalListTable">
          {resources.map((item) => (
            <article key={String(item.id)}>
              <span>{String(item.kind).toUpperCase()}</span>
              <div><b>{String(item.title)}</b><small>{String(item.description || "")}</small></div>
              <em>{String(item.team_code || "CORE")}</em>
              {item.external_url ? <a href={String(item.external_url)} target="_blank" rel="noreferrer">OPEN ↗</a> : <small>INDEX ONLY</small>}
            </article>
          ))}
        </div>
      ) : <PortalEmpty title="No documents indexed yet." text="Register documents from the Library module." />}
    </>
  );
}
