import fs from "node:fs";

function requireFile(path){
  if(!fs.existsSync(path)) throw new Error("Required file missing: "+path);
  return fs.readFileSync(path,"utf8");
}
function assert(condition,message){
  if(!condition) throw new Error(message);
}

const pkg=JSON.parse(requireFile("package.json"));
assert(pkg.scripts?.build==="vite build","Production build must use Vite/Vinext plugin path.");
assert(pkg.scripts?.["schema:generate"],"Schema generation script is required.");
assert(pkg.scripts?.["test:unit"],"Unit test script is required.");

const wrangler=JSON.parse(requireFile("wrangler.jsonc"));
assert((wrangler.d1_databases||[]).some((item)=>item.binding==="DB"),"DB binding missing.");
assert((wrangler.r2_buckets||[]).some((item)=>item.binding==="MEDIA"),"MEDIA binding missing.");
assert(wrangler.vars?.CORE_RUNNER_URL==="https://runner.ytucore.com","Runner service contract drifted.");

const bootstrap=requireFile("lib/portal/bootstrap.ts");
assert(bootstrap.includes("@/lib/generated/portal-migrations"),"Bootstrap must consume generated migration bundle.");
assert(!bootstrap.includes("CREATE TABLE"),"Bootstrap must not embed hand-maintained schema SQL.");

const terminal=requireFile("components/portal/LiveCodeTerminal.tsx");
assert(!terminal.includes("token="),"Terminal capability token must never enter a browser URL.");

const vaultClient=requireFile("components/portal/vault-upload-client.ts");
assert(!vaultClient.includes("capability-token"),"Vault browser client must not receive capability bearer tokens.");

for(const path of [
  "public/desktop/trust/YTU-CORE-Internal-Root-CA.cer",
  "public/desktop/trust/YTU-CORE-Desktop-Code-Signing.cer",
  "public/desktop/trust/install-core-trust.ps1",
  "public/workers/kicad-parser.js",
  "public/workers/model-parser.js",
  "lib/generated/portal-migrations.ts",
]){
  requireFile(path);
}

console.log("Focused CORE security/build/schema contracts validated.");
