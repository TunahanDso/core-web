import type { Metadata, Viewport } from "next";
import PortalShell from "@/components/portal/PortalShell";
import PortalPwaClient from "@/components/portal/PortalPwaClient";
import PortalNativeExperience from "@/components/portal/PortalNativeExperience";
import PortalDesktopExperience from "@/components/portal/PortalDesktopExperience";
import { portalRoleLabel } from "@/lib/portal/labels";
import { requirePortalMember } from "@/lib/portal/auth";
import { getPortalShellCounts } from "@/lib/portal/db";
import { portalMemberCapabilitySet } from "@/lib/portal/governance";


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
  const [counts, capabilitySet] = await Promise.all([
    getPortalShellCounts(member.id),
    portalMemberCapabilitySet(member),
  ]);
  const canControl = ["portal.admin","control.projects","control.vehicles","teams.manage","roles.manage"]
    .some((capability) => capabilitySet.has(capability));
  const initials = member.fullName
    ? member.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
    : "CR";

  return (
    <PortalShell member={member} canControl={canControl}>
      {children}
      <PortalDesktopExperience />
      <PortalPwaClient />
      <PortalNativeExperience
        memberName={member.fullName || member.email}
        memberRole={portalRoleLabel(member.role)}
        portalRole={member.role}
        canControl={canControl}
        memberInitials={initials}
        counts={counts}
      />
    </PortalShell>
  );
}
