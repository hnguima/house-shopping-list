import apiClient from "../apiClient";
import {
  saveShoppingData,
  getShoppingData,
  saveShoppingUpdatedAt,
  getShoppingUpdatedAt,
  clearShoppingCache,
} from "./preferences";
import type { ShoppingList } from "../../types/shopping";

export interface CachedShoppingData {
  lists: ShoppingList[];
  lastSynced: number;
}

export interface ShoppingUpdateStatus {
  shouldUpdate: boolean;
  cachedData: CachedShoppingData | null;
  serverTimestamp: string | null;
}

/**
 * Shopping cache manager based on .ignore/app pattern
 * Uses direct server comparison instead of complex timestamp logic
 * Implements timestamp-based batching system to reduce server calls
 */
export class ShoppingCacheManager {
  private static readonly DEBUG = false;
  private static lastServerCheck = 0;
  private static readonly SERVER_CHECK_INTERVAL = 30000; // 30 seconds

  /**
   * Check if shopping data needs to be updated by comparing timestamps
   * This follows the .ignore/app pattern - direct comparison
   * Uses lightweight timestamp endpoint for faster sync checks
   */
  static async checkShoppingUpdateStatus(): Promise<ShoppingUpdateStatus> {
    console.log("[ShoppingCache] === checkShoppingUpdateStatus() called ===");

    try {
      // Get shopping list timestamps from server (lightweight call)
      const timestampsResponse = await apiClient.getShoppingListsTimestamps(
        false, // Don't include archived by default
        undefined, // No specific home filter
        "active" // Only get active lists by default
      );

      if (!timestampsResponse?.data?.lists) {
        console.warn(
          "[ShoppingCache] Failed to get shopping list timestamps from server"
        );
        const { shoppingData } = await getShoppingData();
        return {
          shouldUpdate: false,
          cachedData: shoppingData as CachedShoppingData,
          serverTimestamp: null,
        };
      }

      // Calculate server timestamp from latest list update
      const lists = timestampsResponse.data.lists;
      const latestTimestamp = Math.max(
        ...lists.map((list: any) => list.updatedAt || 0)
      );
      const serverTimestamp = latestTimestamp.toString();

      console.log("[ShoppingCache] Server timestamp:", serverTimestamp);

      // Get cached timestamp
      const cachedTimestamp = await getShoppingUpdatedAt();
      console.log("[ShoppingCache] Cached timestamp:", cachedTimestamp);

      // Get cached data
      const { shoppingData: cachedData } = await getShoppingData();
      const hasCachedData = !!cachedData;
      console.log("[ShoppingCache] Has cached data:", hasCachedData);

      let shouldUpdate = false;

      if (!cachedData || !cachedTimestamp) {
        console.log(
          "[ShoppingCache] No cached data or timestamp - need to update"
        );
        shouldUpdate = true;
      } else if (serverTimestamp !== cachedTimestamp) {
        console.log(
          "[ShoppingCache] Timestamp mismatch - server:",
          serverTimestamp,
          "cached:",
          cachedTimestamp
        );
        shouldUpdate = true;
      } else {
        console.log("[ShoppingCache] Timestamps match - using cached data");
      }

      return {
        shouldUpdate,
        cachedData: cachedData as CachedShoppingData,
        serverTimestamp,
      };
    } catch (error) {
      console.error("[ShoppingCache] Error checking update status:", error);
      const { shoppingData: cachedData } = await getShoppingData();
      return {
        shouldUpdate: false,
        cachedData: cachedData as CachedShoppingData,
        serverTimestamp: null,
      };
    }
  }

  /**
   * Get shopping data with automatic cache validation
   * This follows the .ignore/app pattern exactly
   */
  static async getShoppingDataWithCache(): Promise<CachedShoppingData | null> {
    console.log("[ShoppingCache] === getShoppingDataWithCache() called ===");

    try {
      const updateStatus = await this.checkShoppingUpdateStatus();

      console.log("[ShoppingCache] Update status:", {
        shouldUpdate: updateStatus.shouldUpdate,
        hasCachedData: !!updateStatus.cachedData,
        serverTimestamp: updateStatus.serverTimestamp,
      });

      if (updateStatus.shouldUpdate || !updateStatus.cachedData) {
        console.log("[ShoppingCache] Fetching fresh shopping data from API");

        // Fetch fresh data from API
        const response = await apiClient.getShoppingLists(
          false, // Don't include archived by default
          undefined, // No specific home filter
          "active" // Only get active lists by default
        );

        if (response?.data?.shopping_lists) {
          const lists = response.data.shopping_lists;
          const timestamp =
            updateStatus.serverTimestamp || Date.now().toString();

          const freshData: CachedShoppingData = {
            lists,
            lastSynced: Date.now(),
          };

          console.log("[ShoppingCache] Got fresh data, caching it now...");
          await this.cacheShoppingData(freshData, timestamp);

          return freshData;
        } else {
          // API failed, return cached data if available
          console.warn("[ShoppingCache] API failed, returning cached data");
          return updateStatus.cachedData;
        }
      } else {
        console.log("[ShoppingCache] Using cached shopping data");
        return updateStatus.cachedData;
      }
    } catch (error) {
      console.error("[ShoppingCache] Error getting shopping data:", error);

      // Fallback to cached data
      const { shoppingData } = await getShoppingData();
      return shoppingData as CachedShoppingData;
    }
  }

  /**
   * Cache shopping data
   */
  static async cacheShoppingData(
    shoppingData: CachedShoppingData,
    timestamp?: string
  ): Promise<void> {
    try {
      const cacheTimestamp = timestamp || Date.now().toString();

      // Save shopping data
      await saveShoppingData(shoppingData, cacheTimestamp);

      // Save timestamp
      await saveShoppingUpdatedAt(cacheTimestamp);

      if (this.DEBUG) {
        console.log(
          "[ShoppingCache] Cached shopping data with timestamp:",
          cacheTimestamp
        );
      }
    } catch (error) {
      if (this.DEBUG) {
        console.error("[ShoppingCache] Error caching shopping data:", error);
      }
    }
  }

  /**
   * Get all shopping lists (with smart caching to avoid frequent server calls)
   * Filters out completed, archived, and deleted lists by default - only shows active lists
   */
  static async getShoppingLists(): Promise<ShoppingList[]> {
    try {
      // First try to get cached data
      const { shoppingData } = await getShoppingData();
      const now = Date.now();

      // If we have cached data and haven't checked server recently, use cache
      if (
        shoppingData &&
        now - this.lastServerCheck < this.SERVER_CHECK_INTERVAL
      ) {
        console.log(
          "[ShoppingCache] Using cached data (server check not needed yet)"
        );
        const allLists = (shoppingData as CachedShoppingData).lists || [];
        // Filter to only show active lists (exclude completed, archived, deleted)
        return allLists.filter((list) => list.status === "active");
      }

      // If no cached data or it's time to check server, do full cache check
      console.log("[ShoppingCache] Time to check server or no cached data");
      this.lastServerCheck = now;
      const data = await this.getShoppingDataWithCache();
      const allLists = data?.lists || [];
      // Filter to only show active lists (exclude completed, archived, deleted)
      return allLists.filter((list) => list.status === "active");
    } catch (error) {
      console.error("[ShoppingCache] Error in getShoppingLists:", error);
      // Fallback to cached data if available
      const { shoppingData } = await getShoppingData();
      const allLists = (shoppingData as CachedShoppingData)?.lists || [];
      // Filter to only show active lists (exclude completed, archived, deleted)
      return allLists.filter((list) => list.status === "active");
    }
  }

  /**
   * Force refresh shopping lists from server (bypasses cache interval)
   */
  static async forceRefreshShoppingLists(): Promise<ShoppingList[]> {
    console.log("[ShoppingCache] Force refresh requested");
    this.lastServerCheck = 0; // Reset timer to force server check
    const data = await this.getShoppingDataWithCache();
    return data?.lists || [];
  }

  /**
   * Get active (non-archived) shopping lists
   */
  static async getActiveShoppingLists(): Promise<ShoppingList[]> {
    const lists = await this.getShoppingLists();
    return lists.filter((list) => !list.archived);
  }

  /**
   * Get archived shopping lists
   */
  static async getArchivedShoppingLists(): Promise<ShoppingList[]> {
    const data = await this.getCachedShoppingData();
    const allLists = data?.lists || [];
    return allLists.filter((list) => list.status === "archived");
  }

  /**
   * Get completed shopping lists
   */
  static async getCompletedShoppingLists(): Promise<ShoppingList[]> {
    const data = await this.getCachedShoppingData();
    const allLists = data?.lists || [];
    return allLists.filter((list) => list.status === "completed");
  }

  /**
   * Get deleted shopping lists
   */
  static async getDeletedShoppingLists(): Promise<ShoppingList[]> {
    const data = await this.getCachedShoppingData();
    const allLists = data?.lists || [];
    return allLists.filter((list) => list.status === "deleted");
  }

  /**
   * Get all shopping lists regardless of status (for admin/management purposes)
   */
  static async getAllShoppingLists(): Promise<ShoppingList[]> {
    const data = await this.getCachedShoppingData();
    return data?.lists || [];
  }

  /**
   * Get only cached data without server check (for immediate UI updates)
   */
  static async getCachedShoppingData(): Promise<CachedShoppingData | null> {
    try {
      const { shoppingData } = await getShoppingData();
      return shoppingData as CachedShoppingData;
    } catch (error) {
      console.error(
        "[ShoppingCache] Error getting cached shopping data:",
        error
      );
      return null;
    }
  }

  /**
   * Get cached shopping lists (no server check)
   * Filters to only show active lists by default
   */
  static async getCachedShoppingLists(): Promise<ShoppingList[]> {
    const data = await this.getCachedShoppingData();
    const allLists = data?.lists || [];
    // Filter to only show active lists (exclude completed, archived, deleted)
    return allLists.filter((list) => list.status === "active");
  }

  /**
   * Update cached shopping lists (for local changes before sync)
   */
  static async updateCachedShoppingLists(lists: ShoppingList[]): Promise<void> {
    try {
      const data: CachedShoppingData = {
        lists,
        lastSynced: Date.now(),
      };

      await this.cacheShoppingData(data);
      console.log("[ShoppingCache] Updated cached shopping lists");
    } catch (error) {
      console.error(
        "[ShoppingCache] Error updating cached shopping lists:",
        error
      );
    }
  }

  /**
   * Add a new shopping list to cache (with timestamp for batching)
   */
  static async addShoppingListToCache(list: ShoppingList): Promise<void> {
    const currentData = await this.getCachedShoppingData();
    const lists = currentData?.lists || [];

    // Ensure the list has an updated timestamp
    const listWithTimestamp = {
      ...list,
      updatedAt: Date.now(), // Current Unix timestamp in milliseconds
    };

    const updatedLists = [...lists, listWithTimestamp];
    await this.updateCachedShoppingLists(updatedLists);

    console.log(
      `[ShoppingCache] Added list ${list.name} to cache with timestamp ${listWithTimestamp.updatedAt}`
    );
  }

  /**
   * Update an existing shopping list in cache (with timestamp for batching)
   */
  static async updateShoppingListInCache(
    updatedList: ShoppingList
  ): Promise<void> {
    const currentData = await this.getCachedShoppingData();
    const lists = currentData?.lists || [];

    // Ensure the list has an updated timestamp
    const listWithTimestamp = {
      ...updatedList,
      updatedAt: Date.now(), // Current Unix timestamp in milliseconds
    };

    const updatedLists = lists.map((list) =>
      list._id === listWithTimestamp._id ? listWithTimestamp : list
    );
    await this.updateCachedShoppingLists(updatedLists);

    console.log(
      `[ShoppingCache] Updated list ${updatedList.name} in cache with timestamp ${listWithTimestamp.updatedAt}`
    );
  }

  /**
   * Mark a shopping list as deleted (soft delete)
   */
  static async markShoppingListAsDeleted(listId: string): Promise<void> {
    const currentData = await this.getCachedShoppingData();
    const lists = currentData?.lists || [];

    const updatedLists = lists.map((list) =>
      list._id === listId
        ? { ...list, status: "deleted" as const, updatedAt: Date.now() }
        : list
    );
    await this.updateCachedShoppingLists(updatedLists);

    console.log(`[ShoppingCache] Marked list ${listId} as deleted in cache`);
  }

  /**
   * Upload pending changes to server based on timestamp comparison
   * Each list is checked individually against server timestamps
   */
  static async uploadPendingChanges(): Promise<void> {
    try {
      console.log("[ShoppingCache] === uploadPendingChanges() called ===");

      // Get cached lists
      const cachedData = await this.getCachedShoppingData();
      if (!cachedData?.lists || cachedData.lists.length === 0) {
        console.log("[ShoppingCache] No cached lists to upload");
        return;
      }

      // Get server list timestamps to compare (lightweight call) - get all statuses for comparison
      const serverTimestamps = await apiClient.getShoppingListsTimestamps(
        true, // Include all
        undefined, // No home filter
        "all" // Get all statuses for comparison
      );
      if (!serverTimestamps?.data?.lists) {
        console.warn(
          "[ShoppingCache] Cannot get server list timestamps for comparison"
        );
        return;
      }

      const serverListsMap = new Map(
        serverTimestamps.data.lists.map((list: any) => [list._id, list])
      );

      // Check each cached list against server
      for (const cachedList of cachedData.lists) {
        const serverId = cachedList._id;
        const serverList = serverListsMap.get(serverId);

        // If list doesn't exist on server (new local list), create it
        if (!serverList) {
          console.log(
            `[ShoppingCache] Creating new list on server: ${cachedList.name} with ID ${cachedList._id}`
          );
          try {
            // Convert items timestamps to Unix format for database compatibility
            const itemsWithUnixTimestamps =
              cachedList.items?.map((item) => ({
                ...item,
                createdAt:
                  typeof item.createdAt === "string"
                    ? new Date(item.createdAt).getTime()
                    : item.createdAt,
                updatedAt:
                  typeof item.updatedAt === "string"
                    ? new Date(item.updatedAt).getTime()
                    : item.updatedAt,
              })) || [];

            await apiClient.createShoppingList({
              _id: cachedList._id, // Pass the frontend-generated ID
              name: cachedList.name,
              description: cachedList.description,
              color: cachedList.color, // Include color for future support
              status: cachedList.status, // Include status field
              home_id: cachedList.home_id, // Include home assignment
              items: itemsWithUnixTimestamps, // Include items with Unix timestamps
            });
          } catch (error) {
            // If we get a duplicate key error, it means the list exists on server but not in our timestamp comparison
            // This can happen with deleted lists - try to update instead
            if (
              error instanceof Error &&
              error.message.includes("duplicate key")
            ) {
              console.log(
                `[ShoppingCache] List ${cachedList._id} already exists on server, updating instead`
              );
              try {
                const itemsWithUnixTimestamps =
                  cachedList.items?.map((item) => ({
                    ...item,
                    createdAt:
                      typeof item.createdAt === "string"
                        ? new Date(item.createdAt).getTime()
                        : item.createdAt,
                    updatedAt:
                      typeof item.updatedAt === "string"
                        ? new Date(item.updatedAt).getTime()
                        : item.updatedAt,
                  })) || [];

                await apiClient.updateShoppingList(cachedList._id, {
                  name: cachedList.name,
                  description: cachedList.description,
                  archived: cachedList.archived,
                  status: cachedList.status, // Include status field
                  home_id: cachedList.home_id, // Include home assignment
                  items: itemsWithUnixTimestamps, // Send items with Unix timestamps
                });
              } catch (updateError) {
                console.error(
                  `[ShoppingCache] Failed to update existing list ${cachedList.name}:`,
                  updateError
                );
              }
            } else {
              console.error(
                `[ShoppingCache] Failed to create list ${cachedList.name}:`,
                error
              );
            }
          }
          continue;
        }

        // Compare timestamps - if cached is newer, update server
        const cachedTimestamp = cachedList.updatedAt;
        const serverTimestamp = (serverList as any).updatedAt;

        if (cachedTimestamp > serverTimestamp) {
          console.log(
            `[ShoppingCache] Updating list on server: ${cachedList.name} (cached: ${cachedTimestamp}, server: ${serverTimestamp})`
          );
          try {
            // Convert items timestamps to Unix format for database compatibility
            const itemsWithUnixTimestamps =
              cachedList.items?.map((item) => ({
                ...item,
                createdAt:
                  typeof item.createdAt === "string"
                    ? new Date(item.createdAt).getTime()
                    : item.createdAt,
                updatedAt:
                  typeof item.updatedAt === "string"
                    ? new Date(item.updatedAt).getTime()
                    : item.updatedAt,
              })) || [];

            // Update list metadata and items
            await apiClient.updateShoppingList(serverId, {
              name: cachedList.name,
              description: cachedList.description,
              archived: cachedList.archived,
              status: cachedList.status, // Include status field
              home_id: cachedList.home_id, // Include home assignment
              items: itemsWithUnixTimestamps, // Send items with Unix timestamps
            });
          } catch (error) {
            console.error(
              `[ShoppingCache] Failed to update list ${cachedList.name}:`,
              error
            );
          }
        }
      }

      console.log("[ShoppingCache] Upload pending changes completed");
    } catch (error) {
      console.error("[ShoppingCache] Error in uploadPendingChanges:", error);
    }
  }

  /**
   * Force upload all shopping lists to server (bypass timestamp check)
   */
  static async forceUpload(): Promise<void> {
    try {
      console.log("[ShoppingCache] === forceUpload() called ===");
      const cachedData = await this.getCachedShoppingData();
      if (cachedData?.lists) {
        for (const list of cachedData.lists) {
          try {
            // Convert items timestamps to Unix format for database compatibility
            const itemsWithUnixTimestamps =
              list.items?.map((item) => ({
                ...item,
                createdAt:
                  typeof item.createdAt === "string"
                    ? new Date(item.createdAt).getTime()
                    : item.createdAt,
                updatedAt:
                  typeof item.updatedAt === "string"
                    ? new Date(item.updatedAt).getTime()
                    : item.updatedAt,
              })) || [];

            await apiClient.updateShoppingList(list._id, {
              name: list.name,
              description: list.description,
              archived: list.archived,
              home_id: list.home_id, // Include home assignment
              items: itemsWithUnixTimestamps,
            });
          } catch (error) {
            console.error(
              `[ShoppingCache] Failed to force upload list ${list.name}:`,
              error
            );
          }
        }
      }
      console.log("[ShoppingCache] Force upload completed");
    } catch (error) {
      console.error("[ShoppingCache] Error in forceUpload:", error);
    }
  }

  /**
   * Clear all shopping cache data
   */
  static async clearCache(): Promise<void> {
    try {
      await clearShoppingCache();
      console.log("[ShoppingCache] Cache cleared successfully");
    } catch (error) {
      console.error("[ShoppingCache] Error clearing cache:", error);
    }
  }
}
