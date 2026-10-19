import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sahayog.hr",
  appName: "Sahayog HR",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: true, // Allows HTTP connection to local dev backend on Android
  },
  plugins: {
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: false,
    },
    SystemBars: {
      insetsHandling: "disable",
    },
  },
};

export default config;

