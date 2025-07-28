import { Preferences } from "@capacitor/preferences";
import type { ShoppingList, ShoppingListStats } from "../types/shopping";

const SHOPPING_LISTS_KEY = "shopping_lists";
const STORAGE_VERSION = "1.0";

export interface ShoppingStorageState {
  lists: ShoppingList[];
  stats: ShoppingListStats | null;
  lastSynced: number | null;
  version: string;
}

export class ShoppingStorageManager {
  private static cachedState: ShoppingStorageState | null = null;

  /**
   * Get the current shopping data from storage
   */
  static async getShoppingState(): Promise<ShoppingStorageState> {
    if (this.cachedState) {
      return this.cachedState;
    }

    try {
      const { value } = await Preferences.get({ key: SHOPPING_LISTS_KEY });

      if (value) {
        const parsed = JSON.parse(value) as ShoppingStorageState;

        // Validate and migrate if needed
        const validatedState = this.validateAndMigrateState(parsed);
        this.cachedState = validatedState;

        return validatedState;
      }
    } catch (error) {
      console.error(
        "[ShoppingStorageManager] Error reading shopping state:",
        error
      );
    }

    // Return default state if nothing found or error occurred
    const defaultState: ShoppingStorageState = {
      lists: [],
      stats: null,
      lastSynced: null,
      version: STORAGE_VERSION,
    };

    this.cachedState = defaultState;
    return defaultState;
  }

  /**
   * Save shopping data to storage
   */
  static async saveShoppingState(state: ShoppingStorageState): Promise<void> {
    try {
      // Update cache
      this.cachedState = { ...state };

      // Save to persistent storage
      await Preferences.set({
        key: SHOPPING_LISTS_KEY,
        value: JSON.stringify(state),
      });

      console.log("[ShoppingStorageManager] Shopping state saved successfully");
    } catch (error) {
      console.error(
        "[ShoppingStorageManager] Error saving shopping state:",
        error
      );
      throw error;
    }
  }

  /**
   * Update shopping lists in storage
   */
  static async updateShoppingLists(lists: ShoppingList[]): Promise<void> {
    const currentState = await this.getShoppingState();

    const updatedState: ShoppingStorageState = {
      ...currentState,
      lists,
      lastSynced: Date.now(),
    };

    await this.saveShoppingState(updatedState);
  }

  /**
   * Update a single shopping list in storage
   */
  static async updateShoppingList(updatedList: ShoppingList): Promise<void> {
    const currentState = await this.getShoppingState();

    const updatedLists = currentState.lists.map((list) =>
      list._id === updatedList._id ? updatedList : list
    );

    // If it's a new list, add it at the end (newest at bottom)
    if (!currentState.lists.find((list) => list._id === updatedList._id)) {
      updatedLists.push(updatedList);
    }

    // Sort the lists to maintain creation order (oldest first, newest at bottom)
    updatedLists.sort((a, b) => {
      const aTime = a.createdAt || 0;
      const bTime = b.createdAt || 0;
      return aTime - bTime;
    });

    await this.updateShoppingLists(updatedLists);
  }

  /**
   * Remove a shopping list from storage
   */
  static async removeShoppingList(listId: string): Promise<void> {
    const currentState = await this.getShoppingState();

    const updatedLists = currentState.lists.filter(
      (list) => list._id !== listId
    );
    await this.updateShoppingLists(updatedLists);
  }

  /**
   * Update shopping stats in storage
   */
  static async updateShoppingStats(stats: ShoppingListStats): Promise<void> {
    const currentState = await this.getShoppingState();

    const updatedState: ShoppingStorageState = {
      ...currentState,
      stats,
      lastSynced: Date.now(),
    };

    await this.saveShoppingState(updatedState);
  }

  /**
   * Get shopping lists from storage
   */
  static async getShoppingLists(): Promise<ShoppingList[]> {
    const state = await this.getShoppingState();
    // Sort lists by creation time (oldest first, newest at bottom)
    return state.lists.sort((a, b) => {
      const aTime = a.createdAt || 0;
      const bTime = b.createdAt || 0;
      return aTime - bTime;
    });
  }

  /**
   * Get shopping stats from storage
   */
  static async getShoppingStats(): Promise<ShoppingListStats | null> {
    const state = await this.getShoppingState();
    return state.stats;
  }

  /**
   * Get last sync time
   */
  static async getLastSyncTime(): Promise<number | null> {
    const state = await this.getShoppingState();
    return state.lastSynced;
  }

  /**
   * Clear all shopping data from storage
   */
  static async clearShoppingData(): Promise<void> {
    try {
      await Preferences.remove({ key: SHOPPING_LISTS_KEY });
      this.cachedState = null;
      console.log(
        "[ShoppingStorageManager] Shopping data cleared successfully"
      );
    } catch (error) {
      console.error(
        "[ShoppingStorageManager] Error clearing shopping data:",
        error
      );
      throw error;
    }
  }

  /**
   * Validate and migrate state from older versions
   */
  private static validateAndMigrateState(state: any): ShoppingStorageState {
    // Default state structure
    const defaultState: ShoppingStorageState = {
      lists: [],
      stats: null,
      lastSynced: null,
      version: STORAGE_VERSION,
    };

    // If state is null or invalid, return default
    if (!state || typeof state !== "object") {
      return defaultState;
    }

    // Ensure all required fields exist with proper types
    const validatedState: ShoppingStorageState = {
      lists: Array.isArray(state.lists) ? state.lists : defaultState.lists,
      stats:
        state.stats && typeof state.stats === "object"
          ? state.stats
          : defaultState.stats,
      lastSynced:
        typeof state.lastSynced === "string"
          ? state.lastSynced
          : defaultState.lastSynced,
      version:
        typeof state.version === "string"
          ? state.version
          : defaultState.version,
    };

    // Validate shopping lists structure
    validatedState.lists = validatedState.lists.filter((list) => {
      return (
        list &&
        typeof list === "object" &&
        typeof list._id === "string" &&
        typeof list.name === "string" &&
        Array.isArray(list.items)
      );
    });

    // Validate items in each list
    validatedState.lists.forEach((list) => {
      list.items = list.items.filter((item) => {
        return (
          item &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          typeof item.quantity === "number" &&
          typeof item.completed === "boolean"
        );
      });
    });

    return validatedState;
  }

  /**
   * Calculate local shopping stats from cached lists
   */
  static async calculateLocalStats(): Promise<ShoppingListStats> {
    const lists = await this.getShoppingLists();

    const totalLists = lists.length;
    const activeLists = lists.filter((list) => !list.archived).length;
    const archivedLists = totalLists - activeLists;

    const totalItems = lists.reduce((sum, list) => sum + list.items.length, 0);
    const completedItems = lists.reduce(
      (sum, list) => sum + list.items.filter((item) => item.completed).length,
      0
    );

    const completionRate =
      totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    return {
      total_lists: totalLists,
      active_lists: activeLists,
      archived_lists: archivedLists,
      total_items: totalItems,
      completed_items: completedItems,
      completion_rate: completionRate,
    };
  }
}
