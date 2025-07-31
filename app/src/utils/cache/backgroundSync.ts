import type { CachedUserData } from "./userCacheManager";
import type { CachedShoppingData } from "./shoppingCacheManager";
import { UserCacheManager } from "./userCacheManager";
import { ShoppingCacheManager } from "./shoppingCacheManager";

/**
 * Background sync service based on .ignore/app pattern
 * Performs cache updates on navigation and app state changes
 */
export class BackgroundSync {
  private static syncInProgress = false;
  private static readonly DEBUG = false;

  /**
   * Sync all cache data (user and shopping)
   * This is the main sync function called on navigation
   */
  static async syncAll(): Promise<void> {
    if (this.syncInProgress) {
      console.log("[BackgroundSync] Sync already in progress, skipping");
      return;
    }

    try {
      this.syncInProgress = true;
      console.log("[BackgroundSync] === Starting background sync ===");

      // Sync user data and shopping data in parallel
      const [userResult, shoppingResult] = await Promise.allSettled([
        this.syncUserData(),
        this.syncShoppingData(),
      ]);

      // Log results
      if (userResult.status === "rejected") {
        console.error("[BackgroundSync] User sync failed:", userResult.reason);
      } else if (this.DEBUG) {
        console.log("[BackgroundSync] User sync completed");
      }

      if (shoppingResult.status === "rejected") {
        console.error(
          "[BackgroundSync] Shopping sync failed:",
          shoppingResult.reason
        );
      } else if (this.DEBUG) {
        console.log("[BackgroundSync] Shopping sync completed");
      }

      console.log("[BackgroundSync] === Background sync completed ===");
    } catch (error) {
      console.error("[BackgroundSync] Unexpected error during sync:", error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync user data only (includes upload of pending changes)
   */
  static async syncUserData(): Promise<CachedUserData | null> {
    try {
      if (this.DEBUG) {
        console.log("[BackgroundSync] Syncing user data...");
      }

      // Upload any pending changes first
      await UserCacheManager.uploadPendingChanges();

      // Then get fresh data
      return await UserCacheManager.getUserDataWithCache();
    } catch (error) {
      console.error("[BackgroundSync] Error syncing user data:", error);
      return null;
    }
  }

  /**
   * Sync shopping data only (includes upload of pending changes)
   */
  static async syncShoppingData(): Promise<CachedShoppingData | null> {
    try {
      if (this.DEBUG) {
        console.log("[BackgroundSync] Syncing shopping data...");
      }

      // Upload any pending changes first
      await ShoppingCacheManager.uploadPendingChanges();

      // Then use the smart caching method to get fresh data
      const lists = await ShoppingCacheManager.getShoppingLists();
      return { lists, lastSynced: Date.now() };
    } catch (error) {
      console.error("[BackgroundSync] Error syncing shopping data:", error);
      return null;
    }
  }

  /**
   * Check if sync is currently in progress
   */
  static isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  /**
   * Force sync (ignores in-progress check)
   */
  static async forceSyncAll(): Promise<void> {
    this.syncInProgress = false; // Reset flag
    await this.syncAll();
  }

  /**
   * Lightweight sync for navigation (non-blocking)
   * This is called on navigation changes and should be fast
   */
  static syncOnNavigation(): void {
    // Run sync in background without blocking navigation
    this.syncAll().catch((error) => {
      console.error("[BackgroundSync] Navigation sync failed:", error);
    });
  }

  /**
   * Sync on app resume/foreground
   */
  static async syncOnAppResume(): Promise<void> {
    console.log("[BackgroundSync] App resumed, triggering sync");
    await this.syncAll();
  }

  /**
   * Sync with retry logic for failed operations
   */
  static async syncWithRetry(maxRetries = 3): Promise<void> {
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        await this.syncAll();
        console.log(`[BackgroundSync] Sync succeeded on attempt ${attempt}`);
        return;
      } catch (error) {
        console.error(
          `[BackgroundSync] Sync attempt ${attempt} failed:`,
          error
        );

        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));

        attempt++;
      }
    }
  }

  /**
   * Clear all cached data
   */
  static async clearAllCache(): Promise<void> {
    try {
      console.log("[BackgroundSync] Clearing all cache...");

      await Promise.allSettled([
        UserCacheManager.clearCache(),
        ShoppingCacheManager.clearCache(),
      ]);

      console.log("[BackgroundSync] All cache cleared");
    } catch (error) {
      console.error("[BackgroundSync] Error clearing cache:", error);
    }
  }

  /**
   * Get cache status for debugging
   */
  static async getCacheStatus(): Promise<{
    userCache: boolean;
    shoppingCache: boolean;
    syncInProgress: boolean;
  }> {
    try {
      const [userData, shoppingData] = await Promise.allSettled([
        UserCacheManager.getCachedUserData(),
        ShoppingCacheManager.getCachedShoppingData(),
      ]);

      return {
        userCache: userData.status === "fulfilled" && !!userData.value,
        shoppingCache:
          shoppingData.status === "fulfilled" && !!shoppingData.value,
        syncInProgress: this.syncInProgress,
      };
    } catch (error) {
      console.error("[BackgroundSync] Error getting cache status:", error);
      return {
        userCache: false,
        shoppingCache: false,
        syncInProgress: this.syncInProgress,
      };
    }
  }
}
