import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const outputPath=path.join(root,"lib/portal/schema.generated.ts");
const sources=[
  ["0002_internal_portal.sql","PORTAL_SCHEMA_SQL"],
  ["0003_portal_professional.sql","PORTAL_V2_SQL"],
  ["0004_engineering_os.sql","PORTAL_V4_SQL"],
  ["0005_mobile_native.sql","PORTAL_V5_SQL"],
  ["0006_control_plane.sql","PORTAL_V6_SQL"],
  ["0007_repo_review.sql","PORTAL_V7_SQL"],
  ["0008_code_lab.sql","PORTAL_V8_SQL"],
  ["0009_code_terminal.sql","PORTAL_V9_SQL"],
  ["0010_vault_upload_sessions.sql","PORTAL_V10_SQL"],
  ["0011_mail_workspace.sql","PORTAL_V11_SQL"],
  ["0012_collaboration_finance.sql","PORTAL_V12_SQL"],
];

let output=`/* AUTO-GENERATED FILE. DO NOT EDIT.
   Source of truth: migrations/0002_internal_portal.sql through
   migrations/0012_collaboration_finance.sql.
   Run npm run schema:generate after changing a portal migration. */

`;

for(const [filename,constant] of sources){
  const sql=fs.readFileSync(path.join(root,"migrations",filename),"utf8");
  output += "export const " + constant + " = " + JSON.stringify(sql) + " as const;\n\n";
}
output += "export const PORTAL_MIGRATIONS = [\n";
for(const [filename,constant] of sources){
  output += "  { id:" + JSON.stringify(filename.replace(".sql","")) + ", sql:" + constant + " },\n";
}
output += "] as const;\n";

if(process.argv.includes("--check")){
  const current=fs.existsSync(outputPath)?fs.readFileSync(outputPath,"utf8"):"";
  if(current!==output){
    process.stderr.write("Portal schema generated artifact is stale. Run npm run schema:generate.\n");
    process.exit(1);
  }
  process.stdout.write("Portal schema artifact matches migrations.\n");
}else{
  fs.writeFileSync(outputPath,output);
  process.stdout.write("Generated " + path.relative(root,outputPath) + "\n");
}
