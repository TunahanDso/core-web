import { notFound } from "next/navigation";
import { getAdminIdentity } from "@/lib/cms/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getAdminIdentity();

  // /admin is an Access-only control plane. If Access is missing, invalid,
  // or not configured, fail closed instead of exposing a read-only admin UI.
  if (!identity.authenticated) notFound();

  return children;
}
