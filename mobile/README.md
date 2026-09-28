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

## Current native product layer · 0.3.0

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
- native QR/barcode inventory scanning with SKU preselection,
- per-installation trusted / pending / revoked device preference controls,
- native-shaped login and activation screens,
- APNs / FCM permission + token registration into the authenticated device registry,
- notification deep links back into safe `/portal` routes,
- native iOS / Android Share Sheet,
- access-aware Teams, Project Map and Control Plane navigation.

The generated Android/iOS projects remain reproducible from source and are validated by CI.

## Next native layers

The device registry now stores native push-provider/token state. The next signed-build wave is:
- APNs server credentials + signed iOS Push Notifications capability,
- Android Firebase `google-services.json` + FCM production sender,
- biometric unlock backed by the existing trusted-device registry,
- secure native file picker,
- app-store signing, TestFlight and Play Internal Testing.

Trusted state is a device preference and does not bypass password, session or role checks. CORE Mobile 0.3 remains a real Capacitor iOS/Android application, not a Safari/PWA launch shortcut. The UI is progressively native-first while authenticated engineering data continues to come from the same protected CORE APIs. Critical screens can be moved to SwiftUI/native API clients incrementally without changing the backend contract.
