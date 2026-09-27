# CORE Web Architecture

## Purpose

`core-web` is the public digital surface of YTÜ CORE. It is a dynamic bilingual web application, not the private engineering workspace and not the vehicle command system.

## Runtime

- Next.js / React / TypeScript
- Cloudflare Workers
- Cloudflare D1 for structured CMS data
- Cloudflare R2 for media and downloadable assets

## Language model

Every public content item has one shared identity and shared metadata, with independent Turkish and English localizations.

Example:

```
project: core-m01
shared: domain, status, dates, vehicle id, cover asset
tr: title, summary, body, SEO
en: title, summary, body, SEO
```

A locale may remain draft while the other locale is published.

## Security boundaries

### Public Web
Anonymous read-only access to published content.

### Public CMS
Protected administration of public content. The outer gateway should be Cloudflare Access. Application-level roles and audit records provide a second authorization layer.

### CORE Ops
Separate application and authorization domain for telemetry, missions and vehicle operations. Public Web may consume explicitly published read-only telemetry. Public CMS must never grant vehicle command authority.

## CMS data

D1 stores:
- content identity and publication state
- TR/EN localizations
- project/publication/news metadata
- media references
- audit records

R2 stores:
- photographs
- project media
- reports and public files
- generated public assets

## Deployment

Production deploys originate from the `main` branch. Pull requests should receive preview deployments before merge.
