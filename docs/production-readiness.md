# Production Readiness Gates

This file is a release contract. A feature may exist in source without being declared production-ready.

## Mandatory platform gates

- Cloudflare **Always Use HTTPS** enabled for `ytucore.com`.
- TLS certificate active for apex and required subdomains.
- Cloudflare Access policy configured for `/admin/**`; application fail-closed behavior is already enforced in code.
- Secrets stored outside Git. Rotate any secret that was ever committed or placed in a URL.
- Mail domain has provider onboarding, SPF, DKIM and DMARC validation before external delivery is called healthy.
- Native push has production APNs/FCM credentials and an end-to-end device delivery test before push is called healthy.
- Desktop installers are code-signed before broad team distribution. Unsigned preview artifacts are developer-only.
- Replace personal `*.workers.dev` runner hostnames with an organization-controlled service hostname before treating the runner as a stable production dependency.

## Required verification on every release

```bash
npm ci
npm run schema:check
npm run typecheck
npm run build
npm run runner:check
```

GitHub Actions must also pass the mobile-native, desktop-native and runner workflows.

## Product gates

**Vault conversion:** queued STEP/IGES/CAM derivatives are not advertised as available until a converter consumes the queue, produces deterministic derivatives, records engine/version metadata and passes fixture tests.

**Repository service:** embedded R2 repositories are described as CORE repository workspaces, not Git. `git clone` / `git push` claims require a real Git protocol service with concurrency, authorization and durability tests.

**Desktop:** local Git/filesystem/serial/USB/SSH/CAD launch/offline/updater features require narrow Tauri commands, explicit user permission, audit logs and platform packaging tests.

**Meetings:** audio/video recording/transcription requires a separately reviewed media/SFU boundary. The Worker may coordinate rooms and metadata; it must not pretend to be a media plane.

**Finance:** budget records remain an internal approval ledger until accounting requirements, retention and export controls are defined.

## Capacity gates

D1 and the main Worker remain acceptable while measured latency/CPU/query counts stay inside the service SLO. Splitting storage or Workers is triggered by measured contention, not module count alone. Portal navigation, Control Center, global search and native summary must be measured independently.

Runner concurrency, queue wait and container saturation must be visible before increasing team-wide usage.

## Release language

UI and docs must distinguish **available**, **preview**, **planned** and **blocked by deployment gate**. A placeholder, queue record or thin shell is never described as a finished product.
