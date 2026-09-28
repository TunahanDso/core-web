import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { createInventoryMovementAction, upsertInventoryAction } from "@/app/portal/actions";
import { requirePortalMember } from "@/lib/portal/auth";
import { listPortalInventory, listPortalInventoryMovements } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalInventoryPage() {
  const [member, items, movements] = await Promise.all([
    requirePortalMember(),
    listPortalInventory(),
    listPortalInventoryMovements(40),
  ]);
  const canWrite = member.role === "admin" || member.role === "lead";

  return (
    <>
      <PortalPageHeader code="ST / ENVANTER" title="Stok & Araçlar" lead="Parçalar, araçlar ve sarf malzemeleri; konum, kullanılabilir miktar, rezerv ve minimum stok uyarılarıyla izlenir." />

      {canWrite ? (
        <section className="portalPanel portalCreatePanel">
          <div className="portalPanelHead"><span>ÜRÜN EKLE / GÜNCELLE</span><small>LİDER / ADMİN</small></div>
          <form className="portalFormGrid" action={upsertInventoryAction}>
            <label><span>SKU</span><input name="sku" required /></label>
            <label><span>Ad</span><input name="name" required /></label>
            <label><span>Kategori</span><input name="category" placeholder="sensor / power / fastener" /></label>
            <label><span>Konum</span><input name="location" placeholder="Lab A · Drawer 03" /></label>
            <label><span>Birim</span><input name="unit" defaultValue="pcs" /></label>
            <label><span>Miktar</span><input name="quantity" type="number" step="0.01" defaultValue="0" /></label>
            <label><span>Minimum</span><input name="minimumQuantity" type="number" step="0.01" defaultValue="0" /></label>
            <button type="submit" className="portalPrimaryButton">KAYDET →</button>
          </form>
        </section>
      ) : null}

      {items.length ? (
        <>
        <section className="portalPanel portalInventoryMovementPanel">
          <div className="portalPanelHead"><span>STOK HAREKETİ</span><small>GİRİŞ / ÇIKIŞ / PROJE TÜKETİMİ</small></div>
          <form className="portalFormGrid" action={createInventoryMovementAction}>
            <label>
              <span>Ürün</span>
              <select name="itemId" required defaultValue="">
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
            <label className="portalFormWide"><span>Neden / kullanım notu</span><input name="reason" placeholder="HYD-01 güç dağıtımı prototipi..." required /></label>
            <button type="submit" className="portalPrimaryButton">HAREKETİ KAYDET →</button>
          </form>
        </section>

        <div className="portalInventoryTable">
          <header><span>SKU</span><span>ÜRÜN</span><span>KONUM</span><span>KULLANILABİLİR</span><span>MİN</span></header>
          {items.map((item) => {
            const low = Number(item.available_quantity) <= Number(item.minimum_quantity);
            return (
              <article className={low ? "low" : ""} key={String(item.id)}>
                <span>{String(item.sku)}</span>
                <div><b>{String(item.name)}</b><small>{String(item.category)}</small></div>
                <span>{String(item.location || "—")}</span>
                <strong>{String(item.available_quantity)} {String(item.unit)}</strong>
                <span>{String(item.minimum_quantity)}</span>
              </article>
            );
          })}
        </div>

        <section className="portalPanel portalInventoryHistory">
          <div className="portalPanelHead"><span>SON STOK HAREKETLERİ</span><small>{movements.length} kayıt</small></div>
          <div className="portalMovementList">
            {movements.length ? movements.map((movement) => (
              <article key={String(movement.id)}>
                <span className={Number(movement.delta) < 0 ? "out" : "in"}>
                  {Number(movement.delta) > 0 ? "+" : ""}{String(movement.delta)} {String(movement.unit)}
                </span>
                <div>
                  <b>{String(movement.sku)} · {String(movement.name)}</b>
                  <small>{String(movement.reason)}{movement.project_slug ? " · " + String(movement.project_slug) : ""}</small>
                </div>
                <em>{String(movement.member_name || movement.member_email || "Sistem")}</em>
                <small>{String(movement.created_at)}</small>
              </article>
            )) : <p className="portalMuted">Henüz stok hareketi yok.</p>}
          </div>
        </section>
        </>
      ) : <PortalEmpty title="Envanter boş." text="Liderler ilk bileşen, araç veya sarf malzemesini yukarıdan kaydedebilir." />}
    </>
  );
}
