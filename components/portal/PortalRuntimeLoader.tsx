"use client";

import { useEffect, useState, type ComponentType } from "react";

type Counts = {
  tasks: number;
  notifications: number;
  mail: number;
  chat: number;
};

type NativeProps = {
  memberName: string;
  memberRole: string;
  portalRole: string;
  canControl: boolean;
  memberInitials: string;
  counts: Counts;
};

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

type Props = NativeProps & { mobileConfig: MobileConfig };

declare global {
  interface Window {
    Capacitor?: { isNativePlatform?: () => boolean };
    __TAURI_INTERNALS__?: unknown;
  }
}

export default function PortalRuntimeLoader(props: Props) {
  const [NativeExperience,setNativeExperience] = useState<ComponentType<NativeProps> | null>(null);
  const [MobileRuntime,setMobileRuntime] = useState<ComponentType<{ config: MobileConfig }> | null>(null);
  const [DesktopExperience,setDesktopExperience] = useState<ComponentType | null>(null);
  const [PwaClient,setPwaClient] = useState<ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const native = Boolean(window.Capacitor?.isNativePlatform?.());
    const desktop = Boolean(window.__TAURI_INTERNALS__) || params.get("desktop") === "1";
    const mobileBrowser = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

    if (native) {
      void Promise.all([
        import("@/components/portal/PortalNativeExperience"),
        import("@/components/portal/PortalMobileRuntime"),
      ]).then(([nativeModule,mobileModule]) => {
        if (cancelled) return;
        setNativeExperience(() => nativeModule.default);
        setMobileRuntime(() => mobileModule.default);
      });
    } else if (desktop) {
      void import("@/components/portal/PortalDesktopExperience").then((module) => {
        if (!cancelled) setDesktopExperience(() => module.default);
      });
    } else {
      void import("@/components/portal/PortalPwaClient").then((module) => {
        if (!cancelled) setPwaClient(() => module.default);
      });

      if (mobileBrowser) {
        void import("@/components/portal/PortalMobileRuntime").then((module) => {
          if (!cancelled) setMobileRuntime(() => module.default);
        });
      }
    }

    return () => { cancelled = true; };
  }, []);

  return (
    <>
      {DesktopExperience ? <DesktopExperience /> : null}
      {PwaClient ? <PwaClient /> : null}
      {MobileRuntime ? <MobileRuntime config={props.mobileConfig} /> : null}
      {NativeExperience ? (
        <NativeExperience
          memberName={props.memberName}
          memberRole={props.memberRole}
          portalRole={props.portalRole}
          canControl={props.canControl}
          memberInitials={props.memberInitials}
          counts={props.counts}
        />
      ) : null}
    </>
  );
}
