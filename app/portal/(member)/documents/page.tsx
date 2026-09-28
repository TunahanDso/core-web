import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { listPortalResources } from "@/lib/portal/db";
import { portalResourceKindLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalDokümanlarPage() {
  const all = await listPortalResources();
  const resources = all.filter((item) => ["document","procedure","drawing","dataset"].includes(String(item.kind)));
  return (
    <>
      <PortalPageHeader code="DC / DOCUMENTS" title="Dokümanlar" lead="Mühendislik kararlarını geleceğe taşıyan raporlar, prosedürler, çizimler ve veri setleri." />
      {resources.length ? (
        <div className="portalListTable">
          {resources.map((item) => (
            <article key={String(item.id)}>
              <span>{portalResourceKindLabel(String(item.kind))}</span>
              <div><b>{String(item.title)}</b><small>{String(item.description || "")}</small></div>
              <em>{String(item.team_code || "CORE")}</em>
              {item.external_url ? <a href={String(item.external_url)} target="_blank" rel="noreferrer">AÇ ↗</a> : <small>YALNIZCA İNDEKS</small>}
            </article>
          ))}
        </div>
      ) : <PortalEmpty title="Henüz doküman indekslenmedi." text="Dokümanları Kütüphane modülünden kaydet." />}
    </>
  );
}
