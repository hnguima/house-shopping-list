import apiClient from "../apiClient";
import {
  saveUserData,
  getUserData,
  saveUserUpdatedAt,
  getUserUpdatedAt,
  clearUserCache,
} from "./preferences";
import type { User } from "../../types/user";

export interface CachedUserData {
  id?: string;
  username: string;
  email: string;
  name: string;
  photo?: string;
  provider?: string;
  preferences: {
    theme?: "light" | "dark";
    language?: string;
    primaryColor?: string;
    fontSize?: "small" | "medium" | "large";
  };
  createdAt?: number;
  updatedAt?: number;
}

export interface UserUpdateStatus {
  shouldUpdate: boolean;
  cachedData: CachedUserData | null;
  serverTimestamp: string | null;
}

/**
 * User cache manager based on .ignore/app pattern
 * Uses direct server comparison instead of complex timestamp math
 */
export class UserCacheManager {
  private static readonly DEBUG = false;
  private static readonly SERVER_CHECK_TIMEOUT = 3000; // 3 seconds timeout
  private static checkInProgress = false; // Prevent duplicate calls

  /**
   * Helper function to check server timestamp with timeout
   */
  private static async checkServerTimestampWithTimeout(): Promise<any> {
    return Promise.race([
      apiClient.getUserTimestamp(), // Use lightweight timestamp endpoint
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Server timestamp check timeout")),
          this.SERVER_CHECK_TIMEOUT
        )
      ),
    ]);
  }

  /**
   * Convert photo URL to base64 blob
   */
  private static async convertPhotoToBlob(
    photoUrl: string
  ): Promise<string | null> {
    try {
      if (!photoUrl || photoUrl.startsWith("data:image/")) {
        return photoUrl; // Already a blob or null
      }

      console.log("[UserCache] Converting photo URL to blob:", photoUrl);
      const response = await fetch(photoUrl);
      if (!response.ok) {
        console.warn("[UserCache] Failed to fetch photo:", response.status);
        return null;
      }

      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn("[UserCache] Error converting photo to blob:", error);
      return null;
    }
  }

  /**
   * Check if user data needs to be updated by comparing timestamps
   * This is the core pattern from .ignore/app - direct comparison
   */
  static async checkUserUpdateStatus(): Promise<UserUpdateStatus> {
    console.log("[UserCache] === checkUserUpdateStatus() called ===");

    // Prevent duplicate simultaneous calls
    if (this.checkInProgress) {
      console.log(
        "[UserCache] Check already in progress, returning cached data"
      );
      const { userData } = await getUserData();
      return {
        shouldUpdate: false,
        cachedData: userData as CachedUserData,
        serverTimestamp: null,
      };
    }

    this.checkInProgress = true;

    try {
      // Get current timestamp from server with timeout
      // Check server timestamp with timeout to avoid hanging
      const timestampResponse = await this.checkServerTimestampWithTimeout();

      if (!timestampResponse?.data?.updatedAt) {
        console.warn("[UserCache] Failed to get user timestamp from server");
        const { userData } = await getUserData();
        return {
          shouldUpdate: false,
          cachedData: userData as CachedUserData,
          serverTimestamp: null,
        };
      }

      // Server returns Unix timestamp (number), convert to string for comparison
      const serverTimestamp = timestampResponse.data.updatedAt.toString();
      console.log("[UserCache] Server timestamp:", serverTimestamp);

      // Get cached timestamp (should also be Unix timestamp as string)
      const cachedTimestamp = await getUserUpdatedAt();
      console.log("[UserCache] Cached timestamp:", cachedTimestamp);

      // Get cached data
      const { userData: cachedData } = await getUserData();
      const hasCachedData = !!cachedData;
      console.log("[UserCache] Has cached data:", hasCachedData);

      let shouldUpdate = false;

      if (!cachedData || !cachedTimestamp) {
        console.log("[UserCache] No cached data or timestamp - need to update");
        shouldUpdate = true;
      } else if (serverTimestamp !== cachedTimestamp) {
        console.log(
          "[UserCache] Timestamp mismatch - server:",
          serverTimestamp,
          "cached:",
          cachedTimestamp
        );
        shouldUpdate = true;
      } else {
        console.log("[UserCache] Timestamps match - using cached data");
      }

      return {
        shouldUpdate,
        cachedData: cachedData as CachedUserData,
        serverTimestamp,
      };
    } catch (error) {
      console.error("[UserCache] Error checking update status:", error);
      // If we can't check, return cached data if available and don't update
      const { userData: cachedData } = await getUserData();
      return {
        shouldUpdate: false,
        cachedData: cachedData as CachedUserData,
        serverTimestamp: null,
      };
    } finally {
      this.checkInProgress = false;
    }
  }

  /**
   * Get user data with automatic cache validation
   * This follows the .ignore/app pattern exactly
   */
  static async getUserDataWithCache(): Promise<CachedUserData | null> {
    console.log("[UserCache] === getUserDataWithCache() called ===");

    try {
      const updateStatus = await this.checkUserUpdateStatus();

      console.log("[UserCache] Update status:", {
        shouldUpdate: updateStatus.shouldUpdate,
        hasCachedData: !!updateStatus.cachedData,
        serverTimestamp: updateStatus.serverTimestamp,
      });

      if (updateStatus.shouldUpdate || !updateStatus.cachedData) {
        console.log("[UserCache] Fetching fresh user data from API");

        // Fetch fresh data from API
        const response = await apiClient.getCurrentUser();

        if (response?.data?.user) {
          const freshData = response.data.user as CachedUserData;
          const timestamp =
            updateStatus.serverTimestamp || Date.now().toString();

          console.log("[UserCache] Got fresh data, caching it now...");
          // Cache the fresh data (including photo BLOB)
          await this.cacheUserData(freshData, timestamp);

          // Return the processed data with BLOB photo instead of raw fresh data
          return await this.getCachedDataWithPhoto(freshData);
        } else {
          // API failed, return cached data if available
          console.warn("[UserCache] API failed, returning cached data");
          return await this.getCachedDataWithPhoto(updateStatus.cachedData);
        }
      } else {
        console.log(
          "[UserCache] Using cached user data - no photo fetch needed"
        );
        // We have valid cached data and timestamps match - just return cached data with photo
        return await this.getCachedDataWithPhoto(updateStatus.cachedData);
      }
    } catch (error) {
      console.error("[UserCache] Error getting user data:", error);

      // Fallback to cached data
      const { userData } = await getUserData();
      return await this.getCachedDataWithPhoto(userData as CachedUserData);
    }
  }

  /**
   * Get cached data with photo BLOB converted to data URL
   */
  private static async getCachedDataWithPhoto(
    cachedData: CachedUserData | null
  ): Promise<CachedUserData | null> {
    console.log("[UserCache] getCachedDataWithPhoto() called");

    if (!cachedData) {
      console.log("[UserCache] No cached data provided");
      return null;
    }

    // Photo is already stored as blob in the cached data, just return it
    console.log("[UserCache] Returning cached data with photo");
    return cachedData;
  }

  /**
   * Cache user data locally and set upload flag for batching
   */
  static async cacheUserData(
    userData: CachedUserData,
    timestamp?: string
  ): Promise<void> {
    try {
      // Use current Unix timestamp if not provided
      const cacheTimestamp = timestamp || Date.now().toString();

      // Convert photo URL to blob if needed
      let processedUserData = { ...userData };
      if (userData.photo && !userData.photo.startsWith("data:image/")) {
        console.log("[UserCache] Converting photo URL to blob");
        const photoBlob = await this.convertPhotoToBlob(userData.photo);
        if (photoBlob) {
          processedUserData.photo = photoBlob;
        }
      }

      // Save user data with proper defaults
      const userDataForSaving: User = {
        ...processedUserData,
        preferences: {
          theme: processedUserData.preferences.theme || "light",
          language: processedUserData.preferences.language || "en",
          primaryColor: processedUserData.preferences.primaryColor,
          fontSize: processedUserData.preferences.fontSize,
        },
      };

      await saveUserData(userDataForSaving, cacheTimestamp);
      console.log("[UserCache] Data cached locally");

      // Save timestamp
      await saveUserUpdatedAt(cacheTimestamp);

      if (this.DEBUG) {
        console.log(
          "[UserCache] Cached user data with timestamp:",
          cacheTimestamp
        );
      }
    } catch (error) {
      if (this.DEBUG) {
        console.error("[UserCache] Error caching user data:", error);
      }
    }
  }

  /**
   * Upload pending changes to server (only if cached data is newer than server)
   */
  static async uploadPendingChanges(): Promise<void> {
    try {
      console.log("[UserCache] === uploadPendingChanges() called ===");

      // Get current server timestamp
      const serverResponse = await this.checkServerTimestampWithTimeout();
      if (!serverResponse?.data?.updatedAt) {
        console.warn(
          "[UserCache] Cannot get server timestamp for upload check"
        );
        return;
      }

      const serverTimestamp = serverResponse.data.updatedAt.toString();
      console.log(
        "[UserCache] Server timestamp for upload check:",
        serverTimestamp
      );

      // Get cached timestamp
      const cachedTimestamp = await getUserUpdatedAt();
      console.log(
        "[UserCache] Cached timestamp for upload check:",
        cachedTimestamp
      );

      // Only upload if cached data is newer than server
      if (cachedTimestamp && cachedTimestamp > serverTimestamp) {
        console.log("[UserCache] Cached data is newer, uploading to server...");

        const { userData } = await getUserData();
        if (userData) {
          await this.saveUserDataToServer(userData as User);
          console.log("[UserCache] Upload completed successfully");
        }
      } else {
        console.log("[UserCache] No upload needed - server is up to date");
      }
    } catch (error) {
      console.error("[UserCache] Error in uploadPendingChanges:", error);
    }
  }

  /**
   * Force upload to server (bypass timestamp check)
   */
  static async forceUpload(): Promise<void> {
    try {
      console.log("[UserCache] === forceUpload() called ===");
      const { userData } = await getUserData();
      if (userData) {
        await this.saveUserDataToServer(userData as User);
        console.log("[UserCache] Force upload completed");
      }
    } catch (error) {
      console.error("[UserCache] Error in forceUpload:", error);
    }
  }

  /**
   * Save complete user data to server using existing user update endpoint
   */
  private static async saveUserDataToServer(userData: User): Promise<void> {
    try {
      console.log("[UserCache] Saving user data to server:", {
        name: userData.name,
        preferences: userData.preferences,
        hasPhoto: !!userData.photo,
      });

      // Send the complete user data fields that can be updated
      const updatePayload = {
        name: userData.name,
        preferences: userData.preferences,
        // Only include photo if it's a data URL (blob), not the original URL
        ...(userData.photo?.startsWith("data:image/")
          ? { photo: userData.photo }
          : {}),
      };

      await apiClient.put("/api/user/profile", updatePayload);
      console.log("[UserCache] User data saved to server successfully");
    } catch (error) {
      console.warn("[UserCache] Failed to save user data to server:", error);
      throw error;
    }
  }

  /**
   * Clear all user cache data
   */
  static async clearCache(): Promise<void> {
    try {
      await clearUserCache();
      console.log("[UserCache] Cache cleared successfully");
    } catch (error) {
      console.error("[UserCache] Error clearing cache:", error);
    }
  }

  /**
   * Get only cached data without server check (for immediate UI updates)
   */
  static async getCachedUserData(): Promise<CachedUserData | null> {
    try {
      const { userData } = await getUserData();
      return await this.getCachedDataWithPhoto(userData as CachedUserData);
    } catch (error) {
      console.error("[UserCache] Error getting cached user data:", error);
      return null;
    }
  }
}
