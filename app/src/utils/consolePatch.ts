/**
 * Console patching utility to add [ShopList] prefix to all console logs
 * Optimized for performance
 */

// Only patch in development mode
if (import.meta.env.DEV) {
  // Patch console methods globally to add prefix
  (function patchConsoleMethods() {
    const patch = (method: "log" | "error" | "warn") => {
      const original = console[method];
      console[method] = function (...args: any[]) {
        // Use requestIdleCallback if available to avoid blocking rendering
        if ("requestIdleCallback" in window) {
          requestIdleCallback(() => {
            original.apply(console, ["[ShopList]", ...args]);
          });
        } else {
          original.apply(console, ["[ShopList]", ...args]);
        }
      };
    };
    patch("log");
    patch("error");
    patch("warn");
  })();

  console.log("Console patching applied");
} else {
  // In production, minimize logging
  console.log = () => {};
  console.warn = () => {};
  // Keep errors for debugging
}
