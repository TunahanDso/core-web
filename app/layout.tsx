import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

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
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
