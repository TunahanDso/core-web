import { PortalEmpty, PortalPageHeader } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { getPortalMailThread, listPortalMembers } from "@/lib/portal/db";
import { formatVaultBytes, listPortalVaultFiles } from "@/lib/portal/vault";
import {
  getPortalMailboxCounts,
  getPortalMailDraft,
  listPortalMailboxThreads,
  listPortalMailDrafts,
  type PortalMailboxFolder,
} from "@/lib/portal/mailbox";
import {
  createMailboxThreadAction,
  deleteMailboxDraftAction,
  mutateMailboxThreadAction,
  openMailboxThreadAction,
  saveMailboxDraftAction,
} from "@/app/portal/mailbox-actions";

export const dynamic = "force-dynamic";

const folderLabels: Array<[PortalMailboxFolder | "drafts", string, string]> = [
  ["inbox","Gelen","IN"],
  ["starred","Yıldızlı","★"],
  ["sent","Gönderilen","OUT"],
  ["drafts","Taslaklar","DR"],
  ["archive","Arşiv","AR"],
  ["trash","Çöp","TR"],
];

function parseRecipientIds(value: unknown) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export default async function PortalMailPage({
  searchParams,
}: {
  searchParams?: Promise<{
    folder?: string;
    q?: string;
    draft?: string;
    forward?: string;
    saved?: string;
  }>;
}) {
  const member = await requirePortalMember();
  const query = searchParams ? await searchParams : {};
  const folderRaw = String(query.folder || "inbox");
  const folder = folderLabels.some(([value]) => value === folderRaw)
    ? folderRaw as PortalMailboxFolder | "drafts"
    : "inbox";
  const q = String(query.q || "").trim().toLowerCase();

  const [members, counts, drafts, vaultFiles] = await Promise.all([
    listPortalMembers(),
    getPortalMailboxCounts(member.id),
    listPortalMailDrafts(member.id),
    listPortalVaultFiles({ lifecycle: "active", limit: 60, viewer: member }),
  ]);

  const threads = folder === "drafts"
    ? []
    : await listPortalMailboxThreads(member.id, folder);

  let draft = query.draft
    ? await getPortalMailDraft(String(query.draft), member.id)
    : null;

  let forward: Awaited<ReturnType<typeof getPortalMailThread>> = null;
  if (!draft && query.forward) {
    forward = await getPortalMailThread(String(query.forward), member.id);
  }

  const selectedRecipientIds = draft ? parseRecipientIds(draft.recipients_json) : [];
  const composeSubject = draft
    ? String(draft.subject || "")
    : forward
      ? "Fwd: " + String(forward.thread.subject || "")
      : "";
  const composeBody = draft
    ? String(draft.body || "")
    : forward
      ? [
          "",
          "----- İLETİLEN CORE YAZIŞMASI -----",
          ...forward.messages.slice(-8).map((message) =>
            `${String(message.full_name || message.email)} · ${String(message.created_at)}\n${String(message.body)}`
          ),
        ].join("\n\n")
      : "";

  const filteredThreads = q
    ? threads.filter((thread) =>
        [thread.subject,thread.preview,thread.last_author]
          .some((value) => String(value || "").toLowerCase().includes(q))
      )
    : threads;

  const filteredDrafts = q
    ? drafts.filter((item) =>
        [item.subject,item.body].some((value) => String(value || "").toLowerCase().includes(q))
      )
    : drafts;

  const folderCount = (value: string) => {
    if (value === "drafts") return drafts.length;
    if (value === "inbox") return counts.inbox;
    if (value === "starred") return counts.starred;
    if (value === "archive") return counts.archive;
    if (value === "trash") return counts.trash;
    return "";
  };

  return (
    <>
      <PortalPageHeader
        code="ML / CORE MAIL"
        title="İç Mail"
        lead="Kararları, talepleri, teknik devir teslimleri ve proje yazışmalarını sohbetten ayıran kalıcı CORE posta sistemi."
      />

      {query.saved ? <div className="portalSuccess">Taslak kaydedildi.</div> : null}

      <section className="mailboxShell">
        <aside className="mailboxSidebar">
          <a className="mailboxComposeJump" href="#compose">+ YENİ MAIL</a>
          <nav>
            {folderLabels.map(([value,label,code]) => (
              <a
                href={"/portal/mail?folder=" + value}
                className={folder === value ? "active" : ""}
                key={value}
              >
                <span>{code}</span>
                <b>{label}</b>
                <em>{folderCount(value)}</em>
              </a>
            ))}
          </nav>
          <div className="mailboxUnread">
            <span>OKUNMAMIŞ</span>
            <b>{counts.unread}</b>
          </div>
        </aside>

        <div className="mailboxMain">
          <form className="mailboxSearch" action="/portal/mail" method="get">
            <input type="hidden" name="folder" value={folder} />
            <input name="q" defaultValue={String(query.q || "")} placeholder="Konu, mesaj veya gönderen ara..." />
            <button type="submit">ARA</button>
          </form>

          {folder === "drafts" ? (
            filteredDrafts.length ? (
              <div className="mailboxThreadList">
                {filteredDrafts.map((item) => (
                  <article className="draft" key={String(item.id)}>
                    <a href={"/portal/mail?folder=drafts&draft=" + encodeURIComponent(String(item.id)) + "#compose"}>
                      <span className="mailboxThreadState">DR</span>
                      <div>
                        <b>{String(item.subject || "Konusuz taslak")}</b>
                        <p>{String(item.body || "Boş taslak")}</p>
                      </div>
                      <small>{String(item.updated_at)}</small>
                    </a>
                    <form action={deleteMailboxDraftAction}>
                      <input type="hidden" name="draftId" value={String(item.id)} />
                      <button type="submit">SİL</button>
                    </form>
                  </article>
                ))}
              </div>
            ) : <PortalEmpty title="Taslak yok." text="Yeni bir mail yazarken TASLAĞA KAYDET ile daha sonra devam edebilirsin." />
          ) : filteredThreads.length ? (
            <div className="mailboxThreadList">
              {filteredThreads.map((thread) => {
                const isUnread = Number(thread.unread || 0) > 0;
                const isStarred = Number(thread.starred || 0) > 0;
                return (
                  <article className={isUnread ? "unread" : ""} key={String(thread.id)}>
                    <form action={openMailboxThreadAction} className="mailboxOpenThread">
                      <input type="hidden" name="threadId" value={String(thread.id)} />
                      <button type="submit">
                        <span className="mailboxThreadState">{isUnread ? "●" : "○"}</span>
                        <div>
                          <header>
                            <b>{String(thread.subject)}</b>
                            {isStarred ? <em>★</em> : null}
                          </header>
                          <p>{String(thread.preview || "")}</p>
                          <small>{String(thread.last_author || "")} · {String(thread.message_count || 1)} mesaj · {String(thread.participant_count || 1)} kişi</small>
                        </div>
                        <time>{String(thread.updated_at)}</time>
                      </button>
                    </form>
                    <form action={mutateMailboxThreadAction} className="mailboxRowActions">
                      <input type="hidden" name="threadId" value={String(thread.id)} />
                      <input type="hidden" name="returnTo" value={"/portal/mail?folder=" + folder} />
                      <button name="operation" value={isStarred ? "unstar" : "star"} type="submit" title="Yıldız">{isStarred ? "★" : "☆"}</button>
                      {folder === "trash" ? (
                        <button name="operation" value="restore" type="submit">GERİ</button>
                      ) : (
                        <>
                          <button name="operation" value="archive" type="submit">ARŞİV</button>
                          <button name="operation" value="trash" type="submit">ÇÖP</button>
                        </>
                      )}
                    </form>
                  </article>
                );
              })}
            </div>
          ) : <PortalEmpty title="Bu klasör temiz." text="Burada gösterilecek iç yazışma yok." />}
        </div>
      </section>

      <section className="portalPanel portalCreatePanel mailboxCompose" id="compose">
        <div className="portalPanelHead">
          <span>{draft ? "TASLAĞI DÜZENLE" : forward ? "YAZIŞMAYI İLET" : "YENİ MAIL"}</span>
          <small>CORE INTERNAL · KALICI THREAD</small>
        </div>
        <form className="portalMailCompose" action={createMailboxThreadAction}>
          {draft ? <input type="hidden" name="draftId" value={String(draft.id)} /> : null}
          <label><span>Konu</span><input name="subject" defaultValue={composeSubject} required /></label>
          <fieldset>
            <legend>Alıcılar</legend>
            <div className="portalRecipientGrid">
              {members.filter((item) => String(item.status) === "active" && String(item.id) !== member.id).map((item) => (
                <label key={String(item.id)}>
                  <input
                    type="checkbox"
                    name="participantId"
                    value={String(item.id)}
                    defaultChecked={selectedRecipientIds.includes(String(item.id))}
                  />
                  <span>{String(item.full_name || item.email)}</span>
                  <small>{String(item.email)}</small>
                </label>
              ))}
            </div>
          </fieldset>
          <label><span>Mesaj</span><textarea name="body" rows={8} defaultValue={composeBody} required /></label>
          <fieldset>
            <legend>Vault ekleri <small>· mevcut teknik dosyalardan en fazla 12</small></legend>
            <div className="mailboxAttachmentPicker">
              {vaultFiles.length ? vaultFiles.slice(0,30).map((file) => (
                <label key={String(file.id)}>
                  <input type="checkbox" name="vaultFileId" value={String(file.id)} />
                  <span>
                    <b>{String(file.title)}</b>
                    <small>R{String(file.revision)} · {String(file.extension || "FILE").toUpperCase()} · {formatVaultBytes(file.size_bytes)}</small>
                  </span>
                </label>
              )) : <p className="portalMuted">Vault'ta eklenebilir dosya yok.</p>}
            </div>
          </fieldset>
          <div className="mailboxComposeActions">
            <button className="portalPrimaryButton" type="submit">GÖNDER →</button>
            <button className="portalOutlineButton" formAction={saveMailboxDraftAction} formNoValidate type="submit">TASLAĞA KAYDET</button>
          </div>
        </form>
      </section>
    </>
  );
}
