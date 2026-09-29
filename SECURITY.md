# YTÜ CORE Security Model

## Public configuration is not a credential

The repository may contain deployment identifiers such as Cloudflare D1 database IDs, R2 bucket names, Access audience identifiers, public hostnames and non-sensitive feature configuration. These values identify resources; they do not grant access by themselves.

Credentials, signing material, API keys, bearer tokens, private keys and other authentication secrets must never be committed to the repository. Production secrets must be provisioned through Cloudflare secret bindings or the relevant deployment secret store.

## Portal sessions

Portal authentication uses a host-only `__Host-core_portal_session` cookie with `Secure`, `HttpOnly`, `SameSite=Lax` and `Path=/`. Legacy `core_portal_session` cookies are accepted only for migration and promoted to the host-only cookie.

Session tokens are stored server-side only as SHA-256 hashes.

## Vault uploads

Vault upload sessions are authorized by the authenticated portal session and are bound to the creating member ID. Upload session IDs are unguessable UUIDs. No secondary bearer capability is exposed to the browser or placed in upload URLs.

## Live terminal

The live terminal is an interactive shell by design. The security boundary is the disposable Cloudflare container, not a command-name allowlist.

The terminal runs:
- as an unprivileged container user;
- with container internet access disabled;
- in an ephemeral snapshot workspace;
- with a minimal environment rather than inherited Worker/container environment variables;
- with one active WebSocket per terminal session;
- with a 10-minute user-idle timeout;
- with a 30-minute absolute session lifetime;
- with connection-level audit metadata (session, duration, byte counts and close reason).

The browser never receives the runner terminal capability. Browser WebSockets connect to an authenticated same-origin portal gateway; the portal forwards the capability to CORE Runner in a server-side request header. Query-string bearer tokens are prohibited.

The terminal process listens on the container port required by the Cloudflare Containers runtime. That port is not a public application endpoint: public access is mediated by CORE Runner's terminal-session authorization and the container binding.

## Runner addressing

Production CORE Runner is addressed through `runner.ytucore.com`. Personal `workers.dev` hostnames must not be used as production service contracts.

## Response security

Production responses enforce HTTPS and emit centralized HSTS, CSP, frame, MIME-sniffing, referrer and permissions policies.

## Reporting

Do not publish active credentials, private keys, live bearer tokens or exploitable security details in public issues. Revoke exposed credentials before documenting the incident.
