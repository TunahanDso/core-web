# YTÜ CORE

YTÜ CORE is the public site and private engineering workspace of the Yıldız Technical University student engineering organization.

The repository contains several surfaces with deliberately different trust boundaries:

- **Public site** — bilingual public pages and CMS-backed showcase content.
- **Admin CMS** — Cloudflare Access-protected content and operations surface. It fails closed when Access is not configured.
- **CORE Portal** — authenticated member workspace for tasks, teams, projects, Vault, mail/chat, meetings, polls, budget records, engineering viewers and operational metadata.
- **CORE Runner** — separate Cloudflare Container/Workflow service for allowlisted jobs and short-lived interactive terminal sessions. Runtime internet is denied.
- **Mobile shell** — Capacitor Android/iOS wrapper. Native runtime code is lazy-loaded only on mobile/native clients.
- **Desktop shell** — Tauri wrapper for the portal. It remains a thin shell; local Git, serial/USB, SSH, CAD launching and offline workspace are not release-ready features and must not be presented as such.

## Truthful product boundaries

The in-portal repository workspace is an internal R2-backed repository model unless an external repository service is configured. It is **not Git Smart HTTP** and does not claim `git clone` / `git push` compatibility.

The portal is **not the vehicle command plane**. Vehicle telemetry/metadata may be displayed, but command authority remains isolated from the web application.

Vault supports engineering-file storage and preview workflows. STEP/IGES conversion is not considered production-ready until the converter worker/container is deployed and the derivative queue is proven end to end.

Meeting records, polls and budget ledgers are collaboration/governance tools; they are not substitutes for a production SFU/recording platform or statutory accounting software.

## Security invariants

Production requests are upgraded to HTTPS at the application edge and responses receive CSP, HSTS, clickjacking, MIME-sniffing, referrer and permissions policies. Cloudflare **Always Use HTTPS** must also remain enabled as a platform-level defense.

Portal session cookies are HttpOnly, Secure and SameSite=Lax. Server-side sessions are revocable and expire after 24 hours. Admin routes require a valid Cloudflare Access identity and never fall back to public/read-only admin pages.

Live-terminal capabilities never travel in the URL. Browser authentication uses a WebSocket subprotocol; the runner consumes the secret at the edge and forwards only the non-secret protocol to the container. Terminal sessions have a single-connection lock, idle timeout and hard expiry.

Secrets belong in Cloudflare secrets or equivalent secret storage. IDs, audience identifiers, bucket names and service hostnames are identifiers, not secrets; no bearer token, API key or private key may be committed.

See `SECURITY.md` and `docs/production-readiness.md` before a release.

## Data and schema

`migrations/*.sql` is the **single source of truth** for D1 schema.

`lib/portal/schema.generated.ts` is generated from migrations and must not be edited by hand:

```bash
npm run schema:generate
npm run schema:check
```

CI rejects schema drift.

## Local verification

```bash
npm ci
npm run schema:check
npm run typecheck
npm run build
npm run runner:check
```

Native and desktop workflows have their own GitHub Actions checks.

## Styling boundaries

The former monolithic stylesheet is retired. Route surfaces load:

- `app/base.css` — shared primitives only
- `app/public.css` — public site
- `app/admin/admin.css` — CMS
- `app/portal/portal.css` — portal/mobile/desktop workbenches

Do not add new rules to `app/globals.css`; it exists only as an empty compatibility marker.

## Deployment

The production application uses Cloudflare Workers, D1, R2 and related platform bindings configured in `wrangler.jsonc`. Repository identifiers in that file are not credentials.

A release is not considered production-ready if any mandatory gate in `docs/production-readiness.md` is open.
