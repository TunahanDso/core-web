import type { Metadata, Viewport } from "next";
import PortalShell from "@/components/portal/PortalShell";
import { portalRoleLabel } from "@/lib/portal/labels";
import { requirePortalMember } from "@/lib/portal/auth";
import { portalMemberCapabilitySet } from "@/lib/portal/governance";
import { portalMobilePublicConfig } from "@/lib/portal/mobile";
import PortalRuntimeLoader from "@/components/portal/PortalRuntimeLoader";


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
  const capabilitySet = await portalMemberCapabilitySet(member);
  const canControl = ["portal.admin","control.projects","control.vehicles","teams.manage","roles.manage"]
    .some((capability) => capabilitySet.has(capability));
  const initials = member.fullName
    ? member.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
    : "CR";
  const mobileConfig = portalMobilePublicConfig();

  return (
    <PortalShell member={member} canControl={canControl}>
      {children}
      <PortalRuntimeLoader
        memberName={member.fullName || member.email}
        memberRole={portalRoleLabel(member.role)}
        portalRole={member.role}
        canControl={canControl}
        memberInitials={initials}
        mobileConfig={mobileConfig}
      />
    </PortalShell>
  );
}
