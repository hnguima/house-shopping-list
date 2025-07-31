import { useCallback } from "react";
import { UserCacheManager } from "../utils/cache";
import apiClient from "../utils/apiClient";
import type { User } from "../types/user";

interface UseLoginProps {
  onUserUpdate: (user: User) => Promise<void>;
  setUser: (user: User | null) => void;
  setThemeMode: (mode: "light" | "dark") => void;
  setLanguage: (language: string) => void;
  onLogout?: () => void; // Optional callback for logout
}

export const useLogin = ({
  onUserUpdate,
  setUser,
  setThemeMode,
  setLanguage,
  onLogout,
}: UseLoginProps) => {
  const handleLogin = useCallback(
    async (loggedInUser: any) => {
      console.log("[useLogin] User logged in:", loggedInUser);

      try {
        // First, try to get the user's current data from the API
        const currentUserResponse = await apiClient.getCurrentUser();

        if (currentUserResponse?.data?.user) {
          // User exists in DB, use their existing data
          console.log(
            "[useLogin] Using existing user data from DB:",
            currentUserResponse.data.user
          );
          console.log(
            "[useLogin] User data structure:",
            JSON.stringify(currentUserResponse.data.user, null, 2)
          );

          // Ensure the user data has the required preferences structure
          const dbUser = currentUserResponse.data.user;
          const formattedDbUser = {
            ...dbUser,
            preferences: {
              theme: dbUser.preferences?.theme || "light",
              language: dbUser.preferences?.language || "en",
              // Only keep existing extra preferences if they exist, don't add defaults
              ...(dbUser.preferences &&
              Object.keys(dbUser.preferences).length > 0
                ? Object.fromEntries(
                    Object.entries(dbUser.preferences).filter(
                      ([key]) => !["theme", "language"].includes(key)
                    )
                  )
                : {}),
            },
          };

          console.log("[useLogin] Formatted DB user:", formattedDbUser);
          await onUserUpdate(formattedDbUser);
        } else {
          // New user or error fetching, create with defaults
          console.log("[useLogin] Creating new user with defaults");
          const formattedUser = {
            id: loggedInUser.id,
            username:
              loggedInUser.username || loggedInUser.email?.split("@")[0] || "",
            email: loggedInUser.email,
            name: loggedInUser.name,
            photo: loggedInUser.photo || loggedInUser.profile_picture,
            provider: "google",
            preferences: {
              theme: "light" as const,
              language: "en",
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          console.log("[useLogin] Formatted user:", formattedUser);
          await onUserUpdate(formattedUser);
        }
      } catch (error) {
        console.error(
          "[useLogin] Error fetching user data, using OAuth data with defaults:",
          error
        );
        // Fallback to creating user with defaults if API call fails
        const formattedUser = {
          id: loggedInUser.id,
          username:
            loggedInUser.username || loggedInUser.email?.split("@")[0] || "",
          email: loggedInUser.email,
          name: loggedInUser.name,
          photo: loggedInUser.photo || loggedInUser.profile_picture,
          provider: "google",
          preferences: {
            theme: "light" as const,
            language: "en",
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await onUserUpdate(formattedUser);
      }
    },
    [onUserUpdate]
  );

  const handleLogout = useCallback(async () => {
    console.log("[useLogin] User logging out");
    try {
      // Clear API tokens immediately
      await apiClient.clearTokens();

      // Clear user cache with new system
      await UserCacheManager.clearCache();

      // Clear local state
      setUser(null);
      setThemeMode("light");
      setLanguage("en");

      // Call onLogout callback if provided
      if (onLogout) {
        onLogout();
      }

      console.log("[useLogin] Logout completed successfully");
    } catch (error) {
      console.error("[useLogin] Error during logout:", error);
      // Force reload on error as fallback
      window.location.reload();
    }
  }, [setUser, setThemeMode, setLanguage, onLogout]);

  const handleAuthError = useCallback((errorMessage: string) => {
    console.error("[useLogin] Auth error:", errorMessage);
    // You could show a notification here
  }, []);

  return {
    handleLogin,
    handleLogout,
    handleAuthError,
  };
};
