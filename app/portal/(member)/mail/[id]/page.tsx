import { redirect } from "next/navigation";

export default async function PortalLegacyMailThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect("/portal/mail?thread=" + encodeURIComponent(decodeURIComponent(id)));
}
