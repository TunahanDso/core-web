import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import mailWorker from '../../services/core-mail/src/index.js';

const repo=process.cwd(), outputs=[];
const env=globalThis.__inviteMailEnv={};
const originalFetch=globalThis.fetch;
const invite={inviteId:'invite-1',email:'student@example.test',fullName:'Test <Member>',code:'PRIVATE-ONE-TIME-CODE',expiresAt:'2026-10-03T15:00:00Z'};
async function bundle(entry, mocks, name) {
  const out=path.join(repo,'node_modules/.cache',name+'.mjs');outputs.push(out);
  await build({entryPoints:[path.join(repo,entry)],outfile:out,bundle:true,platform:'node',format:'esm',plugins:[{
    name:'isolated-mail-dependencies',setup(b){
      b.onResolve({filter:/.*/},args=>Object.hasOwn(mocks,args.path)?{path:args.path,namespace:'mock'}:undefined);
      b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'js'}));
    },
  }]});
  return import(pathToFileURL(out));
}
const mail=await bundle('lib/portal/mail.ts',{'cloudflare:workers':'export const env=globalThis.__inviteMailEnv;'},'invite-mail-test');
const actions=await bundle('app/admin/portal-actions.ts',{
  '@/lib/cms/auth':'export const requireAdminIdentity=(...args)=>globalThis.__inviteActionTest.auth(...args);',
  '@/lib/portal/bootstrap':'export const applyPortalFoundation=()=>{};',
  '@/lib/portal/db':`export const createPortalInvite=(...args)=>globalThis.__inviteActionTest.create(...args);
    export const reissuePortalInvite=(...args)=>globalThis.__inviteActionTest.reissue(...args);
    export const recordPortalInviteDelivery=(...args)=>globalThis.__inviteActionTest.record(...args);
    export const finishPortalInviteDelivery=(...args)=>globalThis.__inviteActionTest.finish(...args);
    export const setPortalMemberStatus=()=>{};`,
  '@/lib/portal/mail':'export const sendPortalInvitationEmail=(...args)=>globalThis.__inviteActionTest.send(...args);export const sendPortalTestEmail=()=>{};',
  'next/cache':'export const revalidatePath=()=>{};',
  'next/navigation':'export const redirect=()=>{throw Error("redirect")};',
},'invite-actions-test');

afterEach(()=>{for(const key of Object.keys(env))delete env[key];globalThis.fetch=originalFetch;delete globalThis.__inviteActionTest;});
after(async()=>{await Promise.all(outputs.map(out=>fs.rm(out,{force:true})));delete globalThis.__inviteMailEnv;});
const send=()=>mail.sendPortalInvitationEmail({to:invite.email,...invite});
function json(body,status=200){return new Response(JSON.stringify(body),{status});}
function noFallback(){env.RESEND_API_KEY='test-only';globalThis.fetch=()=>{assert.fail('An uncertain or rejected send must not be retried via another provider');};}

test('activation email goes to the requested recipient and only reports accepted with a tracking ID',async()=>{
  noFallback();let sent;
  env.MAIL_SERVICE={fetch:async(url,init)=>{sent=JSON.parse(init.body);return json({ok:true,messageId:'cf-123'});}};
  assert.deepEqual(await send(),{status:'sent',provider:'cloudflare',messageId:'cf-123'});
  assert.equal(sent.to,invite.email);assert.ok(sent.text.includes(invite.code));assert.ok(sent.html.includes(invite.code));
  assert.ok(sent.html.includes('Test &lt;Member&gt;'));assert.equal(sent.from.email,'portal@ytucore.com');
});
test('missing tracking IDs, malformed responses and timeouts remain unconfirmed without duplicate sending',async()=>{
  noFallback();
  for(const response of [()=>json({ok:true}),()=>new Response('unreadable'),()=>{throw Error('timeout');}]){
    env.MAIL_SERVICE={fetch:async()=>response()};const result=await send();
    assert.equal(result.status,'pending');assert.equal(result.messageId,undefined);
  }
});
test('suppressed or disallowed recipients are not routed around the provider rejection',async()=>{
  noFallback();
  for(const code of ['E_RECIPIENT_SUPPRESSED','E_RECIPIENT_NOT_ALLOWED','E_VALIDATION_ERROR']){
    env.MAIL_SERVICE={fetch:async()=>json({ok:false,code,error:'rejected'},502)};
    const result=await send();assert.equal(result.status,'failed');assert.equal(result.errorCode,code);assert.ok(result.error);
  }
});
test('an explicitly failed sender can use the configured fallback once',async()=>{
  env.MAIL_SERVICE={fetch:async()=>json({ok:false,code:'E_SENDER_NOT_VERIFIED',error:'sender unavailable'},502)};
  env.RESEND_API_KEY='test-only';let count=0;
  globalThis.fetch=async(url,init)=>{count++;assert.equal(url,'https://api.resend.com/emails');assert.deepEqual(JSON.parse(init.body).to,[invite.email]);return json({id:'resend-123'});};
  assert.deepEqual(await send(),{status:'sent',provider:'resend',messageId:'resend-123'});assert.equal(count,1);
});
test('fallback success without a message ID is also unconfirmed',async()=>{
  env.RESEND_API_KEY='test-only';globalThis.fetch=async()=>json({});
  assert.equal((await send()).status,'pending');
});
test('CORE Mail preserves recipient error codes and marks unknown binding failures as uncertain',async()=>{
  const request=()=>new Request('https://core-mail.internal/v1/send',{method:'POST',body:JSON.stringify({to:invite.email,subject:'Invitation',text:'Fixture'})});
  let response=await mailWorker.fetch(request(),{EMAIL:{send:async()=>{throw Object.assign(Error('suppressed'),{code:'E_RECIPIENT_SUPPRESSED'});}}});
  assert.equal(response.status,502);assert.equal((await response.json()).code,'E_RECIPIENT_SUPPRESSED');
  response=await mailWorker.fetch(request(),{EMAIL:{send:async()=>{throw Error('connection lost');}}});
  const body=await response.json();assert.equal(body.status,'pending');
  noFallback();env.MAIL_SERVICE={fetch:async()=>json(body,502)};assert.equal((await send()).status,'pending');
  response=await mailWorker.fetch(request(),{EMAIL:{send:async()=>({})}});
  assert.equal(response.status,202);assert.equal((await response.json()).status,'pending');
});
test('legacy binding ambiguity does not trigger a second delivery',async()=>{
  noFallback();env.EMAIL={send:async()=>{throw Error('connection lost');}};
  assert.equal((await send()).status,'pending');
});

function setupAction(overrides={}){
  const events=[];
  globalThis.__inviteActionTest={
    auth:async()=>{events.push('auth');return{email:'admin@example.test',payload:{}};},
    create:async()=>{events.push('create');return invite;},
    reissue:async()=>{events.push('reissue');return invite;},
    record:async(data)=>{events.push('record');assert.equal(data.status,'pending');return'attempt-1';},
    send:async(data)=>{events.push('send');assert.equal(data.code,invite.code);return{status:'sent',provider:'cloudflare',messageId:'cf-123'};},
    finish:async(id,data)=>{events.push('finish');assert.equal(id,'attempt-1');assert.equal(data.messageId,'cf-123');},
    ...overrides,
  };
  const form=new FormData();form.set('email',invite.email);form.set('fullName',invite.fullName);form.set('memberId','member-1');
  return{events,form};
}
test('create and reissue authenticate, persist the attempt before sending and never return the activation secret',async()=>{
  for(const [action,event] of [[actions.createPortalInviteAdminAction,'create'],[actions.reissuePortalInviteAdminAction,'reissue']]){
    const {events,form}=setupAction();const result=await action({},form);
    assert.deepEqual(events,['auth',event,'record','send','finish']);
    assert.equal(result.deliveryStatus,'sent');assert.equal(result.deliveryMessageId,'cf-123');
    assert.ok(!JSON.stringify(result).includes(invite.code));assert.equal(result.error,undefined);
  }
});
test('unauthorized requests cannot create an invitation or send mail',async()=>{
  const {events,form}=setupAction({auth:async()=>{throw Error('Unauthorized');}});
  assert.equal((await actions.createPortalInviteAdminAction({},form)).error,'Unauthorized');assert.deepEqual(events,[]);
});
test('a failed initial audit write prevents sending and explains that the invite already exists',async()=>{
  const {events,form}=setupAction({record:async()=>{throw Error('database unavailable');}});
  const result=await actions.createPortalInviteAdminAction({},form);
  assert.deepEqual(events,['auth','create']);assert.match(result.error,/Mail gönderilmedi/);assert.equal(result.deliveryStatus,undefined);
});
test('a failed final audit write retains the accepted tracking ID rather than claiming sending failed',async()=>{
  const {form}=setupAction({finish:async()=>{throw Error('database unavailable');}});
  const result=await actions.createPortalInviteAdminAction({},form);
  assert.equal(result.deliveryStatus,'sent');assert.equal(result.deliveryMessageId,'cf-123');assert.ok(result.deliveryWarning);assert.equal(result.error,undefined);
  assert.ok(!JSON.stringify(result).includes(invite.code));
});
