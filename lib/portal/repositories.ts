import { env } from "cloudflare:workers";
import type { PortalMember } from "@/lib/portal/auth";
import {
  canManageTeamProjects,
  listPortalMemberTeamMemberships,
  memberHasPortalCapability,
  portalTeamMembershipFor,
} from "@/lib/portal/governance";
import { getEngineeringServiceStatus } from "@/lib/portal/engineering-services";
import { embeddedRepoServiceRead } from "@/lib/portal/native-repo-engine";

function database() {
  if (!env.DB) throw new Error("Portal database binding is not available.");
  return env.DB;
}

function cleanRef(value: string | null | undefined, fallback = "main") {
  const ref = String(value || fallback).trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 180);
  return ref || fallback;
}

function cleanPath(value: string | null | undefined) {
  const parts = String(value || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..");
  return parts.join("/").slice(0, 900);
}

function repoServiceToken() {
  return String(env.CORE_REPO_SERVICE_TOKEN || "").trim();
}

export type NativeRepositoryRecord = {
  id: string;
  name: string;
  slug: string;
  service_repository_id: string | null;
  project_slug: string | null;
  team_code: string | null;
  visibility: "private" | "internal" | "public";
  default_branch: string;
  status: "provisioning" | "ready" | "degraded" | "archived";
  mirror_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type RepoBranch = {
  name: string;
  sha: string;
  protected?: boolean;
  updatedAt?: string;
};

export type RepoTreeEntry = {
  name: string;
  path: string;
  type: "file" | "directory" | "symlink" | "submodule";
  sha?: string;
  size?: number;
  language?: string;
};

export type RepoCommit = {
  sha: string;
  message: string;
  authorName?: string;
  authorEmail?: string;
  authoredAt?: string;
  committedAt?: string;
  parents?: string[];
};

export type RepoBlob = {
  path: string;
  ref: string;
  sha?: string;
  size?: number;
  mimeType?: string;
  language?: string;
  encoding?: "utf-8" | "binary";
  content?: string;
};

export type RepoPackageManifest = {
  path: string;
  ecosystem: string;
  packageManager?: string;
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

export type RepoCompareFile = {
  path: string;
  previousPath?: string;
  status?: string;
  additions?: number;
  deletions?: number;
  changes?: number;
};

export type RepoCompare = {
  base: string;
  head: string;
  baseSha?: string;
  headSha?: string;
  aheadBy?: number;
  behindBy?: number;
  totalCommits?: number;
  mergeBaseSha?: string;
  files: RepoCompareFile[];
};

export type RepoDiffLine = {
  kind: "context" | "add" | "delete";
  content: string;
  oldLine?: number;
  newLine?: number;
  lineSha?: string;
};

export type RepoDiffHunk = {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: RepoDiffLine[];
};

export type RepoDiffFile = {
  path: string;
  previousPath?: string;
  status?: string;
  language?: string;
  additions?: number;
  deletions?: number;
  binary?: boolean;
  hunks: RepoDiffHunk[];
};

export type RepoDiff = {
  base: string;
  head: string;
  baseSha: string;
  headSha: string;
  files: RepoDiffFile[];
};

export type RepoRelease = {
  id: string;
  tag: string;
  name: string;
  ref: string;
  commitSha: string;
  notes: string;
  createdBy: string;
  createdAt: string;
};

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

async function serviceGet<T>(pathname: string): Promise<ServiceResult<T>> {
  const service = getEngineeringServiceStatus().repository;
  if (!service.configured) {
    return { ok: false, error: "CORE Repo Service bağlı değil." };
  }

  if (!service.url) {
    const embedded = await embeddedRepoServiceRead(pathname);
    return embedded.ok
      ? { ok: true, data: embedded.data as T }
      : { ok: false, error: embedded.error, status: embedded.status };
  }

  const token = repoServiceToken();
  if (!token) {
    return { ok: false, error: "CORE Repo Service token yapılandırılmadı." };
  }

  try {
    const response = await fetch(service.url + pathname, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: "Bearer " + token,
      },
    });

    const raw = await response.text();
    if (!response.ok) {
      let message = `Repo Service HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(raw) as { error?: string; message?: string };
        message = String(parsed.error || parsed.message || message);
      } catch {
        // Keep the compact HTTP status message.
      }
      return { ok: false, error: message, status: response.status };
    }

    try {
      return { ok: true, data: JSON.parse(raw) as T };
    } catch {
      return { ok: false, error: "Repo Service geçersiz JSON döndürdü." };
    }
  } catch {
    return { ok: false, error: "Repo Service isteğine ulaşılamadı." };
  }
}

function listPayload<T>(payload: unknown, key: string): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const candidate = (payload as Record<string, unknown>)[key];
    if (Array.isArray(candidate)) return candidate as T[];
  }
  return [];
}

function comparePayload(payload: unknown, base: string, head: string): RepoCompare | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;
  return {
    base: String(raw.base || base),
    head: String(raw.head || head),
    baseSha: raw.baseSha ? String(raw.baseSha) : undefined,
    headSha: raw.headSha ? String(raw.headSha) : undefined,
    aheadBy: Number.isFinite(Number(raw.aheadBy)) ? Number(raw.aheadBy) : undefined,
    behindBy: Number.isFinite(Number(raw.behindBy)) ? Number(raw.behindBy) : undefined,
    totalCommits: Number.isFinite(Number(raw.totalCommits)) ? Number(raw.totalCommits) : undefined,
    mergeBaseSha: raw.mergeBaseSha ? String(raw.mergeBaseSha) : undefined,
    files: listPayload<RepoCompareFile>(raw.files, "files"),
  };
}


export async function loadNativeRepositoryCompare(
  repo: NativeRepositoryRecord,
  baseValue: string,
  headValue: string
): Promise<{ compare: RepoCompare | null; error: string | null }> {
  if (!repo.service_repository_id) {
    return { compare: null, error: "Repository servis kimliği henüz atanmadı." };
  }

  const base = cleanRef(baseValue, repo.default_branch || "main");
  const head = cleanRef(headValue, repo.default_branch || "main");
  const serviceId = encodeURIComponent(repo.service_repository_id);
  const result = await serviceGet<unknown>(
    `/v1/repositories/${serviceId}/compare?base=${encodeURIComponent(base)}&head=${encodeURIComponent(head)}`
  );
  if (!result.ok) return { compare: null, error: result.error };

  const compare = comparePayload(result.data, base, head);
  if (!compare) return { compare: null, error: "Repo Service compare cevabı geçersiz." };
  return { compare, error: null };
}


export type ExternalRepositoryRecord = {
  id: string;
  name: string;
  provider: string;
  repo_url: string;
  project_slug: string | null;
  team_code: string | null;
  visibility: "private" | "internal" | "public";
  default_branch: string;
  health: string;
  last_sync_at: string | null;
  created_at: string;
};

export async function listAccessibleExternalRepositories(member: PortalMember) {
  let rows: ExternalRepositoryRecord[] = [];
  try {
    const response = await database().prepare(
      "SELECT * FROM portal_repositories ORDER BY name LIMIT 300"
    ).all<ExternalRepositoryRecord>();
    rows = response.results ?? [];
  } catch {
    return [];
  }

  if (member.role === "admin") return rows;
  const memberships = await listPortalMemberTeamMemberships(member.id);
  const teamCodes = new Set([
    ...member.teams.map((item) => String(item).trim().toUpperCase()),
    ...memberships.map((item) => String(item.team_code || "").trim().toUpperCase()).filter(Boolean),
  ]);

  return rows.filter((repo) => {
    if (repo.visibility === "public" || repo.visibility === "internal") return true;
    return Boolean(repo.team_code && teamCodes.has(String(repo.team_code).trim().toUpperCase()));
  });
}

export async function listAccessibleNativeRepositories(member: PortalMember) {
  let rows: NativeRepositoryRecord[] = [];
  try {
    const response = await database().prepare(
      "SELECT * FROM portal_native_repositories WHERE status!='archived' ORDER BY updated_at DESC LIMIT 200"
    ).all<NativeRepositoryRecord>();
    rows = response.results ?? [];
  } catch {
    return [];
  }

  if (member.role === "admin") return rows;

  const memberships = await listPortalMemberTeamMemberships(member.id);
  const teamCodes = new Set([
    ...member.teams.map((item) => String(item).trim().toUpperCase()),
    ...memberships.map((item) => String(item.team_code || "").trim().toUpperCase()).filter(Boolean),
  ]);

  return rows.filter((repo) => {
    if (repo.visibility === "internal" || repo.visibility === "public") return true;
    if (repo.created_by === member.email) return true;
    return Boolean(repo.team_code && teamCodes.has(String(repo.team_code).trim().toUpperCase()));
  });
}

export async function getAccessibleNativeRepository(member: PortalMember, repoSlug: string) {
  let repo: NativeRepositoryRecord | null = null;
  try {
    repo = await database().prepare(
      "SELECT * FROM portal_native_repositories WHERE slug=? AND status!='archived' LIMIT 1"
    ).bind(repoSlug.trim().toLowerCase()).first<NativeRepositoryRecord>();
  } catch {
    return null;
  }
  if (!repo) return null;

  if (repo.visibility === "internal" || repo.visibility === "public") return repo;
  if (member.role === "admin" || repo.created_by === member.email) return repo;
  if (repo.team_code && await portalTeamMembershipFor(member, repo.team_code)) return repo;
  return null;
}

export async function canManageNativeRepository(member: PortalMember, repo: NativeRepositoryRecord) {
  if (member.role === "admin" || repo.created_by === member.email) return true;
  if (await memberHasPortalCapability(member, "control.projects")) return true;
  if (repo.team_code && await canManageTeamProjects(member, repo.team_code)) return true;
  return false;
}

export async function loadNativeRepositoryWorkspace(
  repo: NativeRepositoryRecord,
  input?: {
    ref?: string | null;
    path?: string | null;
    file?: string | null;
    base?: string | null;
    head?: string | null;
  }
) {
  const serviceStatus = getEngineeringServiceStatus().repository;
  const ref = cleanRef(input?.ref, repo.default_branch || "main");
  const path = cleanPath(input?.path);
  const file = cleanPath(input?.file);
  const base = input?.base ? cleanRef(input.base, repo.default_branch || "main") : "";
  const head = input?.head ? cleanRef(input.head, ref) : "";
  const errors: string[] = [];

  if (!serviceStatus.configured || !serviceStatus.url || !repo.service_repository_id) {
    return {
      ref,
      path,
      service: {
        available: false,
        configured: serviceStatus.configured,
        reason: !serviceStatus.configured
          ? "CORE Repo Service henüz bağlı değil."
          : "Repository servis kimliği henüz atanmadı.",
      },
      branches: [] as RepoBranch[],
      tree: [] as RepoTreeEntry[],
      commits: [] as RepoCommit[],
      manifests: [] as RepoPackageManifest[],
      releases: [] as RepoRelease[],
      blob: null as RepoBlob | null,
      compare: null as RepoCompare | null,
      errors,
    };
  }

  const serviceId = encodeURIComponent(repo.service_repository_id);
  const refParam = encodeURIComponent(ref);
  const pathParam = encodeURIComponent(path);

  const requests: [
    Promise<ServiceResult<unknown>>,
    Promise<ServiceResult<unknown>>,
    Promise<ServiceResult<unknown>>,
    Promise<ServiceResult<unknown>>,
    Promise<ServiceResult<unknown>>
  ] = [
    serviceGet<unknown>(`/v1/repositories/${serviceId}/branches`),
    serviceGet<unknown>(`/v1/repositories/${serviceId}/tree?ref=${refParam}&path=${pathParam}`),
    serviceGet<unknown>(`/v1/repositories/${serviceId}/commits?ref=${refParam}&limit=30`),
    serviceGet<unknown>(`/v1/repositories/${serviceId}/manifests?ref=${refParam}`),
    serviceGet<unknown>(`/v1/repositories/${serviceId}/releases`),
  ];

  const [branchesResult, treeResult, commitsResult, manifestsResult, releasesResult] = await Promise.all(requests);

  const collectError = (label: string, result: ServiceResult<unknown>) => {
    if (!result.ok) errors.push(`${label}: ${result.error}`);
  };
  collectError("Branches", branchesResult);
  collectError("Tree", treeResult);
  collectError("Commits", commitsResult);
  collectError("Packages", manifestsResult);
  collectError("Releases", releasesResult);

  let blob: RepoBlob | null = null;
  if (file) {
    const blobResult = await serviceGet<RepoBlob>(
      `/v1/repositories/${serviceId}/blob?ref=${refParam}&path=${encodeURIComponent(file)}`
    );
    if (blobResult.ok) blob = blobResult.data;
    else errors.push(`File: ${blobResult.error}`);
  }

  let compare: RepoCompare | null = null;
  if (base && head) {
    const compareResult = await serviceGet<unknown>(
      `/v1/repositories/${serviceId}/compare?base=${encodeURIComponent(base)}&head=${encodeURIComponent(head)}`
    );
    if (compareResult.ok) compare = comparePayload(compareResult.data, base, head);
    else errors.push(`Compare: ${compareResult.error}`);
  }

  const coreReads = [branchesResult, treeResult, commitsResult, manifestsResult, releasesResult];
  const reachable = coreReads.some((result) => result.ok);

  return {
    ref,
    path,
    service: {
      available: reachable,
      configured: true,
      reason: reachable ? null : "Repo Service yapılandırılmış ancak workspace endpointlerine ulaşılamadı.",
    },
    branches: branchesResult.ok ? listPayload<RepoBranch>(branchesResult.data, "branches") : [],
    tree: treeResult.ok ? listPayload<RepoTreeEntry>(treeResult.data, "entries") : [],
    commits: commitsResult.ok ? listPayload<RepoCommit>(commitsResult.data, "commits") : [],
    manifests: manifestsResult.ok ? listPayload<RepoPackageManifest>(manifestsResult.data, "manifests") : [],
    releases: releasesResult.ok ? listPayload<RepoRelease>(releasesResult.data, "releases") : [],
    blob,
    compare,
    errors,
  };
}


function diffPayload(payload: unknown, base: string, head: string): RepoDiff | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;
  const baseSha = String(raw.baseSha || "").trim();
  const headSha = String(raw.headSha || "").trim();
  if (!baseSha || !headSha) return null;

  const files = listPayload<Record<string, unknown>>(raw.files, "files").map((file) => {
    const hunks = listPayload<Record<string, unknown>>(file.hunks, "hunks").map((hunk) => {
      const lines = listPayload<Record<string, unknown>>(hunk.lines, "lines").map((line) => ({
        kind: ["add","delete","context"].includes(String(line.kind))
          ? String(line.kind) as RepoDiffLine["kind"]
          : "context",
        content: String(line.content || ""),
        oldLine: Number.isFinite(Number(line.oldLine)) && Number(line.oldLine) > 0 ? Number(line.oldLine) : undefined,
        newLine: Number.isFinite(Number(line.newLine)) && Number(line.newLine) > 0 ? Number(line.newLine) : undefined,
        lineSha: line.lineSha ? String(line.lineSha) : undefined,
      }));
      return {
        header: String(hunk.header || ""),
        oldStart: Number(hunk.oldStart || 0),
        oldLines: Number(hunk.oldLines || 0),
        newStart: Number(hunk.newStart || 0),
        newLines: Number(hunk.newLines || 0),
        lines,
      } satisfies RepoDiffHunk;
    });

    return {
      path: String(file.path || ""),
      previousPath: file.previousPath ? String(file.previousPath) : undefined,
      status: file.status ? String(file.status) : undefined,
      language: file.language ? String(file.language) : undefined,
      additions: Number.isFinite(Number(file.additions)) ? Number(file.additions) : undefined,
      deletions: Number.isFinite(Number(file.deletions)) ? Number(file.deletions) : undefined,
      binary: Boolean(file.binary),
      hunks,
    } satisfies RepoDiffFile;
  }).filter((file) => file.path);

  return {
    base: String(raw.base || base),
    head: String(raw.head || head),
    baseSha,
    headSha,
    files,
  };
}

export async function loadNativeRepositoryDiff(
  repo: NativeRepositoryRecord,
  baseValue: string,
  headValue: string,
  filePath?: string | null
): Promise<{ diff: RepoDiff | null; error: string | null }> {
  if (!repo.service_repository_id) {
    return { diff: null, error: "Repository servis kimliği henüz atanmadı." };
  }

  const base = cleanRef(baseValue, repo.default_branch || "main");
  const head = cleanRef(headValue, repo.default_branch || "main");
  const path = cleanPath(filePath);
  const serviceId = encodeURIComponent(repo.service_repository_id);
  const params = new URLSearchParams({ base, head });
  if (path) params.set("path", path);

  const result = await serviceGet<unknown>(
    `/v1/repositories/${serviceId}/diff?${params.toString()}`
  );
  if (!result.ok) return { diff: null, error: result.error };

  const diff = diffPayload(result.data, base, head);
  if (!diff) return { diff: null, error: "Repo Service diff cevabı geçersiz veya SHA içermiyor." };
  return { diff, error: null };
}

export function findRepoDiffLine(
  diff: RepoDiff,
  filePath: string,
  side: "base" | "head",
  lineNumber: number
) {
  const normalizedPath = cleanPath(filePath);
  const file = diff.files.find((item) => item.path === normalizedPath || item.previousPath === normalizedPath);
  if (!file) return null;

  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      const candidate = side === "base" ? line.oldLine : line.newLine;
      if (candidate === lineNumber) return { file, hunk, line };
    }
  }
  return null;
}
