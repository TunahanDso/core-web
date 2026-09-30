import { env } from "cloudflare:workers";
import { collaborationDb } from "@/lib/platform/databases";
import { ensurePortalCollaborationFinanceSchema } from "@/lib/portal/bootstrap";

type RealtimeKitPreset = {
  name?: string;
  config?: { view_type?: string };
};

type RealtimeKitParticipant = {
  id?: string;
  token?: string;
  custom_participant_id?: string;
  name?: string;
};

type RealtimeKitMeeting = {
  id?: string;
  title?: string;
};

type CloudflareEnvelope<T> = {
  success?: boolean;
  data?: T;
  errors?: Array<{ message?: string }>;
  messages?: Array<{ message?: string }>;
};

function runtimeVar(name:string) {
  const values=env as unknown as Record<string,unknown>;
  return String(values[name] || "").trim();
}

function config() {
  return {
    accountId:runtimeVar("PORTAL_REALTIMEKIT_ACCOUNT_ID"),
    appId:runtimeVar("PORTAL_REALTIMEKIT_APP_ID"),
    apiToken:runtimeVar("PORTAL_REALTIMEKIT_API_TOKEN"),
    hostPreset:runtimeVar("PORTAL_REALTIMEKIT_HOST_PRESET"),
    participantPreset:runtimeVar("PORTAL_REALTIMEKIT_PARTICIPANT_PRESET"),
  };
}

export function getRealtimeKitRuntimeStatus() {
  const values=config();
  return {
    configured:Boolean(values.accountId && values.appId && values.apiToken),
    accountConfigured:Boolean(values.accountId),
    appConfigured:Boolean(values.appId),
    tokenConfigured:Boolean(values.apiToken),
  };
}

function errorMessage(payload:CloudflareEnvelope<unknown>|null,status:number) {
  const message=payload?.errors?.find((item)=>item?.message)?.message
    || payload?.messages?.find((item)=>item?.message)?.message;
  return message || `RealtimeKit API isteği başarısız oldu (${status}).`;
}

async function realtimeRequest<T>(path:string,init:RequestInit={}) {
  const values=config();
  if(!values.accountId || !values.appId || !values.apiToken){
    throw new Error("Cloudflare RealtimeKit yapılandırması tamamlanmadı.");
  }
  const response=await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(values.accountId)}/realtime/kit/${encodeURIComponent(values.appId)}${path}`,
    {
      ...init,
      headers:{
        "Authorization":`Bearer ${values.apiToken}`,
        "Content-Type":"application/json",
        ...(init.headers || {}),
      },
      cache:"no-store",
    }
  );
  let payload:CloudflareEnvelope<T>|null=null;
  try {
    payload=await response.json() as CloudflareEnvelope<T>;
  } catch {
    payload=null;
  }
  if(!response.ok || !payload?.success || payload.data===undefined){
    throw new Error(errorMessage(payload,response.status));
  }
  return payload.data;
}

function asArray<T>(value:unknown):T[] {
  if(Array.isArray(value)) return value as T[];
  if(value && typeof value==="object"){
    const row=value as Record<string,unknown>;
    if(Array.isArray(row.data)) return row.data as T[];
    if(Array.isArray(row.results)) return row.results as T[];
  }
  return [];
}

async function choosePreset(role:"host"|"participant",mode:string) {
  const values=config();
  const explicit=role==="host" ? values.hostPreset : values.participantPreset;
  if(explicit) return explicit;

  const raw=await realtimeRequest<RealtimeKitPreset[]|Record<string,unknown>>("/presets");
  const presets=asArray<RealtimeKitPreset>(raw);
  if(!presets.length) throw new Error("RealtimeKit uygulamasında kullanılabilir preset bulunamadı.");

  const desiredView=mode==="audio" ? "AUDIO_ROOM" : "GROUP_CALL";
  const viewMatches=presets.filter((preset)=>String(preset.config?.view_type || "").toUpperCase()===desiredView);
  const candidates=viewMatches.length
    ? viewMatches
    : presets.filter((preset)=>String(preset.config?.view_type || "").toUpperCase()==="GROUP_CALL");
  const usable=candidates.length ? candidates : presets;

  const named=usable.find((preset)=>{
    const name=String(preset.name || "").toLowerCase();
    return role==="host"
      ? /(host|admin|moderator)/.test(name)
      : /(participant|member|attendee|guest)/.test(name) && !/(host|admin|moderator)/.test(name);
  });
  const nonHost=role==="participant"
    ? usable.find((preset)=>!/(host|admin|moderator)/.test(String(preset.name || "").toLowerCase()))
    : null;
  const selected=named || nonHost || usable[0];
  const name=String(selected?.name || "").trim();
  if(!name) throw new Error("RealtimeKit preset adı çözümlenemedi.");
  return name;
}

async function ensureProviderMeeting(portalMeetingId:string,title:string) {
  await ensurePortalCollaborationFinanceSchema();
  const database=collaborationDb();
  const existing=await database.prepare(
    "SELECT provider_meeting_id FROM portal_meeting_transports WHERE meeting_id=? AND provider='cloudflare-realtimekit' LIMIT 1"
  ).bind(portalMeetingId).first<{provider_meeting_id:string}>();
  if(existing?.provider_meeting_id) return existing.provider_meeting_id;

  const created=await realtimeRequest<RealtimeKitMeeting>("/meetings",{
    method:"POST",
    body:JSON.stringify({
      title,
      persist_chat:true,
      record_on_start:false,
      live_stream_on_start:false,
    }),
  });
  const providerMeetingId=String(created?.id || "").trim();
  if(!providerMeetingId) throw new Error("RealtimeKit toplantı kimliği alınamadı.");

  await database.prepare(
    "INSERT OR IGNORE INTO portal_meeting_transports (meeting_id,provider,provider_meeting_id) VALUES (?,'cloudflare-realtimekit',?)"
  ).bind(portalMeetingId,providerMeetingId).run();

  const winner=await database.prepare(
    "SELECT provider_meeting_id FROM portal_meeting_transports WHERE meeting_id=? AND provider='cloudflare-realtimekit' LIMIT 1"
  ).bind(portalMeetingId).first<{provider_meeting_id:string}>();
  return String(winner?.provider_meeting_id || providerMeetingId);
}

async function listProviderParticipants(providerMeetingId:string) {
  const raw=await realtimeRequest<RealtimeKitParticipant[]|Record<string,unknown>>(
    `/meetings/${encodeURIComponent(providerMeetingId)}/participants?per_page=100&page_no=1`
  );
  return asArray<RealtimeKitParticipant>(raw);
}

async function participantToken(input:{
  providerMeetingId:string;
  memberId:string;
  name:string;
  role:"host"|"participant";
  mode:string;
}) {
  const participants=await listProviderParticipants(input.providerMeetingId);
  const existing=participants.find((item)=>String(item.custom_participant_id || "")===input.memberId);
  if(existing?.id){
    const refreshed=await realtimeRequest<{token?:string}>(
      `/meetings/${encodeURIComponent(input.providerMeetingId)}/participants/${encodeURIComponent(String(existing.id))}/token`,
      {method:"POST"}
    );
    const token=String(refreshed?.token || "").trim();
    if(token) return token;
  }

  const presetName=await choosePreset(input.role,input.mode);
  try {
    const created=await realtimeRequest<RealtimeKitParticipant>(
      `/meetings/${encodeURIComponent(input.providerMeetingId)}/participants`,
      {
        method:"POST",
        body:JSON.stringify({
          name:input.name,
          preset_name:presetName,
          custom_participant_id:input.memberId,
        }),
      }
    );
    const token=String(created?.token || "").trim();
    if(!token) throw new Error("RealtimeKit katılımcı tokenı alınamadı.");
    return token;
  } catch(error) {
    const latest=await listProviderParticipants(input.providerMeetingId);
    const duplicate=latest.find((item)=>String(item.custom_participant_id || "")===input.memberId);
    if(!duplicate?.id) throw error;
    const refreshed=await realtimeRequest<{token?:string}>(
      `/meetings/${encodeURIComponent(input.providerMeetingId)}/participants/${encodeURIComponent(String(duplicate.id))}/token`,
      {method:"POST"}
    );
    const token=String(refreshed?.token || "").trim();
    if(!token) throw error;
    return token;
  }
}

export async function provisionRealtimeKitJoin(input:{
  portalMeetingId:string;
  title:string;
  memberId:string;
  memberName:string;
  role:"host"|"participant";
  mode:string;
}) {
  if(!getRealtimeKitRuntimeStatus().configured){
    throw new Error("Cloudflare RealtimeKit yapılandırması tamamlanmadı.");
  }
  const providerMeetingId=await ensureProviderMeeting(input.portalMeetingId,input.title);
  const authToken=await participantToken({
    providerMeetingId,
    memberId:input.memberId,
    name:input.memberName,
    role:input.role,
    mode:input.mode,
  });
  return {
    provider:"cloudflare-realtimekit" as const,
    providerMeetingId,
    authToken,
  };
}

export async function endRealtimeKitSession(portalMeetingId:string) {
  if(!getRealtimeKitRuntimeStatus().configured) return false;
  await ensurePortalCollaborationFinanceSchema();
  const database=collaborationDb();
  const row=await database.prepare(
    "SELECT provider_meeting_id FROM portal_meeting_transports WHERE meeting_id=? AND provider='cloudflare-realtimekit' LIMIT 1"
  ).bind(portalMeetingId).first<{provider_meeting_id:string}>();
  const providerMeetingId=String(row?.provider_meeting_id || "").trim();
  if(!providerMeetingId) return false;

  try {
    await realtimeRequest<Record<string,unknown>>(
      `/meetings/${encodeURIComponent(providerMeetingId)}/active-session/kick-all`,
      {method:"POST",body:"{}"}
    );
  } catch {
    // A meeting without an active session returns an error; it is still safe to deactivate it.
  }

  await realtimeRequest<RealtimeKitMeeting>(
    `/meetings/${encodeURIComponent(providerMeetingId)}`,
    {method:"PATCH",body:JSON.stringify({status:"INACTIVE"})}
  );
  return true;
}

