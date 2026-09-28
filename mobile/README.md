# YTÜ CORE Native Mobile

This directory is the native-shell acceleration path for the authenticated CORE Portal.

## Architecture

The first Android/iOS release is a Capacitor shell around the production portal at `https://ytucore.com/portal?native=1`. This intentionally reuses the existing invite/password/session model, D1 data, Vault, Mail, CAD/PCB and permissions rather than duplicating them in a second client.

The native shell is the secure runtime container, but the in-app experience is now intentionally native-first rather than a desktop layout squeezed into a WebView. Sensitive data remains served by the authenticated portal APIs and is never compiled into the application.

## Bootstrap

```bash
npm install
npm run mobile:add:android
npm run mobile:add:ios
npm run mobile:sync
npm run mobile:doctor
```

Android development then opens with `npm run mobile:open:android`. iOS requires macOS/Xcode and opens with `npm run mobile:open:ios`.

## Application identity

- App ID / bundle ID: `com.ytucore.portal`
- Custom scheme contract: `ytucore://portal/open?path=%2Fportal%2F...`
- HTTPS portal: `https://ytucore.com/portal`

Do not publish fake signing identities. Android App Links activate only after `PORTAL_ANDROID_SHA256_CERT_FINGERPRINTS` is configured. iOS Universal Links activate only after `PORTAL_IOS_TEAM_ID` is configured.

## Browser handoff

The web portal attempts native handoff on mobile only when `PORTAL_MOBILE_HANDOFF_ENABLED=true`. If the app is unavailable, the user remains in the browser and receives an app/PWA fallback instead of a redirect loop.

## Current native product layer · 0.2.0

The member app currently includes:
- route-aware native app bar,
- Android hardware-back behavior,
- one-handed bottom tabs,
- live task/chat/mail/notification badges,
- native global search sheet,
- per-device favorites and recent modules through Capacitor Preferences,
- haptic navigation and success/error feedback,
- connectivity state + recovery refresh,
- pull-to-refresh,
- keyboard-aware navigation chrome,
- camera capture directly into the authenticated CORE Vault,
- mobile-first task list,
- single-column chat conversation UX,
- mobile mailbox folder rail and thread cards,
- mobile Vault/inventory/calendar layouts,
- native-shaped login and activation screens.

The generated Android/iOS projects remain reproducible from source and are validated by CI.

## Next native layers

The device registry is already prepared for the next signed-build wave:
- real remote push notifications and notification deep links,
- biometric/trusted-device unlock,
- QR/barcode inventory scanning,
- secure native file picker / share sheet,
- app-store signing and internal distribution.

These should be layered onto the current 0.2.0 shell after release signing identities are available.
