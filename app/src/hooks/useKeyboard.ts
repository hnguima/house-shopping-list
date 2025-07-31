import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Hook to track keyboard visibility on mobile devices
 * Returns whether keyboard is visible and keyboard height
 * Note: This is a simplified version for now since @capacitor/keyboard is not installed
 */
export const useKeyboard = () => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      // On web, use viewport height changes as a proxy for keyboard visibility
      const handleResize = () => {
        const viewportHeight =
          window.visualViewport?.height || window.innerHeight;
        const screenHeight = window.screen.height;
        const heightDiff = screenHeight - viewportHeight;

        // If viewport is significantly smaller, assume keyboard is open
        const keyboardOpen = heightDiff > 150; // 150px threshold
        setKeyboardVisible(keyboardOpen);
        setKeyboardHeight(keyboardOpen ? heightDiff : 0);
      };

      window.addEventListener("resize", handleResize);
      window.visualViewport?.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        window.visualViewport?.removeEventListener("resize", handleResize);
      };
    }

    // For native platforms, we'd need @capacitor/keyboard plugin
    // For now, return defaults
  }, []);

  return { keyboardVisible, keyboardHeight };
};
