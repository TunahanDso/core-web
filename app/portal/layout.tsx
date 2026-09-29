import PortalMobileRuntimeGate from "@/components/portal/PortalMobileRuntimeGate";
import { portalMobilePublicConfig } from "@/lib/portal/mobile";

export const dynamic = "force-dynamic";

export default function PortalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mobileConfig = portalMobilePublicConfig();
  return (
    <>
      {children}
      <PortalMobileRuntimeGate config={mobileConfig} />
    </>
  );
}
