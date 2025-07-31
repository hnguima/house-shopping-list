import { useState, useEffect } from "react";

interface KeyboardInfo {
  isVisible: boolean;
  height: number;
}

/**
 * Hook to detect virtual keyboard visibility and adjust UI accordingly
 * This is especially useful on mobile devices where the keyboard can take up significant screen space
 */
export const useKeyboardAwareness = () => {
  const [keyboardInfo, setKeyboardInfo] = useState<KeyboardInfo>({
    isVisible: false,
    height: 0,
  });

  useEffect(() => {
    // Force mobile detection for testing - we want this to work on all devices
    const isMobile = true; // Always enable for testing
    console.log(
      "[KeyboardAwareness] Initializing for mobile detection:",
      isMobile
    );

    if (!isMobile) {
      return; // No need to monitor keyboard on desktop
    }

    // Store multiple baseline measurements for better detection
    let baselineVVHeight = window.visualViewport?.height || window.innerHeight;
    let baselineInnerHeight = window.innerHeight;
    let baselineDocumentHeight = document.documentElement.clientHeight;
    let debounceTimer: NodeJS.Timeout;
    let isInputFocused = false;

    console.log("[KeyboardAwareness] Initial setup:", {
      baselineVVHeight,
      baselineInnerHeight,
      baselineDocumentHeight,
      hasVisualViewport: !!window.visualViewport,
      userAgent: navigator.userAgent,
    });

    const updateKeyboardInfo = (
      detectionMethod: string,
      heightDifference: number,
      rawData: any
    ) => {
      const keyboardThreshold = 15; // Slightly higher threshold
      const isKeyboardVisible =
        heightDifference > keyboardThreshold || isInputFocused;

      // Estimate keyboard height - use different strategies
      let estimatedHeight = 0;
      if (isKeyboardVisible) {
        estimatedHeight = Math.max(heightDifference, 250); // Assume at least 250px for keyboard if detected
      }

      setKeyboardInfo((prev) => {
        const hasChanged =
          prev.isVisible !== isKeyboardVisible ||
          Math.abs(prev.height - estimatedHeight) > 10;

        if (hasChanged) {
          console.log("[KeyboardAwareness] KEYBOARD STATE CHANGE:", {
            method: detectionMethod,
            heightDifference,
            isKeyboardVisible,
            estimatedHeight,
            isInputFocused,
            rawData,
          });
          return { isVisible: isKeyboardVisible, height: estimatedHeight };
        }

        // Always log the check for debugging
        console.log("[KeyboardAwareness] Check (no change):", {
          method: detectionMethod,
          heightDifference,
          threshold: keyboardThreshold,
          visible: isKeyboardVisible,
          isInputFocused,
        });
        return prev;
      });
    };

    const handleViewportChange = () => {
      clearTimeout(debounceTimer);

      debounceTimer = setTimeout(() => {
        const currentVVHeight =
          window.visualViewport?.height || window.innerHeight;
        const currentInnerHeight = window.innerHeight;
        const currentDocumentHeight = document.documentElement.clientHeight;

        // Try multiple detection methods
        const vvHeightDiff = baselineVVHeight - currentVVHeight;
        const innerHeightDiff = baselineInnerHeight - currentInnerHeight;
        const docHeightDiff = baselineDocumentHeight - currentDocumentHeight;

        // Use the largest difference detected
        const maxHeightDiff = Math.max(
          vvHeightDiff,
          innerHeightDiff,
          Math.abs(docHeightDiff)
        );

        const rawData = {
          baselineVVHeight,
          currentVVHeight,
          vvHeightDiff,
          baselineInnerHeight,
          currentInnerHeight,
          innerHeightDiff,
          baselineDocumentHeight,
          currentDocumentHeight,
          docHeightDiff,
          maxHeightDiff,
          screenHeight: window.screen.height,
          orientation: screen.orientation?.angle,
        };

        updateKeyboardInfo("viewport-change", maxHeightDiff, rawData);
      }, 50); // Reduced debounce for faster response
    };

    // Use multiple detection methods for better Android support
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportChange);
    }

    // Fallback for older browsers/Android versions
    window.addEventListener("resize", handleViewportChange);

    // Additional detection for focus events (improved Android support)
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const inputType = (target as HTMLInputElement).type || "";
      console.log(
        "[KeyboardAwareness] Focus in detected on:",
        target.tagName,
        inputType
      );

      if (target.tagName === "INPUT") {
        const inputElement = target as HTMLInputElement;
        // Only trigger keyboard detection for text inputs, not checkboxes
        if (
          inputElement.type === "text" ||
          inputElement.type === "search" ||
          inputElement.type === "" ||
          !inputElement.type
        ) {
          isInputFocused = true;
          // Force keyboard detection when text input is focused
          setTimeout(() => {
            updateKeyboardInfo("focus-in", 0, {
              focusedElement: target.tagName,
              inputType,
            });
          }, 200); // Delay for keyboard animation
          setTimeout(handleViewportChange, 300); // Also check viewport after longer delay
        }
      } else if (target.tagName === "TEXTAREA") {
        isInputFocused = true;
        // Force keyboard detection when textarea is focused
        setTimeout(() => {
          updateKeyboardInfo("focus-in", 0, {
            focusedElement: target.tagName,
            inputType,
          });
        }, 200); // Delay for keyboard animation
        setTimeout(handleViewportChange, 300); // Also check viewport after longer delay
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const inputType = (target as HTMLInputElement).type || "";
      console.log(
        "[KeyboardAwareness] Focus out detected on:",
        target.tagName,
        inputType
      );

      if (target.tagName === "INPUT") {
        const inputElement = target as HTMLInputElement;
        // Only handle focus out for text inputs, not checkboxes
        if (
          inputElement.type === "text" ||
          inputElement.type === "search" ||
          inputElement.type === "" ||
          !inputElement.type
        ) {
          isInputFocused = false;
          // Immediately update keyboard state when focus is lost
          updateKeyboardInfo("focus-out", 0, {
            blurredElement: target.tagName,
            inputType,
          });
          setTimeout(handleViewportChange, 300);
        }
      } else if (target.tagName === "TEXTAREA") {
        isInputFocused = false;
        // Immediately update keyboard state when focus is lost
        updateKeyboardInfo("focus-out", 0, {
          blurredElement: target.tagName,
          inputType,
        });
        setTimeout(handleViewportChange, 300);
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    // Also listen to resize events on window as fallback
    const handleWindowResize = () => {
      console.log("[KeyboardAwareness] Window resize detected");
      handleViewportChange();
    };

    window.addEventListener("resize", handleWindowResize);

    // Force an initial check after a short delay
    setTimeout(() => {
      console.log("[KeyboardAwareness] Performing initial keyboard check");
      updateKeyboardInfo("initial-check", 0, { type: "initial" });
    }, 100);

    return () => {
      clearTimeout(debounceTimer);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          "resize",
          handleViewportChange
        );
      }
      window.removeEventListener("resize", handleWindowResize);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  return keyboardInfo;
};

/**
 * Get keyboard-aware styles for containers - adds padding to push content up
 */
export const getKeyboardAwareStyles = (keyboardInfo: KeyboardInfo) => {
  if (!keyboardInfo.isVisible) {
    return {};
  }

  return {
    paddingBottom: `${Math.max(keyboardInfo.height - 50, 0)}px`, // Add space but account for UI elements
    transition: "padding-bottom 0.3s ease",
  };
};

/**
 * Get keyboard spacer height for creating a spacer element
 */
export const getKeyboardSpacerHeight = (keyboardInfo: KeyboardInfo): number => {
  return keyboardInfo.isVisible ? Math.max(keyboardInfo.height - 100, 0) : 0;
};

/**
 * Ensure active input is visible when keyboard appears
 */
export const useInputScrollIntoView = (keyboardInfo: KeyboardInfo) => {
  useEffect(() => {
    if (keyboardInfo.isVisible) {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.tagName === "INPUT") {
        const inputElement = activeElement as HTMLInputElement;
        // Only scroll for text inputs, not checkboxes or other input types
        if (
          inputElement.type === "text" ||
          inputElement.type === "search" ||
          inputElement.type === "" ||
          !inputElement.type
        ) {
          // Wait for keyboard animation to complete
          setTimeout(() => {
            activeElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }, 350);
        }
      } else if (activeElement && activeElement.tagName === "TEXTAREA") {
        // Always scroll for textarea elements
        setTimeout(() => {
          activeElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 350);
      }
    }
  }, [keyboardInfo.isVisible]);
};
