import "./App.css";
import "./colors.css";
import {
  ThemeProvider,
  CssBaseline,
  CircularProgress,
  Box,
} from "@mui/material";
import { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { useChangeLanguage } from "./hooks/useChangeLanguage";
import { useLogin } from "./hooks/useLogin";
import { useThemeChange } from "./hooks/useThemeChange";
import "./i18n";
import i18n from "i18next";
import Container from "@mui/material/Container";
import Header from "./components/Header";
import type { User } from "./types/user";
import { useTranslation } from "react-i18next";
import apiClient from "./utils/apiClient";
import { UserCacheManager } from "./utils/cache/userCacheManager";
import { ShoppingCacheManager } from "./utils/cache/shoppingCacheManager";
import { BackgroundSync } from "./utils/cache/backgroundSync";
import { getThemeMode, getLanguage } from "./utils/cache/preferences";

// Lazy load screens for better code splitting
const ShoppingListScreen = lazy(() => import("./screens/ShoppingListScreen"));
const UserProfileScreen = lazy(() => import("./screens/UserProfileScreen"));
const LoginScreen = lazy(() => import("./screens/LoginScreen"));

// Loading component for suspense fallback - optimized
const LoadingSpinner = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
    sx={{ backgroundColor: "#ffffff" }}
  >
    <CircularProgress size={40} />
  </Box>
);

// App initialization loading screen
const AppLoadingScreen = () => (
  <Box
    display="flex"
    flexDirection="column"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
    sx={{ 
      backgroundColor: "#ffffff",
      padding: 4,
      textAlign: "center"
    }}
  >
    <Box sx={{ mb: 3 }}>
      {/* App icon/logo could go here */}
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: 2,
          backgroundColor: "#1976d2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2rem",
          color: "white",
          fontWeight: "bold",
          mb: 2,
          mx: "auto"
        }}
      >
        🛒
      </Box>
      <Box
        sx={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          color: "#1976d2",
          mb: 1
        }}
      >
        Shopping List
      </Box>
      <Box
        sx={{
          fontSize: "0.9rem",
          color: "#666",
          mb: 4
        }}
      >
        Loading your data...
      </Box>
    </Box>
    <CircularProgress size={32} />
  </Box>
);

function App() {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<"dashboard" | "profile">("dashboard");

  // Enhanced screen setter with upload triggering for batching system
  const handleScreenChange = useCallback(
    (newScreen: "dashboard" | "profile") => {
      console.log("[App] Screen changing from", screen, "to", newScreen);
      setScreen(newScreen);

      // Trigger upload of pending changes asynchronously (non-blocking)
      Promise.allSettled([
        UserCacheManager.uploadPendingChanges(),
        ShoppingCacheManager.uploadPendingChanges(),
      ]).catch((error) => {
        console.error(
          "[App] Error uploading pending changes on screen change:",
          error
        );
      });
    },
    [screen]
  );

  // App state
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true); // New loading state
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState<string>("en");

  const changeLanguage = useChangeLanguage(setLanguage);

  // Helper functions
  const handleUserUpdate = useCallback(
    async (updatedUserData: User) => {
      try {
        // Update local state
        setUser(updatedUserData);

        // Update cache
        await UserCacheManager.cacheUserData(updatedUserData);

        // Sync theme and language preferences
        if (updatedUserData.preferences?.theme) {
          setThemeMode(updatedUserData.preferences.theme);
        }
        if (updatedUserData.preferences?.language) {
          setLanguage(updatedUserData.preferences.language);
          changeLanguage(updatedUserData.preferences.language);
        }

        console.log("User updated and cached successfully");
      } catch (error) {
        console.error("Error updating user:", error);
      }
    },
    [changeLanguage]
  );

  // Use new hooks
  const theme = useThemeChange(themeMode);
  const { handleLogin, handleLogout, handleAuthError } = useLogin({
    onUserUpdate: handleUserUpdate,
    setUser,
    setThemeMode,
    setLanguage,
    onLogout: () => setIsInitializing(false), // Reset initialization state on logout
  });

  // Initialize user data on app startup
  useEffect(() => {
    let mounted = true; // Prevent race conditions

    const initializeApp = async () => {
      if (!mounted) return;

      try {
        console.log("[App] Initializing app with new cache system...");

        // First check if we have valid tokens to avoid login flash
        const hasTokens = await apiClient.hasValidSession();
        
        // Load user data
        const userData = await UserCacheManager.getUserDataWithCache();
        if (!mounted) return;

        if (userData && hasTokens) {
          console.log("[App] Loaded user from cache:", userData);
          setUser(userData as User);
          // Update theme and language from user preferences
          if (userData.preferences?.theme) {
            setThemeMode(userData.preferences.theme);
          }
          if (userData.preferences?.language) {
            setLanguage(userData.preferences.language);
          }
        } else {
          console.log("[App] No valid user session found");
          setUser(null); // Explicitly set to null to show login
        }

        // Load theme and language preferences as fallback
        if (!userData?.preferences?.theme) {
          const savedTheme = await getThemeMode();
          if (savedTheme && mounted) {
            setThemeMode(savedTheme);
          }
        }

        if (!userData?.preferences?.language) {
          const savedLanguage = await getLanguage();
          if (savedLanguage && mounted) {
            setLanguage(savedLanguage);
          }
        }

        // Trigger background sync only if user is logged in
        if (mounted && hasTokens) {
          BackgroundSync.syncOnNavigation();
        }
        
        // Initialization complete
        setIsInitializing(false);
      } catch (error) {
        console.error("[App] Error initializing app:", error);
        if (mounted) {
          setUser(null); // Show login on error
          setIsInitializing(false);
        }
      }
    };

    initializeApp();

    return () => {
      mounted = false;
    };
  }, []); // Remove dependency array to prevent multiple calls

  // Update i18n language
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

  // Handle app close - upload pending changes
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Synchronously upload pending changes when app is closing
      const syncAll = async () => {
        try {
          await Promise.allSettled([
            UserCacheManager.uploadPendingChanges(),
            ShoppingCacheManager.uploadPendingChanges(),
          ]);
        } catch (error) {
          console.error("[App] Error uploading on app close:", error);
        }
      };

      // Note: beforeunload doesn't wait for async operations
      // This is best effort - most uploads should happen on screen changes
      syncAll();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    console.log("[App] App lifecycle handlers initialized");

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Show app initialization screen while checking authentication
  if (isInitializing) {
    return <AppLoadingScreen />;
  }

  // Show fast loading spinner if theme is not loaded yet
  if (!theme) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{ backgroundColor: "#ffffff" }}
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  // If not logged in, show login screen
  if (!user) {
    console.log("[App] No user found, showing login screen");
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Suspense fallback={<LoadingSpinner />}>
          <LoginScreen onLogin={handleLogin} onError={handleAuthError} />
        </Suspense>
      </ThemeProvider>
    );
  }

  console.log("[App] Rendering main app with user:", user);

  const getScreenTitle = () => {
    if (screen === "dashboard") return t("title");
    return t("profile", "Profile");
  };

  const renderScreen = () => {
    if (screen === "dashboard") return <ShoppingListScreen user={user} />;
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
        setScreen={handleScreenChange}
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
          overflowX: "hidden", // Prevent horizontal scroll
        }}
      >
        <Suspense fallback={<LoadingSpinner />}>{renderScreen()}</Suspense>
      </Container>
    </ThemeProvider>
  );
}

export default App;
