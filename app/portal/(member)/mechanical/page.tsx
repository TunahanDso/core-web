import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { listPortalFiles } from "@/lib/portal/files";

export const dynamic = "force-dynamic";

export default async function PortalMechanicalPage() {
  const files = await listPortalFiles({ limit: 300 });
  const models = files.filter((file) =>
    ["stl","cad"].includes(String(file.preview_kind)) ||
    String(file.kind) === "drawing"
  );

  return (
    <>
      <PortalPageHeader
        code="ME / CAD"
        title="Mekanik & CAD"
        lead="Parça, montaj, üretim modeli ve teknik çizimleri sürümleriyle CORE içinde tut. STL/OBJ tarayıcıda 3B döndürülebilir; native CAD kaynakları üretim referansı olarak korunur."
      />

      <section className="portalEngineeringPipeline">
        <span>İHTİYAÇ</span><i>→</i><span>CAD</span><i>→</i><span>REVİZYON</span><i>→</i><span>ÜRETİM</span><i>→</i><span>MONTAJ</span><i>→</i><span>TEST</span>
      </section>

      <section className="portalLibraryToolbar">
        <div><span>CANLI 3B</span><b>STL · OBJ</b></div>
        <div><span>NATIVE CAD STORAGE</span><b>STEP · IGES · SLDPRT · SLDASM · F3D · IPT · IAM</b></div>
      </section>

      {models.length ? (
        <div className="portalEngineeringFileGrid">
          {models.map((file) => (
            <a href={"/portal/files/" + encodeURIComponent(String(file.id))} key={String(file.id)}>
              <div className={"portalEngineeringFilePreview " + String(file.preview_kind)}>
                <span>{String(file.extension || "CAD").toUpperCase()}</span>
                <b>{String(file.preview_kind) === "stl" ? "3B" : "CAD"}</b>
              </div>
              <h3>{String(file.name)}</h3>
              <p>{String(file.project_slug || file.team_code || "CORE")}</p>
              <footer><small>v{String(file.version_count || 1)}</small><b>İNCELE →</b></footer>
            </a>
          ))}
        </div>
      ) : (
        <PortalEmpty title="Mekanik dosya yok." text="CORE Vault'a STL, OBJ, STEP veya başka bir CAD kaynağı yüklediğinde burada otomatik görünecek." />
      )}
    </>
  );
}
