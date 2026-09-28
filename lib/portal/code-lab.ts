import { env } from "cloudflare:workers";
import runnerContract from "@/config/core-runner-tasks.json";
import type { PortalMember } from "@/lib/portal/auth";
import { ensurePortalCodeLabSchema } from "@/lib/portal/bootstrap";
import {
  canManageNativeRepository,
  getAccessibleNativeRepository,
  type NativeRepositoryRecord,
} from "@/lib/portal/repositories";

function database() {
  if (!env.DB) throw new Error("Portal database binding is not available.");
  return env.DB;
}

function mediaBucket() {
  if (!env.MEDIA) throw new Error("Portal R2 media binding is not available.");
  return env.MEDIA;
}

function serviceUrl(value: unknown) {
  const raw = String(value || "").trim().replace(/\/$/, "");
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") return null;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function randomToken(bytes = 32) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data, (value) => value.toString(16).padStart(2, "0")).join("");
}

function cleanSnapshotRef(value: string) {
  const ref = String(value || "main")
    .trim()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 180);
  if (!ref || ref.includes("..") || ref.includes("//")) throw new Error("Geçersiz snapshot/ref.");
  return ref;
}

export type RunnerLanguage = "python" | "javascript" | "typescript" | "c" | "cpp";

export const RUNNER_TASKS = Object.fromEntries(
  runnerContract.tasks.reduce((groups, task) => {
    const current = groups.get(task.language) ?? [];
    current.push([
      task.id,
      task.label,
      task.steps.map((step) => step.join(" ")).join(" && "),
    ]);
    groups.set(task.language, current);
    return groups;
  }, new Map<string, string[][]>())
) as Record<RunnerLanguage, Array<[string,string,string]>>;

export const RUNNER_LIMITS = runnerContract.limits;

function runnerTask(language: string, taskId: string) {
  return runnerContract.tasks.find((task) => task.language === language && task.id === taskId) ?? null;
}

export function getCodeRunnerServiceStatus() {
  const url = serviceUrl(env.CORE_RUNNER_URL);
  return {
    configured: Boolean(url),
    url,
    mode: url ? "cloudflare-container" as const : "offline" as const,
  };
}

export async function probeCodeRunner() {
  const service = getCodeRunnerServiceStatus();
  if (!service.url) {
    return {
      ...service,
      healthy: false,
      reason: "CORE_RUNNER_URL yapılandırılmadı.",
    };
  }
  try {
    const response = await fetch(service.url + "/health", {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) {
      return { ...service, healthy:false, reason:"Runner health HTTP " + response.status };
    }
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
    return {
      ...service,
      healthy: Boolean(payload?.ok),
      reason: payload?.ok ? null : "Runner health cevabı geçersiz.",
      details: payload,
    };
  } catch {
    return { ...service, healthy:false, reason:"CORE Runner health endpoint'ine ulaşılamadı." };
  }
}

export type PortalCodeRunRow = {
  id: string;
  member_id: string;
  repository_ref: string | null;
  snapshot_ref: string | null;
  language: RunnerLanguage;
  command_label: string;
  status: "queued" | "running" | "passed" | "failed" | "timed_out" | "cancelled";
  runner_provider: string;
  limits_json: string;
  exit_code: number | null;
  stdout_object_key: string | null;
  stderr_object_key: string | null;
  artifact_prefix: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  native_repository_id?: string | null;
  service_repository_id?: string | null;
  snapshot_sha?: string | null;
  workflow_instance_id?: string | null;
  attempt?: number | null;
  retry_of_run_id?: string | null;
  repo_name?: string | null;
  repo_slug?: string | null;
  repo_team_code?: string | null;
};

export async function listPortalCodeRuns(memberId: string, limit = 60) {
  await ensurePortalCodeLabSchema();
  const response = await database().prepare(
    "SELECT r.*,e.native_repository_id,e.service_repository_id,e.snapshot_sha,e.workflow_instance_id,e.attempt,e.retry_of_run_id," +
    "nr.name AS repo_name,nr.slug AS repo_slug,nr.team_code AS repo_team_code " +
    "FROM portal_code_runs r " +
    "LEFT JOIN portal_code_run_execution e ON e.run_id=r.id " +
    "LEFT JOIN portal_native_repositories nr ON nr.id=e.native_repository_id " +
    "WHERE r.member_id=? ORDER BY r.created_at DESC LIMIT ?"
  ).bind(memberId, Math.min(Math.max(limit,1),100)).all<PortalCodeRunRow>();
  return response.results ?? [];
}

async function readObjectText(key: string | null | undefined, max = 1_000_000) {
  if (!key) return "";
  const object = await mediaBucket().get(key);
  if (!object) return "";
  const text = await new Response(object.body).text();
  return text.slice(0,max);
}

async function codeRunAccess(member: PortalMember, runId: string) {
  await ensurePortalCodeLabSchema();
  const row = await database().prepare(
    "SELECT r.*,e.native_repository_id,e.service_repository_id,e.snapshot_sha,e.workflow_instance_id,e.attempt,e.retry_of_run_id,e.dispatch_token," +
    "nr.name AS repo_name,nr.slug AS repo_slug,nr.team_code AS repo_team_code " +
    "FROM portal_code_runs r " +
    "LEFT JOIN portal_code_run_execution e ON e.run_id=r.id " +
    "LEFT JOIN portal_native_repositories nr ON nr.id=e.native_repository_id " +
    "WHERE r.id=? LIMIT 1"
  ).bind(runId).first<PortalCodeRunRow & { dispatch_token?: string | null }>();
  if (!row) return null;
  if (row.member_id === member.id || member.role === "admin") return row;
  if (!row.repo_slug) return null;
  const repo = await getAccessibleNativeRepository(member,row.repo_slug);
  if (!repo) return null;
  if (!(await canManageNativeRepository(member,repo))) return null;
  return row;
}

export async function getPortalCodeRunDetail(member: PortalMember, runId: string) {
  const run = await codeRunAccess(member,runId);
  if (!run) return null;

  const [eventsResponse, artifactsResponse, stdout, stderr] = await Promise.all([
    database().prepare(
      "SELECT id,phase,level,message,metadata_json,created_at FROM portal_code_run_events WHERE run_id=? ORDER BY id"
    ).bind(runId).all<Record<string, unknown>>(),
    database().prepare(
      "SELECT id,name,kind,mime_type,size_bytes,created_at FROM portal_code_run_artifacts WHERE run_id=? ORDER BY created_at"
    ).bind(runId).all<Record<string, unknown>>(),
    readObjectText(run.stdout_object_key),
    readObjectText(run.stderr_object_key),
  ]);

  const { dispatch_token: _hidden, ...safeRun } = run;
  return {
    run: safeRun,
    events: eventsResponse.results ?? [],
    artifacts: artifactsResponse.results ?? [],
    stdout,
    stderr,
  };
}

async function addCodeRunEvent(
  runId: string,
  phase: string,
  level: "info" | "success" | "warning" | "error",
  message: string,
  metadata: Record<string, unknown> = {}
) {
  await database().prepare(
    "INSERT INTO portal_code_run_events (run_id,phase,level,message,metadata_json) VALUES (?,?,?,?,?)"
  ).bind(runId,phase,level,message,JSON.stringify(metadata)).run();
}

async function runnerFetch(pathname: string, init: RequestInit = {}) {
  const service = getCodeRunnerServiceStatus();
  if (!service.url) throw new Error("CORE Runner henüz yapılandırılmadı.");
  const response = await fetch(service.url + pathname, {
    ...init,
    headers: {
      accept:"application/json",
      ...(init.headers || {}),
    },
  });
  return response;
}

export async function createPortalCodeRun(input: {
  memberId: string;
  actorEmail: string;
  repo: NativeRepositoryRecord;
  snapshotRef: string;
  language: RunnerLanguage;
  taskId: string;
  retryOfRunId?: string | null;
}) {
  await ensurePortalCodeLabSchema();
  if (!input.repo.service_repository_id) throw new Error("Repository servis kimliği yok.");
  const task = runnerTask(input.language,input.taskId);
  if (!task) throw new Error("İzin verilmeyen runner görevi.");
  const service = getCodeRunnerServiceStatus();
  if (!service.url) throw new Error("CORE Runner henüz production'a bağlanmadı.");

  const id = crypto.randomUUID();
  const dispatchToken = randomToken();
  const snapshotRef = cleanSnapshotRef(input.snapshotRef || input.repo.default_branch || "main");
  const limits = RUNNER_LIMITS;
  const db = database();

  await db.batch([
    db.prepare(
      "INSERT INTO portal_code_runs (id,member_id,repository_ref,snapshot_ref,language,command_label,status,runner_provider,limits_json) " +
      "VALUES (?,?,?,?,?,?,'queued','core-runner-container',?)"
    ).bind(
      id,input.memberId,input.repo.slug,snapshotRef,input.language,input.taskId,JSON.stringify(limits)
    ),
    db.prepare(
      "INSERT INTO portal_code_run_execution (run_id,native_repository_id,service_repository_id,snapshot_ref,dispatch_token,attempt,retry_of_run_id) " +
      "VALUES (?,?,?,?,?,1,?)"
    ).bind(
      id,input.repo.id,input.repo.service_repository_id,snapshotRef,dispatchToken,input.retryOfRunId || null
    ),
    db.prepare(
      "INSERT INTO portal_code_run_events (run_id,phase,level,message,metadata_json) VALUES (?,'queued','info','Job portal kuyruğunda oluşturuldu.',?)"
    ).bind(id,JSON.stringify({
      repositorySlug:input.repo.slug,
      snapshotRef,
      language:input.language,
      taskId:input.taskId,
    })),
    db.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'code.run.submit','code_run',?,?)"
    ).bind(input.actorEmail,id,JSON.stringify({
      repositorySlug:input.repo.slug,
      snapshotRef,
      language:input.language,
      taskId:input.taskId,
      retryOfRunId:input.retryOfRunId || null,
    })),
  ]);

  try {
    const response = await runnerFetch("/v1/jobs", {
      method:"POST",
      headers:{ "content-type":"application/json" },
      body:JSON.stringify({
        jobId:id,
        repositoryRef:input.repo.service_repository_id,
        snapshotRef,
        language:input.language,
        task:input.taskId,
        limits,
        dispatchToken,
      }),
    });
    const payload = await response.json().catch(() => null) as { workflowInstanceId?: string; error?: string } | null;
    if (!response.ok) throw new Error(payload?.error || "Runner işi kabul etmedi.");

    if (payload?.workflowInstanceId) {
      await db.prepare(
        "UPDATE portal_code_run_execution SET workflow_instance_id=?,updated_at=CURRENT_TIMESTAMP WHERE run_id=?"
      ).bind(payload.workflowInstanceId,id).run();
    }
  } catch (error) {
    await db.prepare(
      "UPDATE portal_code_runs SET status='failed',finished_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(id).run();
    await addCodeRunEvent(
      id,
      "dispatch",
      "error",
      error instanceof Error ? error.message : "Runner dispatch başarısız."
    );
    throw error;
  }

  return id;
}

export async function cancelPortalCodeRun(member: PortalMember, runId: string) {
  const run = await codeRunAccess(member,runId);
  if (!run) throw new Error("Code Lab işi bulunamadı.");
  if (["passed","failed","timed_out","cancelled"].includes(run.status)) {
    throw new Error("Tamamlanmış job iptal edilemez.");
  }
  const token = String(run.dispatch_token || "");
  if (!token) throw new Error("Runner job capability bulunamadı.");

  await database().prepare(
    "UPDATE portal_code_run_execution SET cancel_requested_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE run_id=?"
  ).bind(runId).run();
  await addCodeRunEvent(runId,"cancel-request","warning","İptal isteği CORE Runner'a gönderildi.");

  const response = await runnerFetch("/v1/jobs/" + encodeURIComponent(runId) + "/cancel", {
    method:"POST",
    headers:{ "x-core-job-token":token },
  });
  if (!response.ok && response.status !== 409) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || "Runner iptal isteğini kabul etmedi.");
  }
}

export async function retryPortalCodeRun(member: PortalMember, runId: string) {
  const previous = await codeRunAccess(member,runId);
  if (!previous) throw new Error("Önceki Code Lab işi bulunamadı.");
  if (!previous.repo_slug) throw new Error("Repository bağlantısı bulunamadı.");
  const repo = await getAccessibleNativeRepository(member,previous.repo_slug);
  if (!repo) throw new Error("Repository erişimi artık mevcut değil.");

  return createPortalCodeRun({
    memberId:member.id,
    actorEmail:member.email,
    repo,
    snapshotRef:String(previous.snapshot_ref || repo.default_branch || "main"),
    language:previous.language,
    taskId:String(previous.command_label),
    retryOfRunId:runId,
  });
}

export async function getPortalCodeRunArtifact(
  member: PortalMember,
  runId: string,
  artifactId: string
) {
  const run = await codeRunAccess(member,runId);
  if (!run) return null;
  const artifact = await database().prepare(
    "SELECT id,name,kind,mime_type,object_key,size_bytes FROM portal_code_run_artifacts WHERE id=? AND run_id=? LIMIT 1"
  ).bind(artifactId,runId).first<{
    id:string;
    name:string;
    kind:string;
    mime_type:string;
    object_key:string;
    size_bytes:number;
  }>();
  if (!artifact) return null;
  const object = await mediaBucket().get(artifact.object_key);
  if (!object) return null;
  return { artifact,object };
}
