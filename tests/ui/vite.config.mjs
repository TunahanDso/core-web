import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
const repo=process.cwd();
export default defineConfig({root:path.join(repo,'tests/ui'),publicDir:path.join(repo,'public'),plugins:[react()],resolve:{alias:[
 {find:'next/link',replacement:path.join(repo,'tests/ui/navigation.tsx')},
 {find:'next/navigation',replacement:path.join(repo,'tests/ui/navigation.tsx')},
 {find:/^@capacitor\//,replacement:path.join(repo,'tests/ui/native.ts')+'?plugin='},
 {find:/^@\/app\/portal\/(actions|mailbox-actions|mobile-actions|collaboration-actions)$/,replacement:path.join(repo,'tests/ui/actions.ts')},
 {find:/^@\/lib\/portal\/(auth|db|mailbox|vault|mobile|control|collaboration)$/,replacement:path.join(repo,'tests/ui/data.ts')},
 {find:'@/lib/cms/db',replacement:path.join(repo,'tests/ui/data.ts')},
 {find:'cloudflare:workers',replacement:path.join(repo,'tests/ui/data.ts')},
 {find:'@/components/portal/PortalBanner',replacement:path.join(repo,'tests/ui/banner.tsx')},
 {find:'@',replacement:repo}
]},server:{host:'0.0.0.0',port:4173,fs:{allow:[repo]}}});
