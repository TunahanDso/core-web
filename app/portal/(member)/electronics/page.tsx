import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { listPortalResources } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalElectronicsPage() {
  const all = await listPortalResources();
  const resources = all.filter((item) => ["pcb","bom","drawing"].includes(String(item.kind)));
  return (
    <>
      <PortalPageHeader code="HW / ELECTRONICS" title="PCB & Electronics" lead="Board files, BOMs, schematics, wiring references and hardware evidence indexed by team and project." />
      <section className="portalHardwareRibbon">
        <span>SCHEMATIC</span><i>→</i><span>PCB</span><i>→</i><span>BOM</span><i>→</i><span>ASSEMBLY</span><i>→</i><span>SMOKE TEST</span><i>→</i><span>FIELD</span>
      </section>
      {resources.length ? (
        <div className="portalResourceGrid">
          {resources.map((item) => (
            <article key={String(item.id)}>
              <div><span>{String(item.kind).toUpperCase()}</span><small>{String(item.team_code || "EMB")}</small></div>
              <h3>{String(item.title)}</h3><p>{String(item.description || "")}</p>
              <footer><small>{String(item.project_slug || "shared hardware")}</small>{item.external_url ? <a href={String(item.external_url)}>OPEN ↗</a> : <span>INDEXED</span>}</footer>
            </article>
          ))}
        </div>
      ) : <PortalEmpty title="Hardware registry is ready." text="Add the first PCB, BOM or drawing through the Library module." />}
    </>
  );
}
