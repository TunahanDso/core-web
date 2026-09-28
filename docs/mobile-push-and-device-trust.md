# CORE Mobile Push & Device Trust

CORE Mobile already stores each native installation in `portal_mobile_devices`. The V7 client adds the official Capacitor Push Notifications plugin, but production push remains deliberately gated by:

```
PORTAL_PUSH_ENABLED=false
```

Do not flip this flag until both platform providers are configured.

## Android / Firebase Cloud Messaging

1. Create or select the YTÜ CORE Firebase project.
2. Add Android app `com.ytucore.portal`.
3. Download the production `google-services.json`.
4. Supply it to the Android release build without committing provider secrets to the public repository.
5. Confirm the signed release package name matches `com.ytucore.portal`.
6. Build/install the signed internal-testing application.
7. Set `PORTAL_PUSH_ENABLED=true`.
8. Open the app and confirm the current device obtains an `fcm` provider entry in Portal > Security & Devices.

## iOS / APNs

The generated AppDelegate already forwards APNs registration success/failure to Capacitor through the official notification bridge.

For a real device release:

1. Use the production Apple Developer Team and bundle ID `com.ytucore.portal`.
2. Enable the Push Notifications capability for the App ID / Xcode target.
3. Ensure the signed provisioning profile contains the APNs entitlement.
4. Configure the server-side APNs provider credentials.
5. Build a signed TestFlight/internal build.
6. Set `PORTAL_PUSH_ENABLED=true`.
7. Confirm the device obtains an `apns` provider entry in Portal > Security & Devices.

## Token handling

The client first registers the installation without push data. Push permission is requested only when:
- the app is running natively,
- the portal session is authenticated,
- `PORTAL_PUSH_ENABLED=true`.

After native registration succeeds, the token is written to the existing authenticated mobile-device endpoint and remains associated with the install ID. Revoking a device clears its push provider and token.

Never expose push tokens in the member UI. The Security & Devices page shows only the provider name.

## Notification deep links

A push payload may include:

```json
{ "href": "/portal/tasks/<task-id>" }
```

The native client accepts only paths beginning with `/portal` before navigating.

## Trusted-device state

`trusted` is currently a member-managed device preference. It does **not** bypass the portal password, HttpOnly session validation, role checks or device revocation.

This state is reserved for future:
- notification preference policy,
- biometric step-up,
- sensitive-action confirmation,
- faster reauthentication on approved devices.

Do not turn `trusted_state` into an authentication bypass without a separate cryptographic device credential / step-up design.
