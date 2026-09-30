// Synthetic data only. Production server pages are rendered with their real markup.
export const env={};
export const fixtureMember={id:'fixture',fullName:'Örnek Mühendis',email:'fixture@example.test',role:'admin',teams:['CORE Systems']};
export async function requirePortalMember(){return fixtureMember;}
export async function listPortalChannelsForMember(){return [{id:'general',name:'Duyurular',description:'Takım geneli resmî duyurular.',last_message:'Test planı hazır.',unread_count:1}];}
export async function listPortalMessages(){return Array.from({length:24},(_,i)=>({id:String(i),full_name:'Örnek Mühendis',email:fixtureMember.email,role:'lead',created_at:'2026-09-30 12:54',body:'Tasarım incelemesi ve test planı için mesaj '+(i+1)}));}
export async function listPortalMembers(){return [{id:'other',full_name:'Takım Arkadaşı',email:'other@example.test',status:'active'}];}
export async function getPortalMailboxCounts(){return {inbox:1,starred:0,archive:0,trash:0};}
export async function listPortalMailboxThreads(){return [{id:'thread',subject:'Tasarım incelemesi',preview:'Test planı hazır.',last_author:'Örnek Mühendis',message_count:24,unread:1,updated_at:'2026-09-30'}];}
export async function getPortalMailThread(){return {thread:{id:'thread',subject:'Tasarım incelemesi'},messages:await listPortalMessages()};}
export async function getPortalMailDraft(){return null;}
export async function listPortalMailDrafts(){return [];}
export async function listPortalMailAttachments(){return [];}
export async function listPortalMailParticipants(){return [fixtureMember];}
export async function listPortalMailGroups(){return [];}
export async function listPortalJoinableMailGroups(){return [];}
export async function listPortalMailGroupMembers(){return [];}
export async function listPortalMailThreadGroups(){return [];}
export async function listPortalVaultFiles(){return [];}
export function formatVaultBytes(){return '0 B';}
export async function listPortalMobileDevices(){return [];}
export function portalMobilePublicConfig(){return {appVersion:'test',appScheme:'ytucore',appStoreUrl:'',playStoreUrl:''};}
export function getRealtimeKitRuntimeStatus(){return {configured:false,accountConfigured:false,appConfigured:false,tokenConfigured:false};}

const longToken='kesintisizProjeKodu'.repeat(8);
export async function listProjects(){return [{id:'project',slug:longToken,titleTr:'Otonom platform doğrulama'}];}
export async function listPortalTasks(){return [
  {id:'task-done',title:'Mobil kontrol: tamamlanmış görev',description:'Uzun bir açıklama: '+longToken,status:'done',priority:'critical',assignee_id:'fixture',assignee_name:'Örnek Uzun Soyadlı Takım Mühendisi',project_slug:longToken,team_code:'CORE',due_at:'2026-10-01T21:36'},
  {id:'task-open',title:'Tasarım revizyonu ve test planı',description:'Açık görevin ayrıntıları.',status:'doing',priority:'medium',assignee_id:'other',assignee_name:'Takım Arkadaşı',project_slug:'hydronom',team_code:'CORE',due_at:null},
];}
export async function listAccessiblePortalTeams(){return [{code:'CORE',name:'CORE Systems'}];}
export async function listPortalProjectRegistry(){return [{slug:'hydronom',title:'Hydronom'}];}
export async function listMeetingSpaces(){return [{id:'space',name:'Tasarım ve doğrulama çalışma grubu',description:longToken,visibility:'members',team_code:'CORE',project_slug:longToken,meeting_count:1}];}
export async function listMeetings(){return [{id:'meeting',title:'Mobil toplantı kontrolü ve uzun gündem başlığı',agenda:longToken,space_name:'Tasarım ve doğrulama çalışma grubu',team_code:'CORE',project_slug:'hydronom',creator_name:'Örnek Mühendis',status:'completed',starts_at:'2026-09-29T16:49',participant_count:12,decision_count:1,poll_count:2,report_count:1}];}
