# YTÜ CORE Desktop / Workbench

CORE Desktop is the native engineering client for the authenticated CORE platform.

It is **not** a Chromium-heavy clone of the portal and it is not a second backend. The first release uses a single Tauri system WebView pointed at the existing protected portal, then progressively adds narrowly scoped native engineering capabilities.

## Product role

- **CORE Web** — universal browser access and administration.
- **CORE Mobile** — field, notification, capture and one-handed workflows.
- **CORE Desktop** — native shell baseline for a future workshop/engineering workstation.

Version 0.1 is intentionally a constrained Tauri shell around the authenticated portal. Local workspace, Git, shell, USB/serial, SSH and CAD integration are roadmap items, not current product capabilities.

## Bootstrap architecture

```text
CORE Desktop UI (existing React portal, desktop=1)
              |
      Tauri capability boundary
              |
        Rust native bridge
              |
   +----------+-----------+------------+
   |                      |            |
local workspace        devices      local tools
Git / files            USB/serial   KiCad/FreeCAD
terminal               SSH          compilers
   |
CORE Cloud APIs / Vault / Repo Service / Runner / Converter
```

Version 0.1 intentionally exposes only Tauri application metadata to the remote portal surface. File-system, process, shell, USB, serial, Git and CAD access are **not** globally enabled. Each future native operation gets a dedicated command, validation rules and the smallest possible permission scope.

## Commands

From the repository root:

```bash
npm install
npm run desktop:info
npm run desktop:dev
npm run desktop:build
```

The shell opens:

```text
https://ytucore.com/portal?desktop=1
```

That query flag activates the desktop-density layer without forking the portal UI.

## Native roadmap

1. Desktop shell + desktop-density UI.
2. Secure local workspace and file picker.
3. Vault checkout / revision / upload workflow.
4. Native Git clone, branch, diff, commit and sync.
5. Local terminal and local/cloud execution target selection.
6. Device manager: SSH + Raspberry Pi / lab nodes.
7. Serial / USB engineering console and embedded flashing.
8. KiCad / FreeCAD / OpenSCAD launch and watched-file bridges.
9. Offline metadata/cache and conflict-aware resync.
10. macOS/Linux packaging and updater after signed Windows distribution is operational.

See `desktop/PERFORMANCE.md` before adding any background service, polling loop, additional WebView or native plugin.


## Stable Windows download channel

Stable Windows distribution is fail-closed. A `main` build may publish to `desktop-latest` only after Authenticode signing succeeds with the configured Windows code-signing certificate.

The member-facing Portal never links to a transient Actions artifact. It links to:

```text
/api/portal/desktop/download/windows
```

That authenticated route redirects to the fixed release asset:

```text
desktop-latest/YTU-CORE-Desktop-Windows-x64.exe
```

Pull-request artifacts are explicitly labeled **UNSIGNED-DEV** and are not a team distribution channel.

The authenticated download endpoint remains disabled until `PORTAL_DESKTOP_WINDOWS_RELEASE_ENABLED=true` is set after the first verified signed release.

Required GitHub Actions secrets for stable Windows publishing:

- `WINDOWS_SIGNING_CERT_PFX_BASE64`
- `WINDOWS_SIGNING_CERT_PASSWORD`

A build without those secrets fails before publishing. A failed signing or signature verification step also blocks the release.
