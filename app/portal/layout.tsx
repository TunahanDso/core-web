import "@/app/workspace.css";
import PortalMobileRuntime from "@/components/portal/PortalMobileRuntime";
import { portalMobilePublicConfig } from "@/lib/portal/mobile";


export default function PortalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mobileConfig = portalMobilePublicConfig();
  return (
    <>
      {children}
      <PortalMobileRuntime config={mobileConfig} />
    </>
  );
}
