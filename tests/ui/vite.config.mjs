import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
const repo=process.cwd();
export default defineConfig({root:path.join(repo,'tests/ui'),publicDir:path.join(repo,'public'),plugins:[react()],resolve:{alias:[
 {find:'next/link',replacement:path.join(repo,'tests/ui/navigation.tsx')},
 {find:'next/navigation',replacement:path.join(repo,'tests/ui/navigation.tsx')},
 {find:'@/app/portal/actions',replacement:path.join(repo,'tests/ui/actions.ts')},
 {find:'@/components/portal/PortalBanner',replacement:path.join(repo,'tests/ui/banner.tsx')},
 {find:'@',replacement:repo}
]},server:{host:'0.0.0.0',port:4173,fs:{allow:[repo]}}});
