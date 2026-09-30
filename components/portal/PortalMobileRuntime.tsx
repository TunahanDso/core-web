"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Preferences } from "@capacitor/preferences";
import { PushNotifications } from "@capacitor/push-notifications";

type MobileConfig = {
  appScheme: string;
  androidPackage: string;
  iosBundleId: string;
  appStoreUrl: string;
  playStoreUrl: string;
  appVersion: string;
  handoffEnabled: boolean;
  baseUrl: string;
};

function currentPortalPath() {
  if (typeof window === "undefined") return "/portal";
  const path = window.location.pathname + window.location.search + window.location.hash;
  return path.startsWith("/portal") ? path : "/portal";
}

function standalonePwa() {
  if (typeof window === "undefined") return false;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
}

async function installId() {
  const key = "core_mobile_install_id";

  if (Capacitor.isNativePlatform()) {
    try {
      const existing = await Preferences.get({ key });
      if (existing.value) return existing.value;
      const next = crypto.randomUUID();
      await Preferences.set({ key, value: next });
      return next;
    } catch {
      // Fall through to the web storage compatibility path.
    }
  }

  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const next = crypto.randomUUID();
    localStorage.setItem(key,next);
    return next;
  } catch {
    return crypto.randomUUID();
  }
}

async function registerMobilePresence(
  config: MobileConfig,
  push?: { provider: string; token: string }
) {
  const platform = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : "pwa";
  await fetch("/api/portal/mobile/register", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      installId: await installId(),
      platform,
      appVersion: config.appVersion,
      deviceLabel: (navigator.platform || "CORE device") + " · " + navigator.userAgent.slice(0,90),
      lastPath: currentPortalPath(),
      pushProvider: push?.provider || null,
      pushToken: push?.token || null,
    }),
  });
}

function pushTarget(data: Record<string, unknown>, config: MobileConfig) {
  const raw = String(data.path || data.href || data.url || "").trim();
  if (raw.startsWith("/portal")) return raw;
  return raw ? safePortalTarget(raw,config) : null;
}

function safePortalTarget(url: string, config: MobileConfig) {
  try {
    const parsed = new URL(url);
    const base = new URL(config.baseUrl);

    if (parsed.protocol === config.appScheme + ":") {
      const requested = parsed.searchParams.get("path") || "/portal";
      return requested.startsWith("/portal") ? requested : "/portal";
    }

    if (parsed.protocol === "https:" && parsed.host === base.host && parsed.pathname.startsWith("/portal")) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {
    return null;
  }
  return null;
}

export default function PortalMobileRuntime({ config }: { config: MobileConfig }) {
  const pathname = usePathname();

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    const isStandalone = standalonePwa();

    // Existing path-scoped sessions are promoted before authenticated API calls.
    const promote = fetch("/portal/session-upgrade", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    }).catch(() => null);

    if (isNative || isStandalone) {
      document.documentElement.dataset.coreNative = isNative ? "native-v2" : "pwa";
      void promote.then(async () => {
        await registerMobilePresence(config).catch(() => undefined);
      });
    }

    const pushHandles: Array<{ remove: () => Promise<void> }> = [];

    if (isNative && Capacitor.isPluginAvailable("PushNotifications")) {
      void PushNotifications.addListener("registration", (token) => {
        const provider = Capacitor.getPlatform() === "ios" ? "apns" : "fcm";
        void registerMobilePresence(config,{ provider, token: token.value }).catch(() => undefined);
        window.dispatchEvent(new CustomEvent("core:push-status",{detail:{state:"registered"}}));
      }).then((handle) => pushHandles.push(handle));

      void PushNotifications.addListener("registrationError", () => {
        window.dispatchEvent(new CustomEvent("core:push-status",{detail:{state:"error"}}));
      }).then((handle) => pushHandles.push(handle));

      void PushNotifications.addListener("pushNotificationReceived", () => {
        window.dispatchEvent(new CustomEvent("core:push-status",{detail:{state:"received"}}));
      }).then((handle) => pushHandles.push(handle));

      void PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const data = (action.notification.data || {}) as Record<string, unknown>;
        const target = pushTarget(data,config);
        if (!target) return;
        const url = new URL(target,window.location.origin);
        url.searchParams.set("native","1");
        window.location.assign(url.pathname + url.search + url.hash);
      }).then((handle) => pushHandles.push(handle));

      const optIn = async () => {
        try {
          const permission = await PushNotifications.requestPermissions();
          if (permission.receive !== "granted") {
            window.dispatchEvent(new CustomEvent("core:push-status",{detail:{state:"denied"}}));
            return;
          }
          await Preferences.set({key:"core_push_opt_in",value:"1"});
          window.dispatchEvent(new CustomEvent("core:push-status",{detail:{state:"registering"}}));
          await PushNotifications.register();
        } catch {
          window.dispatchEvent(new CustomEvent("core:push-status",{detail:{state:"error"}}));
        }
      };

      const optInListener = () => { void optIn(); };
      window.addEventListener("core:push-opt-in",optInListener);

      void Preferences.get({key:"core_push_opt_in"}).then(async(result)=>{
        if(result.value!=="1") {
          window.dispatchEvent(new CustomEvent("core:push-status",{detail:{state:"idle"}}));
          return;
        }
        const permission=await PushNotifications.checkPermissions();
        if(permission.receive==="granted") {
          window.dispatchEvent(new CustomEvent("core:push-status",{detail:{state:"registering"}}));
          await PushNotifications.register();
        } else {
          window.dispatchEvent(new CustomEvent("core:push-status",{detail:{state:"denied"}}));
        }
      }).catch(()=>undefined);

      pushHandles.push({ remove: async () => { window.removeEventListener("core:push-opt-in",optInListener); } });
    }

    let deepLinkHandle: { remove: () => Promise<void> } | null = null;
    if (isNative) {
      void App.addListener("appUrlOpen", (event) => {
        const target = safePortalTarget(event.url, config);
        if (!target) return;
        const url = new URL(target, window.location.origin);
        url.searchParams.set("native","1");
        window.location.assign(url.pathname + url.search + url.hash);
      }).then((handle) => { deepLinkHandle = handle; });
    }

    return () => {
      if (deepLinkHandle) void deepLinkHandle.remove();
      for (const handle of pushHandles) void handle.remove();
    };
  }, [config, pathname]);

  // Browsing the portal must never launch a custom URL scheme. App launch is
  // an explicit link on the Devices page; installed apps still receive links above.
  return null;
}
