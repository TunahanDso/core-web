import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import CoreRum from "@/components/analytics/CoreRum";

export const metadata: Metadata = {
  title: "YTÜ CORE",
  description: "Autonomous systems, engineering and research.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const locale = requestHeaders.get("x-core-locale") === "en" ? "en" : "tr";

  return (
    <html lang={locale} suppressHydrationWarning>
      <head><script src="/portal-preferences.js" /></head>
      <body>{children}<CoreRum /></body>
    </html>
  );
}
