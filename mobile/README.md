# YTÜ CORE Native Mobile

This directory is the native-shell acceleration path for the authenticated CORE Portal.

## Architecture

The first Android/iOS release is a Capacitor shell around the production portal at `https://ytucore.com/portal?native=1`. This intentionally reuses the existing invite/password/session model, D1 data, Vault, Mail, CAD/PCB and permissions rather than duplicating them in a second client.

The native shell is only the runtime container. Sensitive data remains served by the authenticated portal APIs and is never compiled into the application.

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

## Next native plugins

The device registry is already prepared for:
- push-token registration,
- biometric/trusted-device state,
- QR/barcode inventory scanning,
- camera uploads to Vault,
- notification deep links.

Those plugins should be added after the first signed internal Android/iOS builds exist.
