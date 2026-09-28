import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { listPortalResources } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalArchivePage() {
  const resources = await listPortalResources("archive");
  return (
    <>
      <PortalPageHeader code="AR / ARCHIVE" title="Mühendislik Arşivi" lead="Emekli tasarımlar, tarihsel raporlar, test kanıtları ve mezun olan bir üyeyle birlikte kaybolmaması gereken kararlar." />
      {resources.length ? (
        <div className="portalArchiveStack">
          {resources.map((item, index) => (
            <article key={String(item.id)}>
              <span>{String(index + 1).padStart(3, "0")}</span>
              <div><h3>{String(item.title)}</h3><p>{String(item.description || "")}</p></div>
              <small>{String(item.project_slug || item.team_code || "CORE")}</small>
              {item.external_url ? <a href={String(item.external_url)} target="_blank" rel="noreferrer">AÇ →</a> : null}
            </article>
          ))}
        </div>
      ) : <PortalEmpty title="Arşiv rafları boş." text="Tarihsel kayıtlar Kütüphane üzerinden arşive alınabilir." />}
    </>
  );
}
