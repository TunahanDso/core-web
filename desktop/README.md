# YTÜ CORE Desktop / Workbench

CORE Desktop is the native engineering client for the authenticated CORE platform.

It is **not** a Chromium-heavy clone of the portal and it is not a second backend. The first release uses a single Tauri system WebView pointed at the existing protected portal, then progressively adds narrowly scoped native engineering capabilities.

## Product role

- **CORE Web** — universal browser access and administration.
- **CORE Mobile** — field, notification, capture and one-handed workflows.
- **CORE Desktop** — full workshop / engineering workstation.

The desktop client must preserve the existing CORE visual language while using the larger screen for denser project context, multi-tool engineering work and local hardware integrations.

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
10. Signed Windows/macOS/Linux releases and updater.

See `desktop/PERFORMANCE.md` before adding any background service, polling loop, additional WebView or native plugin.


## Stable Windows download channel

After merge to `main`, the desktop workflow publishes the last successful Windows x64 executable to the rolling GitHub release tag `desktop-latest`.

The member-facing Portal never links to a transient Actions artifact. It links to:

```text
/api/portal/desktop/download/windows
```

That authenticated route redirects to the fixed release asset:

```text
desktop-latest/YTU-CORE-Desktop-Windows-x64.exe
```

Every successful main desktop build overwrites that asset and its SHA-256 companion. A failed build never replaces the previous working download.
