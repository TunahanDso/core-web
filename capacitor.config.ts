import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ytucore.portal",
  appName: "YTÜ CORE",
  webDir: "mobile-shell",
  server: {
    url: "https://ytucore.com/portal?native=1",
    cleartext: false,
    allowNavigation: ["ytucore.com"],
  },
  ios: {
    scheme: "YTÜ CORE",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
