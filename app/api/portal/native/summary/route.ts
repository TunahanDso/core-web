import { getPortalMember } from "@/lib/portal/auth";
import { getPortalMetrics, listPortalChannelsForMember } from "@/lib/portal/db";
import { getPortalMailboxCounts } from "@/lib/portal/mailbox";

export const dynamic = "force-dynamic";

export async function GET() {
  const member = await getPortalMember();
  if (!member) {
    return Response.json({ error:"unauthorized" }, {
      status:401,
      headers:{ "Cache-Control":"no-store, private" },
    });
  }

  const [metrics,mailboxCounts,channels] = await Promise.all([
    getPortalMetrics(member.id),
    getPortalMailboxCounts(member.id),
    listPortalChannelsForMember(member.id),
  ]);
  const chatUnread = channels.reduce(
    (sum,channel) => sum + Number(channel.unread_count || 0),
    0
  );

  return Response.json({
    counts:{
      tasks:metrics.openTasks,
      notifications:metrics.unread,
      mail:mailboxCounts.unread,
      chat:chatUnread,
    },
  }, {
    headers:{ "Cache-Control":"no-store, private" },
  });
}
