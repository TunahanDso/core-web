import { PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { getPortalMailThread } from "@/lib/portal/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortalMailThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const member = await requirePortalMember();
  const { id } = await params;
  const data = await getPortalMailThread(decodeURIComponent(id), member.id);
  if (!data) notFound();

  return (
    <>
      <PortalPageHeader code="ML / THREAD" title={String(data.thread.subject)} lead="Durable internal decision and handoff trail." />
      <div className="portalThread">
        {data.messages.map((message) => (
          <article key={String(message.id)}>
            <header><b>{String(message.full_name || message.email)}</b><small>{String(message.created_at)}</small></header>
            <p>{String(message.body)}</p>
          </article>
        ))}
      </div>
      <a className="portalBackLink" href="/portal/mail">← Back to internal mail</a>
    </>
  );
}
