# Native Link Contract

The web runtime already listens for Capacitor `appUrlOpen` events and maps only trusted CORE portal URLs back into the current native WebView.

## Android

After `npm run mobile:add:android`, the main Activity must accept both the custom scheme and verified HTTPS portal URLs.

Add these intent filters to the main activity in `android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="ytucore" android:host="portal" />
</intent-filter>

<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data
    android:scheme="https"
    android:host="ytucore.com"
    android:pathPrefix="/portal" />
</intent-filter>
```

Then configure the production signing certificate SHA-256 fingerprint in Cloudflare as `PORTAL_ANDROID_SHA256_CERT_FINGERPRINTS`. The website route `/.well-known/assetlinks.json` stays empty until that value exists, preventing fake verification claims.

## iOS

After `npm run mobile:add:ios`:

1. Register the custom URL scheme `ytucore` in the App target's URL Types.
2. Enable the Associated Domains capability.
3. Add `applinks:ytucore.com`.
4. Configure the Apple Team ID in Cloudflare as `PORTAL_IOS_TEAM_ID`.

The website route `/.well-known/apple-app-site-association` publishes no app identity until the real Team ID exists.

## Browser handoff

The browser contract is:

```
ytucore://portal/open?path=%2Fportal%2Fmail
```

HTTPS Universal/App Links use the normal `https://ytucore.com/portal/...` route. The portal validates deep-link targets and refuses navigation outside `/portal`.

## Rollout switch

Keep `PORTAL_MOBILE_HANDOFF_ENABLED=false` until at least one signed internal build is distributed. When it becomes `true`, mobile browser visits automatically attempt the native app once per browser session and fall back to a clear browser/install choice if the app is unavailable.
