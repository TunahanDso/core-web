import { PortalPageHeader } from "@/components/portal/PortalPage";
import { getPortalAnalytics, listPortalInventory, listPortalTasks } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalAnalyticsPage() {
  const [analytics, tasks, inventory] = await Promise.all([
    getPortalAnalytics(),
    listPortalTasks(),
    listPortalInventory(),
  ]);
  const totalTasks = Number(analytics.tasks_total || 0);
  const tamamlandıTasks = Number(analytics.tasks_done || 0);
  const completion = totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0;
  const low = inventory.filter((item) => Number(item.available_quantity) <= Number(item.minimum_quantity)).length;

  return (
    <>
      <PortalPageHeader code="AN / ANALYTICS" title="CORE İstatistikleri" lead="İnsan, iş, bilgi, donanım ve iletişim için operasyon sinyalleri. Gösteriş metriğine ihtiyaç yok." />
      <section className="portalAnalyticsGrid">
        <article><span>ÜYELER</span><b>{String(analytics.members_active || 0)}</b><small>{String(analytics.members_total || 0)} toplam kayıt</small></article>
        <article><span>GÖREV TAMAMLAMA</span><b>{completion}%</b><small>{doneTasks} / {totalTasks} tamamlandı</small></article>
        <article><span>BİLGİ</span><b>{String(analytics.resources_total || 0)}</b><small>indeksli kaynak</small></article>
        <article><span>ENVANTER</span><b>{String(analytics.inventory_total || 0)}</b><small>{low} düşük stok ürünü</small></article>
        <article><span>SOHBET</span><b>{String(analytics.messages_total || 0)}</b><small>mesaj saklandı</small></article>
        <article><span>ETKİNLİK</span><b>{String(analytics.portal_activity_total || 0)}</b><small>portal olayı</small></article>
      </section>
      <section className="portalPanel">
        <div className="portalPanelHead"><span>İŞ DAĞILIMI</span><small>CANLI D1</small></div>
        <div className="portalStatusBars">
          {["backlog","todo","doing","review","blocked","done"].map((status) => {
            const count = tasks.filter((task) => String(task.status) === status).length;
            const width = totalTasks ? Math.max(3, Math.round(count / totalTasks * 100)) : 0;
            return <div key={status}><span>{status.toUpperCase()}</span><i><b style={{ width: width + "%" }} /></i><strong>{count}</strong></div>;
          })}
        </div>
      </section>
    </>
  );
}
