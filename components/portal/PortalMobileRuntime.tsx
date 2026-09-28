"use client";

import { useEffect, useMemo, useState } from "react";
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

function mobileBrowser() {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
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

function deepLink(config: MobileConfig) {
  return config.appScheme + "://portal/open?path=" + encodeURIComponent(currentPortalPath());
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
  const [handoffVisible,setHandoffVisible] = useState(false);
  const [native,setNative] = useState(false);
  const [storeUrl,setStoreUrl] = useState("");

  const schemeUrl = useMemo(() => {
    if (typeof window === "undefined") return config.appScheme + "://portal";
    return deepLink(config);
  }, [config, pathname]);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    const isStandalone = standalonePwa();
    setNative(isNative);

    if (typeof navigator !== "undefined") {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      setStoreUrl(ios ? config.appStoreUrl : config.playStoreUrl);
    }

    // Existing path-scoped sessions are promoted before authenticated API calls.
    const promote = fetch("/portal/session-upgrade", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    }).catch(() => null);

    if (isNative || isStandalone) {
      document.documentElement.dataset.coreNative = isNative ? "native-v2" : "pwa";
      void promote.then(async () => {
        const platform = isNative
          ? Capacitor.getPlatform()
          : "pwa";
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

    if (
      config.handoffEnabled &&
      !isNative &&
      !isStandalone &&
      mobileBrowser() &&
      !new URL(window.location.href).searchParams.has("web") &&
      sessionStorage.getItem("core_mobile_handoff_attempted") !== "1"
    ) {
      sessionStorage.setItem("core_mobile_handoff_attempted","1");
      const timer = window.setTimeout(() => {
        window.location.href = deepLink(config);
        window.setTimeout(() => {
          if (document.visibilityState === "visible") setHandoffVisible(true);
        }, 1100);
      }, 250);

      return () => {
        window.clearTimeout(timer);
        if (deepLinkHandle) void deepLinkHandle.remove();
        for (const handle of pushHandles) void handle.remove();
      };
    }

    return () => {
      if (deepLinkHandle) void deepLinkHandle.remove();
      for (const handle of pushHandles) void handle.remove();
    };
  }, [config, pathname]);

  if (native || !handoffVisible) return null;

  return (
    <div className="portalAppHandoff" role="dialog" aria-modal="true" aria-label="YTÜ CORE mobil uygulama">
      <section>
        <span className="portalAppHandoffKicker">YTÜ CORE · MOBILE</span>
        <h2>Portal uygulamada daha rahat.</h2>
        <p>
          Bu cihazda CORE uygulaması yüklüyse kaldığın portal ekranını uygulamada açacağız.
          Uygulama yoksa tarayıcıda devam edebilir veya mevcut kurulum seçeneğini kullanabilirsin.
        </p>
        <div className="portalAppHandoffActions">
          <a href={schemeUrl} className="primary">UYGULAMAYI AÇ →</a>
          {storeUrl ? <a href={storeUrl} className="store">UYGULAMAYI KUR ↗</a> : null}
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem("core_mobile_handoff_attempted","1");
              setHandoffVisible(false);
              const url = new URL(window.location.href);
              url.searchParams.set("web","1");
              window.history.replaceState(null,"",url.pathname + url.search + url.hash);
            }}
          >
            BU OTURUMDA TARAYICIDA DEVAM ET
          </button>
        </div>
        <small>Otomatik handoff yalnızca mobil tarayıcıda çalışır; PWA ve native uygulama tekrar yönlendirilmez.</small>
      </section>
    </div>
  );
}
