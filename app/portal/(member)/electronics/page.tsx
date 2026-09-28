import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { listPortalFiles } from "@/lib/portal/files";

export const dynamic = "force-dynamic";

export default async function PortalElectronicsPage() {
  const files = await listPortalFiles({ limit: 300 });
  const resources = files.filter((file) =>
    ["kicad-pcb","pcb"].includes(String(file.preview_kind)) ||
    ["pcb","bom"].includes(String(file.kind))
  );

  return (
    <>
      <PortalPageHeader
        code="HW / PCB"
        title="PCB & Elektronik"
        lead="Şema, PCB, BOM, Gerber, drill ve kart kaynaklarını CORE içinde sürümle. KiCad PCB kaynakları tarayıcıda iz geometrisiyle doğrudan önizlenir."
      />
      <section className="portalHardwareRibbon">
        <span>ŞEMA</span><i>→</i><span>PCB</span><i>→</i><span>BOM</span><i>→</i><span>GERBER</span><i>→</i><span>MONTAJ</span><i>→</i><span>SMOKE TEST</span><i>→</i><span>SAHA</span>
      </section>

      {resources.length ? (
        <div className="portalEngineeringFileGrid">
          {resources.map((file) => (
            <a href={"/portal/files/" + encodeURIComponent(String(file.id))} key={String(file.id)}>
              <div className={"portalEngineeringFilePreview " + String(file.preview_kind)}>
                <span>{String(file.extension || file.kind || "PCB").toUpperCase()}</span>
                <b>{String(file.preview_kind) === "kicad-pcb" ? "LIVE" : "FAB"}</b>
              </div>
              <h3>{String(file.name)}</h3>
              <p>{String(file.project_slug || file.team_code || "CORE")}</p>
              <footer><small>v{String(file.version_count || 1)}</small><b>İNCELE →</b></footer>
            </a>
          ))}
        </div>
      ) : (
        <PortalEmpty title="Elektronik dosyası yok." text="CORE Vault'a .kicad_pcb, Gerber, BOM veya donanım kaynağı yüklediğinde burada otomatik görünecek." />
      )}
    </>
  );
}
