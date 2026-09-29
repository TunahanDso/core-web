import Link from "next/link";
import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalResources } from "@/lib/portal/db";
import { formatVaultBytes, listPortalVaultFiles } from "@/lib/portal/vault";
import { portalResourceKindLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

const ELECTRONICS_EXTENSIONS = new Set([
  "kicad_pcb","kicad_sch","gbr","ger","gerber","drl","bom","pos","step","stp",
]);

export default async function PortalElectronicsPage() {
  const member = await requirePortalMember();
  const [vaultFiles, legacy] = await Promise.all([
    listPortalVaultFiles({ lifecycle: "active", limit: 300, viewer: member }),
    listPortalResources(),
  ]);
  const files = vaultFiles.filter((item) =>
    ["pcb","electronics","bom","drawing"].includes(String(item.kind)) ||
    ELECTRONICS_EXTENSIONS.has(String(item.extension || "").toLowerCase())
  );
  const legacyResources = legacy.filter((item) => ["pcb","bom","drawing"].includes(String(item.kind)));

  return (
    <>
      <PortalPageHeader
        code="HW / PCB & ELEKTRONİK"
        title="Elektronik Tasarım Alanı"
        lead="KiCad, Gerber, drill, BOM, Pick&Place ve kart türevlerini revision geçmişi ve proje bağlamıyla CORE Vault üzerinde tut."
        action={<Link prefetch={false} className="portalOutlineButton" href="/portal/library">VAULT'A DOSYA YÜKLE →</Link>}
      />

      <section className="portalHardwareRibbon">
        <span>ŞEMA</span><i>→</i><span>PCB</span><i>→</i><span>GERBER</span><i>→</i><span>BOM / PNP</span><i>→</i><span>3B TÜREV</span><i>→</i><span>SMOKE TEST</span>
      </section>

      <section className="pcbCapabilityGrid">
        <article><span>KICAD</span><b>.kicad_pcb · .kicad_sch</b><p>Kart kaynakları metin olarak incelenir; PCB dosyasında Edge.Cuts ve footprint katman önizlemesi açılır.</p></article>
        <article><span>ÜRETİM</span><b>GERBER · DRILL · BOM · PNP</b><p>Üretim çıktıları aynı proje ve revision zincirinde tutulur.</p></article>
        <article><span>3B KART</span><b>PCB → DERIVATIVE</b><p>Ayrı converter servisi için pcb-3d kuyruğu hazır; CMS Worker içinde CAD çalıştırılmaz.</p></article>
      </section>

      {files.length ? (
        <div className="vaultFileGrid">
          {files.map((item) => (
            <Link prefetch={false} href={"/portal/library/" + encodeURIComponent(String(item.id))} key={String(item.id)}>
              <header><span>{String(item.kind).toUpperCase()}</span><small>R{String(item.revision)} · {String(item.approval_state).toUpperCase()}</small></header>
              <div className="vaultFileIcon">{String(item.extension || "PCB").toUpperCase()}</div>
              <h3>{String(item.title)}</h3>
              <p>{String(item.description || item.original_name)}</p>
              <footer><span>{String(item.project_slug || item.team_code || "CORE")}</span><small>{formatVaultBytes(item.size_bytes)} · {String(item.preview_kind)}</small></footer>
            </Link>
          ))}
        </div>
      ) : <PortalEmpty title="Elektronik Vault rafı hazır." text="İlk KiCad, Gerber, BOM veya drill dosyasını Vault üzerinden yükle." />}

      {legacyResources.length ? (
        <section className="portalPanel vaultLegacyIndex">
          <div className="portalPanelHead"><span>ESKİ ELEKTRONİK İNDEKSİ</span><small>V1 KAYITLARI KORUNUYOR</small></div>
          <div className="portalResourceGrid">
            {legacyResources.map((item) => (
              <article key={String(item.id)}>
                <div><span>{portalResourceKindLabel(String(item.kind))}</span><small>{String(item.team_code || "EMB")}</small></div>
                <h3>{String(item.title)}</h3><p>{String(item.description || "")}</p>
                <footer><small>{String(item.project_slug || "ortak donanım")}</small>{item.external_url ? <a href={String(item.external_url)}>HARİCİ AÇ ↗</a> : <span>LEGACY</span>}</footer>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
