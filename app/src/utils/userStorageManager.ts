import { Preferences } from "@capacitor/preferences";
import type { User, AppState } from "../types/user";
import { createDefaultUser, DEFAULT_PREFERENCES } from "../types/user";

const STORAGE_KEY = "app_state";
const STORAGE_VERSION = "1.0.0";

export class UserStorageManager {
  private static cachedState: AppState | null = null;

  /**
   * Get the current app state from storage
   */
  static async getAppState(): Promise<AppState> {
    if (this.cachedState) {
      return this.cachedState;
    }

    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });

      if (value) {
        const parsed = JSON.parse(value) as AppState;

        // Validate and migrate if needed
        const validatedState = this.validateAndMigrateState(parsed);
        this.cachedState = validatedState;

        return validatedState;
      }
    } catch (error) {
      console.error("[UserStorageManager] Error reading app state:", error);
    }

    // Return default state if nothing found or error occurred
    const defaultState: AppState = {
      user: null,
      version: STORAGE_VERSION,
    };

    this.cachedState = defaultState;
    return defaultState;
  }

  /**
   * Save the current app state to storage
   */
  static async saveAppState(state: AppState): Promise<void> {
    try {
      const stateToSave = {
        ...state,
        lastSyncAt: new Date().toISOString(),
        version: STORAGE_VERSION,
      };

      await Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(stateToSave),
      });

      this.cachedState = stateToSave;
      console.log("[UserStorageManager] App state saved successfully");
    } catch (error) {
      console.error("[UserStorageManager] Error saving app state:", error);
      throw error;
    }
  }

  /**
   * Get the current user
   */
  static async getUser(): Promise<User | null> {
    const state = await this.getAppState();
    return state.user;
  }

  /**
   * Save or update user data
   */
  static async saveUser(user: User): Promise<void> {
    const state = await this.getAppState();

    const updatedUser = {
      ...user,
      updatedAt: Date.now(), // Unix timestamp in milliseconds
    };

    const newState: AppState = {
      ...state,
      user: updatedUser,
    };

    await this.saveAppState(newState);
  }

  /**
   * Save user data without updating timestamp (for server responses)
   */
  static async saveUserWithTimestamp(user: User): Promise<void> {
    const state = await this.getAppState();

    console.log("[UserStorageManager] Saving user with timestamp:", {
      name: user.name,
      username: user.username,
      updatedAt: user.updatedAt,
      hasPhoto: !!user.photo,
    });

    const newState: AppState = {
      ...state,
      user: { ...user }, // Preserve all fields including updatedAt from server
    };

    await this.saveAppState(newState);
  }

  /**
   * Clear user data (logout)
   */
  static async clearUser(): Promise<void> {
    const defaultState: AppState = {
      user: null,
      version: STORAGE_VERSION,
    };

    await this.saveAppState(defaultState);
    this.cachedState = defaultState;
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(
    preferences: Partial<User["preferences"]>
  ): Promise<void> {
    const user = await this.getUser();

    if (!user) {
      throw new Error("No user found to update preferences");
    }

    const updatedUser: User = {
      ...user,
      preferences: {
        ...user.preferences,
        ...preferences,
      },
      updatedAt: Date.now(), // Unix timestamp in milliseconds
    };

    await this.saveUser(updatedUser);
  }

  /**
   * Convert image file to base64 data URL
   */
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert file to base64"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Update user photo with base64 data
   */
  static async updateUserPhoto(file: File): Promise<void> {
    const user = await this.getUser();

    if (!user) {
      throw new Error("No user found to update photo");
    }

    try {
      // Convert file to base64
      const base64Data = await this.fileToBase64(file);

      const updatedUser: User = {
        ...user,
        photo: base64Data,
        updatedAt: Date.now(), // Unix timestamp in milliseconds
      };

      await this.saveUser(updatedUser);
    } catch (error) {
      console.error("[UserStorageManager] Error updating user photo:", error);
      throw error;
    }
  }

  /**
   * Initialize demo user if no user exists
   */
  static async initializeDemoUser(): Promise<User> {
    const existingUser = await this.getUser();

    if (existingUser) {
      return existingUser;
    }

    const demoUser = createDefaultUser();
    await this.saveUser(demoUser);

    return demoUser;
  }

  /**
   * Clear all app data
   */
  static async clearAllData(): Promise<void> {
    try {
      await Preferences.remove({ key: STORAGE_KEY });
      this.cachedState = null;
      console.log("[UserStorageManager] All app data cleared");
    } catch (error) {
      console.error("[UserStorageManager] Error clearing app data:", error);
      throw error;
    }
  }

  /**
   * Validate and migrate state from older versions
   */
  private static validateAndMigrateState(state: any): AppState {
    // Add version if missing
    if (!state.version) {
      state.version = STORAGE_VERSION;
    }

    // Ensure user has preferences
    if (state.user && !state.user.preferences) {
      state.user.preferences = DEFAULT_PREFERENCES;
    }

    // Migrate old localStorage format if needed
    if (state.user) {
      // Ensure required fields exist
      if (!state.user.createdAt) {
        state.user.createdAt = Date.now(); // Unix timestamp in milliseconds
      }
      if (!state.user.updatedAt) {
        state.user.updatedAt = Date.now(); // Unix timestamp in milliseconds
      }
    }

    return state as AppState;
  }

  /**
   * Get cached state without hitting storage (for performance)
   */
  static getCachedState(): AppState | null {
    return this.cachedState;
  }

  /**
   * Force refresh from storage (clears cache)
   */
  static async refreshFromStorage(): Promise<AppState> {
    this.cachedState = null;
    return this.getAppState();
  }
}

// Legacy localStorage migration utility
export const migrateLegacyUserData = async (): Promise<boolean> => {
  try {
    const legacyUser = localStorage.getItem("user");
    if (legacyUser) {
      const parsed = JSON.parse(legacyUser);

      // Convert to new format
      const migratedUser: User = {
        username: parsed.username || "migrated_user",
        email: parsed.email || "user@example.com",
        name: parsed.name || "User",
        photo: parsed.photo,
        provider: parsed.provider,
        preferences: {
          theme: parsed.preferences?.theme || DEFAULT_PREFERENCES.theme,
          language:
            parsed.preferences?.language || DEFAULT_PREFERENCES.language,
          primaryColor: DEFAULT_PREFERENCES.primaryColor,
          fontSize: DEFAULT_PREFERENCES.fontSize,
        },
        createdAt: Date.now(), // Unix timestamp in milliseconds
        updatedAt: Date.now(), // Unix timestamp in milliseconds
      };

      await UserStorageManager.saveUser(migratedUser);

      // Remove old data
      localStorage.removeItem("user");
      localStorage.removeItem("app_config");

      console.log("[UserStorageManager] Legacy data migrated successfully");
      return true;
    }
  } catch (error) {
    console.error("[UserStorageManager] Error migrating legacy data:", error);
  }

  return false;
};
