import { notFound } from "next/navigation";
import { getAdminIdentity } from "@/lib/cms/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getAdminIdentity();

  // The CMS is never a public/read-only fallback. Cloudflare Access must be
  // configured and the request must carry a valid Access JWT before any admin
  // route is rendered.
  if (!identity.configured || !identity.authenticated) notFound();

  return children;
}
