"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

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

function installId() {
  const key = "core_mobile_install_id";
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
      document.documentElement.dataset.coreNative = isNative ? "native" : "pwa";
      void promote.then(async () => {
        const platform = isNative
          ? Capacitor.getPlatform()
          : "pwa";
        await fetch("/api/portal/mobile/register", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            installId: installId(),
            platform,
            appVersion: config.appVersion,
            deviceLabel: (navigator.platform || "CORE device") + " · " + navigator.userAgent.slice(0,90),
            lastPath: currentPortalPath(),
          }),
        }).catch(() => undefined);
      });
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
      };
    }

    return () => {
      if (deepLinkHandle) void deepLinkHandle.remove();
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
