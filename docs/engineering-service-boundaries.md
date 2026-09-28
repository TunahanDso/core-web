# CORE Engineering Service Boundaries

The public CMS and authenticated member portal remain Cloudflare Worker workloads. Native Git storage, CAD conversion and arbitrary code execution do not run inside that Worker.

## CORE Repo Service

Portal -> `POST /v1/repositories` provisions repositories in a dedicated Git-capable service. The portal stores only repository identity, ownership and project/team metadata in D1. The service owns Git protocol, refs, object storage, branch/commit/diff operations and binary file handling.

Minimum response:
```json
{ "id": "repo-service-id", "defaultBranch": "main" }
```

Future endpoints should include repository tree, commit history, diffs, branches, tags/releases, file read/write and import/export. GitHub is an optional mirror/import/export target, never the source of truth.

## CORE Converter

STEP/IGES/native CAD and PCB 3D conversion runs in a dedicated container boundary (for example OpenCascade/FreeCAD/KiCad CLI). Jobs consume immutable Vault revision objects and write derivatives back to R2. The portal owns job metadata but never executes CAD binaries in the CMS Worker.

## CORE Runner

Portal submits a repository snapshot plus a fixed task identifier. The runner resolves the task to a command inside an isolated container. Initial languages: Python, JavaScript, TypeScript, C and C++.

Every job must enforce CPU, RAM, wall-clock timeout, output limit, isolated filesystem and deny-by-default network policy. stdout/stderr and artifacts return to R2. No arbitrary process execution occurs in the CMS Worker.

## Secrets

Service bearer tokens are Cloudflare secrets only. They must never be committed to `wrangler.jsonc`, source files or CI logs.
