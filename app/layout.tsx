import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "YTÜ CORE",
  description: "Autonomous systems, engineering and research.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "CORE Portal",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111317",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const locale = requestHeaders.get("x-core-locale") === "en" ? "en" : "tr";

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
