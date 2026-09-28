import { env } from "cloudflare:workers";

function database() {
  if (!env.DB) throw new Error("DB bağlantısı kullanılamıyor.");
  return env.DB;
}

export function portalRunnerStatus() {
  const url = typeof env.CORE_RUNNER_URL === "string" ? env.CORE_RUNNER_URL.trim() : "";
  const token = typeof env.CORE_RUNNER_TOKEN === "string" ? env.CORE_RUNNER_TOKEN.trim() : "";
  return {
    configured: Boolean(url && token),
    provider: "Cloudflare Sandbox / CORE Runner",
    urlConfigured: Boolean(url),
    tokenConfigured: Boolean(token),
  };
}

export async function runPortalCode(input: {
  memberId: string;
  repositoryId?: string | null;
  language: string;
  code: string;
}) {
  const db = database();
  const allowed = ["python","javascript","typescript","c","cpp"];
  if (!allowed.includes(input.language)) throw new Error("Desteklenmeyen çalışma dili.");
  if (!input.code.trim() || input.code.length > 100_000) {
    throw new Error("Kod 1 ile 100000 karakter arasında olmalı.");
  }

  const runId = crypto.randomUUID();
  const status = portalRunnerStatus();

  if (!status.configured) {
    await db.prepare(
      "INSERT INTO portal_code_runs (id,member_id,repository_id,language,status,stderr) VALUES (?,?,?,?, 'unavailable', ?)"
    ).bind(
      runId,input.memberId,input.repositoryId || null,input.language,
      "CORE Runner henüz Cloudflare Sandbox'a deploy edilmedi veya bridge secret'ı yapılandırılmadı."
    ).run();
    return {
      id:runId,
      success:false,
      unavailable:true,
      stdout:"",
      stderr:"CORE Runner henüz yapılandırılmadı. Runner servisi repo içinde hazır; Cloudflare Sandbox deploy ve bridge secret gerekir.",
      exitCode:null as number | null,
      durationMs:null as number | null,
    };
  }

  await db.prepare(
    "INSERT INTO portal_code_runs (id,member_id,repository_id,language,status) VALUES (?,?,?,?, 'running')"
  ).bind(runId,input.memberId,input.repositoryId || null,input.language).run();

  const started = Date.now();
  try {
    const response = await fetch(String(env.CORE_RUNNER_URL).replace(/\/+$/,"") + "/run",{
      method:"POST",
      headers:{
        "Authorization":"Bearer " + String(env.CORE_RUNNER_TOKEN),
        "Content-Type":"application/json",
      },
      body:JSON.stringify({
        sessionId:input.memberId,
        language:input.language,
        code:input.code,
      }),
    });
    const payload = await response.json().catch(() => ({})) as Record<string,unknown>;
    const success = response.ok && payload.success === true;
    const stdout = String(payload.stdout || "").slice(0,100_000);
    const stderr = String(payload.stderr || (!response.ok ? "Runner HTTP " + response.status : "")).slice(0,100_000);
    const exitCode = typeof payload.exitCode === "number" ? payload.exitCode : null;
    const durationMs = typeof payload.durationMs === "number" ? payload.durationMs : Date.now()-started;

    await db.prepare(
      "UPDATE portal_code_runs SET status=?,stdout=?,stderr=?,exit_code=?,duration_ms=?,finished_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(success ? "success" : "failed",stdout,stderr,exitCode,durationMs,runId).run();

    return { id:runId,success,unavailable:false,stdout,stderr,exitCode,durationMs };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Runner bağlantısı başarısız.";
    await db.prepare(
      "UPDATE portal_code_runs SET status='failed',stderr=?,duration_ms=?,finished_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(message,Date.now()-started,runId).run();
    return { id:runId,success:false,unavailable:false,stdout:"",stderr:message,exitCode:null,durationMs:Date.now()-started };
  }
}

export async function listPortalCodeRuns(memberId: string, limit = 25) {
  const result = await database().prepare(
    "SELECT * FROM portal_code_runs WHERE member_id=? ORDER BY created_at DESC LIMIT ?"
  ).bind(memberId,limit).all<Record<string,unknown>>();
  return result.results ?? [];
}
