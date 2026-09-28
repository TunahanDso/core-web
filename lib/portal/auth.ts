import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

const SESSION_COOKIE = "core_portal_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
// Cloudflare Workers WebCrypto currently rejects PBKDF2 iteration counts above 100,000.
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_SCHEME = "pbkdf2-sha256-v1";

export type PortalRole = "admin" | "lead" | "member" | "alumni" | "viewer";

export type PortalMember = {
  id: string;
  email: string;
  fullName: string;
  role: PortalRole;
  status: "invited" | "active" | "suspended" | "archived";
  teams: string[];
  activatedAt: string | null;
  lastLoginAt: string | null;
};

type PortalMemberRow = {
  id: string;
  email: string;
  full_name: string;
  role: PortalRole;
  status: PortalMember["status"];
  teams_json: string;
  activated_at: string | null;
  last_login_at: string | null;
};

function database() {
  if (!env.DB) throw new Error("DB bağlantısı kullanılamıyor.");
  return env.DB;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  const clean = value.toLowerCase();
  if (clean.length % 2 !== 0 || !/^[0-9a-f]+$/.test(clean)) {
    throw new Error("Geçersiz hex değeri.");
  }
  const output = new Uint8Array(clean.length / 2);
  for (let index = 0; index < clean.length; index += 2) {
    output[index / 2] = Number.parseInt(clean.slice(index, index + 2), 16);
  }
  return output;
}

function randomHex(bytes: number) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return bytesToHex(data);
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function rowToMember(row: PortalMemberRow): PortalMember {
  let teams: string[] = [];
  try {
    const parsed = JSON.parse(row.teams_json || "[]");
    if (Array.isArray(parsed)) teams = parsed.filter((item): item is string => typeof item === "string");
  } catch {
    teams = [];
  }
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    status: row.status,
    teams,
    activatedAt: row.activated_at,
    lastLoginAt: row.last_login_at,
  };
}

export function normalizePortalEmail(value: string) {
  return value.trim().toLowerCase();
}

export function allowedPortalDomains() {
  const configured = typeof env.PORTAL_ALLOWED_EMAIL_DOMAINS === "string"
    ? env.PORTAL_ALLOWED_EMAIL_DOMAINS
    : "std.yildiz.edu.tr";
  return configured.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

export function isAllowedPortalEmail(email: string) {
  const normalized = normalizePortalEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return false;
  return allowedPortalDomains().includes(normalized.slice(at + 1));
}

export function normalizeInviteCode(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function generatePortalInviteCode() {
  const raw = randomHex(12).toUpperCase();
  const groups = raw.match(/.{1,4}/g) || [raw];
  return "CORE-" + groups.join("-");
}

export async function hashPortalInviteCode(email: string, code: string) {
  return sha256Hex(normalizePortalEmail(email) + ":" + normalizeInviteCode(code));
}

export async function hashPortalPassword(password: string) {
  if (password.length < 10) throw new Error("Parola en az 10 karakter olmalı.");

  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    256
  );

  return [PBKDF2_SCHEME, String(PBKDF2_ITERATIONS), bytesToHex(salt), bytesToHex(new Uint8Array(derived))].join("$");
}

export async function verifyPortalPassword(password: string, stored: string) {
  const parts = stored.split("$");
  const algorithm = parts[0];
  const iterations = Number(parts[1]);
  const saltHex = parts[2];
  const expectedHex = parts[3];

  const supportedScheme =
    algorithm === PBKDF2_SCHEME ||
    algorithm === "pbkdf2-sha256";

  if (
    !supportedScheme ||
    !Number.isInteger(iterations) ||
    iterations < 100000 ||
    iterations > PBKDF2_ITERATIONS ||
    !saltHex ||
    !expectedHex
  ) {
    return false;
  }

  try {
    const salt = hexToBytes(saltHex);
    const expected = hexToBytes(expectedHex);
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const derived = new Uint8Array(await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations },
      keyMaterial,
      expected.length * 8
    ));
    return derived.length === expected.length && timingSafeEqual(Buffer.from(derived), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function createPortalSession(memberId: string) {
  const token = randomHex(32);
  const sessionHash = await sha256Hex(token);
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();

  await database()
    .prepare("INSERT INTO portal_sessions (id,member_id,session_hash,expires_at) VALUES (?,?,?,?)")
    .bind(sessionId, memberId, sessionHash, expiresAt)
    .run();

  const jar = await cookies();
  // Clear the legacy path-scoped cookie before issuing the API-compatible root cookie.
  for (const path of ["/", "/portal"]) {
    jar.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path,
      maxAge: 0,
    });
  }
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearPortalSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token && env.DB) {
    const hash = await sha256Hex(token);
    await env.DB.prepare("DELETE FROM portal_sessions WHERE session_hash = ?").bind(hash).run();
  }

  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/portal",
    maxAge: 0,
  });
}

export async function getPortalMember(): Promise<PortalMember | null> {
  if (!env.DB) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const hash = await sha256Hex(token);
  try {
    const row = await env.DB
      .prepare("SELECT m.id,m.email,m.full_name,m.role,m.status,m.teams_json,m.activated_at,m.last_login_at FROM portal_sessions s JOIN portal_members m ON m.id=s.member_id WHERE s.session_hash=? AND datetime(s.expires_at)>datetime('now') AND m.status='active' LIMIT 1")
      .bind(hash)
      .first<PortalMemberRow>();
    return row ? rowToMember(row) : null;
  } catch {
    return null;
  }
}

export async function requirePortalMember() {
  const member = await getPortalMember();
  if (!member) redirect("/portal/login");
  return member;
}

export async function requirePortalRole(allowed: PortalRole[]) {
  const member = await requirePortalMember();
  if (!allowed.includes(member.role)) throw new Error("Portal rolünüz bu işleme izin vermiyor.");
  return member;
}

export async function activatePortalMember(email: string, inviteCode: string, password: string) {
  const db = database();
  const normalizedEmail = normalizePortalEmail(email);

  if (!isAllowedPortalEmail(normalizedEmail)) {
    throw new Error("Onaylı bir Yıldız Teknik Üniversitesi öğrenci e-postası kullanın.");
  }

  const codeHash = await hashPortalInviteCode(normalizedEmail, inviteCode);
  const record = await db
    .prepare("SELECT i.id AS invite_id,i.member_id,m.status FROM portal_invites i JOIN portal_members m ON m.id=i.member_id WHERE i.email=? AND i.code_hash=? AND i.used_at IS NULL AND datetime(i.expires_at)>datetime('now') AND m.status='invited' LIMIT 1")
    .bind(normalizedEmail, codeHash)
    .first<{ invite_id: string; member_id: string; status: string }>();

  if (!record) throw new Error("Davet kodu geçersiz, süresi dolmuş veya daha önce kullanılmış.");

  const passwordHash = await hashPortalPassword(password);

  await db.batch([
    db.prepare("UPDATE portal_members SET password_hash=?,status='active',activated_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,failed_login_count=0,locked_until=NULL WHERE id=?").bind(passwordHash, record.member_id),
    db.prepare("UPDATE portal_invites SET used_at=CURRENT_TIMESTAMP WHERE id=?").bind(record.invite_id),
    db.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'member.activate','member',?,'{}')").bind(normalizedEmail, record.member_id),
  ]);

  await createPortalSession(record.member_id);
}

export async function loginPortalMember(email: string, password: string) {
  const db = database();
  const normalizedEmail = normalizePortalEmail(email);

  const row = await db
    .prepare("SELECT id,email,full_name,role,status,teams_json,password_hash,failed_login_count,locked_until,activated_at,last_login_at FROM portal_members WHERE email=? LIMIT 1")
    .bind(normalizedEmail)
    .first<PortalMemberRow & { password_hash: string | null; failed_login_count: number; locked_until: string | null }>();

  if (!row || row.status !== "active" || !row.password_hash) {
    throw new Error("E-posta veya parola hatalı.");
  }

  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    throw new Error("Hesap geçici olarak kilitlendi. Daha sonra tekrar deneyin.");
  }

  const valid = await verifyPortalPassword(password, row.password_hash);

  if (!valid) {
    const failures = Number(row.failed_login_count || 0) + 1;
    const lock = failures >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
    await db
      .prepare("UPDATE portal_members SET failed_login_count=?,locked_until=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(lock ? 0 : failures, lock, row.id)
      .run();
    throw new Error("E-posta veya parola hatalı.");
  }

  await db.batch([
    db.prepare("UPDATE portal_members SET failed_login_count=0,locked_until=NULL,last_login_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.id),
    db.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'member.login','member',?,'{}')").bind(normalizedEmail, row.id),
  ]);

  await createPortalSession(row.id);
  return rowToMember(row);
}


export async function promoteLegacyPortalSessionCookie() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || !env.DB) return false;

  const hash = await sha256Hex(token);
  const valid = await env.DB.prepare(
    "SELECT 1 AS ok FROM portal_sessions s JOIN portal_members m ON m.id=s.member_id " +
    "WHERE s.session_hash=? AND datetime(s.expires_at)>datetime('now') AND m.status='active' LIMIT 1"
  ).bind(hash).first<{ ok: number }>();
  if (!valid) return false;

  // Writing a root-scoped cookie makes authenticated /api/portal routes available
  // without invalidating the existing D1 session token.
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return true;
}
