import { env } from "cloudflare:workers";

function database() {
  if (!env.DB) throw new Error("Portal database binding is not available.");
  return env.DB;
}

export type MobilePlatform = "android" | "ios" | "pwa" | "web" | "unknown";

export async function registerPortalMobileDevice(input: {
  memberId: string;
  installId: string;
  platform: MobilePlatform;
  appVersion: string;
  deviceLabel: string;
  lastPath: string;
  pushProvider?: string | null;
  pushToken?: string | null;
}) {
  const installId = input.installId.trim().slice(0, 160);
  if (!installId) throw new Error("Mobil kurulum kimliği gerekli.");

  const id = crypto.randomUUID();
  await database().prepare(
    "INSERT INTO portal_mobile_devices " +
    "(id,member_id,install_id,platform,app_version,device_label,push_provider,push_token,last_path,last_seen_at,updated_at) " +
    "VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) " +
    "ON CONFLICT(install_id) DO UPDATE SET " +
    "member_id=excluded.member_id,platform=excluded.platform,app_version=excluded.app_version," +
    "device_label=excluded.device_label,push_provider=COALESCE(excluded.push_provider,portal_mobile_devices.push_provider)," +
    "push_token=COALESCE(excluded.push_token,portal_mobile_devices.push_token),last_path=excluded.last_path," +
    "last_seen_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP"
  ).bind(
    id,
    input.memberId,
    installId,
    input.platform,
    input.appVersion.trim().slice(0, 40),
    input.deviceLabel.trim().slice(0, 120),
    input.pushProvider?.trim().slice(0, 30) || null,
    input.pushToken?.trim().slice(0, 512) || null,
    input.lastPath.startsWith("/portal") ? input.lastPath.slice(0, 500) : "/portal"
  ).run();

  return database().prepare(
    "SELECT id,install_id,platform,app_version,device_label,trusted_state,biometric_enabled,last_path,last_seen_at,created_at " +
    "FROM portal_mobile_devices WHERE install_id=? AND member_id=? LIMIT 1"
  ).bind(installId,input.memberId).first<Record<string, unknown>>();
}

export async function listPortalMobileDevices(memberId: string) {
  try {
    const response = await database().prepare(
      "SELECT id,install_id,platform,app_version,device_label,trusted_state,biometric_enabled,last_path,last_seen_at,created_at " +
      "FROM portal_mobile_devices WHERE member_id=? ORDER BY datetime(last_seen_at) DESC LIMIT 50"
    ).bind(memberId).all<Record<string, unknown>>();
    return response.results ?? [];
  } catch {
    return [];
  }
}

export async function setPortalMobileDeviceTrust(input: {
  memberId: string;
  deviceId: string;
  trustedState: "pending" | "trusted" | "revoked";
}) {
  if (input.trustedState === "revoked") {
    await database().prepare(
      "UPDATE portal_mobile_devices SET trusted_state='revoked',push_provider=NULL,push_token=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND member_id=?"
    ).bind(input.deviceId,input.memberId).run();
    return;
  }
  await database().prepare(
    "UPDATE portal_mobile_devices SET trusted_state=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND member_id=?"
  ).bind(input.trustedState,input.deviceId,input.memberId).run();
}

export function portalMobilePublicConfig() {
  const baseUrl = String(env.PORTAL_BASE_URL || "https://ytucore.com").replace(/\/$/,"");
  return {
    appScheme: String(env.PORTAL_MOBILE_APP_SCHEME || "ytucore").replace(/[^a-z0-9+.-]/gi,"") || "ytucore",
    androidPackage: String(env.PORTAL_ANDROID_PACKAGE || "com.ytucore.portal"),
    iosBundleId: String(env.PORTAL_IOS_BUNDLE_ID || "com.ytucore.portal"),
    appStoreUrl: String(env.PORTAL_IOS_APP_STORE_URL || "").trim(),
    playStoreUrl: String(env.PORTAL_ANDROID_PLAY_STORE_URL || "").trim(),
    appVersion: String(env.PORTAL_MOBILE_APP_VERSION || "0.1.0"),
    handoffEnabled: String(env.PORTAL_MOBILE_HANDOFF_ENABLED || "false").toLowerCase() === "true",
    pushEnabled: String(env.PORTAL_PUSH_ENABLED || "false").toLowerCase() === "true",
    baseUrl,
  };
}
