import apiClient from "./apiClient";
import { UserStorageManager } from "./userStorageManager";
import { ShoppingSyncManager } from "./shoppingSyncManager";
import type { User } from "../types/user";

interface SyncStatus {
  needsSync: boolean;
  direction: "push" | "pull" | "none";
  localUpdatedAt?: number; // Unix timestamp in milliseconds
  remoteUpdatedAt?: number; // Unix timestamp in milliseconds
}

export class SyncManager {
  private static syncInProgress: boolean = false;
  private static syncCheckInProgress: boolean = false;
  private static lastSyncCheckTime: number = 0;
  private static initialized: boolean = false;
  private static lastSyncStatus: SyncStatus = {
    needsSync: false,
    direction: "none",
  };

  /**
   * Callback to notify when user data has been updated via sync
   */
  private static userDataUpdatedCallback?: () => void;

  /**
   * Set callback for user data updates
   */
  static setOnUserDataUpdated(callback: () => void): void {
    this.userDataUpdatedCallback = callback;
  }

  /**
   * Check if synchronization is needed
   */
  static async checkSyncStatus(): Promise<SyncStatus> {
    // Quick check: if no tokens available, no sync needed
    const hasToken =
      localStorage.getItem("auth_token") ||
      localStorage.getItem("refresh_token");
    if (!hasToken) {
      console.log(
        "[SyncManager] No authentication tokens available, skipping sync"
      );
      this.lastSyncStatus = { needsSync: false, direction: "none" };
      return this.lastSyncStatus;
    }

    // Prevent multiple simultaneous sync checks
    if (this.syncCheckInProgress) {
      console.log(
        "[SyncManager] Sync check already in progress, returning cached status"
      );
      return this.lastSyncStatus;
    }

    // Cache for 100ms to prevent duplicate calls in same render cycle
    const now = Date.now();
    if (now - this.lastSyncCheckTime < 100) {
      console.log("[SyncManager] Using cached sync status (recent check)");
      return this.lastSyncStatus;
    }

    this.syncCheckInProgress = true;
    this.lastSyncCheckTime = now;

    try {
      // Get local user data
      const localUser = await UserStorageManager.getUser();
      if (!localUser) {
        console.log("[SyncManager] No local user found");
        this.lastSyncStatus = { needsSync: false, direction: "none" };
        return this.lastSyncStatus;
      }

      console.log("[SyncManager] Current local user:", {
        name: localUser.name,
        username: localUser.username,
        updatedAt: localUser.updatedAt,
      });

      // Get remote timestamp
      const remoteStatus = await apiClient.checkSyncStatus();
      console.log("[SyncManager] Remote status response:", remoteStatus);

      const localUpdatedAt = localUser.updatedAt;
      const remoteUpdatedAt = remoteStatus.updatedAt;

      console.log("[SyncManager] Sync check:", {
        local: localUpdatedAt,
        remote: remoteUpdatedAt,
      });

      // Compare timestamps - direct integer comparison
      if (!localUpdatedAt || !remoteUpdatedAt) {
        this.lastSyncStatus = {
          needsSync: false,
          direction: "none",
          localUpdatedAt,
          remoteUpdatedAt,
        };
        return this.lastSyncStatus;
      }

      // Direct timestamp comparison (no tolerance for immediate updates)
      if (localUpdatedAt === remoteUpdatedAt) {
        console.log("[SyncManager] Timestamps are equal, no sync needed");
        this.lastSyncStatus = {
          needsSync: false,
          direction: "none",
          localUpdatedAt,
          remoteUpdatedAt,
        };
        return this.lastSyncStatus;
      }

      // Determine sync direction
      const direction = localUpdatedAt > remoteUpdatedAt ? "push" : "pull";

      console.log("[SyncManager] Sync needed:", {
        direction,
        localTime: new Date(localUpdatedAt * 1000).toISOString(),
        remoteTime: new Date(remoteUpdatedAt * 1000).toISOString(),
        timeDiff: Math.abs(localUpdatedAt - remoteUpdatedAt),
      });

      this.lastSyncStatus = {
        needsSync: true,
        direction,
        localUpdatedAt,
        remoteUpdatedAt,
      };

      return this.lastSyncStatus;
    } catch (error) {
      // Handle auth errors gracefully - they're expected when user is logged out
      if (
        error instanceof Error &&
        (error.message.includes("Authorization token required") ||
          error.message.includes("unauthorized") ||
          error.message.includes("401"))
      ) {
        console.log(
          "[SyncManager] Authentication required - user likely logged out"
        );
        this.lastSyncStatus = { needsSync: false, direction: "none" };
        return this.lastSyncStatus;
      }

      console.error("[SyncManager] Sync check failed:", error);
      this.lastSyncStatus = { needsSync: false, direction: "none" };
      return this.lastSyncStatus;
    } finally {
      this.syncCheckInProgress = false;
    }
  }

  /**
   * Perform synchronization based on the sync status
   */
  static async performSync(syncStatus: SyncStatus): Promise<boolean> {
    if (!syncStatus.needsSync || this.syncInProgress) {
      console.log(
        "[SyncManager] Skipping sync:",
        !syncStatus.needsSync ? "no sync needed" : "sync in progress"
      );
      return false;
    }

    this.syncInProgress = true;
    console.log("[SyncManager] Starting sync:", syncStatus.direction);

    try {
      let success = false;
      if (syncStatus.direction === "push") {
        console.log("[SyncManager] Executing push to server");
        success = await this.pushToServer();
      } else if (syncStatus.direction === "pull") {
        console.log("[SyncManager] Executing pull from server");
        success = await this.pullFromServer();
      } else {
        console.log(
          "[SyncManager] Unknown sync direction:",
          syncStatus.direction
        );
      }

      // Clear cached sync status after successful sync to force fresh check next time
      if (success) {
        this.lastSyncStatus = { needsSync: false, direction: "none" };
      }

      return success;
    } catch (error) {
      console.error("[SyncManager] Sync failed:", error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Push local changes to server
   */
  private static async pushToServer(): Promise<boolean> {
    try {
      const localUser = await UserStorageManager.getUser();
      if (!localUser) return false;

      console.log("[SyncManager] Pushing local changes to server");
      console.log("[SyncManager] Local user data being sent:", {
        name: localUser.name,
        username: localUser.username,
        photo: localUser.photo ? "photo present" : "no photo",
        preferences: localUser.preferences,
      });

      // Only send changed data, not the entire user object
      const updateData = {
        name: localUser.name,
        username: localUser.username,
        photo: localUser.photo,
        preferences: localUser.preferences,
      };

      const updatedUser = await apiClient.updateUserProfile(updateData);
      console.log(
        "[SyncManager] Server response after push:",
        JSON.stringify(updatedUser, null, 2)
      );

      // Update local storage with the server response (preserving server's updatedAt)
      await UserStorageManager.saveUserWithTimestamp(updatedUser);

      // Verify what was saved
      const savedUser = await UserStorageManager.getUser();
      console.log("[SyncManager] Verified saved user:", {
        name: savedUser?.name,
        username: savedUser?.username,
        updatedAt: savedUser?.updatedAt,
        hasPhoto: !!savedUser?.photo,
      });

      // Notify UI of user data update
      if (this.userDataUpdatedCallback) {
        this.userDataUpdatedCallback();
      }

      console.log("[SyncManager] Push completed successfully");
      return true;
    } catch (error) {
      console.error("[SyncManager] Push failed:", error);
      return false;
    }
  }

  /**
   * Pull changes from server
   */
  private static async pullFromServer(): Promise<boolean> {
    try {
      console.log("[SyncManager] Pulling changes from server");

      const serverUser = await apiClient.getUserProfile();
      console.log("[SyncManager] Server user data:", serverUser);

      // Merge server data with local data, preserving local-only fields if any
      const localUser = await UserStorageManager.getUser();
      console.log("[SyncManager] Local user data:", localUser);

      if (!serverUser) {
        throw new Error("No server user data received");
      }

      const mergedUser: User = {
        ...localUser,
        ...serverUser,
        id: serverUser.id || localUser?.id,
        email: serverUser.email || localUser?.email,
      };

      console.log("[SyncManager] Merged user data:", mergedUser);
      await UserStorageManager.saveUserWithTimestamp(mergedUser);

      // Notify UI of user data update
      if (this.userDataUpdatedCallback) {
        this.userDataUpdatedCallback();
      }

      console.log("[SyncManager] Pull completed successfully");
      return true;
    } catch (error) {
      console.error("[SyncManager] Pull failed:", error);
      return false;
    }
  }

  /**
   * Force a full synchronization (check + perform if needed)
   */
  static async fullSync(): Promise<boolean> {
    console.log("[SyncManager] Starting full sync");

    const syncStatus = await this.checkSyncStatus();
    if (syncStatus.needsSync) {
      return await this.performSync(syncStatus);
    }

    console.log("[SyncManager] No sync needed");
    return true;
  }

  /**
   * Mark local user data as updated (call when user makes changes)
   */
  static async markLocalUpdate(): Promise<void> {
    try {
      const user = await UserStorageManager.getUser();
      if (user) {
        user.updatedAt = Date.now(); // Unix timestamp in milliseconds
        await UserStorageManager.saveUser(user);
        console.log("[SyncManager] Local update timestamp set");
      }
    } catch (error) {
      console.error("[SyncManager] Failed to mark local update:", error);
    }
  }

  /**
   * Initialize sync manager (call on app start)
   */
  static initialize(): void {
    if (this.initialized) {
      console.log("[SyncManager] Already initialized, skipping");
      return;
    }

    console.log("[SyncManager] Initialized");
    this.syncInProgress = false;
    this.syncCheckInProgress = false;
    this.lastSyncCheckTime = 0;
    this.initialized = true;

    // Initialize shopping sync manager
    ShoppingSyncManager.initialize();
  }
}
