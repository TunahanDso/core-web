import { env } from "cloudflare:workers";

const ROOT = "core-repo/v1";
const MAX_TEXT_BLOB_BYTES = 512_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type RepoMeta = {
  version: 1;
  id: string;
  name: string;
  slug: string;
  defaultBranch: string;
  refs: { heads: Record<string,string>; tags: Record<string,string> };
  releases: Array<{
    id: string;
    tag: string;
    name: string;
    ref: string;
    commitSha: string;
    notes: string;
    createdBy: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

type RepoFileMeta = {
  blobSha: string;
  size: number;
  mimeType: string;
  language?: string;
};

type RepoSnapshot = {
  commitSha: string;
  treeSha: string;
  files: Record<string,RepoFileMeta>;
};

type RepoCommitObject = {
  sha: string;
  treeSha: string;
  parents: string[];
  message: string;
  authorName: string;
  authorEmail: string;
  authoredAt: string;
  committedAt: string;
};

type DiffOp = {
  kind: "context" | "add" | "delete";
  content: string;
  oldLine?: number;
  newLine?: number;
};

function bucket() {
  if (!env.MEDIA) throw new Error("R2 MEDIA binding is not available.");
  return env.MEDIA;
}

function repoPrefix(repoId: string) {
  return ROOT + "/" + repoId;
}
function metaKey(repoId: string) {
  return repoPrefix(repoId) + "/meta.json";
}
function commitKey(repoId: string, sha: string) {
  return repoPrefix(repoId) + "/commits/" + sha + ".json";
}
function snapshotKey(repoId: string, sha: string) {
  return repoPrefix(repoId) + "/snapshots/" + sha + ".json";
}
function blobKey(repoId: string, sha: string) {
  return repoPrefix(repoId) + "/blobs/" + sha;
}

function normalizePath(value: string) {
  return String(value || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((item) => item.trim())
    .filter((item) => item && item !== "." && item !== "..")
    .join("/")
    .slice(0, 900);
}

function normalizeRefName(value: string, label: string) {
  const ref = String(value || "").trim().slice(0, 180);
  if (
    !ref ||
    !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(ref) ||
    ref.includes("..") ||
    ref.includes("//") ||
    ref.endsWith("/")
  ) {
    throw new Error("Geçersiz " + label + ".");
  }
  return ref;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Bytes(bytes: Uint8Array) {
  const stable = Uint8Array.from(bytes);
  const digest = await crypto.subtle.digest("SHA-256", stable.buffer);
  return bytesToHex(new Uint8Array(digest));
}
async function sha256Text(value: string) {
  return sha256Bytes(encoder.encode(value));
}

function canonicalFiles(files: Record<string,RepoFileMeta>) {
  return Object.fromEntries(
    Object.entries(files)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([path,meta]) => [
        path,
        {
          blobSha: meta.blobSha,
          size: meta.size,
          mimeType: meta.mimeType,
          ...(meta.language ? { language: meta.language } : {}),
        },
      ])
  );
}

async function getJson<T>(key: string): Promise<T | null> {
  const object = await bucket().get(key);
  if (!object) return null;
  try {
    return JSON.parse(await new Response(object.body).text()) as T;
  } catch {
    return null;
  }
}

async function putJson(key: string, value: unknown) {
  await bucket().put(key, JSON.stringify(value), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

function languageForPath(path: string) {
  const lower = path.toLowerCase();
  const extension = lower.includes(".") ? lower.slice(lower.lastIndexOf(".") + 1) : "";
  const table: Record<string,string> = {
    ts:"TypeScript",tsx:"TypeScript",js:"JavaScript",jsx:"JavaScript",
    py:"Python",c:"C",h:"C",cpp:"C++",cc:"C++",hpp:"C++",
    rs:"Rust",go:"Go",java:"Java",kt:"Kotlin",swift:"Swift",cs:"C#",
    json:"JSON",yaml:"YAML",yml:"YAML",toml:"TOML",md:"Markdown",
    html:"HTML",css:"CSS",scss:"SCSS",sh:"Shell",ino:"Arduino",
  };
  if (lower.endsWith("cmakelists.txt")) return "CMake";
  if (lower.endsWith("dockerfile")) return "Dockerfile";
  return table[extension];
}

function mimeForPath(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".md")) return "text/markdown";
  if (lower.endsWith(".html")) return "text/html";
  if (lower.endsWith(".css")) return "text/css";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (/\.(png|jpg|jpeg|gif|webp|pdf|zip|gz|glb|bin|wasm)$/i.test(lower)) return "application/octet-stream";
  return "text/plain";
}

function isTextMime(mimeType: string, path: string) {
  return mimeType.startsWith("text/")
    || mimeType === "application/json"
    || mimeType === "image/svg+xml"
    || Boolean(languageForPath(path));
}

async function getMeta(repoId: string) {
  const meta = await getJson<RepoMeta>(metaKey(repoId));
  if (!meta) throw new Error("Native repository metadata not found.");
  return meta;
}
async function getCommit(repoId: string, sha: string) {
  return getJson<RepoCommitObject>(commitKey(repoId,sha));
}
async function getSnapshot(repoId: string, sha: string) {
  return getJson<RepoSnapshot>(snapshotKey(repoId,sha));
}

async function resolveRef(repoId: string, refValue: string) {
  const meta = await getMeta(repoId);
  const ref = String(refValue || meta.defaultBranch).trim();
  if (meta.refs.heads[ref]) return { meta, ref, sha: meta.refs.heads[ref] };
  if (meta.refs.tags[ref]) return { meta, ref, sha: meta.refs.tags[ref] };
  const commit = await getCommit(repoId,ref);
  if (commit) return { meta, ref, sha: commit.sha };
  throw new Error("Ref bulunamadı.");
}

async function storeBlob(repoId: string, path: string, bytes: Uint8Array) {
  const sha = await sha256Bytes(bytes);
  const key = blobKey(repoId,sha);
  const existing = await bucket().head(key);
  if (!existing) {
    await bucket().put(key,bytes,{
      httpMetadata:{ contentType:mimeForPath(path) },
    });
  }
  return {
    blobSha:sha,
    size:bytes.byteLength,
    mimeType:mimeForPath(path),
    language:languageForPath(path),
  } satisfies RepoFileMeta;
}

async function createCommit(input: {
  repoId: string;
  files: Record<string,RepoFileMeta>;
  parents: string[];
  message: string;
  authorName: string;
  authorEmail: string;
  authoredAt?: string;
}) {
  const authoredAt = input.authoredAt || new Date().toISOString();
  const files = canonicalFiles(input.files);
  const treeSha = await sha256Text("tree\n" + JSON.stringify(files));
  const seed = JSON.stringify({
    treeSha,
    parents:input.parents,
    message:input.message,
    authorName:input.authorName,
    authorEmail:input.authorEmail,
    authoredAt,
  });
  const sha = await sha256Text("commit\n" + seed);
  const commit: RepoCommitObject = {
    sha,
    treeSha,
    parents:input.parents,
    message:input.message.trim().slice(0,4000) || "chore: update repository",
    authorName:input.authorName.slice(0,160),
    authorEmail:input.authorEmail.slice(0,240),
    authoredAt,
    committedAt:authoredAt,
  };
  const snapshot: RepoSnapshot = { commitSha:sha,treeSha,files };
  await Promise.all([
    putJson(commitKey(input.repoId,sha),commit),
    putJson(snapshotKey(input.repoId,sha),snapshot),
  ]);
  return commit;
}

export function embeddedRepoEngineAvailable() {
  return Boolean(env.MEDIA);
}

export async function provisionEmbeddedRepository(input: {
  name: string;
  slug: string;
  defaultBranch?: string;
  actorName: string;
  actorEmail: string;
}) {
  const repoId = crypto.randomUUID();
  const defaultBranch = normalizeRefName(input.defaultBranch || "main","branch adı");
  const now = new Date().toISOString();
  const readmePath = "README.md";
  const readme = "# " + input.name + "\n\n"
    + "Native YTÜ CORE repository.\n\n"
    + "This repository is managed by CORE Repo Engine and its project/team permissions are enforced by the portal.\n";
  const readmeMeta = await storeBlob(repoId,readmePath,encoder.encode(readme));
  const commit = await createCommit({
    repoId,
    files:{ [readmePath]:readmeMeta },
    parents:[],
    message:"chore: initialize repository",
    authorName:input.actorName,
    authorEmail:input.actorEmail,
    authoredAt:now,
  });
  const meta: RepoMeta = {
    version:1,
    id:repoId,
    name:input.name,
    slug:input.slug,
    defaultBranch,
    refs:{ heads:{ [defaultBranch]:commit.sha },tags:{} },
    releases:[],
    createdAt:now,
    updatedAt:now,
  };
  await putJson(metaKey(repoId),meta);
  return { id:repoId,defaultBranch,headSha:commit.sha,engine:"embedded-r2" };
}

export async function listEmbeddedRepoBranches(repoId: string) {
  const meta = await getMeta(repoId);
  const branches = await Promise.all(
    Object.entries(meta.refs.heads).map(async ([name,sha]) => {
      const commit = await getCommit(repoId,sha);
      return {
        name,
        sha,
        protected:name === meta.defaultBranch,
        updatedAt:commit?.committedAt,
      };
    })
  );
  return branches.sort((a,b) => a.name.localeCompare(b.name));
}

export async function createEmbeddedRepoBranch(input: {
  repoId: string;
  name: string;
  fromRef: string;
}) {
  const name = normalizeRefName(input.name,"branch adı");
  const resolved = await resolveRef(input.repoId,input.fromRef);
  if (resolved.meta.refs.heads[name] || resolved.meta.refs.tags[name]) {
    throw new Error("Bu branch/ref zaten var.");
  }
  resolved.meta.refs.heads[name] = resolved.sha;
  resolved.meta.updatedAt = new Date().toISOString();
  await putJson(metaKey(input.repoId),resolved.meta);
  return { name,sha:resolved.sha };
}

export async function listEmbeddedRepoTree(repoId: string, ref: string, pathValue: string) {
  const resolved = await resolveRef(repoId,ref);
  const snapshot = await getSnapshot(repoId,resolved.sha);
  if (!snapshot) throw new Error("Repository snapshot bulunamadı.");
  const path = normalizePath(pathValue);
  const prefix = path ? path + "/" : "";
  const directories = new Map<string,string>();
  const entries: Array<Record<string,unknown>> = [];

  for (const [filePath,file] of Object.entries(snapshot.files)) {
    if (!filePath.startsWith(prefix)) continue;
    const remainder = filePath.slice(prefix.length);
    if (!remainder) continue;
    const slash = remainder.indexOf("/");
    if (slash >= 0) {
      const name = remainder.slice(0,slash);
      if (!directories.has(name)) directories.set(name,prefix + name);
      continue;
    }
    entries.push({
      name:remainder,
      path:filePath,
      type:"file",
      sha:file.blobSha,
      size:file.size,
      language:file.language,
    });
  }

  for (const [name,childPath] of directories) {
    entries.push({
      name,
      path:childPath,
      type:"directory",
      sha:await sha256Text("dir\n" + resolved.sha + "\n" + childPath),
    });
  }

  return entries.sort((a,b) => {
    const typeOrder = String(a.type) === String(b.type) ? 0 : String(a.type) === "directory" ? -1 : 1;
    return typeOrder || String(a.name).localeCompare(String(b.name));
  });
}

export async function getEmbeddedRepoBlob(repoId: string, ref: string, pathValue: string) {
  const resolved = await resolveRef(repoId,ref);
  const snapshot = await getSnapshot(repoId,resolved.sha);
  if (!snapshot) throw new Error("Repository snapshot bulunamadı.");
  const path = normalizePath(pathValue);
  const file = snapshot.files[path];
  if (!file) throw new Error("Dosya bulunamadı.");
  const object = await bucket().get(blobKey(repoId,file.blobSha));
  if (!object) throw new Error("Blob bulunamadı.");
  const bytes = new Uint8Array(await new Response(object.body).arrayBuffer());
  const text = isTextMime(file.mimeType,path) && bytes.byteLength <= MAX_TEXT_BLOB_BYTES;
  return {
    path,
    ref,
    sha:file.blobSha,
    size:file.size,
    mimeType:file.mimeType,
    language:file.language,
    encoding:text ? "utf-8" : "binary",
    ...(text ? { content:decoder.decode(bytes) } : {}),
  };
}

export async function listEmbeddedRepoCommits(repoId: string, ref: string, limit = 30) {
  const resolved = await resolveRef(repoId,ref);
  const commits: RepoCommitObject[] = [];
  let sha: string | undefined = resolved.sha;
  const max = Math.min(Math.max(limit,1),100);
  while (sha && commits.length < max) {
    const commit = await getCommit(repoId,sha);
    if (!commit) break;
    commits.push(commit);
    sha = commit.parents[0];
  }
  return commits;
}

function mapRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return Object.fromEntries(
    Object.entries(value as Record<string,unknown>).map(([key,item]) => [key,String(item)])
  );
}

function manifestFromPackageJson(path: string, content: string) {
  try {
    const parsed = JSON.parse(content) as Record<string,unknown>;
    return {
      path,
      ecosystem:"node",
      packageManager:typeof parsed.packageManager === "string" ? parsed.packageManager : "npm",
      name:typeof parsed.name === "string" ? parsed.name : undefined,
      version:typeof parsed.version === "string" ? parsed.version : undefined,
      dependencies:mapRecord(parsed.dependencies),
      devDependencies:mapRecord(parsed.devDependencies),
      peerDependencies:mapRecord(parsed.peerDependencies),
      scripts:mapRecord(parsed.scripts),
    };
  } catch {
    return null;
  }
}

function simpleTomlValue(content: string, key: string) {
  const escaped = key.replace(/[.*+?^$()|[\]\\]/g,"\\$&");
  const pattern = new RegExp("^\\s*" + escaped + "\\s*=\\s*[\\\"']([^\\\"']+)[\\\"']","m");
  return content.match(pattern)?.[1];
}

async function parseManifest(repoId: string, ref: string, path: string) {
  const blob = await getEmbeddedRepoBlob(repoId,ref,path);
  if (blob.encoding !== "utf-8" || typeof blob.content !== "string") return null;
  const source = blob.content;
  const lower = path.toLowerCase();

  if (lower.endsWith("package.json")) return manifestFromPackageJson(path,source);
  if (/requirements[^/]*\.txt$/i.test(lower)) {
    const dependencies: Record<string,string> = {};
    for (const raw of source.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#") || line.startsWith("-")) continue;
      const match = line.match(/^([A-Za-z0-9_.-]+)\s*(.*)$/);
      if (match) dependencies[match[1]] = match[2] || "*";
    }
    return { path,ecosystem:"python",packageManager:"pip",dependencies };
  }
  if (lower.endsWith("pyproject.toml")) {
    return {
      path,ecosystem:"python",
      packageManager:source.includes("[tool.poetry") ? "poetry" : "python",
      name:simpleTomlValue(source,"name"),
      version:simpleTomlValue(source,"version"),
    };
  }
  if (lower.endsWith("cargo.toml")) {
    return {
      path,ecosystem:"rust",packageManager:"cargo",
      name:simpleTomlValue(source,"name"),
      version:simpleTomlValue(source,"version"),
    };
  }
  if (lower.endsWith("go.mod")) {
    return {
      path,ecosystem:"go",packageManager:"go",
      name:source.match(/^\s*module\s+(.+)$/m)?.[1]?.trim(),
    };
  }
  if (lower.endsWith("platformio.ini")) {
    return { path,ecosystem:"embedded",packageManager:"platformio",name:path };
  }
  if (lower.endsWith("cmakelists.txt")) {
    return {
      path,ecosystem:"cmake",packageManager:"cmake",
      name:source.match(/project\s*\(\s*([^\s\)]+)/i)?.[1],
    };
  }
  return null;
}

export async function listEmbeddedRepoManifests(repoId: string, ref: string) {
  const resolved = await resolveRef(repoId,ref);
  const snapshot = await getSnapshot(repoId,resolved.sha);
  if (!snapshot) throw new Error("Repository snapshot bulunamadı.");
  const candidates = Object.keys(snapshot.files).filter((path) => {
    const lower = path.toLowerCase();
    return lower.endsWith("package.json")
      || lower.endsWith("pyproject.toml")
      || /requirements[^/]*\.txt$/i.test(lower)
      || lower.endsWith("cargo.toml")
      || lower.endsWith("go.mod")
      || lower.endsWith("platformio.ini")
      || lower.endsWith("cmakelists.txt");
  }).slice(0,80);
  const parsed = await Promise.all(candidates.map((path) => parseManifest(repoId,ref,path)));
  return parsed.filter(Boolean);
}

function splitLines(value: string) {
  return value.replace(/\r\n/g,"\n").split("\n");
}

function coarseDiff(before: string[], after: string[]): DiffOp[] {
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) suffix += 1;

  const ops: DiffOp[] = [];
  let oldLine = 1;
  let newLine = 1;
  for (let index=0;index<prefix;index+=1) {
    ops.push({ kind:"context",content:before[index],oldLine:oldLine++,newLine:newLine++ });
  }
  for (let index=prefix;index<before.length-suffix;index+=1) {
    ops.push({ kind:"delete",content:before[index],oldLine:oldLine++ });
  }
  for (let index=prefix;index<after.length-suffix;index+=1) {
    ops.push({ kind:"add",content:after[index],newLine:newLine++ });
  }
  for (let index=0;index<suffix;index+=1) {
    ops.push({
      kind:"context",
      content:before[before.length-suffix+index],
      oldLine:oldLine++,
      newLine:newLine++,
    });
  }
  return ops;
}

function exactDiff(before: string[], after: string[]): DiffOp[] {
  if (before.length * after.length > 250_000) return coarseDiff(before,after);
  const rows = before.length + 1;
  const cols = after.length + 1;
  const dp = new Uint16Array(rows * cols);
  const at = (i:number,j:number) => i * cols + j;

  for (let i=before.length-1;i>=0;i-=1) {
    for (let j=after.length-1;j>=0;j-=1) {
      dp[at(i,j)] = before[i] === after[j]
        ? dp[at(i+1,j+1)] + 1
        : Math.max(dp[at(i+1,j)],dp[at(i,j+1)]);
    }
  }

  const ops: DiffOp[] = [];
  let i=0,j=0,oldLine=1,newLine=1;
  while (i<before.length && j<after.length) {
    if (before[i] === after[j]) {
      ops.push({ kind:"context",content:before[i],oldLine:oldLine++,newLine:newLine++ });
      i+=1;j+=1;
    } else if (dp[at(i+1,j)] >= dp[at(i,j+1)]) {
      ops.push({ kind:"delete",content:before[i],oldLine:oldLine++ });
      i+=1;
    } else {
      ops.push({ kind:"add",content:after[j],newLine:newLine++ });
      j+=1;
    }
  }
  while (i<before.length) ops.push({ kind:"delete",content:before[i++],oldLine:oldLine++ });
  while (j<after.length) ops.push({ kind:"add",content:after[j++],newLine:newLine++ });
  return ops;
}

async function blobText(repoId: string, path: string, file?: RepoFileMeta) {
  if (!file || !isTextMime(file.mimeType,path) || file.size > MAX_TEXT_BLOB_BYTES) return null;
  const object = await bucket().get(blobKey(repoId,file.blobSha));
  if (!object) return null;
  return decoder.decode(new Uint8Array(await new Response(object.body).arrayBuffer()));
}

async function buildHunks(ops: DiffOp[]) {
  const changed = ops
    .map((item,index) => item.kind === "context" ? -1 : index)
    .filter((index) => index >= 0);
  if (!changed.length) return [];

  const ranges: Array<[number,number]> = [];
  let start = Math.max(0,changed[0]-3);
  let end = Math.min(ops.length-1,changed[0]+3);
  for (const index of changed.slice(1)) {
    const nextStart = Math.max(0,index-3);
    const nextEnd = Math.min(ops.length-1,index+3);
    if (nextStart <= end + 1) end = Math.max(end,nextEnd);
    else {
      ranges.push([start,end]);
      start = nextStart;
      end = nextEnd;
    }
  }
  ranges.push([start,end]);

  const hunks = [];
  for (const [rangeStart,rangeEnd] of ranges) {
    const lines = [];
    for (const line of ops.slice(rangeStart,rangeEnd+1)) {
      lines.push({
        ...line,
        lineSha:await sha256Text(
          line.kind + "\n"
          + String(line.oldLine || "") + "\n"
          + String(line.newLine || "") + "\n"
          + line.content
        ),
      });
    }
    const oldNumbers = lines.map((line) => line.oldLine).filter((value): value is number => Boolean(value));
    const newNumbers = lines.map((line) => line.newLine).filter((value): value is number => Boolean(value));
    const oldStart = oldNumbers[0] || 0;
    const newStart = newNumbers[0] || 0;
    const oldLines = oldNumbers.length;
    const newLines = newNumbers.length;
    hunks.push({
      header:"@@ -" + oldStart + "," + oldLines + " +" + newStart + "," + newLines + " @@",
      oldStart,oldLines,newStart,newLines,lines,
    });
  }
  return hunks;
}

async function compareSnapshots(repoId: string, baseSha: string, headSha: string) {
  const [baseSnapshot,headSnapshot] = await Promise.all([
    getSnapshot(repoId,baseSha),
    getSnapshot(repoId,headSha),
  ]);
  if (!baseSnapshot || !headSnapshot) throw new Error("Compare snapshot bulunamadı.");
  const paths = Array.from(new Set([
    ...Object.keys(baseSnapshot.files),
    ...Object.keys(headSnapshot.files),
  ])).sort();
  const files = [];

  for (const path of paths) {
    const beforeMeta = baseSnapshot.files[path];
    const afterMeta = headSnapshot.files[path];
    if (beforeMeta?.blobSha === afterMeta?.blobSha) continue;
    const status = !beforeMeta ? "added" : !afterMeta ? "deleted" : "modified";
    let additions = 0;
    let deletions = 0;
    const beforeText = await blobText(repoId,path,beforeMeta);
    const afterText = await blobText(repoId,path,afterMeta);
    if (beforeText !== null && afterText !== null) {
      const ops = exactDiff(splitLines(beforeText),splitLines(afterText));
      additions = ops.filter((item) => item.kind === "add").length;
      deletions = ops.filter((item) => item.kind === "delete").length;
    } else if (!beforeMeta && afterText !== null) additions = splitLines(afterText).length;
    else if (!afterMeta && beforeText !== null) deletions = splitLines(beforeText).length;
    files.push({ path,status,additions,deletions,changes:additions+deletions });
  }
  return { baseSnapshot,headSnapshot,files };
}

async function ancestorSet(repoId: string, sha: string) {
  const set = new Set<string>();
  let current: string | undefined = sha;
  while (current && set.size < 500) {
    if (set.has(current)) break;
    set.add(current);
    current = (await getCommit(repoId,current))?.parents[0];
  }
  return set;
}

async function distanceToAncestor(repoId: string, sha: string, target: string) {
  let current: string | undefined = sha;
  let distance = 0;
  while (current && distance <= 500) {
    if (current === target) return distance;
    current = (await getCommit(repoId,current))?.parents[0];
    distance += 1;
  }
  return undefined;
}

async function findMergeBase(repoId: string, baseSha: string, headSha: string) {
  const baseAncestors = await ancestorSet(repoId,baseSha);
  let current: string | undefined = headSha;
  let steps = 0;
  while (current && steps < 500) {
    if (baseAncestors.has(current)) return current;
    current = (await getCommit(repoId,current))?.parents[0];
    steps += 1;
  }
  return undefined;
}

export async function compareEmbeddedRepo(repoId: string, baseRef: string, headRef: string) {
  const [base,head] = await Promise.all([
    resolveRef(repoId,baseRef),
    resolveRef(repoId,headRef),
  ]);
  const mergeBaseSha = await findMergeBase(repoId,base.sha,head.sha);
  const compared = await compareSnapshots(repoId,base.sha,head.sha);
  const aheadBy = mergeBaseSha ? await distanceToAncestor(repoId,head.sha,mergeBaseSha) : undefined;
  const behindBy = mergeBaseSha ? await distanceToAncestor(repoId,base.sha,mergeBaseSha) : undefined;
  return {
    base:baseRef,head:headRef,baseSha:base.sha,headSha:head.sha,
    aheadBy,behindBy,totalCommits:aheadBy,mergeBaseSha,files:compared.files,
  };
}

export async function diffEmbeddedRepo(repoId: string, baseRef: string, headRef: string, onlyPath?: string) {
  const [base,head] = await Promise.all([
    resolveRef(repoId,baseRef),
    resolveRef(repoId,headRef),
  ]);
  const compared = await compareSnapshots(repoId,base.sha,head.sha);
  const wanted = onlyPath ? normalizePath(onlyPath) : "";
  const files = [];
  for (const summary of compared.files) {
    if (wanted && summary.path !== wanted) continue;
    const beforeMeta = compared.baseSnapshot.files[summary.path];
    const afterMeta = compared.headSnapshot.files[summary.path];
    const binary = Boolean(
      (beforeMeta && !isTextMime(beforeMeta.mimeType,summary.path))
      || (afterMeta && !isTextMime(afterMeta.mimeType,summary.path))
      || Number(beforeMeta?.size || afterMeta?.size || 0) > MAX_TEXT_BLOB_BYTES
    );
    let hunks: unknown[] = [];
    if (!binary) {
      const beforeText = beforeMeta ? await blobText(repoId,summary.path,beforeMeta) : "";
      const afterText = afterMeta ? await blobText(repoId,summary.path,afterMeta) : "";
      hunks = await buildHunks(exactDiff(splitLines(beforeText || ""),splitLines(afterText || "")));
    }
    files.push({
      path:summary.path,status:summary.status,language:languageForPath(summary.path),
      additions:summary.additions,deletions:summary.deletions,binary,hunks,
    });
  }
  return { base:baseRef,head:headRef,baseSha:base.sha,headSha:head.sha,files };
}

export async function commitEmbeddedRepoChanges(input: {
  repoId: string;
  branch: string;
  expectedHead?: string | null;
  message: string;
  authorName: string;
  authorEmail: string;
  changes: Array<{ path:string;content:string|null }>;
}) {
  const branch = normalizeRefName(input.branch,"branch adı");
  const meta = await getMeta(input.repoId);
  const currentHead = meta.refs.heads[branch];
  if (!currentHead) throw new Error("Commit yalnız mevcut bir branch'e yazılabilir.");
  if (input.expectedHead && currentHead !== input.expectedHead) {
    throw new Error("Branch ilerledi. Dosyayı güncel HEAD üzerinden tekrar commit et.");
  }
  const parentSnapshot = await getSnapshot(input.repoId,currentHead);
  if (!parentSnapshot) throw new Error("Parent snapshot bulunamadı.");
  const files: Record<string,RepoFileMeta> = { ...parentSnapshot.files };

  for (const change of input.changes.slice(0,100)) {
    const path = normalizePath(change.path);
    if (!path) throw new Error("Dosya yolu gerekli.");
    if (change.content === null) {
      delete files[path];
      continue;
    }
    const bytes = encoder.encode(change.content);
    if (bytes.byteLength > MAX_TEXT_BLOB_BYTES) {
      throw new Error("Portal editörü tek dosyada en fazla 512 KB metin commit edebilir.");
    }
    files[path] = await storeBlob(input.repoId,path,bytes);
  }

  const commit = await createCommit({
    repoId:input.repoId,
    files,
    parents:[currentHead],
    message:input.message,
    authorName:input.authorName,
    authorEmail:input.authorEmail,
  });
  meta.refs.heads[branch] = commit.sha;
  meta.updatedAt = new Date().toISOString();
  await putJson(metaKey(input.repoId),meta);
  return commit;
}

export async function listEmbeddedRepoReleases(repoId: string) {
  return [...(await getMeta(repoId)).releases].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createEmbeddedRepoRelease(input: {
  repoId: string;
  ref: string;
  tag: string;
  name: string;
  notes: string;
  actorEmail: string;
}) {
  const tag = normalizeRefName(input.tag,"tag");
  const resolved = await resolveRef(input.repoId,input.ref);
  if (resolved.meta.refs.tags[tag]) throw new Error("Bu tag zaten var.");
  resolved.meta.refs.tags[tag] = resolved.sha;
  const release = {
    id:crypto.randomUUID(),
    tag,
    name:input.name.trim().slice(0,220) || tag,
    ref:input.ref,
    commitSha:resolved.sha,
    notes:input.notes.trim().slice(0,20_000),
    createdBy:input.actorEmail,
    createdAt:new Date().toISOString(),
  };
  resolved.meta.releases.push(release);
  resolved.meta.updatedAt = release.createdAt;
  await putJson(metaKey(input.repoId),resolved.meta);
  return release;
}

export async function embeddedRepoServiceRead(pathname: string) {
  const url = new URL(pathname,"https://core-repo.internal");
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "v1" || parts[1] !== "repositories" || !parts[2]) {
    return { ok:false as const,error:"Unknown embedded Repo Service route.",status:404 };
  }
  const repoId = decodeURIComponent(parts[2]);
  const resource = parts[3] || "";
  try {
    if (resource === "branches") {
      return { ok:true as const,data:{ branches:await listEmbeddedRepoBranches(repoId) } };
    }
    if (resource === "tree") {
      return { ok:true as const,data:{ entries:await listEmbeddedRepoTree(
        repoId,url.searchParams.get("ref") || "main",url.searchParams.get("path") || ""
      ) } };
    }
    if (resource === "blob") {
      return { ok:true as const,data:await getEmbeddedRepoBlob(
        repoId,url.searchParams.get("ref") || "main",url.searchParams.get("path") || ""
      ) };
    }
    if (resource === "commits") {
      return { ok:true as const,data:{ commits:await listEmbeddedRepoCommits(
        repoId,url.searchParams.get("ref") || "main",Number(url.searchParams.get("limit") || 30)
      ) } };
    }
    if (resource === "manifests") {
      return { ok:true as const,data:{ manifests:await listEmbeddedRepoManifests(
        repoId,url.searchParams.get("ref") || "main"
      ) } };
    }
    if (resource === "compare") {
      return { ok:true as const,data:await compareEmbeddedRepo(
        repoId,url.searchParams.get("base") || "main",url.searchParams.get("head") || "main"
      ) };
    }
    if (resource === "diff") {
      return { ok:true as const,data:await diffEmbeddedRepo(
        repoId,url.searchParams.get("base") || "main",url.searchParams.get("head") || "main",
        url.searchParams.get("path") || undefined
      ) };
    }
    if (resource === "releases") {
      return { ok:true as const,data:{ releases:await listEmbeddedRepoReleases(repoId) } };
    }
    return { ok:false as const,error:"Unknown embedded Repo Service resource.",status:404 };
  } catch (error) {
    return {
      ok:false as const,
      error:error instanceof Error ? error.message : "Embedded Repo Service error.",
      status:400,
    };
  }
}
