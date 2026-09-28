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
      <PortalPageHeader code="ST / INVENTORY" title="Stock & Tools" lead="Parts, tools and consumables with location, available quantity, reservations and minimum-stock alerts." />

      {canWrite ? (
        <section className="portalPanel portalCreatePanel">
          <div className="portalPanelHead"><span>ADD / SYNC ITEM</span><small>LEAD / ADMIN</small></div>
          <form className="portalFormGrid" action={upsertInventoryAction}>
            <label><span>SKU</span><input name="sku" required /></label>
            <label><span>Name</span><input name="name" required /></label>
            <label><span>Category</span><input name="category" placeholder="sensor / power / fastener" /></label>
            <label><span>Location</span><input name="location" placeholder="Lab A · Drawer 03" /></label>
            <label><span>Unit</span><input name="unit" defaultValue="pcs" /></label>
            <label><span>Quantity</span><input name="quantity" type="number" step="0.01" defaultValue="0" /></label>
            <label><span>Minimum</span><input name="minimumQuantity" type="number" step="0.01" defaultValue="0" /></label>
            <button type="submit" className="portalPrimaryButton">SAVE ITEM →</button>
          </form>
        </section>
      ) : null}

      {items.length ? (
        <div className="portalInventoryTable">
          <header><span>SKU</span><span>ITEM</span><span>LOCATION</span><span>AVAILABLE</span><span>MIN</span></header>
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
      ) : <PortalEmpty title="Inventory is empty." text="Leads can register the first component, tool or consumable above." />}
    </>
  );
}
