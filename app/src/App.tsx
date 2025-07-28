import "./App.css";
import "./colors.css";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { useState, useEffect } from "react";
import { usePersistentConfig } from "./hooks/usePersistentConfig";
import { useChangeLanguage } from "./hooks/useChangeLanguage";
import "./i18n";
import i18n from "i18next";
import Container from "@mui/material/Container";
import ShoppingListScreen from "./screens/ShoppingListScreen";
import Header from "./components/Header";

import { useTranslation } from "react-i18next";
import UserProfileScreen from "./screens/UserProfileScreen";
import LoginScreen from "./screens/LoginScreen";
import apiClient from "./utils/apiClient";
import { SyncManager } from "./utils/syncManager";

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
    if (screen === "dashboard") return <ShoppingListScreen />;
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
        maxWidth="md"
        sx={{
          paddingTop: `calc(64px + env(safe-area-inset-top, 0px))`, // Header height + safe area
          paddingLeft: 1,
          paddingRight: 1,
          paddingBottom: 1,
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
