import { env } from "cloudflare:workers";
import {
  commitEmbeddedRepoChanges,
  createEmbeddedRepoBranch,
  createEmbeddedRepoRelease,
  embeddedRepoEngineAvailable,
  provisionEmbeddedRepository,
} from "@/lib/portal/native-repo-engine";

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
  const repositoryUrl = serviceUrl(env.CORE_REPO_SERVICE_URL);
  const repositoryToken = String(env.CORE_REPO_SERVICE_TOKEN || "").trim();
  const externalRepository = Boolean(repositoryUrl && repositoryToken);
  const embeddedRepository = embeddedRepoEngineAvailable();
  return {
    repository: {
      configured: Boolean(externalRepository || embeddedRepository),
      url: externalRepository ? repositoryUrl : null,
      mode: externalRepository ? "external" : embeddedRepository ? "snapshot-r2" : "offline",
      embedded: embeddedRepository,
    },
    runner: {
      configured: Boolean(serviceUrl(env.CORE_RUNNER_URL)),
      url: serviceUrl(env.CORE_RUNNER_URL),
    },
    converter: {
      configured: Boolean(
        ((env as unknown as Record<string,unknown>).CONVERTER_SERVICE as {fetch?:unknown}|undefined)?.fetch
        || serviceUrl(env.CORE_CONVERTER_URL)
      ),
      url: serviceUrl(env.CORE_CONVERTER_URL),
      mode: ((env as unknown as Record<string,unknown>).CONVERTER_SERVICE as {fetch?:unknown}|undefined)?.fetch
        ? "internal-service"
        : serviceUrl(env.CORE_CONVERTER_URL)
          ? "external"
          : "offline",
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
  actorName: string;
}) {
  const url = serviceUrl(env.CORE_REPO_SERVICE_URL);
  const token = String(env.CORE_REPO_SERVICE_TOKEN || "").trim();

  let payload: { id: string; defaultBranch: string; headSha?: string; engine?: string };
  if (url && token) {
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
    const remote = await response.json() as { id?: string; defaultBranch?: string; headSha?: string };
    if (!remote.id) throw new Error("CORE Repo Service geçersiz repository cevabı döndürdü.");
    payload = {
      id: remote.id,
      defaultBranch: remote.defaultBranch || "main",
      headSha: remote.headSha,
      engine: "external",
    };
  } else {
    payload = await provisionEmbeddedRepository({
      name: input.name,
      slug: input.slug,
      defaultBranch: "main",
      actorName: input.actorName,
      actorEmail: input.actorEmail,
    });
  }

  const id = crypto.randomUUID();
  const db = database();
  await db.batch([
    db.prepare(
      "INSERT INTO portal_native_repositories (id,name,slug,service_repository_id,project_slug,team_code,visibility,default_branch,status,created_by) VALUES (?,?,?,?,?,?,?,?, 'ready',?)"
    ).bind(
      id,input.name,input.slug,payload.id,input.projectSlug,input.teamCode,input.visibility,payload.defaultBranch,input.actorEmail
    ),
    db.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'repository.native.create','native_repository',?,?)"
    ).bind(input.actorEmail,id,JSON.stringify({
      name: input.name,
      slug: input.slug,
      serviceRepositoryId: payload.id,
      engine: payload.engine || (url ? "external-git-service" : "snapshot-r2"),
      headSha: payload.headSha || null,
    })),
  ]);
  return id;
}

async function externalRepoWrite(pathname: string, body: unknown) {
  const url = serviceUrl(env.CORE_REPO_SERVICE_URL);
  const token = String(env.CORE_REPO_SERVICE_TOKEN || "").trim();
  if (!url || !token) return null;
  const response = await fetch(url + pathname, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": "Bearer " + token,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let message = "CORE Repo Service write failed.";
    try {
      const parsed = await response.json() as { error?: string; message?: string };
      message = String(parsed.error || parsed.message || message);
    } catch {}
    throw new Error(message);
  }
  return response.json() as Promise<Record<string,unknown>>;
}

export async function createNativeRepositoryBranch(input: {
  serviceRepositoryId: string;
  name: string;
  fromRef: string;
  actorEmail: string;
  nativeRepositoryId: string;
}) {
  const external = await externalRepoWrite(
    "/v1/repositories/" + encodeURIComponent(input.serviceRepositoryId) + "/branches",
    { name:input.name,fromRef:input.fromRef }
  );
  const result = external || await createEmbeddedRepoBranch({
    repoId:input.serviceRepositoryId,
    name:input.name,
    fromRef:input.fromRef,
  });
  await database().prepare(
    "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'repository.branch.create','native_repository',?,?)"
  ).bind(input.actorEmail,input.nativeRepositoryId,JSON.stringify({
    name:input.name,fromRef:input.fromRef,sha:(result as { sha?: string }).sha || null,
  })).run();
  return result;
}

export async function commitNativeRepositoryTextFile(input: {
  serviceRepositoryId: string;
  nativeRepositoryId: string;
  branch: string;
  expectedHead?: string | null;
  path: string;
  content: string | null;
  message: string;
  actorName: string;
  actorEmail: string;
}) {
  const body = {
    branch:input.branch,
    expectedHead:input.expectedHead || null,
    message:input.message,
    authorName:input.actorName,
    authorEmail:input.actorEmail,
    changes:[{ path:input.path,content:input.content }],
  };
  const external = await externalRepoWrite(
    "/v1/repositories/" + encodeURIComponent(input.serviceRepositoryId) + "/commits",
    body
  );
  const result = external || await commitEmbeddedRepoChanges({
    repoId:input.serviceRepositoryId,
    branch:input.branch,
    expectedHead:input.expectedHead,
    message:input.message,
    authorName:input.actorName,
    authorEmail:input.actorEmail,
    changes:[{ path:input.path,content:input.content }],
  });
  await database().batch([
    database().prepare(
      "UPDATE portal_native_repositories SET updated_at=CURRENT_TIMESTAMP,status='ready' WHERE id=?"
    ).bind(input.nativeRepositoryId),
    database().prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'repository.commit','native_repository',?,?)"
    ).bind(input.actorEmail,input.nativeRepositoryId,JSON.stringify({
      branch:input.branch,path:input.path,sha:(result as { sha?: string }).sha || null,
      operation:input.content === null ? "delete" : "write",
    })),
  ]);
  return result;
}

export async function createNativeRepositoryRelease(input: {
  serviceRepositoryId: string;
  nativeRepositoryId: string;
  ref: string;
  tag: string;
  name: string;
  notes: string;
  actorEmail: string;
}) {
  const body = {
    ref:input.ref,tag:input.tag,name:input.name,notes:input.notes,
  };
  const external = await externalRepoWrite(
    "/v1/repositories/" + encodeURIComponent(input.serviceRepositoryId) + "/releases",
    body
  );
  const result = external || await createEmbeddedRepoRelease({
    repoId:input.serviceRepositoryId,
    ref:input.ref,
    tag:input.tag,
    name:input.name,
    notes:input.notes,
    actorEmail:input.actorEmail,
  });
  await database().prepare(
    "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'repository.release.create','native_repository',?,?)"
  ).bind(input.actorEmail,input.nativeRepositoryId,JSON.stringify({
    ref:input.ref,tag:input.tag,name:input.name,
  })).run();
  return result;
}
