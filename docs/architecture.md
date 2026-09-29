# CORE Web Architecture

## 1. Trust boundaries

CORE Web is intentionally split into four execution boundaries.

**Public/CMS Worker.** Next/vinext serves the public site, authenticated portal and Access-protected admin surface. User-facing web code never receives vehicle command authority or runner platform credentials.

**D1/R2 data plane.** D1 stores relational product state and R2 stores Vault objects, embedded repository objects, logs/artifacts and media. SQL migrations are the schema source of truth; runtime schema text is generated.

**CORE Runner.** Code execution and interactive shells run in a separate Cloudflare Container/Workflow service. Allowlisted jobs and interactive terminals have different lifecycle records and separate container IDs. Runtime internet is denied.

**Native shells.** Capacitor and Tauri are clients of the authenticated web surface. They do not implicitly gain privileged OS bridges. Every future local filesystem, serial, SSH, Git or CAD bridge requires a narrow command API and an explicit permission model.

## 2. Request security

`proxy.ts` upgrades HTTP to HTTPS before locale routing and applies the common browser-security policy. Cloudflare edge HTTPS redirection remains a second line of defense.

`/admin/**` is fail-closed in `app/admin/layout.tsx`; missing or invalid Access identity produces no admin application.

Portal authentication uses one-time invite activation, PBKDF2 password hashes, failed-login lockout, HttpOnly/Secure cookies and revocable server sessions.

## 3. Portal render path

The authenticated member layout performs only member authentication. Capability evaluation is centralized in `PortalShell`.

Native counters are no longer queried during ordinary desktop navigation. `PortalNativeGate` dynamically loads the native experience only inside Capacitor, and `/api/portal/native/summary` supplies native-only counters.

The mobile runtime is similarly lazy-loaded by `PortalMobileRuntimeGate`, keeping Capacitor plugin graphs out of ordinary desktop navigation.

## 4. CSS boundaries

Global surface coupling is forbidden. Shared primitives live in `app/base.css`; public, admin and portal styles are loaded from their corresponding route layouts. CI checks that public/admin bundles do not absorb engineering workbench modules.

## 5. Database schema

`migrations/0001_public_cms.sql` and subsequent migrations are canonical. Portal runtime bootstrap imports `lib/portal/schema.generated.ts`, produced deterministically by `scripts/generate-portal-schema.mjs`.

Generated schema drift is a CI failure. Hand-maintained SQL copies inside TypeScript are not allowed.

## 6. Search and registries

Control Center is server-scoped by entity type. A tab navigation requests one bounded registry (maximum 100 rows) plus small editor lookup sets; it does not preload every registry.

Global search pushes its query into D1 for the large engineering registries and caps each source. Search must never become an unbounded `SELECT *` fan-out.

## 7. Code Lab and terminal

Job pages poll a lightweight status endpoint and refresh the RSC page only when the job reaches a terminal state.

Live terminal URLs contain no capability token. The browser sends the capability as a WebSocket subprotocol; the runner validates it and strips it before forwarding the socket to the container. The container uses a real PTY with resize support, one live connection per session, 10-minute idle timeout and a hard expiry.

## 8. Deliberate non-claims

The embedded R2 repository engine is not Git protocol compatibility. Desktop is not yet a local engineering agent. Vault derivatives are not complete until a converter service drains the derivative queue. Meetings are not a mature SFU/recording service. Budget is an internal ledger, not accounting software.

These are release gates, not marketing features. Their current status is tracked in `docs/production-readiness.md`.
