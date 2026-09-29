import Link from "next/link";
import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createInventoryMovementAction, upsertInventoryAction } from "@/app/portal/actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalInventory, listPortalInventoryMovements } from "@/lib/portal/db";
import PortalInventoryScanner from "@/components/portal/PortalInventoryScanner";

export const dynamic = "force-dynamic";

function inventoryHref(input: Record<string,string | undefined>) {
  const params=new URLSearchParams();
  Object.entries(input).forEach(([key,value])=>{ if(value) params.set(key,value); });
  const query=params.toString();
  return "/portal/inventory"+(query?"?"+query:"");
}

export default async function PortalInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{
    scan?: string;
    scanNow?: string;
    action?: string;
    view?: string;
    q?: string;
    low?: string;
  }>;
}) {
  const query = searchParams ? await searchParams : {};
  const scannedCode = String(query.scan || "").trim();
  const [member, items, movements] = await Promise.all([
    requirePortalMember(),
    listPortalInventory(),
    listPortalInventoryMovements(80),
  ]);
  const canWrite = member.role === "admin" || member.role === "lead";
  const matchedItem = scannedCode
    ? items.find((item) => String(item.sku || "").trim().toLowerCase() === scannedCode.toLowerCase())
    : undefined;

  const q=String(query.q || "").trim().toLocaleLowerCase("tr-TR");
  const lowOnly=String(query.low || "") === "1";
  const view=String(query.view || "") === "history" ? "history" : "stock";
  const action=canWrite && ["item","movement"].includes(String(query.action)) ? String(query.action) : "";

  const filteredItems=items.filter((item)=>{
    const low=Number(item.available_quantity) <= Number(item.minimum_quantity);
    if(lowOnly && !low) return false;
    if(q){
      const haystack=[item.sku,item.name,item.category,item.location]
        .map((value)=>String(value || ""))
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      if(!haystack.includes(q)) return false;
    }
    return true;
  });
  const displayItems = matchedItem
    ? [matchedItem, ...filteredItems.filter((item) => String(item.id) !== String(matchedItem.id))]
    : filteredItems;
  const lowCount=items.filter((item)=>Number(item.available_quantity) <= Number(item.minimum_quantity)).length;

  return (
    <>
      <PortalPageHeader
        code="ENVANTER"
        title="Stok & Araçlar"
        lead="Stok seviyelerini karşılaştır, hareketleri ayrı görünümde izle ve yalnız gerektiğinde kayıt formunu aç."
        action={canWrite ? <a className="portalPrimaryButton" href={inventoryHref({action:"item",view})}>+ ÜRÜN KAYDET</a> : undefined}
      />

      <PortalInventoryScanner autoStart={String(query.scanNow || "") === "1"} />

      {scannedCode ? (
        <section className={"nativeScanResult " + (matchedItem ? "matched" : "missing")}>
          <span>{matchedItem ? "KOD EŞLEŞTİ" : "KOD BULUNAMADI"}</span>
          <div>
            <b>{scannedCode}</b>
            <small>
              {matchedItem
                ? String(matchedItem.name) + " · " + String(matchedItem.location || "konum yok")
                : "Bu barkod / QR henüz CORE envanterinde bir SKU ile eşleşmiyor."}
            </small>
          </div>
          {matchedItem ? <strong>{String(matchedItem.available_quantity)} {String(matchedItem.unit)}</strong> : null}
        </section>
      ) : null}

      <section className="portalRegistryToolbar">
        {view === "stock" ? (
          <form action="/portal/inventory" method="get">
            <input type="hidden" name="view" value="stock" />
            <label className="grow">
              <span>ARA</span>
              <input name="q" defaultValue={String(query.q || "")} placeholder="SKU, ürün, kategori veya konum..." />
            </label>
            <label className="portalTaskMine">
              <input type="checkbox" name="low" value="1" defaultChecked={lowOnly} />
              <span>Düşük stok</span>
            </label>
            <button type="submit">UYGULA</button>
            {(q || lowOnly) ? <Link prefetch={false} className="subtle" href="/portal/inventory">Temizle</Link> : null}
          </form>
        ) : (
          <div className="portalRegistryTabs">
            <span className="portalMuted">Son {movements.length} stok hareketi</span>
          </div>
        )}

        <div className="portalRegistrySummary">
          <span>{view === "stock" ? "STOK" : "HAREKET"}</span>
          <b>{view === "stock" ? displayItems.length : movements.length}</b>
          <small>{view === "stock" ? lowCount+" düşük" : "son kayıtlar"}</small>
        </div>

        <nav className="portalSegmentedControl" aria-label="Envanter görünümü">
          <Link prefetch={false} className={view === "stock" ? "active" : ""} href="/portal/inventory">Stok</Link>
          <Link prefetch={false} className={view === "history" ? "active" : ""} href="/portal/inventory?view=history">Hareketler</Link>
        </nav>

        {canWrite ? (
          <a className="primary" href={inventoryHref({action:"movement",view,scan:matchedItem?String(matchedItem.sku):undefined})}>
            Stok hareketi
          </a>
        ) : null}
      </section>

      {action === "item" ? (
        <section className="portalToolSurface">
          <div className="portalToolBody">
            <div className="portalInlineToolHead">
              <div><b>Ürün ekle veya güncelle</b><small>SKU mevcutsa kayıt güncellenir.</small></div>
              <a href={inventoryHref({view})}>Kapat</a>
            </div>
            <form className="portalFormGrid" action={upsertInventoryAction}>
              <label><span>SKU</span><input name="sku" required autoFocus /></label>
              <label><span>Ad</span><input name="name" required /></label>
              <label><span>Kategori</span><input name="category" placeholder="sensor / power / fastener" /></label>
              <label><span>Konum</span><input name="location" placeholder="Lab A · Drawer 03" /></label>
              <label><span>Birim</span><input name="unit" defaultValue="pcs" /></label>
              <label><span>Miktar</span><input name="quantity" type="number" step="0.01" defaultValue="0" /></label>
              <label><span>Minimum</span><input name="minimumQuantity" type="number" step="0.01" defaultValue="0" /></label>
              <button type="submit" className="portalPrimaryButton">Kaydet</button>
            </form>
          </div>
        </section>
      ) : null}

      {action === "movement" && items.length ? (
        <section className="portalToolSurface">
          <div className="portalToolBody">
            <div className="portalInlineToolHead">
              <div><b>Stok hareketi kaydet</b><small>Giriş veya çıkış işlemini tek kayıt olarak işle.</small></div>
              <a href={inventoryHref({view,scan:matchedItem?String(matchedItem.sku):undefined})}>Kapat</a>
            </div>
            <form className="portalFormGrid" action={createInventoryMovementAction}>
              <label>
                <span>Ürün</span>
                <select name="itemId" required defaultValue={matchedItem ? String(matchedItem.id) : ""}>
                  <option value="" disabled>Ürün seç</option>
                  {items.map((item) => <option value={String(item.id)} key={String(item.id)}>{String(item.sku)} · {String(item.name)}</option>)}
                </select>
              </label>
              <label>
                <span>Hareket</span>
                <select name="direction" defaultValue="out">
                  <option value="out">Stoktan çıkış</option>
                  <option value="in">Stok girişi</option>
                </select>
              </label>
              <label><span>Miktar</span><input name="amount" type="number" step="0.01" min="0.01" required /></label>
              <label><span>Proje</span><input name="projectSlug" placeholder="hydronom" /></label>
              <label className="portalFormWide"><span>Neden / kullanım notu</span><input name="reason" placeholder="Prototip, bakım veya test..." required /></label>
              <button type="submit" className="portalPrimaryButton">Hareketi kaydet</button>
            </form>
          </div>
        </section>
      ) : null}

      {view === "stock" ? (
        displayItems.length ? (
          <div className="portalDataTableShell">
            <table className="portalDataTable portalInventoryDataTable">
              <thead>
                <tr>
                  <th scope="col">SKU</th>
                  <th scope="col">Ürün</th>
                  <th scope="col">Kategori</th>
                  <th scope="col">Konum</th>
                  <th scope="col">Kullanılabilir</th>
                  <th scope="col">Minimum</th>
                  <th scope="col">Durum</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item)=>{
                  const low=Number(item.available_quantity) <= Number(item.minimum_quantity);
                  const scanned=matchedItem && String(item.id) === String(matchedItem.id);
                  return (
                    <tr className={scanned ? "selected" : ""} key={String(item.id)}>
                      <td className="mono"><b>{String(item.sku)}</b></td>
                      <td className="primaryCell"><div><b>{String(item.name)}</b><small>{String(item.unit)}</small></div></td>
                      <td>{String(item.category || "—")}</td>
                      <td>{String(item.location || "—")}</td>
                      <td className="numeric"><strong>{String(item.available_quantity)} {String(item.unit)}</strong></td>
                      <td className="numeric">{String(item.minimum_quantity)}</td>
                      <td><span className={"portalStatusText "+(low?"lowStock":"active")}>{low ? "Düşük stok" : "Normal"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <PortalEmpty
            title={items.length ? "Bu filtrelerle stok kaydı yok." : "Envanter boş."}
            text={items.length ? "Filtreleri temizle veya farklı bir arama yap." : "İlk bileşen, araç veya sarf malzemesini kaydettiğinde burada listelenecek."}
          />
        )
      ) : (
        movements.length ? (
          <div className="portalDataTableShell">
            <table className="portalDataTable portalMovementDataTable">
              <thead>
                <tr>
                  <th scope="col">Zaman</th>
                  <th scope="col">Ürün</th>
                  <th scope="col">Değişim</th>
                  <th scope="col">Proje</th>
                  <th scope="col">Neden</th>
                  <th scope="col">İşleyen</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement)=>(
                  <tr key={String(movement.id)}>
                    <td className="mono">{String(movement.created_at)}</td>
                    <td className="primaryCell"><div><b>{String(movement.sku)} · {String(movement.name)}</b><small>{String(movement.unit)}</small></div></td>
                    <td className="numeric"><strong>{Number(movement.delta)>0?"+":""}{String(movement.delta)} {String(movement.unit)}</strong></td>
                    <td className="mono">{String(movement.project_slug || "—")}</td>
                    <td>{String(movement.reason || "—")}</td>
                    <td>{String(movement.member_name || movement.member_email || "Sistem")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <PortalEmpty title="Henüz stok hareketi yok." text="İlk giriş veya çıkış işlemi burada zaman, kişi ve gerekçesiyle görünecek." />
      )}
    </>
  );
}
