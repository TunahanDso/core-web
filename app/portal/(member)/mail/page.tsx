import { PortalEmpty } from "@/components/portal/PortalPage";
import { requirePortalMember } from "@/lib/portal/auth";
import { getPortalMailThread, listPortalMembers } from "@/lib/portal/db";
import { formatVaultBytes, listPortalVaultFiles } from "@/lib/portal/vault";
import {
  getPortalMailboxCounts,
  getPortalMailDraft,
  listPortalMailboxThreads,
  listPortalMailDrafts,
  listPortalMailAttachments,
  listPortalMailParticipants,
  listPortalMailGroups,
  listPortalJoinableMailGroups,
  listPortalMailGroupMembers,
  listPortalMailThreadGroups,
  type PortalMailboxFolder,
} from "@/lib/portal/mailbox";
import {
  createMailboxThreadAction,
  deleteMailboxDraftAction,
  mutateMailboxThreadAction,
  openMailboxThreadAction,
  replyMailboxThreadAction,
  saveMailboxDraftAction,
  createMailboxGroupAction,
  joinMailboxGroupAction,
  deleteMailboxGroupAction,
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

function queryHref(input: Record<string,string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key,value]) => {
    if (value) params.set(key,value);
  });
  const query = params.toString();
  return "/portal/mail" + (query ? "?" + query : "");
}

export default async function PortalMailPage({
  searchParams,
}: {
  searchParams?: Promise<{
    folder?: string;
    q?: string;
    filter?: string;
    thread?: string;
    draft?: string;
    forward?: string;
    compose?: string;
    reply?: string;
    section?: string;
    group?: string;
    groupCreate?: string;
    saved?: string;
    sent?: string;
    replied?: string;
    created?: string;
    joined?: string;
    deleted?: string;
  }>;
}) {
  const member = await requirePortalMember();
  const query = searchParams ? await searchParams : {};
  const folderRaw = String(query.folder || "inbox");
  const folder = folderLabels.some(([value]) => value === folderRaw)
    ? folderRaw as PortalMailboxFolder | "drafts"
    : "inbox";
  const section = String(query.section || "mail") === "groups" ? "groups" : "mail";
  const q = String(query.q || "").trim().toLowerCase();
  const unreadOnly = String(query.filter || "") === "unread";

  const [members, counts, drafts, vaultFiles, groups, joinableGroups] = await Promise.all([
    listPortalMembers(),
    getPortalMailboxCounts(member.id),
    listPortalMailDrafts(member.id),
    listPortalVaultFiles({ lifecycle: "active", limit: 60, viewer: member }),
    listPortalMailGroups(member.id),
    listPortalJoinableMailGroups(member.id),
  ]);

  const threads = section === "mail" && folder !== "drafts"
    ? await listPortalMailboxThreads(member.id, folder)
    : [];

  const filteredThreads = threads.filter((thread) => {
    if (unreadOnly && Number(thread.unread || 0) < 1) return false;
    if (!q) return true;
    return [thread.subject,thread.preview,thread.last_author]
      .some((value) => String(value || "").toLowerCase().includes(q));
  });

  const filteredDrafts = drafts.filter((item) => {
    if (!q) return true;
    return [item.subject,item.body]
      .some((value) => String(value || "").toLowerCase().includes(q));
  });

  const threadId = String(query.thread || "");
  const selectedThread = threadId
    ? await getPortalMailThread(threadId,member.id)
    : null;
  const [threadParticipants,threadAttachments,threadGroups] = selectedThread
    ? await Promise.all([
        listPortalMailParticipants(threadId),
        listPortalMailAttachments(threadId),
        listPortalMailThreadGroups(threadId,member.id),
      ])
    : [[],[],[]];

  const draft = query.draft
    ? await getPortalMailDraft(String(query.draft), member.id)
    : null;
  let forward: Awaited<ReturnType<typeof getPortalMailThread>> = null;
  if (!draft && query.forward) {
    forward = await getPortalMailThread(String(query.forward), member.id);
  }

  const composeOpen = String(query.compose || "") === "1" || Boolean(draft) || Boolean(forward);
  const selectedRecipientIds = draft ? parseRecipientIds(draft.recipients_json) : [];
  const composeSubject = draft
    ? String(draft.subject || "")
    : forward
      ? "İlt: " + String(forward.thread.subject || "")
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

  const selectedGroupId = String(query.group || "");
  const selectedGroup = groups.find((item) => String(item.id) === selectedGroupId) || null;
  const selectedGroupMembers = selectedGroup
    ? await listPortalMailGroupMembers(selectedGroupId,member.id)
    : [];

  const folderCount = (value: string) => {
    if (value === "drafts") return drafts.length;
    if (value === "inbox") return counts.inbox;
    if (value === "starred") return counts.starred;
    if (value === "archive") return counts.archive;
    if (value === "trash") return counts.trash;
    return "";
  };

  const activeFolderLabel = folderLabels.find(([value]) => value === folder)?.[1] || "Gelen";
  const composeCloseHref = queryHref({folder,thread:threadId || undefined});
  const replyOpen = Boolean(selectedThread) && String(query.reply || "") === "1";

  return (
    <section className="mailAppShell">
      <header className="mailAppTopbar">
        <div className="mailAppIdentity">
          <span className="mailAppLogo">M</span>
          <div>
            <b>CORE Mail</b>
            <small>İç yazışma · {counts.unread} okunmamış</small>
          </div>
        </div>

        {section === "mail" ? (
          <form className="mailAppSearch" action="/portal/mail" method="get">
            <input type="hidden" name="folder" value={folder} />
            <span>⌕</span>
            <input name="q" defaultValue={String(query.q || "")} placeholder="Mail, kişi veya konu ara" aria-label="Mail ara" />
            <button type="submit">Ara</button>
          </form>
        ) : (
          <div className="mailAppSectionTitle">
            <b>Alıcı grupları</b>
            <small>{groups.length} grubun var</small>
          </div>
        )}

        <div className="mailAppTopActions">
          <a className={section === "groups" ? "active" : ""} href="/portal/mail?section=groups">Gruplar</a>
          <a className="primary" href={queryHref({folder,thread:threadId || undefined,compose:"1"})}>+ Yeni yazışma</a>
        </div>
      </header>

      <div className="mailAppBody">
        <aside className="mailAppRail">
          <a className="mailRailCompose" href={queryHref({folder,thread:threadId || undefined,compose:"1"})}>
            <span>＋</span><b>Yeni</b>
          </a>

          <nav aria-label="Mail klasörleri">
            {folderLabels.map(([value,label,code]) => (
              <a
                href={queryHref({folder:value})}
                className={section === "mail" && folder === value ? "active" : ""}
                key={value}
              >
                <span>{code}</span>
                <b>{label}</b>
                <em>{folderCount(value)}</em>
              </a>
            ))}
          </nav>

          <div className="mailRailDivider" />

          <a className={"mailRailGroups "+(section === "groups" ? "active" : "")} href="/portal/mail?section=groups">
            <span>GR</span>
            <b>Gruplar</b>
            <em>{groups.length || ""}</em>
          </a>
        </aside>

        {section === "mail" ? (
          <>
            <section className="mailListPane">
              <header className="mailPaneHeader">
                <div>
                  <b>{activeFolderLabel}</b>
                  <small>{folder === "drafts" ? filteredDrafts.length : filteredThreads.length} kayıt</small>
                </div>
                <div className="mailListFilters">
                  <a
                    className={unreadOnly ? "active" : ""}
                    href={queryHref({folder,filter:unreadOnly ? undefined : "unread",q:query.q})}
                  >
                    Okunmamış
                  </a>
                </div>
              </header>

              <div className="mailMessageList">
                {folder === "drafts" ? (
                  filteredDrafts.length ? filteredDrafts.map((item) => (
                    <article className="mailListRow draft" key={String(item.id)}>
                      <a className="mailListRowOpen" href={queryHref({folder:"drafts",draft:String(item.id)})}>
                        <span className="mailUnreadDot">DR</span>
                        <div>
                          <header><b>{String(item.subject || "Konusuz taslak")}</b></header>
                          <p>{String(item.body || "Boş taslak")}</p>
                          <small>Taslak · {String(item.updated_at)}</small>
                        </div>
                      </a>
                      <form action={deleteMailboxDraftAction}>
                        <input type="hidden" name="draftId" value={String(item.id)} />
                        <button type="submit" title="Taslağı sil">×</button>
                      </form>
                    </article>
                  )) : <PortalEmpty title="Taslak yok." text="Yeni yazışma başlatıp daha sonra devam etmek için taslak kaydedebilirsin." />
                ) : filteredThreads.length ? filteredThreads.map((thread) => {
                  const isUnread = Number(thread.unread || 0) > 0;
                  const isStarred = Number(thread.starred || 0) > 0;
                  const selected = String(thread.id) === threadId;
                  return (
                    <article className={"mailListRow "+(isUnread?"unread ":"")+(selected?"selected":"")} key={String(thread.id)}>
                      <form action={openMailboxThreadAction} className="mailListOpenForm">
                        <input type="hidden" name="threadId" value={String(thread.id)} />
                        <input type="hidden" name="folder" value={folder} />
                        <button className="mailListRowOpen" type="submit">
                          <span className="mailUnreadDot">{isUnread ? "●" : "○"}</span>
                          <div>
                            <header>
                              <b>{String(thread.subject || "Konusuz yazışma")}</b>
                              {isStarred ? <em>★</em> : null}
                            </header>
                            <p>{String(thread.preview || "")}</p>
                            <small>{String(thread.last_author || "")} · {String(thread.message_count || 1)} mesaj</small>
                          </div>
                          <time>{String(thread.updated_at)}</time>
                        </button>
                      </form>
                      <form action={mutateMailboxThreadAction} className="mailListQuickActions">
                        <input type="hidden" name="threadId" value={String(thread.id)} />
                        <input type="hidden" name="returnTo" value={queryHref({folder,thread:selected ? threadId : undefined})} />
                        <button name="operation" value={isStarred ? "unstar" : "star"} type="submit" title="Yıldız">{isStarred ? "★" : "☆"}</button>
                        <button name="operation" value={isUnread ? "read" : "unread"} type="submit" title={isUnread ? "Okundu" : "Okunmadı"}>{isUnread ? "✓" : "•"}</button>
                      </form>
                    </article>
                  );
                }) : <PortalEmpty title="Bu klasör temiz." text="Burada gösterilecek yazışma yok." />}
              </div>
            </section>

            <section className="mailReaderPane">
              {selectedThread ? (
                <>
                  <header className="mailReaderHeader">
                    <a className="mailMobileBack" href={queryHref({folder})}>← Liste</a>
                    <div className="mailReaderSubject">
                      <span>YAZIŞMA</span>
                      <h1>{String(selectedThread.thread.subject)}</h1>
                      <div className="mailReaderContext">
                        <span>{threadParticipants.length} katılımcı</span>
                        <span>{selectedThread.messages.length} mesaj</span>
                        {threadGroups.map((group) => <span key={String(group.id)}>Grup · {String(group.name)}</span>)}
                      </div>
                    </div>

                    <div className="mailReaderActions">
                      <a className="primary" href={queryHref({folder,thread:threadId,reply:"1"})}>Yanıtla</a>
                      <a href={queryHref({folder,thread:threadId,compose:"1",forward:threadId})}>İlet</a>
                      <form action={mutateMailboxThreadAction}>
                        <input type="hidden" name="threadId" value={threadId} />
                        <input type="hidden" name="returnTo" value={queryHref({folder})} />
                        <button name="operation" value="archive" type="submit">Arşivle</button>
                      </form>
                      <form action={mutateMailboxThreadAction}>
                        <input type="hidden" name="threadId" value={threadId} />
                        <input type="hidden" name="returnTo" value={queryHref({folder})} />
                        <button name="operation" value="trash" type="submit">Çöp</button>
                      </form>
                    </div>
                  </header>

                  {(query.sent || query.replied) ? (
                    <div className="mailInlineStatus">{query.sent ? "Yazışma gönderildi." : "Yanıt gönderildi."}</div>
                  ) : null}

                  <div className="mailConversationViewport">
                    {selectedThread.messages.map((message,index) => {
                      const author = String(message.full_name || message.email);
                      const initials = author.split(/\s+/).slice(0,2).map((part) => part[0]).join("").toUpperCase();
                      const mine = String(message.email) === member.email;
                      const messageFiles = threadAttachments.filter((item) => String(item.message_id) === String(message.id));
                      return (
                        <article className={"mailConversationMessage "+(mine?"mine":"")} key={String(message.id)}>
                          <span className="mailMessageAvatar">{initials || "CR"}</span>
                          <div className="mailMessageCard">
                            <header>
                              <div>
                                <b>{author}</b>
                                <small>{String(message.email)}</small>
                              </div>
                              <time>{String(message.created_at)}</time>
                            </header>
                            <p>{String(message.body)}</p>
                            {messageFiles.length ? (
                              <div className="mailReaderAttachments">
                                {messageFiles.map((item) => (
                                  <a
                                    href={"/api/portal/vault/" + encodeURIComponent(String(item.vault_file_id)) + "?revision=" + encodeURIComponent(String(item.revision)) + "&download=1"}
                                    key={String(item.id)}
                                  >
                                    <span>{String(item.extension || "FILE").toUpperCase()}</span>
                                    <div><b>{String(item.title)}</b><small>R{String(item.revision)} · {formatVaultBytes(item.size_bytes)}</small></div>
                                  </a>
                                ))}
                              </div>
                            ) : null}
                            <footer>Mesaj {index + 1} / {selectedThread.messages.length}</footer>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <footer className="mailReaderFooter">
                    {replyOpen ? (
                      <form className="mailInlineReply" action={replyMailboxThreadAction}>
                        <input type="hidden" name="threadId" value={threadId} />
                        <div className="mailInlineReplyHead">
                          <div><b>Tümünü yanıtla</b><small>{threadParticipants.length} katılımcı</small></div>
                          <a href={queryHref({folder,thread:threadId})}>Kapat</a>
                        </div>
                        <textarea name="body" rows={5} placeholder="Yanıtını yaz..." autoFocus required />
                        {vaultFiles.length ? (
                          <details>
                            <summary>Vault'tan dosya ekle</summary>
                            <div className="mailboxAttachmentPicker">
                              {vaultFiles.slice(0,24).map((file) => (
                                <label key={String(file.id)}>
                                  <input type="checkbox" name="vaultFileId" value={String(file.id)} />
                                  <span><b>{String(file.title)}</b><small>R{String(file.revision)} · {String(file.extension || "FILE").toUpperCase()}</small></span>
                                </label>
                              ))}
                            </div>
                          </details>
                        ) : null}
                        <div className="mailInlineReplyActions">
                          <button className="portalPrimaryButton" type="submit">Gönder</button>
                        </div>
                      </form>
                    ) : (
                      <a className="mailReplyLauncher" href={queryHref({folder,thread:threadId,reply:"1"})}>
                        <span>↩</span><b>Yanıtla</b><small>Bu yazışmadaki herkese</small>
                      </a>
                    )}
                  </footer>
                </>
              ) : (
                <div className="mailReaderEmpty">
                  <span>CORE MAIL</span>
                  <h2>Bir yazışma seç.</h2>
                  <p>Mail listesinde bir kaydı açtığında içerik burada görünür. Yeni mail yazmak için sayfanın tamamı değişmez; compose ayrı bir çalışma yüzeyi olarak açılır.</p>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="mailGroupsWorkspace">
            <div className="mailGroupsListPane">
              <header className="mailPaneHeader">
                <div><b>Gruplarım</b><small>Tek seferde bir ekibe yaz</small></div>
                <a className="portalPrimaryButton" href="/portal/mail?section=groups&groupCreate=1">+ Grup oluştur</a>
              </header>

              <div className="mailGroupsList">
                {groups.length ? groups.map((group) => (
                  <a
                    className={String(group.id) === selectedGroupId ? "active" : ""}
                    href={queryHref({section:"groups",group:String(group.id)})}
                    key={String(group.id)}
                  >
                    <span>{String(group.access_mode) === "locked" ? "LK" : "GR"}</span>
                    <div>
                      <b>{String(group.name)}</b>
                      <small>{String(group.member_count || 0)} üye · {String(group.access_mode) === "locked" ? "erişim kodlu" : "özel"}</small>
                    </div>
                  </a>
                )) : <PortalEmpty title="Henüz grubun yok." text="Sık kullandığın ekipleri alıcı grubu yaparak tek seçimle mail gönderebilirsin." />}
              </div>

              {joinableGroups.length ? (
                <section className="mailJoinableGroups">
                  <header><b>Erişim koduyla katıl</b><small>{joinableGroups.length} grup</small></header>
                  {joinableGroups.map((group) => (
                    <form action={joinMailboxGroupAction} key={String(group.id)}>
                      <input type="hidden" name="groupId" value={String(group.id)} />
                      <div><b>{String(group.name)}</b><small>{String(group.description || "")}</small></div>
                      <input name="accessCode" type="password" placeholder="Erişim kodu" minLength={6} required />
                      <button type="submit">Katıl</button>
                    </form>
                  ))}
                </section>
              ) : null}
            </div>

            <div className="mailGroupDetailPane">
              {selectedGroup ? (
                <>
                  <header>
                    <a className="mailMobileBack" href="/portal/mail?section=groups">← Gruplar</a>
                    <div>
                      <span>{String(selectedGroup.access_mode) === "locked" ? "ERİŞİM KODLU GRUP" : "ÖZEL GRUP"}</span>
                      <h2>{String(selectedGroup.name)}</h2>
                      <p>{String(selectedGroup.description || "Açıklama yok.")}</p>
                    </div>
                    <a className="portalPrimaryButton" href={queryHref({compose:"1",section:"mail",group:selectedGroupId})}>Bu gruba yaz</a>
                  </header>

                  <div className="mailGroupMemberList">
                    {selectedGroupMembers.map((person) => (
                      <article key={String(person.id)}>
                        <span>{String(person.full_name || person.email).slice(0,2).toUpperCase()}</span>
                        <div><b>{String(person.full_name || person.email)}</b><small>{String(person.email)}</small></div>
                        <em>{String(person.member_role) === "owner" ? "Sahip" : "Üye"}</em>
                      </article>
                    ))}
                  </div>

                  {String(selectedGroup.member_role) === "owner" ? (
                    <form className="mailGroupDanger" action={deleteMailboxGroupAction}>
                      <input type="hidden" name="groupId" value={selectedGroupId} />
                      <div><b>Grubu sil</b><small>Grup silinir; eski mail thread'leri korunur.</small></div>
                      <button type="submit">Grubu sil</button>
                    </form>
                  ) : null}
                </>
              ) : (
                <div className="mailReaderEmpty">
                  <span>ALICI GRUPLARI</span>
                  <h2>Bir grup seç.</h2>
                  <p>Özel gruplar yalnızca üyeleri tarafından görülür. Erişim kodlu gruplara kodla katılabilirsin. Bu özellik erişim kontrolüdür; uçtan uca mesaj şifrelemesi değildir.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {composeOpen ? (
          <section className="mailComposeSurface" aria-label="Yeni yazışma">
            <header>
              <div>
                <span>{draft ? "TASLAK" : forward ? "İLET" : "YENİ YAZIŞMA"}</span>
                <b>{draft ? String(draft.subject || "Taslağı düzenle") : "CORE Mail"}</b>
              </div>
              <a href={composeCloseHref} aria-label="Yazmayı kapat">×</a>
            </header>

            <form action={createMailboxThreadAction}>
              {draft ? <input type="hidden" name="draftId" value={String(draft.id)} /> : null}

              <label className="mailComposeSubject">
                <span>Konu</span>
                <input name="subject" defaultValue={composeSubject} placeholder="Kısa ve açıklayıcı bir konu" required autoFocus />
              </label>

              <section className="mailComposeRecipients">
                <header><b>Alıcılar</b><small>Kişi veya grup seç</small></header>

                {groups.length ? (
                  <div className="mailComposeGroupChips">
                    {groups.map((group) => (
                      <label key={String(group.id)}>
                        <input
                          type="checkbox"
                          name="groupId"
                          value={String(group.id)}
                          defaultChecked={String(query.group || "") === String(group.id)}
                        />
                        <span>{String(group.name)} <small>{String(group.member_count || 0)}</small></span>
                      </label>
                    ))}
                  </div>
                ) : null}

                <details>
                  <summary>Kişileri seç</summary>
                  <div className="mailComposePeople">
                    {members.filter((item) => String(item.status) === "active" && String(item.id) !== member.id).map((item) => (
                      <label key={String(item.id)}>
                        <input
                          type="checkbox"
                          name="participantId"
                          value={String(item.id)}
                          defaultChecked={selectedRecipientIds.includes(String(item.id))}
                        />
                        <span><b>{String(item.full_name || item.email)}</b><small>{String(item.email)}</small></span>
                      </label>
                    ))}
                  </div>
                </details>
              </section>

              <label className="mailComposeMessage">
                <span>Mesaj</span>
                <textarea name="body" rows={12} defaultValue={composeBody} placeholder="Mesajını yaz..." required />
              </label>

              <details className="mailComposeFiles">
                <summary>Vault'tan dosya ekle <small>en fazla 12</small></summary>
                <div className="mailboxAttachmentPicker">
                  {vaultFiles.slice(0,30).map((file) => (
                    <label key={String(file.id)}>
                      <input type="checkbox" name="vaultFileId" value={String(file.id)} />
                      <span><b>{String(file.title)}</b><small>R{String(file.revision)} · {String(file.extension || "FILE").toUpperCase()} · {formatVaultBytes(file.size_bytes)}</small></span>
                    </label>
                  ))}
                </div>
              </details>

              <footer>
                <button className="portalPrimaryButton" type="submit">Gönder</button>
                <button className="portalOutlineButton" formAction={saveMailboxDraftAction} formNoValidate type="submit">Taslağa kaydet</button>
                <a href={composeCloseHref}>Vazgeç</a>
              </footer>
            </form>
          </section>
        ) : null}

        {section === "groups" && String(query.groupCreate || "") === "1" ? (
          <section className="mailComposeSurface mailGroupCreateSurface">
            <header>
              <div><span>ALICI GRUBU</span><b>Yeni grup oluştur</b></div>
              <a href="/portal/mail?section=groups" aria-label="Grup oluşturmayı kapat">×</a>
            </header>
            <form action={createMailboxGroupAction}>
              <label className="mailComposeSubject">
                <span>Grup adı</span>
                <input name="name" maxLength={80} placeholder="Örn. CORE Marine Yazılım" required autoFocus />
              </label>

              <label className="mailComposeMessage compact">
                <span>Açıklama</span>
                <textarea name="description" rows={3} maxLength={500} placeholder="Bu grup kimler için?" />
              </label>

              <fieldset className="mailGroupMode">
                <legend>Erişim</legend>
                <label><input type="radio" name="accessMode" value="private" defaultChecked /><span><b>Özel grup</b><small>Yalnızca eklediğin üyeler kullanır.</small></span></label>
                <label><input type="radio" name="accessMode" value="locked" /><span><b>Erişim kodlu</b><small>Üyeler paylaşılan kodla gruba katılabilir.</small></span></label>
                <label className="mailGroupCode"><span>Erişim kodu</span><input name="accessCode" type="password" minLength={6} placeholder="Kodlu grup için en az 6 karakter" /></label>
              </fieldset>

              <section className="mailComposeRecipients">
                <header><b>Başlangıç üyeleri</b><small>Sonradan erişim koduyla da katılabilirler</small></header>
                <div className="mailComposePeople">
                  {members.filter((item) => String(item.status) === "active" && String(item.id) !== member.id).map((item) => (
                    <label key={String(item.id)}>
                      <input type="checkbox" name="participantId" value={String(item.id)} />
                      <span><b>{String(item.full_name || item.email)}</b><small>{String(item.email)}</small></span>
                    </label>
                  ))}
                </div>
              </section>

              <footer>
                <button className="portalPrimaryButton" type="submit">Grubu oluştur</button>
                <a href="/portal/mail?section=groups">Vazgeç</a>
              </footer>
            </form>
          </section>
        ) : null}

        {(query.saved || query.created || query.joined || query.deleted) ? (
          <div className="mailFloatingStatus">
            {query.saved ? "Taslak kaydedildi." : query.created ? "Grup oluşturuldu." : query.joined ? "Gruba katıldın." : "Grup silindi."}
          </div>
        ) : null}
      </div>
    </section>
  );
}
