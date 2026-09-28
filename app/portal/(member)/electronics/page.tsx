import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { listPortalResources } from "@/lib/portal/db";
import { portalResourceKindLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalElectronicsPage() {
  const all = await listPortalResources();
  const resources = all.filter((item) => ["pcb","bom","drawing"].includes(String(item.kind)));
  return (
    <>
      <PortalPageHeader code="HW / ELEKTRONİK" title="PCB & Elektronik" lead="Kart dosyaları, BOM'lar, şemalar, kablolama referansları ve donanım kanıtları takım ve projeye göre indekslenir." />
      <section className="portalHardwareRibbon">
        <span>ŞEMA</span><i>→</i><span>PCB</span><i>→</i><span>BOM</span><i>→</i><span>MONTAJ</span><i>→</i><span>SMOKE TEST</span><i>→</i><span>SAHA</span>
      </section>
      {resources.length ? (
        <div className="portalResourceGrid">
          {resources.map((item) => (
            <article key={String(item.id)}>
              <div><span>{portalResourceKindLabel(String(item.kind))}</span><small>{String(item.team_code || "EMB")}</small></div>
              <h3>{String(item.title)}</h3><p>{String(item.description || "")}</p>
              <footer><small>{String(item.project_slug || "ortak donanım")}</small>{item.external_url ? <a href={String(item.external_url)}>AÇ ↗</a> : <span>İNDEKSLENDİ</span>}</footer>
            </article>
          ))}
        </div>
      ) : <PortalEmpty title="Donanım kaydı hazır." text="İlk PCB, BOM veya çizimi Kütüphane modülünden ekle." />}
    </>
  );
}
