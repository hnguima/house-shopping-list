import apiClient from "./apiClient";
import { ShoppingStorageManager } from "./shoppingStorageManager";
import type { ShoppingList, ShoppingListStats } from "../types/shopping";

export interface ShoppingSyncStatus {
  needsSync: boolean;
  direction: "push" | "pull" | "none";
  localLastSynced: number | null;
  remoteUpdatedAt: number | null;
}

export class ShoppingSyncManager {
  /**
   * Check if shopping data needs synchronization
   */
  static async checkSyncStatus(): Promise<ShoppingSyncStatus> {
    try {
      const localLastSynced = await ShoppingStorageManager.getLastSyncTime();
      const localLists = await ShoppingStorageManager.getShoppingLists();

      // Get remote data to compare timestamps
      const remoteResponse = await apiClient.getShoppingLists(true); // Include archived
      const remoteLists: ShoppingList[] =
        remoteResponse.data.shopping_lists || [];

      // Find the most recent update time from remote lists
      let remoteUpdatedAt: number | null = null;
      if (remoteLists.length > 0) {
        const latestRemote = remoteLists.reduce((latest, list) => {
          const listTime = list.updatedAt || 0;
          const latestTime = latest.updatedAt || 0;
          return listTime > latestTime ? list : latest;
        }, remoteLists[0]);
        remoteUpdatedAt = latestRemote.updatedAt;
      }

      // Find the most recent update time from local lists
      let localUpdatedAt: number | null = null;
      if (localLists.length > 0) {
        const latestLocal = localLists.reduce((latest, list) => {
          const listTime = list.updatedAt || 0;
          const latestTime = latest.updatedAt || 0;
          return listTime > latestTime ? list : latest;
        }, localLists[0]);
        localUpdatedAt = latestLocal.updatedAt;
      }

      // Determine sync direction
      let needsSync = false;
      let direction: "push" | "pull" | "none" = "none";

      if (!localLastSynced) {
        // First sync - pull from remote if available
        if (remoteLists.length > 0) {
          needsSync = true;
          direction = "pull";
        }
      } else {
        const lastSyncTime = localLastSynced; // Already a Unix timestamp

        // Check if remote data is newer than last sync
        const remoteIsNewer = remoteUpdatedAt && remoteUpdatedAt > lastSyncTime;

        // Check if local data is newer than last sync
        const localIsNewer = localUpdatedAt && localUpdatedAt > lastSyncTime;

        if (remoteIsNewer && localIsNewer) {
          // Both changed - prioritize local changes (push to remote)
          needsSync = true;
          direction = "push";
        } else if (remoteIsNewer) {
          // Only remote changed - pull from remote
          needsSync = true;
          direction = "pull";
        } else if (localIsNewer) {
          // Only local changed - push to remote
          needsSync = true;
          direction = "push";
        }
      }

      return {
        needsSync,
        direction,
        localLastSynced,
        remoteUpdatedAt,
      };
    } catch (error) {
      console.error("[ShoppingSyncManager] Error checking sync status:", error);
      return {
        needsSync: false,
        direction: "none",
        localLastSynced: null,
        remoteUpdatedAt: null,
      };
    }
  }

  /**
   * Perform synchronization based on sync status
   */
  static async performSync(syncStatus: ShoppingSyncStatus): Promise<boolean> {
    try {
      if (!syncStatus.needsSync) {
        return true;
      }

      if (syncStatus.direction === "pull") {
        return await this.pullFromRemote();
      } else if (syncStatus.direction === "push") {
        return await this.pushToRemote();
      }

      return true;
    } catch (error) {
      console.error("[ShoppingSyncManager] Error performing sync:", error);
      return false;
    }
  }

  /**
   * Pull shopping data from remote and update local storage
   */
  static async pullFromRemote(): Promise<boolean> {
    try {
      console.log("[ShoppingSyncManager] Pulling shopping data from remote");

      // Get remote shopping lists
      const listsResponse = await apiClient.getShoppingLists(true);
      const remoteLists: ShoppingList[] =
        listsResponse.data.shopping_lists || [];

      // Get remote stats
      const statsResponse = await apiClient.getShoppingStats();
      const remoteStats: ShoppingListStats = statsResponse.data.stats;

      // Update local storage
      await ShoppingStorageManager.updateShoppingLists(remoteLists);
      await ShoppingStorageManager.updateShoppingStats(remoteStats);

      console.log("[ShoppingSyncManager] Pull completed successfully");
      return true;
    } catch (error) {
      console.error("[ShoppingSyncManager] Error pulling from remote:", error);
      throw error;
    }
  }

  /**
   * Push local shopping data to remote
   */
  static async pushToRemote(): Promise<boolean> {
    try {
      console.log("[ShoppingSyncManager] Pushing shopping data to remote");

      const localLists = await ShoppingStorageManager.getShoppingLists();

      // Get current remote lists to compare
      const remoteResponse = await apiClient.getShoppingLists(true);
      const remoteLists: ShoppingList[] =
        remoteResponse.data.shopping_lists || [];
      const remoteListIds = new Set(remoteLists.map((list) => list._id));

      // Push each local list to remote
      for (const localList of localLists) {
        try {
          if (remoteListIds.has(localList._id)) {
            // Update existing list
            await apiClient.updateShoppingList(localList._id, {
              name: localList.name,
              description: localList.description,
              archived: localList.archived,
            });

            // Sync items by comparing with remote list
            const remoteList = remoteLists.find(
              (list) => list._id === localList._id
            );
            if (remoteList) {
              await this.syncListItems(localList, remoteList);
            }
          } else {
            // Create new list (this shouldn't happen in normal sync, but handle it)
            console.warn(
              "[ShoppingSyncManager] Local list not found on remote:",
              localList._id
            );
          }
        } catch (error) {
          console.error(
            `[ShoppingSyncManager] Error syncing list ${localList._id}:`,
            error
          );
          // Continue with other lists
        }
      }

      // Update sync timestamp
      await ShoppingStorageManager.updateShoppingLists(localLists);

      console.log("[ShoppingSyncManager] Push completed successfully");
      return true;
    } catch (error) {
      console.error("[ShoppingSyncManager] Error pushing to remote:", error);
      throw error;
    }
  }

  /**
   * Sync items between local and remote list
   */
  private static async syncListItems(
    localList: ShoppingList,
    remoteList: ShoppingList
  ): Promise<void> {
    const remoteItemIds = new Set(remoteList.items.map((item) => item.id));
    const localItemIds = new Set(localList.items.map((item) => item.id));

    // Update existing items and add new ones
    for (const localItem of localList.items) {
      if (remoteItemIds.has(localItem.id)) {
        // Update existing item
        const remoteItem = remoteList.items.find(
          (item) => item.id === localItem.id
        );
        if (remoteItem && localItem.updatedAt > remoteItem.updatedAt) {
          await apiClient.updateItemInList(localList._id, localItem.id, {
            name: localItem.name,
            quantity: localItem.quantity,
            category: localItem.category,
            notes: localItem.notes,
            completed: localItem.completed,
          });
        }
      } else {
        // Add new item
        await apiClient.addItemToList(localList._id, {
          name: localItem.name,
          quantity: localItem.quantity,
          category: localItem.category,
          notes: localItem.notes,
        });
      }
    }

    // Remove items that exist in remote but not in local
    for (const remoteItem of remoteList.items) {
      if (!localItemIds.has(remoteItem.id)) {
        await apiClient.removeItemFromList(localList._id, remoteItem.id);
      }
    }
  }

  /**
   * Force full synchronization (pull from remote)
   */
  static async forceSync(): Promise<boolean> {
    try {
      console.log("[ShoppingSyncManager] Forcing full sync");
      return await this.pullFromRemote();
    } catch (error) {
      console.error("[ShoppingSyncManager] Error in force sync:", error);
      return false;
    }
  }

  /**
   * Initialize sync manager
   */
  static initialize(): void {
    console.log("[ShoppingSyncManager] Shopping sync manager initialized");
  }
}
