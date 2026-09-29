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


## Internal Windows signing and distribution

CORE Desktop uses a private team trust chain rather than a paid public code-signing CA.

### Trust chain

- Root: `YTU CORE Internal Root CA`
- Signer: `YTU CORE Desktop Internal Signing`
- Root lifetime: 10 years
- Desktop signer lifetime: 3 years
- Root SHA-256: `72:26:F0:5A:90:67:F3:19:05:27:7A:93:21:5C:2B:CE:62:3E:2D:EF:B3:82:E9:8C:BE:65:A7:4E:69:A9:A2:95`
- Signer SHA-256: `76:1E:FD:F0:30:90:D7:EE:30:B3:B1:1F:1A:E5:DE:A1:6F:28:5D:99:C8:1C:A6:17:0A:7E:C5:28:A4:DC:F2:B5`

The public certificates and the per-user installer live under `public/desktop/trust/`. Private keys never live in the repository.

The Devices panel asks members to establish trust first, then download the application. The PowerShell installer verifies both certificate fingerprints before adding the Root CA to the current user's `Root` store and the signer certificate to `TrustedPublisher`.

### CI secrets

Stable internal builds require:

- `WINDOWS_SIGNING_CERT_PFX_BASE64`
- `WINDOWS_SIGNING_CERT_PASSWORD`

The GitHub workflow imports the public internal trust chain only on the ephemeral runner, signs the executable with the PFX from repository secrets, verifies the Authenticode signature, and publishes only successful signed builds.

PR artifacts remain explicitly `UNSIGNED-DEV`.

### Distribution channel

The authenticated portal route:

```text
/api/portal/desktop/download/windows
```

redirects only to:

```text
desktop-internal/YTU-CORE-Desktop-Windows-x64.exe
```

The previous unsigned `desktop-latest` channel is not used for team distribution.

> Internal signing is deliberate trust for managed CORE devices. It does not create Microsoft SmartScreen/public-CA reputation on arbitrary Windows computers.
