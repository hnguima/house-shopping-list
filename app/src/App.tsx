import "./App.css";
import "./colors.css";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { useState, useEffect } from "react";
import { usePersistentConfig } from "./hooks/usePersistentConfig";
import { useChangeLanguage } from "./hooks/useChangeLanguage";
import "./i18n";
import i18n from "i18next";
import Container from "@mui/material/Container";
import DashboardScreen from "./screens/DashboardScreen";
import Header from "./components/Header";
import { StatusBar } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";

import { useTranslation } from "react-i18next";
import UserProfileScreen from "./screens/UserProfileScreen";
import LoginScreen from "./screens/LoginScreen";
import apiClient from "./utils/apiClient";
import { SyncManager } from "./utils/syncManager";

// Console patching temporarily disabled to reduce log noise
// (function patchConsoleMethods() {
//   const patch = (method: "log" | "error" | "warn") => {
//     const original = console[method];
//     console[method] = function (...args: any[]) {
//       original.apply(console, ["[ShoppingList]", ...args]);
//     };
//   };
//   patch("log");
//   patch("error");
//   patch("warn");
// })();

function App() {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<"dashboard" | "profile">("dashboard");

  const {
    themeMode,
    setThemeMode,
    theme,
    language,
    setLanguage,
    user,
    updateUser,
    refreshUser,
    clearUser,
  } = usePersistentConfig();
  const changeLanguage = useChangeLanguage(setLanguage);
  const [safeAreaTop, setSafeAreaTop] = useState<number>(0);

  const handleUserUpdate = async (updatedUser: any) => {
    try {
      await updateUser(updatedUser);
    } catch (error) {
      console.error("[App] Error updating user:", error);
    }
  };

  const handleLogin = (loggedInUser: any) => {
    console.log("[App] User logged in:", loggedInUser);
    handleUserUpdate(loggedInUser);
  };

  const handleLogout = async () => {
    console.log("[App] User logging out");
    try {
      // Clear API tokens immediately
      apiClient.clearTokens();

      // Clear user storage and state
      await clearUser();

      console.log("[App] Logout completed successfully");
    } catch (error) {
      console.error("[App] Error during logout:", error);
      // Force reload on error as fallback
      window.location.reload();
    }
  };

  const handleAuthError = (errorMessage: string) => {
    console.error("[App] Auth error:", errorMessage);
    // You could show a notification here
  };

  // Sync i18n language with persistent config
  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  // Setup API client token expiration handling and session monitoring
  useEffect(() => {
    // Handle token expiration
    apiClient.onTokenExpired = () => {
      console.log("[App] Token expired, logging out");
      handleLogout();
    };

    // Listen for session expiration events from SessionManager
    const handleSessionExpired = () => {
      console.log("[App] Session expired event received");
      handleLogout();
    };

    window.addEventListener("sessionExpired", handleSessionExpired);

    return () => {
      window.removeEventListener("sessionExpired", handleSessionExpired);
    };
  }, []);

  // Initialize sync manager
  useEffect(() => {
    SyncManager.initialize();

    // Set up callback to refresh UI when sync updates user data
    SyncManager.setOnUserDataUpdated(() => {
      console.log("[App] User data updated via sync, refreshing UI");
      refreshUser();
    });

    console.log("[App] Sync manager initialized");
  }, []); // Remove refreshUser dependency

  // Get safe area information on mobile platforms
  useEffect(() => {
    const getSafeAreaInfo = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.getInfo();
          // On mobile, we need to account for status bar + typical header height
          // Status bar is typically 24-44px, app bar is typically 56-64px
          setSafeAreaTop(56 + 24); // App bar height + typical status bar
        } catch (error) {
          console.log("Could not get status bar info:", error);
          // Fallback to typical mobile header heights
          setSafeAreaTop(80); // App bar + status bar fallback
        }
      } else {
        // Web platform - only account for app bar
        setSafeAreaTop(64);
      }
    };

    getSafeAreaInfo();
  }, []);

  if (!themeMode || !language) return null; // or a loading spinner

  // If not logged in, show login screen
  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginScreen onLogin={handleLogin} onError={handleAuthError} />
      </ThemeProvider>
    );
  }

  const getScreenTitle = () => {
    if (screen === "dashboard") return t("title");
    return t("profile", "Profile");
  };

  const renderScreen = () => {
    if (screen === "dashboard") return <DashboardScreen />;
    return (
      <UserProfileScreen
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        language={language}
        setLanguage={changeLanguage}
        user={user}
        onUserUpdate={handleUserUpdate}
      />
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Header
        title={getScreenTitle()}
        screen={screen}
        setScreen={setScreen}
        user={user}
      />
      <Container
        className="App"
        sx={{
          paddingTop: `${safeAreaTop}px`, // Use padding instead of margin for proper header spacing
          paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))", // Bottom padding + safe area
          minHeight:
            "calc(100vh - env(safe-area-inset-bottom, 0px) - 64px - env(safe-area-inset-top, 0px))", // Full height
          boxSizing: "border-box", // Include padding in height calculation
        }}
      >
        {renderScreen()}
      </Container>
    </ThemeProvider>
  );
}

export default App;
