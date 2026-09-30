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
