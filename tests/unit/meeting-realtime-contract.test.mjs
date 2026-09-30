import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../../'+path,import.meta.url),'utf8');

test('RealtimeKit meeting transport keeps Cloudflare API token server-side',()=>{
  const wrangler=read('wrangler.jsonc');
  const types=read('types/cloudflare-workers.d.ts');
  const route=read('app/api/portal/meetings/[id]/realtime/route.ts');
  const backend=read('lib/portal/meeting-realtime.ts');

  assert.match(wrangler,/"keep_vars": true/);
  assert.doesNotMatch(wrangler,/"PORTAL_REALTIMEKIT_ACCOUNT_ID"\s*:/);
  assert.doesNotMatch(wrangler,/"PORTAL_REALTIMEKIT_APP_ID"\s*:/);
  assert.doesNotMatch(wrangler,/PORTAL_REALTIMEKIT_API_TOKEN/);
  assert.match(types,/PORTAL_REALTIMEKIT_ACCOUNT_ID\?: string/);
  assert.match(types,/PORTAL_REALTIMEKIT_APP_ID\?: string/);
  assert.match(types,/PORTAL_REALTIMEKIT_API_TOKEN\?: string/);
  assert.match(backend,/runtimeVar\("PORTAL_REALTIMEKIT_API_TOKEN"\)/);
  assert.match(route,/getPortalMember\(\)/);
  assert.match(route,/getMeeting\(meetingId,member\.id\)/);
  assert.match(route,/"Cache-Control":"private, no-store, max-age=0"/);
});

test('RealtimeKit backend provisions meetings and per-member participant tokens',()=>{
  const backend=read('lib/portal/meeting-realtime.ts');
  assert.match(backend,/\/meetings",\{\s*method:"POST"/s);
  assert.match(backend,/\/participants`/);
  assert.match(backend,/custom_participant_id:input\.memberId/);
  assert.match(backend,/\/token`/);
  assert.match(backend,/portal_meeting_transports/);
  assert.match(backend,/active-session\/kick-all/);
  assert.match(backend,/status:"INACTIVE"/);
});

test('meeting UI uses pinned RealtimeKit Web Components and secure join endpoint',()=>{
  const panel=read('components/portal/MeetingTransportPanel.tsx');
  const loader=read('public/realtimekit-loader.js');
  const nextConfig=read('next.config.mjs');

  assert.match(panel,/@cloudflare\/realtimekit@2\.0\.2\/dist\/browser\.js/);
  assert.match(loader,/@cloudflare\/realtimekit-ui@2\.0\.2\/loader\/index\.es2017\.js/);
  assert.match(panel,/fetch\("\/api\/portal\/meetings\/"\+encodeURIComponent\(meetingId\)\+"\/realtime"/);
  assert.match(panel,/document\.createElement\("rtk-meeting"\)/);
  assert.match(panel,/showSetupScreen=true/);
  assert.match(panel,/element\.mode="fill"/);
  assert.match(panel,/element\.loadConfigFromPreset=true/);
  assert.match(panel,/self\?\.show\?\.\(\)/);
  assert.match(panel,/registerVideoElement\?\.\(element\)/);
  assert.match(panel,/listen\(self,"roomLeft",onRoomLeft\)/);
  assert.match(nextConfig,/script-src 'self' 'unsafe-inline' https:\/\/cdn\.jsdelivr\.net/);
});

test('meeting realtime migration is included in generated schema pipeline',()=>{
  const migration=read('migrations/0014_meeting_realtime.sql');
  const generator=read('scripts/generate-portal-migrations.mjs');
  const generated=read('lib/generated/portal-migrations.ts');
  const bootstrap=read('lib/portal/bootstrap.ts');

  assert.match(migration,/CREATE TABLE IF NOT EXISTS portal_meeting_transports/);
  assert.match(generator,/PORTAL_V14_SQL/);
  assert.match(generated,/export const PORTAL_V14_SQL/);
  assert.match(bootstrap,/PORTAL_V12_SQL \+ "\\n" \+ PORTAL_V14_SQL/);
  assert.match(bootstrap,/"portal_meeting_transports"/);
});

test('native shell provisioning includes camera and microphone permissions',()=>{
  const nativeConfig=read('mobile/scripts/configure-native.mjs');
  assert.match(nativeConfig,/android\.permission\.CAMERA/);
  assert.match(nativeConfig,/android\.permission\.RECORD_AUDIO/);
  assert.match(nativeConfig,/NSCameraUsageDescription/);
  assert.match(nativeConfig,/NSMicrophoneUsageDescription/);
});

test('RealtimeKit lifecycle returns control to CORE and verifies provider-ended state',()=>{
  const panel=read('components/portal/MeetingTransportPanel.tsx');
  const route=read('app/api/portal/meetings/[id]/realtime/lifecycle/route.ts');
  const backend=read('lib/portal/meeting-realtime.ts');

  assert.match(panel,/\/realtime\/lifecycle"/);
  assert.match(panel,/router\.replace\("\/portal\/meetings\/"/);
  assert.match(route,/getPortalMember\(\)/);
  assert.match(route,/\["host","moderator"\]/);
  assert.match(route,/syncEndedRealtimeKitSession/);
  assert.match(backend,/\/active-session\`/);
  assert.match(backend,/status \|\| ""\)\.toUpperCase\(\)!=="ENDED"/);
  assert.match(backend,/UPDATE portal_meetings SET status='completed'/);
  assert.match(backend,/JSON\.stringify\(\{status:"INACTIVE"\}\)/);
});
