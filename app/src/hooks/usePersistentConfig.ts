import { useEffect, useState } from "react";
import { getLightTheme, getDarkTheme } from "../theme";
import { UserStorageManager } from "../utils/userStorageManager";
import type { User } from "../types/user";

const GUEST_PREFERENCES_KEY = "guest_preferences";

interface GuestPreferences {
  theme: "light" | "dark";
  language: string;
}

const getGuestPreferences = (): GuestPreferences => {
  try {
    const stored = localStorage.getItem(GUEST_PREFERENCES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error reading guest preferences:", error);
  }
  return { theme: "light", language: "en" };
};

const saveGuestPreferences = (preferences: Partial<GuestPreferences>) => {
  try {
    const current = getGuestPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(GUEST_PREFERENCES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Error saving guest preferences:", error);
  }
};

export function usePersistentConfig() {
  const [themeMode, setThemeMode] = useState<"light" | "dark" | null>(null);
  const [theme, setTheme] = useState(getLightTheme());
  const [language, setLanguage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // On mount, load user data and preferences
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Check for legacy data and migrate if needed
        const migrated = await import("../utils/userStorageManager").then(
          (module) => module.migrateLegacyUserData()
        );

        if (migrated) {
          console.log("[usePersistentConfig] Legacy data migrated");
        }

        // Check if user exists (don't create demo user automatically)
        const currentUser = await UserStorageManager.getUser();

        if (currentUser) {
          setUser(currentUser);
          // Set theme and language from user preferences
          setThemeMode(currentUser.preferences.theme);
          setLanguage(currentUser.preferences.language);
        } else {
          // No user logged in - use guest preferences
          const guestPrefs = getGuestPreferences();
          setThemeMode(guestPrefs.theme);
          setLanguage(guestPrefs.language);
        }
      } catch (error) {
        console.error("[usePersistentConfig] Error loading user data:", error);
        // Fallback to defaults
        setThemeMode("light");
        setLanguage("en");
      }
    };

    loadUserData();
  }, []);

  // Update theme when themeMode changes
  useEffect(() => {
    if (themeMode) {
      setTheme(themeMode === "dark" ? getDarkTheme() : getLightTheme());

      // Save to user preferences if user is logged in
      if (user) {
        UserStorageManager.updateUserPreferences({ theme: themeMode }).catch(
          (error) => {
            console.error("[usePersistentConfig] Error saving theme:", error);
          }
        );
      } else {
        // Save to guest preferences for non-logged in users
        saveGuestPreferences({ theme: themeMode });
      }
    }
  }, [themeMode, user]);

  // Update language preference when language changes
  useEffect(() => {
    if (language) {
      if (user) {
        UserStorageManager.updateUserPreferences({ language }).catch(
          (error) => {
            console.error(
              "[usePersistentConfig] Error saving language:",
              error
            );
          }
        );
      } else {
        // Save to guest preferences for non-logged in users
        saveGuestPreferences({ language });
      }
    }
  }, [language, user]);

  const updateUser = async (updatedUser: User) => {
    try {
      await UserStorageManager.saveUser(updatedUser);
      setUser(updatedUser);

      // Update local state if preferences changed
      if (updatedUser.preferences.theme !== themeMode) {
        setThemeMode(updatedUser.preferences.theme);
      }
      if (updatedUser.preferences.language !== language) {
        setLanguage(updatedUser.preferences.language);
      }
    } catch (error) {
      console.error("[usePersistentConfig] Error updating user:", error);
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await UserStorageManager.getUser();
      setUser(userData); // Set to userData (could be null)

      if (userData) {
        setThemeMode(userData.preferences.theme);
        setLanguage(userData.preferences.language);
        console.log("[usePersistentConfig] User data refreshed from storage");
      } else {
        // User is logged out, revert to guest preferences
        const guestPrefs = getGuestPreferences();
        setThemeMode(guestPrefs.theme);
        setLanguage(guestPrefs.language);
        console.log(
          "[usePersistentConfig] User cleared, using guest preferences"
        );
      }
    } catch (error) {
      console.error("[usePersistentConfig] Error refreshing user data:", error);
    }
  };

  const clearUser = async () => {
    try {
      await UserStorageManager.clearUser();
      setUser(null);

      // Revert to guest preferences
      const guestPrefs = getGuestPreferences();
      setThemeMode(guestPrefs.theme);
      setLanguage(guestPrefs.language);
      console.log(
        "[usePersistentConfig] User logged out, reverted to guest preferences"
      );
    } catch (error) {
      console.error("[usePersistentConfig] Error clearing user:", error);
      throw error;
    }
  };

  return {
    themeMode,
    setThemeMode,
    theme,
    language,
    setLanguage,
    user,
    updateUser,
    refreshUser,
    clearUser,
  };
}
