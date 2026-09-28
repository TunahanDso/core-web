import type { Metadata, Viewport } from "next";
import PortalShell from "@/components/portal/PortalShell";
import PortalPwaClient from "@/components/portal/PortalPwaClient";
import PortalNativeExperience from "@/components/portal/PortalNativeExperience";
import { portalRoleLabel } from "@/lib/portal/labels";
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
  const initials = member.fullName
    ? member.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
    : "CR";

  return (
    <PortalShell member={member}>
      {children}
      <PortalPwaClient />
      <PortalNativeExperience
        memberName={member.fullName || member.email}
        memberRole={portalRoleLabel(member.role)}
        memberInitials={initials}
      />
    </PortalShell>
  );
}
