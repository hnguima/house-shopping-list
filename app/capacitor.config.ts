import type { CapacitorConfig } from "@capacitor/cli";

// Add Node.js types for process.env
declare const process: {
  env: {
    VITE_GOOGLE_CLIENT_ID?: string;
    [key: string]: string | undefined;
  };
};

const config: CapacitorConfig = {
  appId: "com.example.shoplist",
  appName: "shoplist",
  webDir: "dist",
  server: {
    allowNavigation: ["shop-list-api.the-cube-lab.com", "*.the-cube-lab.com"],
    androidScheme: "https",
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
