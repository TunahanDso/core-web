import { env } from "cloudflare:workers";
import { ensurePortalCollaborationFinanceSchema } from "@/lib/portal/bootstrap";

function db() {
  if (!env.DB) throw new Error("DB binding is not available.");
  return env.DB;
}

type PortalPollRecord = Record<string, unknown> & {
  options: Record<string, unknown>[];
};

function runtimeVar(name: string) {
  const values = env as unknown as Record<string, unknown>;
  return String(values[name] || "").trim();
}

export function getMeetingTransportStatus(room: string) {
  const base = runtimeVar("PORTAL_MEETING_PROVIDER_URL");
  if (!base) {
    return {
      configured: false,
      provider: "not-configured",
      joinUrl: null as string | null,
      note: "Ses/görüntü SFU sağlayıcısı henüz bağlanmadı.",
    };
  }
  const encoded = encodeURIComponent(room);
  const joinUrl = base.includes("{room}")
    ? base.replaceAll("{room}",encoded)
    : base.replace(/\/$/,"") + "/" + encoded;
  return {
    configured: true,
    provider: runtimeVar("PORTAL_MEETING_PROVIDER") || "external-webrtc",
    joinUrl,
    note: "CORE meeting transport adapter",
  };
}

export async function listMeetingSpaces(memberId: string) {
  await ensurePortalCollaborationFinanceSchema();
  const response = await db().prepare(
    "SELECT s.*," +
    "(SELECT COUNT(*) FROM portal_meetings m WHERE m.space_id=s.id) AS meeting_count " +
    "FROM portal_meeting_spaces s WHERE " +
    "s.visibility='members' OR s.created_by=? OR " +
    "(s.visibility='team' AND EXISTS (SELECT 1 FROM portal_team_memberships tm WHERE tm.team_code=s.team_code AND tm.member_id=? AND tm.status='active')) OR " +
    "(s.visibility='private' AND EXISTS (SELECT 1 FROM portal_meetings m JOIN portal_meeting_participants mp ON mp.meeting_id=m.id WHERE m.space_id=s.id AND mp.member_id=?)) " +
    "ORDER BY s.name"
  ).bind(memberId,memberId,memberId).all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function createMeetingSpace(input: {
  name: string;
  description: string;
  teamCode: string | null;
  projectSlug: string | null;
  visibility: "private" | "team" | "members";
  createdBy: string;
}) {
  await ensurePortalCollaborationFinanceSchema();
  const id=crypto.randomUUID();
  await db().prepare(
    "INSERT INTO portal_meeting_spaces (id,name,description,team_code,project_slug,visibility,created_by) VALUES (?,?,?,?,?,?,?)"
  ).bind(id,input.name.trim(),input.description.trim(),input.teamCode,input.projectSlug,input.visibility,input.createdBy).run();
  return id;
}

export async function listMeetings(memberId: string, limit=120, query="") {
  await ensurePortalCollaborationFinanceSchema();
  const capped=Math.min(Math.max(limit,1),120);
  const needle=query.trim().slice(0,80);
  const search=needle
    ? " AND (m.title LIKE ? OR m.agenda LIKE ? OR m.team_code LIKE ? OR m.project_slug LIKE ? OR s.name LIKE ?) "
    : " ";
  const sql=
    "SELECT m.*,s.name AS space_name,s.visibility AS space_visibility,pm.full_name AS creator_name," +
    "(SELECT COUNT(*) FROM portal_meeting_participants x WHERE x.meeting_id=m.id) AS participant_count," +
    "(SELECT COUNT(*) FROM portal_meeting_notes n WHERE n.meeting_id=m.id AND n.kind='decision') AS decision_count," +
    "(SELECT COUNT(*) FROM portal_polls p WHERE p.meeting_id=m.id) AS poll_count," +
    "(SELECT COUNT(*) FROM portal_meeting_reports r WHERE r.meeting_id=m.id) AS report_count " +
    "FROM portal_meetings m " +
    "LEFT JOIN portal_meeting_spaces s ON s.id=m.space_id " +
    "LEFT JOIN portal_members pm ON pm.id=m.created_by " +
    "WHERE (m.created_by=? " +
    "OR EXISTS (SELECT 1 FROM portal_meeting_participants mp WHERE mp.meeting_id=m.id AND mp.member_id=?) " +
    "OR (s.id IS NOT NULL AND s.visibility='members') " +
    "OR (s.id IS NULL AND m.team_code IS NULL) " +
    "OR ((s.visibility='team' OR (s.id IS NULL AND m.team_code IS NOT NULL)) AND EXISTS (SELECT 1 FROM portal_team_memberships tm WHERE tm.team_code=COALESCE(m.team_code,s.team_code) AND tm.member_id=? AND tm.status='active'))) " +
    search +
    "ORDER BY CASE m.status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END," +
    "CASE WHEN m.status IN ('live','scheduled') THEN datetime(m.starts_at) END ASC,datetime(m.starts_at) DESC LIMIT ?";
  const q="%"+needle+"%";
  const response=needle
    ? await db().prepare(sql).bind(memberId,memberId,memberId,q,q,q,q,q,capped).all<Record<string, unknown>>()
    : await db().prepare(sql).bind(memberId,memberId,memberId,capped).all<Record<string, unknown>>();
  return response.results ?? [];
}

export async function getMeeting(meetingId: string, memberId: string) {
  await ensurePortalCollaborationFinanceSchema();
  const meeting=await db().prepare(
    "SELECT m.*,s.name AS space_name,s.description AS space_description,s.visibility AS space_visibility,pm.full_name AS creator_name " +
    "FROM portal_meetings m LEFT JOIN portal_meeting_spaces s ON s.id=m.space_id LEFT JOIN portal_members pm ON pm.id=m.created_by WHERE m.id=? LIMIT 1"
  ).bind(meetingId).first<Record<string, unknown>>();
  if(!meeting) return null;

  const isParticipant=await db().prepare(
    "SELECT 1 AS ok FROM portal_meeting_participants WHERE meeting_id=? AND member_id=? LIMIT 1"
  ).bind(meetingId,memberId).first<{ok:number}>();
  const visibility=String(meeting.space_visibility || (meeting.team_code ? "team" : "members"));
  let allowed=String(meeting.created_by)===memberId || Boolean(isParticipant) || visibility==="members";
  if(!allowed && visibility==="team"){
    const team=String(meeting.team_code || "");
    const membership=team ? await db().prepare(
      "SELECT 1 AS ok FROM portal_team_memberships WHERE team_code=? AND member_id=? AND status='active' LIMIT 1"
    ).bind(team,memberId).first<{ok:number}>() : null;
    allowed=Boolean(membership);
  }
  if(!allowed) return null;

  const [participants,notes,polls,report]=await Promise.all([
    db().prepare(
      "SELECT mp.*,m.full_name,m.email,m.role FROM portal_meeting_participants mp JOIN portal_members m ON m.id=mp.member_id WHERE mp.meeting_id=? ORDER BY CASE mp.participant_role WHEN 'host' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END,m.full_name"
    ).bind(meetingId).all<Record<string, unknown>>(),
    db().prepare(
      "SELECT n.*,m.full_name,m.email FROM portal_meeting_notes n JOIN portal_members m ON m.id=n.author_id WHERE n.meeting_id=? ORDER BY n.created_at"
    ).bind(meetingId).all<Record<string, unknown>>(),
    listPollsForMeeting(meetingId,memberId),
    db().prepare("SELECT * FROM portal_meeting_reports WHERE meeting_id=? LIMIT 1").bind(meetingId).first<Record<string, unknown>>(),
  ]);
  return {
    meeting,
    participants:participants.results ?? [],
    notes:notes.results ?? [],
    polls,
    report,
  };
}

export async function createMeeting(input: {
  spaceId: string | null;
  title: string;
  agenda: string;
  startsAt: string;
  endsAt: string | null;
  teamCode: string | null;
  projectSlug: string | null;
  transportMode: "audio_video" | "audio" | "external" | "none";
  participantIds: string[];
  createdBy: string;
  actorEmail: string;
}) {
  await ensurePortalCollaborationFinanceSchema();
  const database=db();
  const id=crypto.randomUUID();
  const calendarId=crypto.randomUUID();
  const room="core-"+id.replaceAll("-","").slice(0,20);
  const participants=Array.from(new Set([input.createdBy,...input.participantIds.filter(Boolean)])).slice(0,80);
  const statements=[
    database.prepare(
      "INSERT INTO portal_calendar_events (id,title,description,starts_at,ends_at,location,team_code,project_slug,created_by) VALUES (?,?,?,?,?,?,?,?,?)"
    ).bind(calendarId,input.title,input.agenda,input.startsAt,input.endsAt,"CORE Meeting",input.teamCode,input.projectSlug,input.createdBy),
    database.prepare(
      "INSERT INTO portal_meetings (id,space_id,calendar_event_id,title,agenda,starts_at,ends_at,team_code,project_slug,status,transport_mode,transport_room,created_by) VALUES (?,?,?,?,?,?,?,?,?,'scheduled',?,?,?)"
    ).bind(id,input.spaceId,calendarId,input.title,input.agenda,input.startsAt,input.endsAt,input.teamCode,input.projectSlug,input.transportMode,room,input.createdBy),
    database.prepare(
      "INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'meeting.create','meeting',?,?)"
    ).bind(input.actorEmail,id,JSON.stringify({title:input.title,startsAt:input.startsAt,participants:participants.length})),
  ];
  for(const memberId of participants){
    statements.push(
      database.prepare(
        "INSERT INTO portal_meeting_participants (meeting_id,member_id,participant_role,invite_state) VALUES (?,?,?,?)"
      ).bind(id,memberId,memberId===input.createdBy?"host":"participant",memberId===input.createdBy?"accepted":"invited")
    );
    if(memberId!==input.createdBy){
      statements.push(
        database.prepare("INSERT INTO portal_notifications (id,member_id,kind,title,body,href) VALUES (?,?,?,?,?,?)")
          .bind(crypto.randomUUID(),memberId,"info","Toplantı daveti: "+input.title,input.startsAt,"/portal/meetings/"+id)
      );
    }
  }
  await database.batch(statements);
  return id;
}

export async function setMeetingStatus(meetingId: string, status: "scheduled"|"live"|"completed"|"cancelled", memberId: string, actorEmail: string) {
  await ensurePortalCollaborationFinanceSchema();
  const database=db();
  const meeting=await database.prepare("SELECT created_by FROM portal_meetings WHERE id=? LIMIT 1").bind(meetingId).first<{created_by:string}>();
  const privileged=meeting?.created_by===memberId || Boolean(await database.prepare(
    "SELECT 1 AS ok FROM portal_meeting_participants WHERE meeting_id=? AND member_id=? AND participant_role IN ('host','moderator') LIMIT 1"
  ).bind(meetingId,memberId).first<{ok:number}>());
  if(!privileged) throw new Error("Toplantı durumunu yalnız host veya moderatör değiştirebilir.");
  await database.batch([
    database.prepare("UPDATE portal_meetings SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,meetingId),
    database.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'meeting.status','meeting',?,?)")
      .bind(actorEmail,meetingId,JSON.stringify({status})),
  ]);
}

export async function addMeetingNote(input: {
  meetingId: string;
  authorId: string;
  kind: "note"|"decision"|"action"|"transcript";
  body: string;
}) {
  await ensurePortalCollaborationFinanceSchema();
  const database=db();
  const allowed=Boolean(await database.prepare(
    "SELECT 1 AS ok FROM portal_meetings m WHERE m.id=? AND (m.created_by=? OR EXISTS (SELECT 1 FROM portal_meeting_participants mp WHERE mp.meeting_id=m.id AND mp.member_id=?)) LIMIT 1"
  ).bind(input.meetingId,input.authorId,input.authorId).first<{ok:number}>());
  if(!allowed) throw new Error("Bu toplantıya not ekleme yetkiniz yok.");
  const id=crypto.randomUUID();
  await database.prepare(
    "INSERT INTO portal_meeting_notes (id,meeting_id,author_id,kind,body) VALUES (?,?,?,?,?)"
  ).bind(id,input.meetingId,input.authorId,input.kind,input.body.trim()).run();
  return id;
}

export async function createPoll(input: {
  meetingId: string | null;
  title: string;
  description: string;
  scope: "global"|"team"|"meeting";
  teamCode: string | null;
  closesAt: string | null;
  options: string[];
  createdBy: string;
}) {
  await ensurePortalCollaborationFinanceSchema();
  const database=db();
  if(input.scope==="meeting" && input.meetingId){
    const allowed=Boolean(await database.prepare(
      "SELECT 1 AS ok FROM portal_meetings m WHERE m.id=? AND (m.created_by=? OR EXISTS (SELECT 1 FROM portal_meeting_participants mp WHERE mp.meeting_id=m.id AND mp.member_id=?)) LIMIT 1"
    ).bind(input.meetingId,input.createdBy,input.createdBy).first<{ok:number}>());
    if(!allowed) throw new Error("Bu toplantıda oylama açma yetkiniz yok.");
  }
  const id=crypto.randomUUID();
  const options=input.options.map((x)=>x.trim()).filter(Boolean).slice(0,12);
  if(options.length<2) throw new Error("Oylama için en az iki seçenek gerekli.");
  const statements=[
    database.prepare(
      "INSERT INTO portal_polls (id,meeting_id,title,description,scope,team_code,status,closes_at,created_by) VALUES (?,?,?,?,?,?,'open',?,?)"
    ).bind(id,input.meetingId,input.title.trim(),input.description.trim(),input.scope,input.teamCode,input.closesAt,input.createdBy),
  ];
  options.forEach((label,index)=>{
    statements.push(
      database.prepare("INSERT INTO portal_poll_options (id,poll_id,label,sort_order) VALUES (?,?,?,?)")
        .bind(crypto.randomUUID(),id,label,index)
    );
  });

  if(input.scope==="global"){
    statements.push(
      database.prepare("INSERT INTO portal_notifications (id,member_id,kind,title,body,href) VALUES (?,NULL,'info',?,?,?)")
        .bind(crypto.randomUUID(),"Yeni oylama: "+input.title,input.description,"/portal/polls?poll="+id)
    );
  } else if(input.scope==="team" && input.teamCode){
    const members=await database.prepare(
      "SELECT member_id FROM portal_team_memberships WHERE team_code=? AND status='active'"
    ).bind(input.teamCode).all<{member_id:string}>();
    for(const row of members.results ?? []){
      statements.push(
        database.prepare("INSERT INTO portal_notifications (id,member_id,kind,title,body,href) VALUES (?,?,?,?,?,?)")
          .bind(crypto.randomUUID(),row.member_id,"info","Takım oylaması: "+input.title,input.description,"/portal/polls?poll="+id)
      );
    }
  } else if(input.scope==="meeting" && input.meetingId){
    const members=await database.prepare(
      "SELECT member_id FROM portal_meeting_participants WHERE meeting_id=?"
    ).bind(input.meetingId).all<{member_id:string}>();
    for(const row of members.results ?? []){
      statements.push(
        database.prepare("INSERT INTO portal_notifications (id,member_id,kind,title,body,href) VALUES (?,?,?,?,?,?)")
          .bind(crypto.randomUUID(),row.member_id,"info","Toplantı oylaması: "+input.title,input.description,"/portal/meetings/"+input.meetingId)
      );
    }
  }
  await database.batch(statements);
  return id;
}

async function listPollRows(whereSql: string, bindings: unknown[], limit=120) {
  const capped=Math.min(Math.max(limit,1),120);
  const response=await db().prepare(
    "SELECT p.*,m.full_name AS creator_name," +
    "(SELECT COUNT(*) FROM portal_poll_votes v WHERE v.poll_id=p.id) AS vote_count " +
    "FROM portal_polls p LEFT JOIN portal_members m ON m.id=p.created_by "+whereSql+
    " ORDER BY CASE p.status WHEN 'open' THEN 0 ELSE 1 END,p.created_at DESC LIMIT ?"
  ).bind(...bindings,capped).all<Record<string, unknown>>();
  const rows: PortalPollRecord[]=[];
  for(const poll of response.results ?? []){
    const options=await db().prepare(
      "SELECT o.id,o.label,o.sort_order,(SELECT COUNT(*) FROM portal_poll_votes v WHERE v.option_id=o.id) AS votes FROM portal_poll_options o WHERE o.poll_id=? ORDER BY o.sort_order"
    ).bind(String(poll.id)).all<Record<string, unknown>>();
    rows.push({...poll,options:options.results ?? []} as PortalPollRecord);
  }
  return rows;
}

export async function listPolls(memberId: string, query="", limit=120) {
  await ensurePortalCollaborationFinanceSchema();
  const needle=query.trim().slice(0,80);
  const access=
    "(p.scope='global' OR p.created_by=? " +
    "OR (p.scope='team' AND EXISTS (SELECT 1 FROM portal_team_memberships tm WHERE tm.team_code=p.team_code AND tm.member_id=? AND tm.status='active')) " +
    "OR (p.scope='meeting' AND EXISTS (SELECT 1 FROM portal_meeting_participants mp WHERE mp.meeting_id=p.meeting_id AND mp.member_id=?)))";
  if(!needle) return listPollRows("WHERE "+access,[memberId,memberId,memberId],limit);
  const q="%"+needle+"%";
  return listPollRows(
    "WHERE "+access+" AND (p.title LIKE ? OR p.description LIKE ? OR p.team_code LIKE ?)",
    [memberId,memberId,memberId,q,q,q],
    limit
  );
}

export async function listPollsForMeeting(meetingId: string, memberId: string) {
  await ensurePortalCollaborationFinanceSchema();
  return listPollRows(
    "WHERE p.meeting_id=? AND (p.created_by=? OR EXISTS (SELECT 1 FROM portal_meeting_participants mp WHERE mp.meeting_id=p.meeting_id AND mp.member_id=?))",
    [meetingId,memberId,memberId]
  );
}

export async function votePoll(pollId: string, optionId: string, memberId: string) {
  await ensurePortalCollaborationFinanceSchema();
  const database=db();
  const poll=await database.prepare(
    "SELECT status,closes_at,scope,team_code,meeting_id,created_by FROM portal_polls WHERE id=? LIMIT 1"
  ).bind(pollId).first<Record<string,unknown>>();
  if(!poll || String(poll.status)!=="open") throw new Error("Oylama kapalı.");
  if(poll.closes_at && new Date(String(poll.closes_at)).getTime()<Date.now()) throw new Error("Oylama süresi doldu.");

  const scope=String(poll.scope);
  let allowed=scope==="global" || String(poll.created_by)===memberId;
  if(!allowed && scope==="team" && poll.team_code){
    allowed=Boolean(await database.prepare(
      "SELECT 1 AS ok FROM portal_team_memberships WHERE team_code=? AND member_id=? AND status='active' LIMIT 1"
    ).bind(String(poll.team_code),memberId).first<{ok:number}>());
  }
  if(!allowed && scope==="meeting" && poll.meeting_id){
    allowed=Boolean(await database.prepare(
      "SELECT 1 AS ok FROM portal_meeting_participants WHERE meeting_id=? AND member_id=? LIMIT 1"
    ).bind(String(poll.meeting_id),memberId).first<{ok:number}>());
  }
  if(!allowed) throw new Error("Bu oylamaya erişim yetkiniz yok.");

  const option=await database.prepare("SELECT 1 AS ok FROM portal_poll_options WHERE id=? AND poll_id=? LIMIT 1").bind(optionId,pollId).first<{ok:number}>();
  if(!option) throw new Error("Geçersiz oylama seçeneği.");
  await database.prepare(
    "INSERT INTO portal_poll_votes (poll_id,option_id,member_id) VALUES (?,?,?) ON CONFLICT(poll_id,member_id) DO UPDATE SET option_id=excluded.option_id,created_at=CURRENT_TIMESTAMP"
  ).bind(pollId,optionId,memberId).run();
}

export async function closePoll(pollId: string, memberId: string) {
  await ensurePortalCollaborationFinanceSchema();
  await db().prepare(
    "UPDATE portal_polls SET status='closed',updated_at=CURRENT_TIMESTAMP WHERE id=? AND created_by=?"
  ).bind(pollId,memberId).run();
}

export async function generateMeetingReport(meetingId: string, memberId: string, actorEmail: string) {
  await ensurePortalCollaborationFinanceSchema();
  const database=db();
  const meeting=await database.prepare("SELECT * FROM portal_meetings WHERE id=? LIMIT 1").bind(meetingId).first<Record<string,unknown>>();
  if(!meeting) throw new Error("Toplantı bulunamadı.");
  const allowed=String(meeting.created_by)===memberId || Boolean(await database.prepare(
    "SELECT 1 AS ok FROM portal_meeting_participants WHERE meeting_id=? AND member_id=? AND participant_role IN ('host','moderator') LIMIT 1"
  ).bind(meetingId,memberId).first<{ok:number}>());
  if(!allowed) throw new Error("Bu toplantı için rapor üretme yetkiniz yok.");

  const notes=(await database.prepare(
    "SELECT n.kind,n.body,n.created_at,m.full_name FROM portal_meeting_notes n JOIN portal_members m ON m.id=n.author_id WHERE n.meeting_id=? ORDER BY n.created_at"
  ).bind(meetingId).all<Record<string,unknown>>()).results ?? [];
  const polls=await listPollsForMeeting(meetingId,memberId);
  const decisions=notes.filter((x)=>String(x.kind)==="decision");
  const actions=notes.filter((x)=>String(x.kind)==="action");
  const transcripts=notes.filter((x)=>String(x.kind)==="transcript");
  const generalNotes=notes.filter((x)=>String(x.kind)==="note");

  const pollText=polls.map((poll)=>{
    const opts=(poll.options as Record<string,unknown>[]).map((o)=>"- "+String(o.label)+": "+String(o.votes)+" oy").join("\n");
    return "### "+String(poll.title)+"\n"+opts;
  }).join("\n\n");

  const summary=[
    "# "+String(meeting.title),
    "",
    "Tarih: "+String(meeting.starts_at),
    String(meeting.agenda || "") ? "Gündem: "+String(meeting.agenda) : "",
    "",
    "## Alınan Kararlar",
    decisions.length ? decisions.map((x)=>"- "+String(x.body)).join("\n") : "- Kayıtlı karar yok.",
    "",
    "## Aksiyonlar",
    actions.length ? actions.map((x)=>"- "+String(x.body)).join("\n") : "- Kayıtlı aksiyon yok.",
    "",
    "## Toplantı Notları",
    generalNotes.length ? generalNotes.map((x)=>"- "+String(x.body)).join("\n") : "- Ek not yok.",
    "",
    "## Transcript / Konuşma Kaydı",
    transcripts.length ? transcripts.map((x)=>String(x.body)).join("\n\n") : "Otomatik transcript sağlayıcısından henüz içerik gelmedi.",
    "",
    "## Oylamalar",
    pollText || "Toplantıda kayıtlı oylama yok.",
  ].filter(Boolean).join("\n");

  const existing=await database.prepare("SELECT resource_id FROM portal_meeting_reports WHERE meeting_id=? LIMIT 1").bind(meetingId).first<{resource_id:string|null}>();
  const resourceId=existing?.resource_id || crypto.randomUUID();
  const statements=[];
  if(!existing?.resource_id){
    statements.push(
      database.prepare(
        "INSERT INTO portal_resources (id,kind,title,description,team_code,project_slug,external_url,tags_json,visibility,created_by) VALUES (?,'archive',?,?,?,?,?,?,?,?)"
      ).bind(resourceId,"Toplantı Raporu · "+String(meeting.title),summary.slice(0,4000),meeting.team_code || null,meeting.project_slug || null,"/portal/meetings/"+meetingId,JSON.stringify(["meeting","report",meetingId]),meeting.team_code ? "team" : "members",memberId)
    );
  } else {
    statements.push(
      database.prepare("UPDATE portal_resources SET description=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(summary.slice(0,4000),resourceId)
    );
  }
  statements.push(
    database.prepare(
      "INSERT INTO portal_meeting_reports (meeting_id,summary,resource_id,generated_by) VALUES (?,?,?,?) " +
      "ON CONFLICT(meeting_id) DO UPDATE SET summary=excluded.summary,resource_id=excluded.resource_id,generated_by=excluded.generated_by,updated_at=CURRENT_TIMESTAMP"
    ).bind(meetingId,summary,resourceId,memberId)
  );
  statements.push(
    database.prepare("INSERT INTO portal_activity_log (actor,action,entity_type,entity_id,details_json) VALUES (?,'meeting.report','meeting',?,?)")
      .bind(actorEmail,meetingId,JSON.stringify({resourceId}))
  );
  await database.batch(statements);
  return {summary,resourceId};
}

export async function listBudgetAccounts(memberId?: string, canReadAll=false, query="", limit=200) {
  await ensurePortalCollaborationFinanceSchema();
  const where=memberId && !canReadAll
    ? " WHERE (a.team_code IS NULL OR a.owner_member_id=? OR EXISTS (SELECT 1 FROM portal_team_memberships tm WHERE tm.team_code=a.team_code AND tm.member_id=? AND tm.status='active')) "
    : " ";
  const sql=
    "SELECT a.*,m.full_name AS owner_name," +
    "(a.opening_balance_minor + COALESCE((SELECT SUM(CASE e.entry_type WHEN 'income' THEN e.amount_minor WHEN 'expense' THEN -e.amount_minor ELSE 0 END) FROM portal_budget_entries e WHERE e.account_id=a.id AND e.status='approved'),0)) AS balance_minor," +
    "COALESCE((SELECT SUM(e.amount_minor) FROM portal_budget_entries e WHERE e.account_id=a.id AND e.entry_type='commitment' AND e.status IN ('pending','approved')),0) AS committed_minor," +
    "COALESCE((SELECT SUM(x.amount_minor) FROM portal_budget_allocations x WHERE x.account_id=a.id),0) AS allocated_minor " +
    "FROM portal_budget_accounts a LEFT JOIN portal_members m ON m.id=a.owner_member_id" +
    where +
    (where.includes("WHERE") ? " AND a.status='active' " : " WHERE a.status='active' ") +
    (query.trim() ? " AND (a.name LIKE ? OR a.team_code LIKE ? OR a.project_slug LIKE ? OR m.full_name LIKE ?) " : " ") +
    "ORDER BY a.name LIMIT ?";
  const statement=db().prepare(sql);
  const capped=Math.min(Math.max(limit,1),200);
  const needle="%"+query.trim().slice(0,80)+"%";
  const bindings: unknown[]=[];
  if(memberId && !canReadAll) bindings.push(memberId,memberId);
  if(query.trim()) bindings.push(needle,needle,needle,needle);
  bindings.push(capped);
  const response=await statement.bind(...bindings).all<Record<string,unknown>>();
  return response.results ?? [];
}

export async function createBudgetAccount(input:{
  name:string; teamCode:string|null; projectSlug:string|null; currency:string; openingMinor:number; ownerMemberId:string|null; createdBy:string;
}) {
  await ensurePortalCollaborationFinanceSchema();
  const id=crypto.randomUUID();
  await db().prepare(
    "INSERT INTO portal_budget_accounts (id,name,team_code,project_slug,currency,opening_balance_minor,owner_member_id,created_by) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(id,input.name,input.teamCode,input.projectSlug,input.currency,input.openingMinor,input.ownerMemberId,input.createdBy).run();
  return id;
}

export async function listBudgetEntries(accountId?:string) {
  await ensurePortalCollaborationFinanceSchema();
  const sql=
    "SELECT e.*,a.name AS account_name,a.currency,m.full_name AS creator_name,ap.full_name AS approver_name " +
    "FROM portal_budget_entries e JOIN portal_budget_accounts a ON a.id=e.account_id " +
    "LEFT JOIN portal_members m ON m.id=e.created_by LEFT JOIN portal_members ap ON ap.id=e.approved_by " +
    (accountId ? "WHERE e.account_id=? " : "")+
    "ORDER BY e.occurred_at DESC,e.created_at DESC LIMIT 400";
  const stmt=db().prepare(sql);
  const response=accountId ? await stmt.bind(accountId).all<Record<string,unknown>>() : await stmt.all<Record<string,unknown>>();
  return response.results ?? [];
}

export async function createBudgetEntry(input:{
  accountId:string; entryType:"income"|"expense"|"commitment"; category:string; amountMinor:number; description:string; occurredAt:string;
  teamCode:string|null; projectSlug:string|null; createdBy:string; autoApprove:boolean;
}) {
  await ensurePortalCollaborationFinanceSchema();
  const id=crypto.randomUUID();
  await db().prepare(
    "INSERT INTO portal_budget_entries (id,account_id,entry_type,category,amount_minor,description,occurred_at,team_code,project_slug,status,created_by,approved_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(id,input.accountId,input.entryType,input.category,input.amountMinor,input.description,input.occurredAt,input.teamCode,input.projectSlug,input.autoApprove?"approved":"pending",input.createdBy,input.autoApprove?input.createdBy:null).run();
  return id;
}

export async function approveBudgetEntry(entryId:string, approverId:string, status:"approved"|"rejected", allowSelfApproval=false) {
  await ensurePortalCollaborationFinanceSchema();
  const database=db();
  const entry=await database.prepare("SELECT created_by,status FROM portal_budget_entries WHERE id=? LIMIT 1").bind(entryId).first<{created_by:string;status:string}>();
  if(!entry || entry.status!=="pending") throw new Error("Bekleyen bütçe hareketi bulunamadı.");
  if(!allowSelfApproval && entry.created_by===approverId) throw new Error("Kendi bütçe hareketinizi onaylayamazsınız.");
  await database.prepare(
    "UPDATE portal_budget_entries SET status=?,approved_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'"
  ).bind(status,approverId,entryId).run();
}

export async function createBudgetAllocation(input:{
  accountId:string; category:string; amountMinor:number; periodStart:string|null; periodEnd:string|null; notes:string; createdBy:string;
}) {
  await ensurePortalCollaborationFinanceSchema();
  const id=crypto.randomUUID();
  await db().prepare(
    "INSERT INTO portal_budget_allocations (id,account_id,category,amount_minor,period_start,period_end,notes,created_by) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(id,input.accountId,input.category,input.amountMinor,input.periodStart,input.periodEnd,input.notes,input.createdBy).run();
  return id;
}

export async function listBudgetAllocations(accountId?:string) {
  await ensurePortalCollaborationFinanceSchema();
  const base="SELECT x.*,a.name AS account_name,a.currency FROM portal_budget_allocations x JOIN portal_budget_accounts a ON a.id=x.account_id ";
  const response=accountId
    ? await db().prepare(base+"WHERE x.account_id=? ORDER BY x.created_at DESC").bind(accountId).all<Record<string,unknown>>()
    : await db().prepare(base+"ORDER BY x.created_at DESC LIMIT 200").all<Record<string,unknown>>();
  return response.results ?? [];
}
