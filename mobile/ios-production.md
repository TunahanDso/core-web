# CORE Mobile iOS Production

CORE Mobile is shipped as a native iOS application with Capacitor. It is not a Safari shortcut. Capacitor provides the native application lifecycle and plugin bridge; the authenticated CORE web/API layer remains shared with Android and desktop.

## Current native capabilities

The generated iOS target includes:
- bundle ID `com.ytucore.portal`,
- custom URL scheme `ytucore://`,
- Universal Links for `applinks:ytucore.com`,
- native camera access,
- native Share Sheet,
- APNs permission/token registration,
- notification action deep links,
- haptics, keyboard, status bar, network state and app lifecycle integration.

## Push Notifications signing requirements

The repository can compile and validate the APNs bridge without an Apple account, but real-device remote push requires Apple-controlled signing state.

Before TestFlight:

1. Enroll/use the YTÜ CORE Apple Developer team.
2. Register the App ID / bundle ID `com.ytucore.portal`.
3. Enable **Push Notifications** and **Associated Domains** for that App ID.
4. Create or select a distribution certificate and provisioning profile containing those entitlements.
5. Create an APNs authentication key (recommended) or certificate for the server-side sender.
6. Set `PORTAL_IOS_TEAM_ID` in Cloudflare so the public Apple App Site Association endpoint can publish the real signed app identity.
7. Build the release native project with `CORE_APS_ENVIRONMENT=production`.
8. Archive in Xcode and distribute through TestFlight.

The repository's CI uses `development` APNs entitlement for unsigned simulator/internal validation. Do not claim production push until the signed App Store/TestFlight profile and APNs sender credentials are configured.

## AppDelegate bridge

Capacitor Push Notifications requires the generated iOS `AppDelegate.swift` to forward APNs registration success/failure into Capacitor notifications. `mobile/scripts/configure-native.mjs ios` injects these methods idempotently.

## Native-vs-web boundary

Remote portal rendering is used to keep identity, permissions, Vault, Mail, Project Map and Control Plane on one secured backend. This does not prevent native screens. The intended migration sequence is:

1. retain authenticated CORE APIs as source of truth,
2. keep shared portal pages for complex engineering desktop surfaces,
3. move high-frequency phone screens (Home, Tasks, Chat, Notifications, Inventory scan) to SwiftUI/native client surfaces,
4. keep CAD/PCB/3D heavy workspaces as optimized Web Native views where browser rendering is the better tool.

This avoids maintaining two incompatible backends while still allowing a genuinely native iOS experience.
