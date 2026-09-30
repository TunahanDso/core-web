export async function logoutPortalAction() { /* UI fixture: no production actions. */ }
export const openChatChannelAction=logoutPortalAction,sendChatMessageAction=logoutPortalAction;
export const createMailboxThreadAction=logoutPortalAction,deleteMailboxDraftAction=logoutPortalAction,mutateMailboxThreadAction=logoutPortalAction,openMailboxThreadAction=logoutPortalAction,replyMailboxThreadAction=logoutPortalAction,saveMailboxDraftAction=logoutPortalAction,createMailboxGroupAction=logoutPortalAction,joinMailboxGroupAction=logoutPortalAction,deleteMailboxGroupAction=logoutPortalAction;
export const revokePortalMobileDeviceAction=logoutPortalAction,setPortalMobileDeviceTrustAction=logoutPortalAction;
export const createTaskAction=logoutPortalAction;
export async function updateTaskStatusAction(data:FormData){
  document.documentElement.dataset.fixtureTaskStatus=String(data.get('id'))+':'+String(data.get('status'));
}
export const createMeetingAction=logoutPortalAction,createMeetingSpaceAction=logoutPortalAction;
