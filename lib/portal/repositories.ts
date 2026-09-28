import { env } from "cloudflare:workers";
import { uploadPortalFile } from "@/lib/portal/files";

function database() {
  if (!env.DB) throw new Error("DB bağlantısı kullanılamıyor.");
  return env.DB;
}

function languageForPath(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const map: Record<string,string> = {
    c:"C",h:"C/C++ Header",cpp:"C++",hpp:"C++ Header",cc:"C++",
    cs:"C#",py:"Python",js:"JavaScript",jsx:"JavaScript",
    ts:"TypeScript",tsx:"TypeScript",java:"Java",kt:"Kotlin",
    rs:"Rust",go:"Go",sh:"Shell",ino:"Arduino",json:"JSON",
    yaml:"YAML",yml:"YAML",toml:"TOML",xml:"XML",md:"Markdown",
    html:"HTML",css:"CSS",sql:"SQL",cmake:"CMake"
  };
  return map[ext] || ext.toUpperCase() || "TEXT";
}

function safeRepoPath(value: string) {
  const path = value.replace(/\\/g,"/").replace(/^\/+/,"").replace(/\/+/g,"/").trim();
  if (!path || path.includes("..")) throw new Error("Geçersiz repo dosya yolu.");
  return path.slice(0,400);
}

export async function getPortalRepositoryWorkspace(repositoryId: string, branch = "main") {
  const db = database();
  const repository = await db.prepare(
    "SELECT * FROM portal_repositories WHERE id=? LIMIT 1"
  ).bind(repositoryId).first<Record<string,unknown>>();
  if (!repository) return null;

  const commit = await db.prepare(
    "SELECT c.*,m.full_name AS author_name,m.email AS author_email FROM portal_repo_commits c LEFT JOIN portal_members m ON m.id=c.author_id WHERE c.repository_id=? AND c.branch=? ORDER BY c.created_at DESC LIMIT 1"
  ).bind(repositoryId,branch).first<Record<string,unknown>>();

  let files: Record<string,unknown>[] = [];
  if (commit) {
    const result = await db.prepare(
      "SELECT rf.id,rf.path,rf.language,rf.file_id,f.name,f.mime_type,f.extension,f.size_bytes,f.preview_kind,f.updated_at " +
      "FROM portal_repo_files rf JOIN portal_files f ON f.id=rf.file_id WHERE rf.repository_id=? AND rf.commit_id=? ORDER BY rf.path"
    ).bind(repositoryId,String(commit.id)).all<Record<string,unknown>>();
    files = result.results ?? [];
  }

  const history = await db.prepare(
    "SELECT c.id,c.parent_id,c.branch,c.message,c.created_at,m.full_name AS author_name,m.email AS author_email " +
    "FROM portal_repo_commits c LEFT JOIN portal_members m ON m.id=c.author_id WHERE c.repository_id=? AND c.branch=? ORDER BY c.created_at DESC LIMIT 50"
  ).bind(repositoryId,branch).all<Record<string,unknown>>();

  return { repository, commit, files, history: history.results ?? [] };
}

export async function getPortalRepositoryFile(repositoryId: string, path: string, branch = "main") {
  const workspace = await getPortalRepositoryWorkspace(repositoryId,branch);
  if (!workspace?.commit) return null;
  const clean = safeRepoPath(path);
  return database().prepare(
    "SELECT rf.*,f.name,f.mime_type,f.extension,f.size_bytes,f.preview_kind,f.object_key " +
    "FROM portal_repo_files rf JOIN portal_files f ON f.id=rf.file_id WHERE rf.repository_id=? AND rf.commit_id=? AND rf.path=? LIMIT 1"
  ).bind(repositoryId,String(workspace.commit.id),clean).first<Record<string,unknown>>();
}

async function createCommitSnapshot(input: {
  repositoryId: string;
  branch: string;
  path: string;
  fileId: string;
  message: string;
  memberId: string;
  actorEmail: string;
}) {
  const db = database();
  const latest = await db.prepare(
    "SELECT id FROM portal_repo_commits WHERE repository_id=? AND branch=? ORDER BY created_at DESC LIMIT 1"
  ).bind(input.repositoryId,input.branch).first<{id:string}>();

  const commitId = crypto.randomUUID();
  const statements = [
    db.prepare(
      "INSERT INTO portal_repo_commits (id,repository_id,parent_id,branch,message,author_id) VALUES (?,?,?,?,?,?)"
    ).bind(commitId,input.repositoryId,latest?.id ?? null,input.branch,input.message,input.memberId),
  ];

  if (latest?.id) {
    statements.push(
      db.prepare(
        "INSERT INTO portal_repo_files (id,repository_id,path,commit_id,file_id,language) " +
        "SELECT lower(hex(randomblob(16))),repository_id,path,?,file_id,language FROM portal_repo_files " +
        "WHERE repository_id=? AND commit_id=? AND path<>?"
      ).bind(commitId,input.repositoryId,latest.id,input.path)
    );
  }

  statements.push(
    db.prepare(
      "INSERT INTO portal_repo_files (id,repository_id,path,commit_id,file_id,language) VALUES (?,?,?,?,?,?)"
    ).bind(crypto.randomUUID(),input.repositoryId,input.path,commitId,input.fileId,languageForPath(input.path))
  );
  statements.push(
    db.prepare(
      "UPDATE portal_repositories SET provider='core',repo_url=?,health='healthy',last_sync_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind("core://repo/"+input.repositoryId,input.repositoryId)
  );
  statements.push(
    db.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'repository.commit','repository',?,?)"
    ).bind(input.actorEmail,input.repositoryId,JSON.stringify({ commitId,path:input.path,message:input.message }))
  );

  await db.batch(statements);
  return commitId;
}

export async function commitPortalRepositoryFile(input: {
  repositoryId: string;
  path: string;
  file: File;
  message: string;
  memberId: string;
  actorEmail: string;
  branch?: string;
}) {
  const db = database();
  const repository = await db.prepare(
    "SELECT id,project_slug,team_code FROM portal_repositories WHERE id=? LIMIT 1"
  ).bind(input.repositoryId).first<{id:string;project_slug:string|null;team_code:string|null}>();
  if (!repository) throw new Error("Repo bulunamadı.");

  const path = safeRepoPath(input.path || input.file.name);
  const stored = await uploadPortalFile({
    file: input.file,
    memberId: input.memberId,
    kind: "code",
    projectSlug: repository.project_slug,
    teamCode: repository.team_code,
    note: input.message || "Repo commit",
  });

  return createCommitSnapshot({
    repositoryId:input.repositoryId,
    branch:input.branch || "main",
    path,
    fileId:stored.id,
    message:input.message || "Update " + path,
    memberId:input.memberId,
    actorEmail:input.actorEmail,
  });
}

export async function commitPortalRepositoryText(input: {
  repositoryId: string;
  path: string;
  content: string;
  message: string;
  memberId: string;
  actorEmail: string;
  branch?: string;
}) {
  const path = safeRepoPath(input.path);
  const name = path.split("/").pop() || "file.txt";
  const file = new File([input.content],name,{type:"text/plain;charset=utf-8"});
  return commitPortalRepositoryFile({
    repositoryId:input.repositoryId,
    path,
    file,
    message:input.message,
    memberId:input.memberId,
    actorEmail:input.actorEmail,
    branch:input.branch,
  });
}

export async function deletePortalRepositoryPath(input: {
  repositoryId: string;
  path: string;
  message: string;
  memberId: string;
  actorEmail: string;
  branch?: string;
}) {
  const db = database();
  const branch = input.branch || "main";
  const path = safeRepoPath(input.path);
  const latest = await db.prepare(
    "SELECT id FROM portal_repo_commits WHERE repository_id=? AND branch=? ORDER BY created_at DESC LIMIT 1"
  ).bind(input.repositoryId,branch).first<{id:string}>();
  if (!latest) throw new Error("Silinecek repo snapshot'ı yok.");

  const commitId=crypto.randomUUID();
  await db.batch([
    db.prepare("INSERT INTO portal_repo_commits (id,repository_id,parent_id,branch,message,author_id) VALUES (?,?,?,?,?,?)")
      .bind(commitId,input.repositoryId,latest.id,branch,input.message || "Delete "+path,input.memberId),
    db.prepare(
      "INSERT INTO portal_repo_files (id,repository_id,path,commit_id,file_id,language) " +
      "SELECT lower(hex(randomblob(16))),repository_id,path,?,file_id,language FROM portal_repo_files " +
      "WHERE repository_id=? AND commit_id=? AND path<>?"
    ).bind(commitId,input.repositoryId,latest.id,path),
    db.prepare("UPDATE portal_repositories SET provider='core',repo_url=?,health='healthy',last_sync_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind("core://repo/"+input.repositoryId,input.repositoryId),
    db.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'repository.delete','repository',?,?)")
      .bind(input.actorEmail,input.repositoryId,JSON.stringify({commitId,path})),
  ]);
}
