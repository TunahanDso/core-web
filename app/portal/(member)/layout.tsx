import PortalShell from "@/components/portal/PortalShell";
import { requirePortalMember } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

export default async function PortalMemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await requirePortalMember();
  return <PortalShell member={member}>{children}</PortalShell>;
}
