function json(body,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{"content-type":"application/json","cache-control":"no-store"},
  });
}

function secureEqual(a,b){
  if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length) return false;
  let diff=0;
  for(let i=0;i<a.length;i+=1) diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}

function numeric(value){
  return typeof value==="number"&&Number.isFinite(value)?value:null;
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method==="GET"&&url.pathname==="/health"){
      return json({ok:true,service:"core-telemetry",authority:"ingest-only"});
    }
    if(request.method!=="POST"||url.pathname!=="/v1/ingest"){
      return json({ok:false,error:"not-found"},404);
    }

    const secret=String(env.PORTAL_TELEMETRY_INGEST_KEY||"");
    const auth=request.headers.get("authorization")||"";
    const supplied=auth.startsWith("Bearer ")?auth.slice(7):"";
    if(!secret||!supplied||!secureEqual(supplied,secret)){
      return json({ok:false,error:"unauthorized"},401);
    }
    if(!env.DB) return json({ok:false,error:"db-unavailable"},503);

    let body;
    try{ body=await request.json(); }
    catch{ return json({ok:false,error:"invalid-json"},400); }

    const code=typeof body.code==="string"?body.code.trim():"";
    if(!code) return json({ok:false,error:"vehicle-code-required"},400);

    const vehicle=await env.DB.prepare("SELECT id FROM portal_vehicle_units WHERE code=? LIMIT 1")
      .bind(code).first();
    if(!vehicle) return json({ok:false,error:"unknown-vehicle"},404);

    const status=typeof body.status==="string"&&["offline","idle","testing","mission","maintenance"].includes(body.status)
      ? body.status
      : "testing";
    const mode=typeof body.mode==="string"?body.mode.slice(0,80):null;
    const health=body.health&&typeof body.health==="object"?body.health:{};

    await env.DB.batch([
      env.DB.prepare("INSERT INTO portal_telemetry_snapshots (vehicle_id,latitude,longitude,heading,speed,battery,mode,health_json) VALUES (?,?,?,?,?,?,?,?)")
        .bind(vehicle.id,numeric(body.latitude),numeric(body.longitude),numeric(body.heading),numeric(body.speed),numeric(body.battery),mode,JSON.stringify(health)),
      env.DB.prepare("UPDATE portal_vehicle_units SET status=?,last_seen_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(status,vehicle.id),
    ]);

    return json({ok:true,accepted:"telemetry-only"});
  }
};
