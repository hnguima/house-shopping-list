/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";


// https://vite.dev/config/
export default defineConfig({

  plugins: [react(), dts({ exclude: "**/*.test.*" }), tsconfigPaths()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "dist/",
        "build/",
        "android/",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  build: {
    rollupOptions: {
      external: [
        "**/*.test.tsx", // Exclude all .test.ts files
        "**/*.test.ts", // Exclude all .test.ts files
        "**/*.spec*", // Exclude all .spec.ts files
        "cypress/**", // Exclude the entire Cypress folder
      ],
      output: {
        manualChunks: {
          // Vendor chunk for React and core libraries
          vendor: ["react", "react-dom"],
          // MUI chunk for Material-UI components
          mui: [
            "@mui/material",
            "@mui/icons-material",
            "@mui/system",
            "@emotion/react",
            "@emotion/styled",
          ],
          // i18n chunk for internationalization
          i18n: ["react-i18next", "i18next"],
          // Capacitor chunk for mobile functionality
          capacitor: ["@capacitor/core", "@capacitor/preferences"],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Disable source maps in production for smaller builds
    sourcemap: false,
    // Optimize dependencies
    target: "es2020",
    minify: "esbuild", // Use esbuild for faster builds
  },
  // Optimize dev server
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: false,
    },
  },
  // Optimize dependencies pre-bundling
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@mui/material",
      "@mui/icons-material",
      "react-i18next",
      "i18next",
    ],
  },
});
