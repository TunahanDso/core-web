import { Container, getContainer } from "@cloudflare/containers";
import { WorkflowEntrypoint } from "cloudflare:workers";

const TASK_LANGUAGE = new Map([
  ["python-test","python"],
  ["python-script","python"],
  ["js-test","javascript"],
  ["js-script","javascript"],
  ["ts-typecheck","typescript"],
  ["ts-test","typescript"],
  ["c-build","c"],
  ["c-test","c"],
  ["cpp-build","cpp"],
  ["cpp-test","cpp"],
]);

const MAX_SNAPSHOT_BYTES = 16 * 1024 * 1024;
const MAX_FILES = 1200;
const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 1_000_000;

function responseJson(value, init = {}) {
  return new Response(JSON.stringify(value), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {}),
    },
  });
}

function safePath(value) {
  const path = String(value || "").replace(/\\/g,"/").replace(/^\/+/,"");
  if (!path || path.includes("\0")) return null;
  const parts = path.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) return null;
  return parts.join("/");
}

async function objectJson(bucket, key) {
  const object = await bucket.get(key);
  if (!object) return null;
  try {
    return JSON.parse(await new Response(object.body).text());
  } catch {
    return null;
  }
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunk, bytes.length)));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(String(value || ""));
  const output = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) output[i] = binary.charCodeAt(i);
  return output;
}

async function resolveSnapshot(env, repositoryId, refValue) {
  const prefix = "core-repo/v1/" + repositoryId;
  const meta = await objectJson(env.MEDIA, prefix + "/meta.json");
  if (!meta) throw new Error("Repository metadata bulunamadı.");

  const ref = String(refValue || meta.defaultBranch || "main").trim();
  let sha = meta.refs?.heads?.[ref] || meta.refs?.tags?.[ref] || null;
  if (!sha) {
    const commit = await objectJson(env.MEDIA, prefix + "/commits/" + ref + ".json");
    sha = commit?.sha || null;
  }
  if (!sha) throw new Error("Snapshot/ref bulunamadı.");

  const snapshot = await objectJson(env.MEDIA, prefix + "/snapshots/" + sha + ".json");
  if (!snapshot || !snapshot.files || typeof snapshot.files !== "object") {
    throw new Error("Repository snapshot bulunamadı.");
  }

  const entries = Object.entries(snapshot.files);
  if (entries.length > MAX_FILES) throw new Error("Snapshot dosya limiti aşıldı.");

  let totalBytes = 0;
  const files = [];
  for (const [rawPath, fileMeta] of entries) {
    const path = safePath(rawPath);
    if (!path) throw new Error("Snapshot içinde geçersiz dosya yolu bulundu.");
    const size = Number(fileMeta?.size || 0);
    if (!Number.isFinite(size) || size < 0) throw new Error("Snapshot dosya boyutu geçersiz.");
    totalBytes += size;
    if (totalBytes > MAX_SNAPSHOT_BYTES) throw new Error("Snapshot boyutu Code Lab limitini aşıyor.");

    const blobSha = String(fileMeta?.blobSha || "");
    if (!blobSha) throw new Error("Snapshot blob kimliği eksik.");
    const blob = await env.MEDIA.get(prefix + "/blobs/" + blobSha);
    if (!blob) throw new Error("Snapshot blob bulunamadı: " + path);
    const bytes = new Uint8Array(await new Response(blob.body).arrayBuffer());
    files.push({
      path,
      contentBase64: bytesToBase64(bytes),
      size: bytes.byteLength,
    });
  }

  return { sha, ref, files, totalBytes };
}

async function addEvent(env, runId, phase, level, message, metadata = {}) {
  await env.DB.prepare(
    "INSERT INTO portal_code_run_events (run_id,phase,level,message,metadata_json) VALUES (?,?,?,?,?)"
  ).bind(runId, phase, level, message, JSON.stringify(metadata)).run();
}

async function persistRunResult(env, payload, snapshot, result) {
  const prefix = "core-runner/" + payload.jobId;
  const stdout = String(result.stdout || "").slice(0, MAX_OUTPUT_BYTES);
  const stderr = String(result.stderr || "").slice(0, MAX_OUTPUT_BYTES);
  const stdoutKey = prefix + "/stdout.txt";
  const stderrKey = prefix + "/stderr.txt";

  await Promise.all([
    env.MEDIA.put(stdoutKey, stdout, { httpMetadata: { contentType: "text/plain; charset=utf-8" } }),
    env.MEDIA.put(stderrKey, stderr, { httpMetadata: { contentType: "text/plain; charset=utf-8" } }),
  ]);

  const artifacts = Array.isArray(result.artifacts) ? result.artifacts : [];
  let artifactBytes = 0;
  for (const artifact of artifacts.slice(0, 50)) {
    const bytes = base64ToBytes(artifact.contentBase64);
    artifactBytes += bytes.byteLength;
    if (artifactBytes > MAX_ARTIFACT_BYTES) break;
    const name = String(artifact.name || "artifact").slice(0, 220);
    const artifactId = crypto.randomUUID();
    const objectKey = prefix + "/artifacts/" + artifactId + "-" + name.replace(/[^A-Za-z0-9._-]+/g,"-");
    await env.MEDIA.put(objectKey, bytes, {
      httpMetadata: { contentType: String(artifact.mimeType || "application/octet-stream") },
    });
    await env.DB.prepare(
      "INSERT INTO portal_code_run_artifacts (id,run_id,name,kind,mime_type,object_key,size_bytes) VALUES (?,?,?,?,?,?,?)"
    ).bind(
      artifactId,
      payload.jobId,
      name,
      String(artifact.kind || "artifact").slice(0,80),
      String(artifact.mimeType || "application/octet-stream").slice(0,180),
      objectKey,
      bytes.byteLength
    ).run();
  }

  const status = ["passed","failed","timed_out"].includes(result.status) ? result.status : "failed";
  const exitCode = Number.isFinite(Number(result.exitCode)) ? Number(result.exitCode) : null;
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE portal_code_runs SET status=?,exit_code=?,stdout_object_key=?,stderr_object_key=?,artifact_prefix=?,finished_at=CURRENT_TIMESTAMP WHERE id=? AND status!='cancelled'"
    ).bind(status, exitCode, stdoutKey, stderrKey, prefix + "/artifacts/", payload.jobId),
    env.DB.prepare(
      "UPDATE portal_code_run_execution SET snapshot_sha=?,updated_at=CURRENT_TIMESTAMP WHERE run_id=?"
    ).bind(snapshot.sha, payload.jobId),
  ]);
  await addEvent(
    env,
    payload.jobId,
    "finished",
    status === "passed" ? "success" : status === "timed_out" ? "warning" : "error",
    status === "passed" ? "Sandbox job başarıyla tamamlandı." : status === "timed_out" ? "Sandbox zaman aşımına uğradı." : "Sandbox job başarısız oldu.",
    { exitCode, durationMs: Number(result.durationMs || 0), snapshotSha: snapshot.sha }
  );
}

export class RunnerContainer extends Container {
  defaultPort = 8080;
  requiredPorts = [8080, 8081];
  sleepAfter = "15m";
  enableInternet = false;
  pingEndpoint = "localhost/health";

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/internal/terminal") {
      return this.containerFetch(request);
    }
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return responseJson({ error:"websocket_required" }, { status:426 });
    }

    const sessionId = String(request.headers.get("x-core-terminal-session") || "");
    if (!/^[a-f0-9-]{36}$/i.test(sessionId)) {
      return responseJson({ error:"invalid_terminal_session" }, { status:400 });
    }

    if (!this.ctx.container.running) {
      await this.startAndWaitForPorts({ ports:[8080,8081] });
    } else {
      await this.waitForPort({ portToCheck:8081,retries:30,waitInterval:100 });
    }

    const port = this.ctx.container.getTcpPort(8081);
    const response = await port.fetch(request);
    return response;
  }
}

export class CodeRunWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const payload = event.payload;
    await step.do("mark-running", async () => {
      await this.env.DB.batch([
        this.env.DB.prepare(
          "UPDATE portal_code_runs SET status='running',started_at=CURRENT_TIMESTAMP WHERE id=? AND status='queued'"
        ).bind(payload.jobId),
        this.env.DB.prepare(
          "UPDATE portal_code_run_execution SET workflow_instance_id=?,updated_at=CURRENT_TIMESTAMP WHERE run_id=?"
        ).bind(payload.jobId, payload.jobId),
      ]);
      await addEvent(this.env, payload.jobId, "runner", "info", "CORE Runner workflow başladı.");
    });

    const execution = await step.do("sandbox-execute", async () => {
      try {
        const snapshot = await resolveSnapshot(this.env, payload.repositoryRef, payload.snapshotRef);
        await this.env.DB.prepare(
          "UPDATE portal_code_run_execution SET snapshot_sha=?,updated_at=CURRENT_TIMESTAMP WHERE run_id=?"
        ).bind(snapshot.sha, payload.jobId).run();
        await addEvent(this.env, payload.jobId, "snapshot", "success", "Repository snapshot sandbox için hazırlandı.", {
          snapshotSha: snapshot.sha,
          fileCount: snapshot.files.length,
          sizeBytes: snapshot.totalBytes,
        });

        const container = getContainer(this.env.RUNNER_SANDBOX, payload.jobId);
        let response;
        let body = "";
        try {
          response = await container.fetch(new Request("http://sandbox/run", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              jobId: payload.jobId,
              language: payload.language,
              task: payload.task,
              files: snapshot.files,
              limits: payload.limits,
            }),
          }));
          body = await response.text();
        } finally {
          await container.stop().catch(() => {});
        }
        if (!response.ok) {
          return {
            snapshot,
            result: {
              status: "failed",
              exitCode: null,
              stdout: "",
              stderr: "Sandbox HTTP " + response.status + ": " + body.slice(0, 12000),
              artifacts: [],
            },
          };
        }
        let result;
        try {
          result = JSON.parse(body);
        } catch {
          result = { status:"failed",exitCode:null,stdout:"",stderr:"Sandbox geçersiz JSON döndürdü.",artifacts:[] };
        }
        return { snapshot, result };
      } catch (error) {
        return {
          snapshot: { sha:"", ref:payload.snapshotRef, files:[], totalBytes:0 },
          result: {
            status:"failed",
            exitCode:null,
            stdout:"",
            stderr:error instanceof Error ? error.message : "CORE Runner execution error.",
            artifacts:[],
          },
        };
      }
    });

    await step.do("persist-result", async () => {
      const current = await this.env.DB.prepare(
        "SELECT status FROM portal_code_runs WHERE id=? LIMIT 1"
      ).bind(payload.jobId).first();
      if (String(current?.status || "") === "cancelled") return;
      await persistRunResult(this.env, payload, execution.snapshot, execution.result);
    });

    return {
      jobId: payload.jobId,
      status: execution.result.status,
      exitCode: execution.result.exitCode ?? null,
      snapshotSha: execution.snapshot.sha || null,
    };
  }
}

function validJobBody(body) {
  if (!body || typeof body !== "object") return false;
  const task = String(body.task || "");
  const language = String(body.language || "");
  return Boolean(
    body.jobId &&
    body.repositoryRef &&
    body.snapshotRef &&
    TASK_LANGUAGE.get(task) === language
  );
}

async function createJob(request, env) {
  const body = await request.json().catch(() => null);
  if (!validJobBody(body)) return responseJson({ error:"invalid_job_contract" }, { status:400 });

  const row = await env.DB.prepare(
    "SELECT r.id,r.member_id,r.status,r.language,r.command_label,e.service_repository_id,e.snapshot_ref,e.dispatch_token " +
    "FROM portal_code_runs r JOIN portal_code_run_execution e ON e.run_id=r.id WHERE r.id=? LIMIT 1"
  ).bind(String(body.jobId)).first();
  if (!row) return responseJson({ error:"job_not_registered" }, { status:404 });
  if (!body.dispatchToken || String(row.dispatch_token) !== String(body.dispatchToken)) {
    return responseJson({ error:"invalid_job_capability" }, { status:401 });
  }
  if (String(row.status) !== "queued") return responseJson({ error:"job_not_queueable", status:row.status }, { status:409 });
  if (
    String(row.service_repository_id) !== String(body.repositoryRef) ||
    String(row.snapshot_ref) !== String(body.snapshotRef) ||
    String(row.language) !== String(body.language) ||
    String(row.command_label) !== String(body.task)
  ) {
    return responseJson({ error:"job_contract_mismatch" }, { status:409 });
  }

  try {
    const instance = await env.CODE_RUN_WORKFLOW.create({
      id:String(body.jobId),
      params:body,
      retention:{ successRetention:"1 day", errorRetention:"7 days" },
    });
    await addEvent(env, String(body.jobId), "queued", "info", "Job CORE Runner workflow kuyruğuna kabul edildi.", { workflowInstanceId:instance.id });
    return responseJson({ accepted:true,jobId:body.jobId,workflowInstanceId:instance.id }, { status:202 });
  } catch (error) {
    await env.DB.prepare(
      "UPDATE portal_code_runs SET status='failed',finished_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(String(body.jobId)).run();
    await addEvent(env, String(body.jobId), "queue", "error", "Workflow başlatılamadı.", {
      error:error instanceof Error ? error.message : String(error),
    });
    return responseJson({ error:"workflow_create_failed" }, { status:500 });
  }
}

async function cancelJob(jobId, request, env) {
  const row = await env.DB.prepare(
    "SELECT r.id,r.status,e.dispatch_token FROM portal_code_runs r JOIN portal_code_run_execution e ON e.run_id=r.id WHERE r.id=? LIMIT 1"
  ).bind(jobId).first();
  if (!row) return responseJson({ error:"job_not_found" }, { status:404 });
  if (request.headers.get("x-core-job-token") !== String(row.dispatch_token || "")) {
    return responseJson({ error:"invalid_job_capability" }, { status:401 });
  }
  if (["passed","failed","timed_out","cancelled"].includes(String(row.status))) {
    return responseJson({ cancelled:false,status:row.status }, { status:409 });
  }

  const instance = await env.CODE_RUN_WORKFLOW.get(jobId).catch(() => null);
  const container = getContainer(env.RUNNER_SANDBOX, jobId);
  await Promise.allSettled([
    instance ? instance.terminate() : Promise.resolve(),
    container.stop(),
  ]);
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE portal_code_runs SET status='cancelled',finished_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(jobId),
    env.DB.prepare(
      "UPDATE portal_code_run_execution SET cancel_requested_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE run_id=?"
    ).bind(jobId),
  ]);
  await addEvent(env, jobId, "cancelled", "warning", "Job kullanıcı isteğiyle iptal edildi.");
  return responseJson({ cancelled:true,jobId });
}

async function jobStatus(jobId, request, env) {
  const run = await env.DB.prepare(
    "SELECT r.*,e.native_repository_id,e.service_repository_id,e.snapshot_sha,e.workflow_instance_id,e.attempt,e.retry_of_run_id,e.dispatch_token " +
    "FROM portal_code_runs r LEFT JOIN portal_code_run_execution e ON e.run_id=r.id WHERE r.id=? LIMIT 1"
  ).bind(jobId).first();
  if (!run) return responseJson({ error:"job_not_found" }, { status:404 });
  if (request.headers.get("x-core-job-token") !== String(run.dispatch_token || "")) {
    return responseJson({ error:"invalid_job_capability" }, { status:401 });
  }
  delete run.dispatch_token;
  const events = await env.DB.prepare(
    "SELECT phase,level,message,metadata_json,created_at FROM portal_code_run_events WHERE run_id=? ORDER BY id"
  ).bind(jobId).all();
  const artifacts = await env.DB.prepare(
    "SELECT id,name,kind,mime_type,size_bytes,created_at FROM portal_code_run_artifacts WHERE run_id=? ORDER BY created_at"
  ).bind(jobId).all();
  return responseJson({ run,events:events.results || [],artifacts:artifacts.results || [] });
}


async function terminalRow(env, sessionId) {
  return env.DB.prepare(
    "SELECT t.*,nr.name AS repo_name FROM portal_code_terminal_sessions t " +
    "LEFT JOIN portal_native_repositories nr ON nr.id=t.native_repository_id WHERE t.id=? LIMIT 1"
  ).bind(sessionId).first();
}

function validTerminalContract(body) {
  return Boolean(
    body &&
    typeof body === "object" &&
    /^[a-f0-9-]{36}$/i.test(String(body.sessionId || "")) &&
    body.repositoryRef &&
    body.snapshotRef &&
    body.connectToken
  );
}

async function createTerminal(request, env) {
  const body = await request.json().catch(() => null);
  if (!validTerminalContract(body)) {
    return responseJson({ error:"invalid_terminal_contract" }, { status:400 });
  }
  const sessionId = String(body.sessionId);
  const row = await terminalRow(env,sessionId);
  if (!row) return responseJson({ error:"terminal_not_registered" }, { status:404 });
  if (String(row.connect_token || "") !== String(body.connectToken || "")) {
    return responseJson({ error:"invalid_terminal_capability" }, { status:401 });
  }
  if (new Date(String(row.expires_at)).getTime() <= Date.now()) {
    await env.DB.prepare(
      "UPDATE portal_code_terminal_sessions SET status='expired',ended_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(sessionId).run();
    return responseJson({ error:"terminal_expired" }, { status:410 });
  }
  if (
    String(row.service_repository_id) !== String(body.repositoryRef) ||
    String(row.snapshot_ref) !== String(body.snapshotRef)
  ) {
    return responseJson({ error:"terminal_contract_mismatch" }, { status:409 });
  }

  try {
    const snapshot = await resolveSnapshot(env,String(body.repositoryRef),String(body.snapshotRef));
    const container = getContainer(env.RUNNER_SANDBOX,"terminal-" + sessionId);
    const response = await container.fetch(new Request("http://sandbox/prepare-terminal", {
      method:"POST",
      headers:{ "content-type":"application/json" },
      body:JSON.stringify({
        sessionId,
        files:snapshot.files,
      }),
    }));
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      throw new Error(String(payload?.error || "terminal_workspace_prepare_failed"));
    }
    await env.DB.prepare(
      "UPDATE portal_code_terminal_sessions SET status='ready',snapshot_sha=?,last_activity_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(snapshot.sha,sessionId).run();
    return responseJson({
      ready:true,
      sessionId,
      snapshotSha:snapshot.sha,
      fileCount:snapshot.files.length,
      sizeBytes:snapshot.totalBytes,
    }, { status:201 });
  } catch (error) {
    await env.DB.prepare(
      "UPDATE portal_code_terminal_sessions SET status='failed',ended_at=CURRENT_TIMESTAMP,last_activity_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(sessionId).run();
    return responseJson({
      error:error instanceof Error ? error.message : "terminal_prepare_failed",
    }, { status:500 });
  }
}

async function terminalSocket(sessionId, request, env) {
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return responseJson({ error:"websocket_required" }, { status:426 });
  }
  const row = await terminalRow(env,sessionId);
  if (!row) return responseJson({ error:"terminal_not_found" }, { status:404 });
  const url = new URL(request.url);
  const protocols = String(request.headers.get("sec-websocket-protocol") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const token = protocols[0] === "core-terminal" ? String(protocols[1] || "") : "";
  if (!token || String(row.connect_token || "") !== token) {
    return responseJson({ error:"invalid_terminal_capability" }, { status:401 });
  }
  if (new Date(String(row.expires_at)).getTime() <= Date.now()) {
    const container = getContainer(env.RUNNER_SANDBOX,"terminal-" + sessionId);
    await container.stop().catch(() => {});
    await env.DB.prepare(
      "UPDATE portal_code_terminal_sessions SET status='expired',ended_at=COALESCE(ended_at,CURRENT_TIMESTAMP),last_activity_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(sessionId).run();
    return responseJson({ error:"terminal_expired" }, { status:410 });
  }
  if (!["ready","connected"].includes(String(row.status))) {
    return responseJson({ error:"terminal_not_connectable",status:row.status }, { status:409 });
  }

  const container = getContainer(env.RUNNER_SANDBOX,"terminal-" + sessionId);
  const internal = new URL("http://container/internal/terminal");
  internal.searchParams.set("cols",url.searchParams.get("cols") || "120");
  internal.searchParams.set("rows",url.searchParams.get("rows") || "32");
  const headers = new Headers(request.headers);
  headers.delete("host");
  // Never forward the session capability into the container. The browser
  // requests two subprotocol values; after authorization the container only
  // sees the non-secret protocol identifier.
  headers.set("sec-websocket-protocol","core-terminal");
  headers.set("x-core-terminal-session",sessionId);

  try {
    const response = await container.fetch(new Request(internal.toString(), {
      method:"GET",
      headers,
    }));
    if (response.status === 101 && response.webSocket) {
      await env.DB.prepare(
        "UPDATE portal_code_terminal_sessions SET status='connected',connected_at=COALESCE(connected_at,CURRENT_TIMESTAMP),last_activity_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(sessionId).run();
      return response;
    }

    await env.DB.prepare(
      "UPDATE portal_code_terminal_sessions SET status='failed',ended_at=CURRENT_TIMESTAMP,last_activity_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(sessionId).run();
    return response;
  } catch (error) {
    await env.DB.prepare(
      "UPDATE portal_code_terminal_sessions SET status='failed',ended_at=CURRENT_TIMESTAMP,last_activity_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(sessionId).run();
    return responseJson({
      error:"terminal_websocket_proxy_failed",
      message:error instanceof Error ? error.message : String(error),
    }, { status:502 });
  }
}

async function closeTerminal(sessionId, request, env) {
  const row = await terminalRow(env,sessionId);
  if (!row) return responseJson({ error:"terminal_not_found" }, { status:404 });
  if (request.headers.get("x-core-terminal-token") !== String(row.connect_token || "")) {
    return responseJson({ error:"invalid_terminal_capability" }, { status:401 });
  }
  if (["closed","failed","expired"].includes(String(row.status))) {
    return responseJson({ closed:false,status:row.status }, { status:409 });
  }
  const container = getContainer(env.RUNNER_SANDBOX,"terminal-" + sessionId);
  await container.stop().catch(() => {});
  await env.DB.prepare(
    "UPDATE portal_code_terminal_sessions SET status='closed',ended_at=COALESCE(ended_at,CURRENT_TIMESTAMP),last_activity_at=CURRENT_TIMESTAMP WHERE id=?"
  ).bind(sessionId).run();
  return responseJson({ closed:true,sessionId });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return responseJson({
        ok:true,
        service:"core-runner",
        isolation:"cloudflare-container",
        workflow:true,
        liveTerminal:true,
        terminalTransport:"container-websocket",
        network:"deny",
      });
    }
    if (request.method === "POST" && url.pathname === "/v1/jobs") {
      return createJob(request, env);
    }
    if (request.method === "POST" && url.pathname === "/v1/terminals") {
      return createTerminal(request, env);
    }

    const terminalMatch = url.pathname.match(/^\/v1\/terminals\/([^/]+)\/(socket|close)$/);
    if (terminalMatch) {
      const sessionId = decodeURIComponent(terminalMatch[1]);
      if (request.method === "GET" && terminalMatch[2] === "socket") {
        return terminalSocket(sessionId,request,env);
      }
      if (request.method === "POST" && terminalMatch[2] === "close") {
        return closeTerminal(sessionId,request,env);
      }
    }

    const match = url.pathname.match(/^\/v1\/jobs\/([^/]+)(?:\/(cancel))?$/);
    if (match) {
      const jobId = decodeURIComponent(match[1]);
      if (request.method === "POST" && match[2] === "cancel") return cancelJob(jobId, request, env);
      if (request.method === "GET" && !match[2]) return jobStatus(jobId, request, env);
    }

    return responseJson({ error:"not_found" }, { status:404 });
  },
};
