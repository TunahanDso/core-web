import { env } from "cloudflare:workers";

function database() {
  if (!env.DB) throw new Error("Portal database binding is not available.");
  return env.DB;
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

export function getEngineeringServiceStatus() {
  return {
    repository: {
      configured: Boolean(serviceUrl(env.CORE_REPO_SERVICE_URL)),
      url: serviceUrl(env.CORE_REPO_SERVICE_URL),
    },
    runner: {
      configured: Boolean(serviceUrl(env.CORE_RUNNER_URL)),
      url: serviceUrl(env.CORE_RUNNER_URL),
    },
    converter: {
      configured: Boolean(serviceUrl(env.CORE_CONVERTER_URL)),
      url: serviceUrl(env.CORE_CONVERTER_URL),
    },
  };
}

export async function listNativeRepositories() {
  try {
    const response = await database().prepare(
      "SELECT * FROM portal_native_repositories ORDER BY updated_at DESC LIMIT 200"
    ).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    return [];
  }
}

export async function createNativeRepository(input: {
  name: string;
  slug: string;
  projectSlug: string | null;
  teamCode: string | null;
  visibility: "private" | "internal" | "public";
  actorEmail: string;
}) {
  const url = serviceUrl(env.CORE_REPO_SERVICE_URL);
  if (!url) throw new Error("CORE Repo Service henüz production'a bağlanmadı.");
  const token = String(env.CORE_REPO_SERVICE_TOKEN || "").trim();
  if (!token) throw new Error("CORE Repo Service kimlik bilgisi yapılandırılmadı.");

  const response = await fetch(url + "/v1/repositories", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": "Bearer " + token,
    },
    body: JSON.stringify({
      name: input.name,
      slug: input.slug,
      projectSlug: input.projectSlug,
      teamCode: input.teamCode,
      visibility: input.visibility,
      defaultBranch: "main",
    }),
  });
  if (!response.ok) throw new Error("CORE Repo Service repository oluşturamadı.");
  const payload = await response.json() as { id?: string; defaultBranch?: string };
  if (!payload.id) throw new Error("CORE Repo Service geçersiz repository cevabı döndürdü.");

  const id = crypto.randomUUID();
  const db = database();
  await db.batch([
    db.prepare(
      "INSERT INTO portal_native_repositories (id,name,slug,service_repository_id,project_slug,team_code,visibility,default_branch,status,created_by) VALUES (?,?,?,?,?,?,?,?, 'ready',?)"
    ).bind(
      id,input.name,input.slug,payload.id,input.projectSlug,input.teamCode,input.visibility,payload.defaultBranch || "main",input.actorEmail
    ),
    db.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'repository.native.create','native_repository',?,?)"
    ).bind(input.actorEmail,id,JSON.stringify({ name: input.name, slug: input.slug, serviceRepositoryId: payload.id })),
  ]);
  return id;
}

export const RUNNER_TASKS = {
  python: [
    ["python-test","Python test","python -m pytest -q"],
    ["python-script","Python entry","python main.py"],
  ],
  javascript: [
    ["js-test","JavaScript test","npm test -- --run"],
    ["js-script","Node entry","node index.js"],
  ],
  typescript: [
    ["ts-typecheck","TypeScript check","npx tsc --noEmit"],
    ["ts-test","TypeScript test","npm test -- --run"],
  ],
  c: [
    ["c-build","C build","cmake --build build"],
    ["c-test","C tests","ctest --test-dir build --output-on-failure"],
  ],
  cpp: [
    ["cpp-build","C++ build","cmake --build build"],
    ["cpp-test","C++ tests","ctest --test-dir build --output-on-failure"],
  ],
} as const;

export async function listPortalCodeRuns(memberId: string, limit = 50) {
  try {
    const response = await database().prepare(
      "SELECT * FROM portal_code_runs WHERE member_id=? ORDER BY created_at DESC LIMIT ?"
    ).bind(memberId,Math.min(Math.max(limit,1),100)).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    return [];
  }
}

export async function submitPortalCodeRun(input: {
  memberId: string;
  repositoryRef: string;
  snapshotRef: string;
  language: keyof typeof RUNNER_TASKS;
  task: string;
}) {
  const url = serviceUrl(env.CORE_RUNNER_URL);
  if (!url) throw new Error("CORE Runner henüz production'a bağlanmadı.");
  const token = String(env.CORE_RUNNER_TOKEN || "").trim();
  if (!token) throw new Error("CORE Runner kimlik bilgisi yapılandırılmadı.");

  const templates = RUNNER_TASKS[input.language];
  const template = templates.find((item) => item[0] === input.task);
  if (!template) throw new Error("İzin verilmeyen runner görevi.");

  const id = crypto.randomUUID();
  const limits = {
    timeoutSeconds: 120,
    memoryMb: 512,
    cpu: 1,
    maxOutputBytes: 1_000_000,
    network: "deny-by-default",
  };

  await database().prepare(
    "INSERT INTO portal_code_runs (id,member_id,repository_ref,snapshot_ref,language,command_label,status,limits_json) VALUES (?,?,?,?,?,?, 'queued',?)"
  ).bind(id,input.memberId,input.repositoryRef,input.snapshotRef,input.language,template[0],JSON.stringify(limits)).run();

  try {
    const response = await fetch(url + "/v1/jobs", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": "Bearer " + token,
      },
      body: JSON.stringify({
        jobId: id,
        repositoryRef: input.repositoryRef,
        snapshotRef: input.snapshotRef,
        language: input.language,
        task: template[0],
        limits,
      }),
    });
    if (!response.ok) throw new Error("Runner işi kabul etmedi.");
  } catch (error) {
    await database().prepare(
      "UPDATE portal_code_runs SET status='failed',finished_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(id).run();
    throw error;
  }

  return id;
}
