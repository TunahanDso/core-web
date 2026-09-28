import PortalPwaRuntime from "@/components/portal/PortalPwaRuntime";

export default function PortalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <PortalPwaRuntime />
    </>
  );
}
