import { env } from "cloudflare:workers";
import { timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { telemetryDb } from "@/lib/platform/databases";

export const dynamic = "force-dynamic";

function secureEqual(a:string,b:string){
  const left=Buffer.from(a);
  const right=Buffer.from(b);
  return left.length===right.length&&timingSafeEqual(left,right);
}

function telemetryServiceUrl(){
  const value=String((env as unknown as Record<string,unknown>).CORE_TELEMETRY_URL||"").trim().replace(/\/$/,"");
  if(!value) return null;
  try{
    const parsed=new URL(value);
    return parsed.protocol==="https:"?parsed.toString().replace(/\/$/,""):null;
  }catch{
    return null;
  }
}

export async function POST(request:Request){
  const auth=request.headers.get("authorization")||"";
  const service=telemetryServiceUrl();
  const raw=await request.text();

  if(service){
    try{
      const response=await fetch(service+"/v1/ingest",{
        method:"POST",
        headers:{
          "authorization":auth,
          "content-type":"application/json",
          "accept":"application/json",
        },
        body:raw,
        signal:AbortSignal.timeout(4000),
      });
      return new Response(response.body,{
        status:response.status,
        headers:{
          "content-type":response.headers.get("content-type")||"application/json",
          "cache-control":"no-store",
          "x-core-telemetry-provider":"isolated-worker",
        },
      });
    }catch{
      return Response.json({ok:false,error:"telemetry-service-unavailable"},{status:503});
    }
  }

  const secret=typeof env.PORTAL_TELEMETRY_INGEST_KEY==="string"
    ? env.PORTAL_TELEMETRY_INGEST_KEY
    : "";
  if(!secret){
    return Response.json({ok:false,error:"telemetry-ingest-not-configured"},{status:503});
  }

  const supplied=auth.startsWith("Bearer ")?auth.slice(7):"";
  if(!supplied||!secureEqual(supplied,secret)){
    return Response.json({ok:false,error:"unauthorized"},{status:401});
  }

  let body:Record<string,unknown>;
  try{
    body=JSON.parse(raw) as Record<string,unknown>;
  }catch{
    return Response.json({ok:false,error:"invalid-json"},{status:400});
  }

  const code=typeof body.code==="string"?body.code.trim():"";
  if(!code) return Response.json({ok:false,error:"vehicle-code-required"},{status:400});

  const database=telemetryDb();
  const vehicle=await database.prepare("SELECT id FROM portal_vehicle_units WHERE code=? LIMIT 1")
    .bind(code)
    .first<{id:string}>();
  if(!vehicle) return Response.json({ok:false,error:"unknown-vehicle"},{status:404});

  const numeric=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)?value:null;
  const mode=typeof body.mode==="string"?body.mode.slice(0,80):null;
  const status=typeof body.status==="string"&&["offline","idle","testing","mission","maintenance"].includes(body.status)
    ? body.status
    : "testing";
  const health=body.health&&typeof body.health==="object"?body.health:{};

  await database.batch([
    database.prepare("INSERT INTO portal_telemetry_snapshots (vehicle_id,latitude,longitude,heading,speed,battery,mode,health_json) VALUES (?,?,?,?,?,?,?,?)")
      .bind(vehicle.id,numeric(body.latitude),numeric(body.longitude),numeric(body.heading),numeric(body.speed),numeric(body.battery),mode,JSON.stringify(health)),
    database.prepare("UPDATE portal_vehicle_units SET status=?,last_seen_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(status,vehicle.id),
  ]);

  return Response.json(
    {ok:true,accepted:"telemetry-only"},
    {headers:{"x-core-telemetry-provider":"web-worker-fallback"}}
  );
}

export function GET(){
  return Response.json({
    ok:true,
    service:"YTÜ CORE portal telemetry gateway",
    provider:telemetryServiceUrl()?"isolated-worker":"web-worker-fallback",
    authority:"read-only-observability",
    commands:false,
  });
}
