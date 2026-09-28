import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { formatVaultBytes, listPortalVaultFiles } from "@/lib/portal/vault";

export const dynamic = "force-dynamic";

const CAD_EXTENSIONS = new Set(["stl","obj","3mf","gltf","glb","step","stp","iges","igs","sldprt","sldasm","f3d","ipt","iam"]);

export default async function PortalMechanicalPage() {
  const member = await requirePortalMember();
  const files = await listPortalVaultFiles({ lifecycle: "active", limit: 300, viewer: member });
  const mechanical = files.filter((item) =>
    ["mechanical","cad","drawing"].includes(String(item.kind)) ||
    CAD_EXTENSIONS.has(String(item.extension || "").toLowerCase())
  );

  return (
    <>
      <PortalPageHeader
        code="MC / MEKANİK & CAD"
        title="Mekanik Tasarım Alanı"
        lead="Kaynak CAD dosyaları, mesh modelleri, teknik çizimler ve browser türevleri proje revision'larıyla aynı Vault üzerinde."
        action={<a className="portalOutlineButton" href="/portal/library">VAULT'A DOSYA YÜKLE →</a>}
      />

      <section className="mechanicalFormatMatrix">
        <article><span>DOĞRUDAN 3B</span><b>STL · OBJ</b><p>Portal içinde döndür, kaydır ve yakınlaştır.</p></article>
        <article><span>KAYNAK CAD</span><b>STEP · IGES · 3MF · GLTF/GLB</b><p>Kaynak korunur; glTF/GLB türevi conversion kuyruğuna alınabilir.</p></article>
        <article><span>NATIVE CAD</span><b>SOLIDWORKS · FUSION · INVENTOR</b><p>Dosya Vault'ta sürümlenir; güvenli converter adaptörü için hazır.</p></article>
      </section>

      <section className="portalHardwareRibbon">
        <span>KAYNAK CAD</span><i>→</i><span>REVISION</span><i>→</i><span>CONVERTER</span><i>→</i><span>WEB GLTF</span><i>→</i><span>İNCELEME</span>
      </section>

      {mechanical.length ? (
        <div className="vaultFileGrid">
          {mechanical.map((item) => (
            <a href={"/portal/library/" + encodeURIComponent(String(item.id))} key={String(item.id)}>
              <header><span>{String(item.kind).toUpperCase()}</span><small>R{String(item.revision)}</small></header>
              <div className="vaultFileIcon">{String(item.extension || "CAD").toUpperCase()}</div>
              <h3>{String(item.title)}</h3>
              <p>{String(item.description || item.original_name)}</p>
              <footer><span>{String(item.project_slug || item.team_code || "CORE")}</span><small>{formatVaultBytes(item.size_bytes)} · {String(item.preview_kind)}</small></footer>
            </a>
          ))}
        </div>
      ) : <PortalEmpty title="Mekanik rafı hazır." text="İlk STL, OBJ, STEP, IGES veya native CAD dosyasını Vault üzerinden yükle." />}
    </>
  );
}
