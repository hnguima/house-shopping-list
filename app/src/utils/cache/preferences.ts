import { Preferences } from "@capacitor/preferences";
import type { User } from "../../types/user";
import type { ShoppingList } from "../../types/shopping";

// Single storage key for all user data
const USER_DATA_KEY = "userData";
const SHOPPING_DATA_KEY = "shoppingData";

const DEBUG = false; // Set to true for debugging

// Consolidated user data structure stored in single key
interface StoredUserData {
  theme?: "light" | "dark";
  language?: string;
  user?: User;
  userUpdatedAt?: string;
  userPhoto?: string; // Base64 data URL
  userPhotoTimestamp?: string;
}

// Shopping data structure
interface StoredShoppingData {
  lists?: ShoppingList[];
  lastSynced?: number;
  shoppingUpdatedAt?: string;
  pendingDeletions?: string[]; // Array of list IDs pending deletion
}

/**
 * Simple wrapper around Capacitor Preferences API
 * Based on .ignore/app capacitorPreferences.ts pattern
 * Consolidates all data into single JSON objects
 */

// Helper to get current stored user data
async function getStoredUserData(): Promise<StoredUserData> {
  try {
    const { value } = await Preferences.get({ key: USER_DATA_KEY });
    if (value) {
      return JSON.parse(value);
    }
    return {};
  } catch (e) {
    if (DEBUG)
      console.error(`[Preferences] Failed to get stored user data:`, e);
    return {};
  }
}

// Helper to save stored user data
async function saveStoredUserData(data: StoredUserData): Promise<void> {
  try {
    await Preferences.set({ key: USER_DATA_KEY, value: JSON.stringify(data) });
    if (DEBUG) console.log(`[Preferences] Saved user data to storage`);
  } catch (e) {
    if (DEBUG) console.error(`[Preferences] Failed to save user data:`, e);
  }
}

// Helper to get current stored shopping data
async function getStoredShoppingData(): Promise<StoredShoppingData> {
  try {
    const { value } = await Preferences.get({ key: SHOPPING_DATA_KEY });
    if (value) {
      return JSON.parse(value);
    }
    return {};
  } catch (e) {
    if (DEBUG)
      console.error(`[Preferences] Failed to get stored shopping data:`, e);
    return {};
  }
}

// Helper to save stored shopping data
async function saveStoredShoppingData(data: StoredShoppingData): Promise<void> {
  try {
    await Preferences.set({
      key: SHOPPING_DATA_KEY,
      value: JSON.stringify(data),
    });
    if (DEBUG) console.log(`[Preferences] Saved shopping data to storage`);
  } catch (e) {
    if (DEBUG) console.error(`[Preferences] Failed to save shopping data:`, e);
  }
}

// Theme & Language preferences (part of user data)
export async function saveThemeMode(mode: "light" | "dark"): Promise<void> {
  try {
    const userData = await getStoredUserData();
    userData.theme = mode;
    await saveStoredUserData(userData);
    if (DEBUG) console.log(`[Preferences] Saved theme mode:`, mode);
  } catch (e) {
    if (DEBUG) console.error(`[Preferences] Failed to save theme mode:`, e);
  }
}

export async function getThemeMode(): Promise<"light" | "dark" | null> {
  try {
    const userData = await getStoredUserData();
    const theme = userData.theme;
    if (DEBUG) console.log(`[Preferences] Retrieved theme mode:`, theme);
    if (theme === "light" || theme === "dark") return theme;
    return null;
  } catch (e) {
    if (DEBUG) console.error(`[Preferences] Failed to retrieve theme mode:`, e);
    return null;
  }
}

export async function saveLanguage(language: string): Promise<void> {
  try {
    if (DEBUG) console.log(`[Preferences] Saving language:`, language);
    const userData = await getStoredUserData();
    userData.language = language;
    await saveStoredUserData(userData);
    if (DEBUG) console.log(`[Preferences] Saved language:`, language);
  } catch (e) {
    if (DEBUG) console.error(`[Preferences] Failed to save language:`, e);
  }
}

export async function getLanguage(): Promise<string | null> {
  try {
    const userData = await getStoredUserData();
    const language = userData.language;
    if (DEBUG) console.log(`[Preferences] Retrieved language:`, language);
    if (typeof language === "string" && language.length > 0) {
      return language;
    }
    return null;
  } catch (e) {
    if (DEBUG) console.error(`[Preferences] Failed to retrieve language:`, e);
    return null;
  }
}

// User data caching with timestamp
export async function saveUserData(
  user: User,
  timestamp?: string
): Promise<void> {
  try {
    if (DEBUG) console.log(`[Preferences] Saving user data:`, user);

    const userData = await getStoredUserData();
    userData.user = user;
    if (timestamp) {
      userData.userUpdatedAt = timestamp;
    }
    await saveStoredUserData(userData);

    if (DEBUG) console.log(`[Preferences] Saved user data`);
  } catch (e) {
    if (DEBUG) console.error(`[Preferences] Failed to save user data:`, e);
  }
}

export async function getUserData(): Promise<{
  userData: User | null;
  updatedAt: string | null;
}> {
  try {
    const storedData = await getStoredUserData();
    const user = storedData.user || null;
    const updatedAt = storedData.userUpdatedAt || null;

    if (DEBUG)
      console.log(
        `[Preferences] Retrieved user data`,
        user ? "found" : "not found"
      );

    return {
      userData: user,
      updatedAt,
    };
  } catch (e) {
    if (DEBUG) console.error(`[Preferences] Failed to retrieve user data:`, e);
    return { userData: null, updatedAt: null };
  }
}

// User timestamp management
export async function saveUserUpdatedAt(timestamp: string): Promise<void> {
  try {
    if (DEBUG)
      console.log(`[Preferences] Saving user updated timestamp:`, timestamp);
    const userData = await getStoredUserData();
    userData.userUpdatedAt = timestamp;
    await saveStoredUserData(userData);
  } catch (e) {
    if (DEBUG)
      console.error(`[Preferences] Failed to save user updated timestamp:`, e);
  }
}

export async function getUserUpdatedAt(): Promise<string | null> {
  try {
    const userData = await getStoredUserData();
    const timestamp = userData.userUpdatedAt || null;
    if (DEBUG)
      console.log(`[Preferences] Retrieved user updated timestamp:`, timestamp);
    return timestamp;
  } catch (e) {
    if (DEBUG)
      console.error(
        `[Preferences] Failed to retrieve user updated timestamp:`,
        e
      );
    return null;
  }
}

// User photo BLOB caching
export async function saveUserPhotoBlob(
  photoBlob: string,
  timestamp?: string
): Promise<void> {
  try {
    if (DEBUG)
      console.log(
        `[Preferences] Saving user photo BLOB (length: ${photoBlob.length})`
      );
    const userData = await getStoredUserData();
    userData.userPhoto = photoBlob;
    if (timestamp) {
      userData.userPhotoTimestamp = timestamp;
    }
    await saveStoredUserData(userData);

    if (DEBUG) console.log(`[Preferences] Saved user photo BLOB`);
  } catch (e) {
    if (DEBUG)
      console.error(`[Preferences] Failed to save user photo BLOB:`, e);
  }
}

export async function getUserPhotoBlob(): Promise<{
  photoBlob: string | null;
  timestamp: string | null;
}> {
  try {
    const userData = await getStoredUserData();
    const photoBlob = userData.userPhoto || null;
    const timestamp = userData.userPhotoTimestamp || null;

    if (DEBUG)
      console.log(
        `[Preferences] Retrieved user photo BLOB:`,
        photoBlob ? `length ${photoBlob.length}` : "null"
      );

    return {
      photoBlob,
      timestamp,
    };
  } catch (e) {
    if (DEBUG)
      console.error(`[Preferences] Failed to retrieve user photo BLOB:`, e);
    return { photoBlob: null, timestamp: null };
  }
}

// Shopping data caching
export async function saveShoppingData(
  data: { lists: ShoppingList[]; lastSynced: number },
  timestamp?: string
): Promise<void> {
  try {
    if (DEBUG) console.log(`[Preferences] Saving shopping data:`, data);

    const shoppingData = await getStoredShoppingData();
    shoppingData.lists = data.lists;
    shoppingData.lastSynced = data.lastSynced;
    if (timestamp) {
      shoppingData.shoppingUpdatedAt = timestamp;
    }
    await saveStoredShoppingData(shoppingData);

    if (DEBUG) console.log(`[Preferences] Saved shopping data`);
  } catch (e) {
    if (DEBUG) console.error(`[Preferences] Failed to save shopping data:`, e);
  }
}

export async function getShoppingData(): Promise<{
  shoppingData: { lists: ShoppingList[]; lastSynced: number } | null;
  updatedAt: string | null;
}> {
  try {
    const storedData = await getStoredShoppingData();

    const shoppingData =
      storedData.lists && storedData.lastSynced !== undefined
        ? {
            lists: storedData.lists,
            lastSynced: storedData.lastSynced,
          }
        : null;

    const updatedAt = storedData.shoppingUpdatedAt || null;

    if (DEBUG)
      console.log(
        `[Preferences] Retrieved shopping data`,
        shoppingData ? "found" : "not found"
      );

    return {
      shoppingData,
      updatedAt,
    };
  } catch (e) {
    if (DEBUG)
      console.error(`[Preferences] Failed to retrieve shopping data:`, e);
    return { shoppingData: null, updatedAt: null };
  }
}

// Shopping timestamp management
export async function saveShoppingUpdatedAt(timestamp: string): Promise<void> {
  try {
    if (DEBUG)
      console.log(
        `[Preferences] Saving shopping updated timestamp:`,
        timestamp
      );
    const shoppingData = await getStoredShoppingData();
    shoppingData.shoppingUpdatedAt = timestamp;
    await saveStoredShoppingData(shoppingData);
  } catch (e) {
    if (DEBUG)
      console.error(
        `[Preferences] Failed to save shopping updated timestamp:`,
        e
      );
  }
}

export async function getShoppingUpdatedAt(): Promise<string | null> {
  try {
    const shoppingData = await getStoredShoppingData();
    const timestamp = shoppingData.shoppingUpdatedAt || null;
    if (DEBUG)
      console.log(
        `[Preferences] Retrieved shopping updated timestamp:`,
        timestamp
      );
    return timestamp;
  } catch (e) {
    if (DEBUG)
      console.error(
        `[Preferences] Failed to retrieve shopping updated timestamp:`,
        e
      );
    return null;
  }
}

// Clear cache functions
export async function clearUserCache(): Promise<void> {
  try {
    await Preferences.remove({ key: USER_DATA_KEY });
    if (DEBUG) console.log(`[Preferences] Cleared user cache`);
  } catch (e) {
    if (DEBUG) console.error(`[Preferences] Failed to clear user cache:`, e);
  }
}

export async function clearShoppingCache(): Promise<void> {
  try {
    await Preferences.remove({ key: SHOPPING_DATA_KEY });
    if (DEBUG) console.log(`[Preferences] Cleared shopping cache`);
  } catch (e) {
    if (DEBUG)
      console.error(`[Preferences] Failed to clear shopping cache:`, e);
  }
}
