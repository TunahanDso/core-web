import { PortalPageHeader } from "@/components/portal/PortalPage";
import { listPortalVehicles } from "@/lib/portal/db";
import { portalVehicleStatusLabel } from "@/lib/portal/labels";

export const dynamic = "force-dynamic";

export default async function PortalOpsPage() {
  const vehicles = await listPortalVehicles();
  return (
    <>
      <PortalPageHeader code="OP / VEHICLE LIVE" title="Canlı Araç" lead="Salt okunur operasyon farkındalığı. Telemetri bu yüzeye girebilir; komut otoritesi asla girmez." />
      <section className="portalOpsBoundary">
        <span>GÜVENLİK SINIRI</span>
        <b>TELEMETRİ GİRİŞİ → GÖZLE / KAYDET / ANALİZ ET</b>
        <strong>AKTÜATÖR VEYA GÖREV KOMUT ENDPOINT'İ YOK</strong>
      </section>
      <div className="portalVehicleGrid">
        {vehicles.map((vehicle) => (
          <article key={String(vehicle.id)}>
            <header><span>{String(vehicle.code)}</span><b className={String(vehicle.status)}>{portalVehicleStatusLabel(String(vehicle.status))}</b></header>
            <h2>{String(vehicle.name)}</h2>
            <p>{String(vehicle.domain)}</p>
            <div className="portalTelemetryGrid">
              <div><span>LAT</span><b>{vehicle.latitude == null ? "—" : String(vehicle.latitude)}</b></div>
              <div><span>LON</span><b>{vehicle.longitude == null ? "—" : String(vehicle.longitude)}</b></div>
              <div><span>BATARYA</span><b>{vehicle.battery == null ? "—" : String(vehicle.battery) + "%"}</b></div>
              <div><span>MOD</span><b>{String(vehicle.telemetry_mode || "VERİ YOK")}</b></div>
            </div>
            <footer>{vehicle.last_seen_at ? "SON GÖRÜLME " + String(vehicle.last_seen_at) : "TELEMETRİ BEKLENİYOR"}</footer>
          </article>
        ))}
      </div>
    </>
  );
}
