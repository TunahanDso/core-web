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



const auth=requireFile("lib/portal/auth.ts");
assert(auth.includes("portal_team_memberships"),"Portal sessions must derive teams from authoritative memberships.");

const governance=requireFile("lib/portal/governance.ts");
assert(!governance.includes("legacy: 1"),"Legacy teams_json must not participate in authorization.");
assert(governance.includes("PORTAL_SENSITIVE_CAPABILITIES"),"Sensitive capability policy is required.");

const control=requireFile("lib/portal/control.ts");
assert(control.includes('"APPLY "+roleKey'),"High-risk role expansion confirmation is required.");
assert(control.includes('"GRANT "+input.capability'),"Sensitive direct grants require explicit confirmation.");

const repoEngine=requireFile("lib/portal/native-repo-engine.ts");
assert(repoEngine.includes("not a Git remote"),"R2 snapshot fallback must not masquerade as Git.");
assert(repoEngine.includes('engine:"snapshot-r2"'),"Snapshot repository mode must be explicit.");

const repoPage=requireFile("app/portal/(member)/repositories/page.tsx");
assert(repoPage.includes("listAccessibleRepositoryCatalog"),"Repository UI must use the unified catalog.");
assert(repoPage.includes("clone/push"),"Repository UI must disclose snapshot Git limitations.");

const wranglerFull=JSON.parse(requireFile("wrangler.jsonc"));
const serviceBindings=new Set((wranglerFull.services||[]).map((item)=>item.binding));
assert(serviceBindings.has("MAIL_SERVICE"),"Internal mail service binding missing.");
assert(serviceBindings.has("CONVERTER_SERVICE"),"Internal converter service binding missing.");

requireFile("services/core-mail/src/index.js");
requireFile("services/core-converter/src/index.js");
assert(requireFile("services/core-converter/src/index.js").includes("Edge.Cuts"),"CORE Converter must contain a real KiCad derivative engine.");

const migrationV13=requireFile("migrations/0013_authority_cleanup.sql");
assert(migrationV13.includes("portal_team_memberships"),"V13 membership authority migration missing.");

console.log("Focused CORE security/build/schema contracts validated.");
