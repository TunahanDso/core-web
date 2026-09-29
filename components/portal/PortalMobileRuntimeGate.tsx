"use client";

import { useEffect, useState } from "react";

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

type MobileRuntime = React.ComponentType<{ config: MobileConfig }>;

function shouldLoadMobileRuntime() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const mobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const nativeHint = new URLSearchParams(window.location.search).get("native") === "1";
  return mobile || standalone || nativeHint;
}

export default function PortalMobileRuntimeGate({ config }: { config: MobileConfig }) {
  const [Runtime,setRuntime] = useState<MobileRuntime | null>(null);

  useEffect(() => {
    if (!shouldLoadMobileRuntime()) return;
    let cancelled = false;
    void import("@/components/portal/PortalMobileRuntime")
      .then((module) => {
        if (!cancelled) setRuntime(() => module.default);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  return Runtime ? <Runtime config={config} /> : null;
}
