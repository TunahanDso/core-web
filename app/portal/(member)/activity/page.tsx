import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { listPortalActivity } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalActivityPage() {
  const activity = await listPortalActivity(150);
  return (
    <>
      <PortalPageHeader code="AC / ETKİNLİK" title="Etkinlik Geçmişi" lead="Hesap, görev, kaynak, envanter ve koordinasyon olaylarının okunabilir operasyon geçmişi." />
      {activity.length ? (
        <div className="portalActivityTable">
          {activity.map((item) => (
            <article key={String(item.id)}>
              <span>{String(item.created_at)}</span><b>{String(item.action)}</b>
              <div>{String(item.actor)}</div><small>{String(item.entity_type)} / {String(item.entity_id)}</small>
            </article>
          ))}
        </div>
      ) : <PortalEmpty title="Henüz portal etkinliği yok." text="Üyeler çalıştıkça operasyon olayları burada birikecek." />}
    </>
  );
}
