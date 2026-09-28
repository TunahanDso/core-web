import { env } from "cloudflare:workers";
import type { PortalMember } from "@/lib/portal/auth";
import {
  canManageTeamProjects,
  memberHasPortalCapability,
  portalTeamMembershipFor,
} from "@/lib/portal/governance";
import { getEngineeringServiceStatus } from "@/lib/portal/engineering-services";

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
  aheadBy?: number;
  behindBy?: number;
  totalCommits?: number;
  mergeBaseSha?: string;
  files: RepoCompareFile[];
};

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

async function serviceGet<T>(pathname: string): Promise<ServiceResult<T>> {
  const service = getEngineeringServiceStatus().repository;
  if (!service.configured || !service.url) {
    return { ok: false, error: "CORE Repo Service bağlı değil." };
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
    aheadBy: Number.isFinite(Number(raw.aheadBy)) ? Number(raw.aheadBy) : undefined,
    behindBy: Number.isFinite(Number(raw.behindBy)) ? Number(raw.behindBy) : undefined,
    totalCommits: Number.isFinite(Number(raw.totalCommits)) ? Number(raw.totalCommits) : undefined,
    mergeBaseSha: raw.mergeBaseSha ? String(raw.mergeBaseSha) : undefined,
    files: listPayload<RepoCompareFile>(raw.files, "files"),
  };
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

  const result: NativeRepositoryRecord[] = [];
  for (const repo of rows) {
    if (repo.visibility === "internal" || repo.visibility === "public") {
      result.push(repo);
      continue;
    }
    if (member.role === "admin" || repo.created_by === member.email) {
      result.push(repo);
      continue;
    }
    if (repo.team_code && await portalTeamMembershipFor(member, repo.team_code)) {
      result.push(repo);
    }
  }
  return result;
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
    Promise<ServiceResult<unknown>>
  ] = [
    serviceGet<unknown>(`/v1/repositories/${serviceId}/branches`),
    serviceGet<unknown>(`/v1/repositories/${serviceId}/tree?ref=${refParam}&path=${pathParam}`),
    serviceGet<unknown>(`/v1/repositories/${serviceId}/commits?ref=${refParam}&limit=30`),
    serviceGet<unknown>(`/v1/repositories/${serviceId}/manifests?ref=${refParam}`),
  ];

  const [branchesResult, treeResult, commitsResult, manifestsResult] = await Promise.all(requests);

  const collectError = (label: string, result: ServiceResult<unknown>) => {
    if (!result.ok) errors.push(`${label}: ${result.error}`);
  };
  collectError("Branches", branchesResult);
  collectError("Tree", treeResult);
  collectError("Commits", commitsResult);
  collectError("Packages", manifestsResult);

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

  return {
    ref,
    path,
    service: {
      available: true,
      configured: true,
      reason: null as string | null,
    },
    branches: branchesResult.ok ? listPayload<RepoBranch>(branchesResult.data, "branches") : [],
    tree: treeResult.ok ? listPayload<RepoTreeEntry>(treeResult.data, "entries") : [],
    commits: commitsResult.ok ? listPayload<RepoCommit>(commitsResult.data, "commits") : [],
    manifests: manifestsResult.ok ? listPayload<RepoPackageManifest>(manifestsResult.data, "manifests") : [],
    blob,
    compare,
    errors,
  };
}
