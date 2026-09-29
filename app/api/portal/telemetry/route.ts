import { env } from "cloudflare:workers";
import { timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { telemetryDb } from "@/lib/platform/databases";

export const dynamic = "force-dynamic";

function secureEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const secret = typeof env.PORTAL_TELEMETRY_INGEST_KEY === "string"
    ? env.PORTAL_TELEMETRY_INGEST_KEY
    : "";

  if (!secret) {
    return Response.json({ ok: false, error: "telemetry-ingest-not-configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization") || "";
  const supplied = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!supplied || !secureEqual(supplied, secret)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) return Response.json({ ok: false, error: "vehicle-code-required" }, { status: 400 });

  const database=telemetryDb();
  const vehicle = await database.prepare("SELECT id FROM portal_vehicle_units WHERE code=? LIMIT 1")
    .bind(code)
    .first<{ id: string }>();
  if (!vehicle) return Response.json({ ok: false, error: "unknown-vehicle" }, { status: 404 });

  const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;
  const mode = typeof body.mode === "string" ? body.mode.slice(0, 80) : null;
  const status = typeof body.status === "string" && ["offline","idle","testing","mission","maintenance"].includes(body.status)
    ? body.status
    : "testing";
  const health = body.health && typeof body.health === "object" ? body.health : {};

  await database.batch([
    database.prepare("INSERT INTO portal_telemetry_snapshots (vehicle_id,latitude,longitude,heading,speed,battery,mode,health_json) VALUES (?,?,?,?,?,?,?,?)")
      .bind(vehicle.id,numeric(body.latitude),numeric(body.longitude),numeric(body.heading),numeric(body.speed),numeric(body.battery),mode,JSON.stringify(health)),
    database.prepare("UPDATE portal_vehicle_units SET status=?,last_seen_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(status,vehicle.id),
  ]);

  return Response.json({ ok: true, accepted: "telemetry-only" });
}

export function GET() {
  return Response.json({
    ok: true,
    service: "YTÜ CORE portal telemetry ingest",
    authority: "read-only-observability",
    commands: false,
  });
}
