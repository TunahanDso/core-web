# YTÜ CORE — Public Web

Official public web application of YTÜ CORE.

## Scope
- Public institutional website
- Dynamic project, domain, publication and team content
- Public/read-only operations views in the future
- Protected administration interface

## Architecture principle
The public-site administration plane is separate from private CORE operations and vehicle command/control. Public telemetry may be exposed read-only through a dedicated API boundary.

## Development
```bash
npm install
npm run dev
```

Open http://localhost:3000.

> The /admin route is a placeholder only. It is intentionally not an authentication implementation yet and must not be treated as secure until identity, authorization and persistent storage are connected.
