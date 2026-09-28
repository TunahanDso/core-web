import type { Metadata, Viewport } from "next";
import PortalShell from "@/components/portal/PortalShell";
import PortalPwaClient from "@/components/portal/PortalPwaClient";
import PortalMobileRuntime from "@/components/portal/PortalMobileRuntime";
import { portalMobilePublicConfig } from "@/lib/portal/mobile";
import { requirePortalMember } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "YTÜ CORE Portal",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/portal-icon.svg",
    apple: "/portal-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#ff6500",
  viewportFit: "cover",
};

export default async function PortalMemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await requirePortalMember();
  const mobileConfig = portalMobilePublicConfig();
  return (
    <PortalShell member={member}>
      {children}
      <PortalPwaClient />
      <PortalMobileRuntime config={mobileConfig} />
    </PortalShell>
  );
}
