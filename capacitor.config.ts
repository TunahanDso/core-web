import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";

const config: CapacitorConfig = {
  appId: "com.ytucore.portal",
  appName: "YTÜ CORE",
  webDir: "mobile-shell",
  server: {
    url: "https://ytucore.com/portal?native=1",
    cleartext: false,
    allowNavigation: ["ytucore.com"],
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Light,
      resizeOnFullScreen: true,
      autoBackdropColor: "dom",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "banner", "list"],
    },
  },
};

export default config;
