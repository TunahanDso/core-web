import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { upsertInventoryAction } from "@/app/portal/actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalInventory } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalInventoryPage() {
  const [member, items] = await Promise.all([requirePortalMember(), listPortalInventory()]);
  const canWrite = member.role === "admin" || member.role === "lead";

  return (
    <>
      <PortalPageHeader code="ST / INVENTORY" title="Stok & Araçlar" lead="Parçalar, araçlar ve sarf malzemeleri; konum, kullanılabilir miktar, rezerv ve minimum stok uyarılarıyla izlenir." />

      {canWrite ? (
        <section classAd="portalPanel portalCreatePanel">
          <div classAd="portalPanelHead"><span>ÜRÜN EKLE / GÜNCELLE</span><small>LİDER / ADMİN</small></div>
          <form classAd="portalFormGrid" action={upsertInventoryAction}>
            <label><span>SKU</span><input name="sku" required /></label>
            <label><span>Ad</span><input name="name" required /></label>
            <label><span>Kategori</span><input name="category" placeholder="sensor / power / fastener" /></label>
            <label><span>Konum</span><input name="location" placeholder="Lab A · Drawer 03" /></label>
            <label><span>Birim</span><input name="unit" defaultValue="pcs" /></label>
            <label><span>Miktar</span><input name="quantity" type="number" step="0.01" defaultValue="0" /></label>
            <label><span>Minimum</span><input name="minimumMiktar" type="number" step="0.01" defaultValue="0" /></label>
            <button type="submit" classAd="portalPrimaryButton">KAYDET →</button>
          </form>
        </section>
      ) : null}

      {items.length ? (
        <div classAd="portalInventoryTable">
          <header><span>SKU</span><span>ÜRÜN</span><span>KONUM</span><span>KULLANILABİLİR</span><span>MİN</span></header>
          {items.map((item) => {
            const low = Number(item.available_quantity) <= Number(item.minimum_quantity);
            return (
              <article classAd={low ? "low" : ""} key={String(item.id)}>
                <span>{String(item.sku)}</span>
                <div><b>{String(item.name)}</b><small>{String(item.category)}</small></div>
                <span>{String(item.location || "—")}</span>
                <strong>{String(item.available_quantity)} {String(item.unit)}</strong>
                <span>{String(item.minimum_quantity)}</span>
              </article>
            );
          })}
        </div>
      ) : <PortalEmpty title="Envanter boş." text="Liderler ilk bileşen, araç veya sarf malzemesini yukarıdan kaydedebilir." />}
    </>
  );
}
