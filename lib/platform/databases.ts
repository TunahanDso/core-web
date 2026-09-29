import { env } from "cloudflare:workers";

type DbBinding = NonNullable<typeof env.DB>;

function resolveDb(name:string):DbBinding {
  const values=env as unknown as Record<string,unknown>;
  const candidate=values[name] as DbBinding | undefined;
  const fallback=env.DB as DbBinding | undefined;
  if(candidate) return candidate;
  if(fallback) return fallback;
  throw new Error("Database binding is not available: "+name);
}

export function cmsDb(){ return resolveDb("CMS_DB"); }
export function portalDb(){ return resolveDb("PORTAL_DB"); }
export function collaborationDb(){ return resolveDb("COLLABORATION_DB"); }
export function codeLabDb(){ return resolveDb("CODE_LAB_DB"); }
export function telemetryDb(){ return resolveDb("TELEMETRY_DB"); }
