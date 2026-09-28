import { PortalPageHeader } from "@/components/portal/PortalPage";
import { listPortalVehicles } from "@/lib/portal/db";

export const dynamic = "force-dynamic";

export default async function PortalOpsPage() {
  const vehicles = await listPortalVehicles();
  return (
    <>
      <PortalPageHeader code="OP / VEHICLE LIVE" title="Vehicle Live" lead="Read-only operational awareness. Telemetry may enter this surface; command authority never does." />
      <section className="portalOpsBoundary">
        <span>SECURITY BOUNDARY</span>
        <b>TELEMETRY IN → OBSERVE / LOG / ANALYZE</b>
        <strong>NO ACTUATOR OR MISSION COMMAND ENDPOINT</strong>
      </section>
      <div className="portalVehicleGrid">
        {vehicles.map((vehicle) => (
          <article key={String(vehicle.id)}>
            <header><span>{String(vehicle.code)}</span><b className={String(vehicle.status)}>{String(vehicle.status).toUpperCase()}</b></header>
            <h2>{String(vehicle.name)}</h2>
            <p>{String(vehicle.domain)}</p>
            <div className="portalTelemetryGrid">
              <div><span>LAT</span><b>{vehicle.latitude == null ? "—" : String(vehicle.latitude)}</b></div>
              <div><span>LON</span><b>{vehicle.longitude == null ? "—" : String(vehicle.longitude)}</b></div>
              <div><span>BATTERY</span><b>{vehicle.battery == null ? "—" : String(vehicle.battery) + "%"}</b></div>
              <div><span>MODE</span><b>{String(vehicle.telemetry_mode || "NO DATA")}</b></div>
            </div>
            <footer>{vehicle.last_seen_at ? "LAST SEEN " + String(vehicle.last_seen_at) : "AWAITING TELEMETRY INGESTION"}</footer>
          </article>
        ))}
      </div>
    </>
  );
}
