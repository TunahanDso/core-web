# CORE Desktop native security boundary

The authenticated portal is trusted application content, but remote web content must still be treated as a separate privilege domain from the host operating system.

## Rules

1. Only `https://ytucore.com/*` may receive the desktop main-window capability.
2. Version 0.1 grants only `core:app:default`; it does not grant shell, filesystem, process or broad window control.
3. Never expose a generic `exec(command)`, `readFile(path)` or `writeFile(path)` bridge to portal JavaScript.
4. Native commands must be intention-specific, for example:
   - `workspace_checkout(vaultRevisionId)`
   - `repo_clone(repositoryId)`
   - `device_open_serial(deviceId, profileId)`
   - `cad_open_revision(vaultRevisionId, tool)`
5. Server authorization remains authoritative. A desktop capability never replaces portal role/capability checks.
6. Local credentials go to the OS credential store; they are not persisted in D1, localStorage or source files.
7. Paths received from the UI are never trusted directly. Workspace IDs resolve to server/native-owned paths.
8. External process execution is allowlisted by tool identity and arguments, with audit events for sensitive actions.
9. Signed releases and updater verification are mandatory before broad team deployment.
10. Any future remote-origin permission expansion must receive explicit security review.
