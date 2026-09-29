import assert from "node:assert/strict";

const base=(process.env.E2E_BASE_URL||"https://ytucore.com").replace(/\/$/,"");

async function fetchWithRetry(path,options={}){
  let lastError;
  for(let attempt=0;attempt<12;attempt+=1){
    try{
      const response=await fetch(base+path,{redirect:"follow",...options});
      if(response.status<500) return response;
      lastError=new Error(path+" returned "+response.status);
    }catch(error){
      lastError=error;
    }
    await new Promise((resolve)=>setTimeout(resolve,5000));
  }
  throw lastError||new Error("E2E request failed: "+path);
}

const page=await fetchWithRetry("/tr");
assert.equal(page.status,200,"/tr must be healthy");
assert.equal(new URL(page.url).protocol,"https:","Public page must remain HTTPS");
assert.match(page.headers.get("strict-transport-security")||"",/max-age=/i,"HSTS missing");
assert.match(page.headers.get("content-security-policy")||"",/default-src/i,"CSP missing");
assert.equal((page.headers.get("x-content-type-options")||"").toLowerCase(),"nosniff","nosniff missing");
assert.ok(page.headers.get("referrer-policy"),"Referrer-Policy missing");

const telemetry=await fetchWithRetry("/api/portal/telemetry");
assert.equal(telemetry.status,200,"Telemetry gateway health must be reachable");
const telemetryJson=await telemetry.json();
assert.equal(telemetryJson.commands,false,"Telemetry gateway must remain non-command authority");

const manifest=await fetchWithRetry("/manifest.webmanifest");
assert.equal(manifest.status,200,"PWA manifest must be reachable");

console.log("YTÜ CORE live E2E smoke passed:",base);
