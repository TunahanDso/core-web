import fs from "node:fs";
import path from "node:path";

const platform = process.argv[2];

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function configureAndroid() {
  const manifest = "android/app/src/main/AndroidManifest.xml";
  const variables = "android/variables.gradle";
  if (!fs.existsSync(manifest) || !fs.existsSync(variables)) {
    throw new Error("Android project is missing. Run cap add android first.");
  }

  let gradle = read(variables);
  const minSdkPattern = /minSdkVersion\s*=\s*\d+/;
  if (!minSdkPattern.test(gradle)) {
    throw new Error("Android minSdkVersion setting was not found.");
  }
  gradle = gradle.replace(minSdkPattern, "minSdkVersion = 26");
  write(variables, gradle);

  let source = read(manifest);
  if (!source.includes("CORE_NATIVE_LINKS")) {
    const marker = "        <!-- CORE_NATIVE_LINKS -->";
    const filters = `
${marker}
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
        </intent-filter>`;

    const mainActivity = /(<activity\b[\s\S]*?android:name="\.MainActivity"[\s\S]*?)(\s*<\/activity>)/;
    if (!mainActivity.test(source)) throw new Error("Capacitor MainActivity block was not found.");
    source = source.replace(mainActivity, (_, body, close) => body + filters + close);
    write(manifest, source);
  }

  console.log("Android minSdk 26, custom scheme and App Links configured.");
}

function configureIos() {
  const plist = "ios/App/App/Info.plist";
  const project = "ios/App/App.xcodeproj/project.pbxproj";
  if (!fs.existsSync(plist) || !fs.existsSync(project)) {
    throw new Error("iOS project is missing. Run cap add ios first.");
  }

  let info = read(plist);
  if (!info.includes("COREMobileURLScheme")) {
    const urlTypes = `
	<key>CFBundleURLTypes</key>
	<array>
		<dict>
			<key>CFBundleTypeRole</key>
			<string>Editor</string>
			<key>CFBundleURLName</key>
			<string>COREMobileURLScheme</string>
			<key>CFBundleURLSchemes</key>
			<array>
				<string>ytucore</string>
			</array>
		</dict>
	</array>`;
    if (!info.includes("</dict>")) throw new Error("Info.plist root dictionary was not found.");
    info = info.replace(/\s*<\/dict>\s*<\/plist>\s*$/, urlTypes + "\n</dict>\n</plist>\n");
    write(plist, info);
  }

  if (!info.includes("NSCameraUsageDescription")) {
    const privacy = `
\t<key>NSCameraUsageDescription</key>
\t<string>CORE üyeleri saha, prototip ve test fotoğraflarını teknik Vault'a kaydedebilmek için kamerayı kullanır.</string>
\t<key>NSPhotoLibraryUsageDescription</key>
\t<string>CORE üyeleri teknik görselleri Vault'a eklemek için fotoğraf arşivine erişebilir.</string>
\t<key>NSPhotoLibraryAddUsageDescription</key>
\t<string>CORE uygulaması gerektiğinde oluşturulan teknik görselleri cihaz fotoğraf arşivine kaydedebilir.</string>`;
    info = read(plist);
    if (!info.includes("</dict>")) throw new Error("Info.plist root dictionary was not found.");
    info = info.replace(/\s*<\/dict>\s*<\/plist>\s*$/, privacy + "\n</dict>\n</plist>\n");
    write(plist, info);
  }

  const appDelegate = "ios/App/App/AppDelegate.swift";
  if (fs.existsSync(appDelegate)) {
    let delegate = read(appDelegate);
    if (!delegate.includes("CORE_PUSH_BRIDGE")) {
      const pushMethods = `

    // CORE_PUSH_BRIDGE
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
`;
      const finalBrace = delegate.lastIndexOf("}");
      if (finalBrace < 0) throw new Error("AppDelegate class closing brace was not found.");
      delegate = delegate.slice(0, finalBrace) + pushMethods + delegate.slice(finalBrace);
      write(appDelegate, delegate);
    }
  }

  const entitlements = "ios/App/App/App.entitlements";
  const entitlementBody = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.associated-domains</key>
	<array>
		<string>applinks:ytucore.com</string>
	</array>
</dict>
</plist>
`;
  write(entitlements, entitlementBody);

  let pbx = read(project);
  if (!pbx.includes("CODE_SIGN_ENTITLEMENTS = App/App.entitlements;")) {
    const signStyle = /CODE_SIGN_STYLE = Automatic;/g;
    if (!signStyle.test(pbx)) throw new Error("Xcode signing build settings were not found.");
    pbx = pbx.replace(/CODE_SIGN_STYLE = Automatic;/g, "CODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n\t\t\t\tCODE_SIGN_STYLE = Automatic;");
    write(project, pbx);
  }

  console.log("iOS custom URL scheme and Associated Domains entitlement configured.");
}

if (platform === "android") configureAndroid();
else if (platform === "ios") configureIos();
else throw new Error("Usage: node mobile/scripts/configure-native.mjs <android|ios>");
