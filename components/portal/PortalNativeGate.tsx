"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";

type NativeGateProps = {
  memberName: string;
  memberRole: string;
  portalRole: string;
  canControl: boolean;
  memberInitials: string;
};

type NativeComponent = ComponentType<NativeGateProps>;

export default function PortalNativeGate(props: NativeGateProps) {
  const [NativeExperience,setNativeExperience] = useState<NativeComponent | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import("@capacitor/core")
      .then(({ Capacitor }) => {
        if (!Capacitor.isNativePlatform()) return null;
        return import("@/components/portal/PortalNativeExperience");
      })
      .then((module) => {
        if (!cancelled && module) setNativeExperience(() => module.default);
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, []);

  return NativeExperience ? <NativeExperience {...props} /> : null;
}
