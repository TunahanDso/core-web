# CORE Repo Service v1 contract

This document defines the read contract consumed by the YTÜ CORE Portal repository workspace.

## Boundary

- **D1 is not a Git object database.** Portal D1 stores repository identity, ownership, visibility, project/team relations and audit metadata.
- **CORE Repo Service is the source of truth for Git objects**: refs, commits, trees, blobs, diffs and releases.
- GitHub or another provider may exist as an optional mirror/import/export target. Portal availability must not depend on a mirror.
- Portal authenticates to the service with `Authorization: Bearer <CORE_REPO_SERVICE_TOKEN>`.
- Repository identifiers in these routes are the service-side `service_repository_id`, not the portal D1 UUID.

## General response rules

- JSON only for the routes below.
- UTF-8 text blobs may be returned inline. Binary blobs must return `encoding: "binary"` without inline binary content.
- Paths are repository-relative and use `/`.
- Refs may be branch names, tags or immutable commit SHAs.
- Service should reject path traversal.
- Portal expects non-2xx responses to optionally include `{ "error": "..." }` or `{ "message": "..." }`.
- A practical maximum for inline text blobs is 160 kB. Larger content should be represented through an artifact/download flow in a later contract.

## 1. Branches

`GET /v1/repositories/:repositoryId/branches`

Response:

```json
{
  "branches": [
    {
      "name": "main",
      "sha": "0123456789abcdef",
      "protected": true,
      "updatedAt": "2026-09-28T20:00:00Z"
    }
  ]
}
```

## 2. Tree

`GET /v1/repositories/:repositoryId/tree?ref=<ref>&path=<path>`

Returns direct children of the requested directory.

```json
{
  "entries": [
    {
      "name": "src",
      "path": "src",
      "type": "directory",
      "sha": "..."
    },
    {
      "name": "package.json",
      "path": "package.json",
      "type": "file",
      "sha": "...",
      "size": 1832,
      "language": "JSON"
    }
  ]
}
```

Allowed `type` values:

- `file`
- `directory`
- `symlink`
- `submodule`

## 3. Blob

`GET /v1/repositories/:repositoryId/blob?ref=<ref>&path=<filePath>`

Text response:

```json
{
  "path": "src/index.ts",
  "ref": "main",
  "sha": "...",
  "size": 4200,
  "mimeType": "text/plain",
  "language": "TypeScript",
  "encoding": "utf-8",
  "content": "..."
}
```

Binary response:

```json
{
  "path": "assets/model.glb",
  "ref": "main",
  "sha": "...",
  "size": 902134,
  "mimeType": "model/gltf-binary",
  "encoding": "binary"
}
```

## 4. Commits

`GET /v1/repositories/:repositoryId/commits?ref=<ref>&limit=30`

```json
{
  "commits": [
    {
      "sha": "...",
      "message": "feat: add runtime watchdog",
      "authorName": "Engineer",
      "authorEmail": "engineer@example.invalid",
      "authoredAt": "2026-09-28T20:00:00Z",
      "committedAt": "2026-09-28T20:01:00Z",
      "parents": ["..."]
    }
  ]
}
```

## 5. Package / manifest inspection

`GET /v1/repositories/:repositoryId/manifests?ref=<ref>`

The service normalizes common project manifests. Initial target formats:

- `package.json`
- `pyproject.toml`
- `requirements*.txt`
- `Cargo.toml`
- `go.mod`
- `CMakeLists.txt`
- `platformio.ini`

Response:

```json
{
  "manifests": [
    {
      "path": "package.json",
      "ecosystem": "node",
      "packageManager": "npm",
      "name": "core-web",
      "version": "0.3.0",
      "dependencies": {
        "next": "16.3.6"
      },
      "devDependencies": {
        "typescript": "^5.6.0"
      },
      "peerDependencies": {},
      "scripts": {
        "build": "vinext build"
      }
    }
  ]
}
```

For ecosystems that do not have a direct equivalent, unused maps may be omitted.

## 6. Compare

`GET /v1/repositories/:repositoryId/compare?base=<ref>&head=<ref>`

```json
{
  "base": "main",
  "head": "feature/repo-workspace",
  "baseSha": "1111111111111111111111111111111111111111",
  "headSha": "2222222222222222222222222222222222222222",
  "aheadBy": 3,
  "behindBy": 0,
  "totalCommits": 3,
  "mergeBaseSha": "...",
  "files": [
    {
      "path": "src/runtime.ts",
      "status": "modified",
      "additions": 42,
      "deletions": 8,
      "changes": 50
    }
  ]
}
```

## 7. Diff hunks for code review

`GET /v1/repositories/:repositoryId/diff?base=<ref>&head=<ref>&path=<optionalFilePath>`

The response **must resolve both refs to immutable commit SHAs**. Portal review metadata is anchored to these SHAs, never only to moving branch names.

```json
{
  "base": "main",
  "head": "feature/repo-workspace",
  "baseSha": "1111111111111111111111111111111111111111",
  "headSha": "2222222222222222222222222222222222222222",
  "files": [
    {
      "path": "src/runtime.ts",
      "previousPath": "src/runtime-old.ts",
      "status": "modified",
      "language": "TypeScript",
      "additions": 2,
      "deletions": 1,
      "binary": false,
      "hunks": [
        {
          "header": "@@ -10,4 +10,5 @@",
          "oldStart": 10,
          "oldLines": 4,
          "newStart": 10,
          "newLines": 5,
          "lines": [
            {
              "kind": "context",
              "content": "const ready = true;",
              "oldLine": 10,
              "newLine": 10,
              "lineSha": "optional-stable-line-fingerprint"
            },
            {
              "kind": "delete",
              "content": "startLegacy();",
              "oldLine": 11,
              "lineSha": "optional-stable-line-fingerprint"
            },
            {
              "kind": "add",
              "content": "startRuntime();",
              "newLine": 11,
              "lineSha": "optional-stable-line-fingerprint"
            }
          ]
        }
      ]
    }
  ]
}
```

Allowed line kinds are `context`, `add` and `delete`.

When `path` is supplied, the service should return only that changed file while still returning `baseSha` and `headSha`. Binary files should set `binary: true` and omit hunks.

### Review metadata boundary

The Repo Service owns the Git diff. Portal D1 owns review metadata:

- review snapshot identity (`baseSha` + `headSha`)
- line threads and replies
- resolve/reopen state
- reviewer submissions: COMMENT / APPROVE / REQUEST CHANGES
- portal audit events

The portal validates a new line-thread target against the current immutable diff before storing the thread. It never trusts arbitrary browser-supplied file/line anchors.

## Security expectations

- Portal-side visibility checks are mandatory, but Repo Service must also enforce repository authorization; do not treat portal filtering as the only security boundary.
- Tokens must never be exposed to the browser.
- Clone/fetch/push credentials should be scoped per user/repository and short-lived once write protocol support is introduced.
- Repository service should log mutating operations with actor identity and immutable commit/ref metadata.
- Ref updates should support protected branch policy and optimistic concurrency.
