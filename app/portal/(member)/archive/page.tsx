import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { listPortalResources } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalArchivePage() {
  const resources = await listPortalResources("archive");
  return (
    <>
      <PortalPageHeader code="AR / ARCHIVE" title="Engineering Archive" lead="Retired designs, historical reports, test evidence and decisions that should never disappear with a graduating member." />
      {resources.length ? (
        <div className="portalArchiveStack">
          {resources.map((item, index) => (
            <article key={String(item.id)}>
              <span>{String(index + 1).padStart(3, "0")}</span>
              <div><h3>{String(item.title)}</h3><p>{String(item.description || "")}</p></div>
              <small>{String(item.project_slug || item.team_code || "CORE")}</small>
              {item.external_url ? <a href={String(item.external_url)} target="_blank" rel="noreferrer">RETRIEVE →</a> : null}
            </article>
          ))}
        </div>
      ) : <PortalEmpty title="Archive shelves are empty." text="Historical records can be moved into the archive through the Library registry." />}
    </>
  );
}
