import { useEffect } from "react";
import { SyncManager } from "../utils/syncManager";

/**
 * Hook to automatically sync user data when page/screen changes
 * Call this hook in each main screen component
 */
export const useAutoSync = (screenName: string) => {
  useEffect(() => {
    const performAutoSync = async () => {
      try {
        console.log(`[AutoSync] ==> SCREEN CHANGE DETECTED: ${screenName} <==`);

        const syncStatus = await SyncManager.checkSyncStatus();
        console.log(`[AutoSync] Sync status for ${screenName}:`, {
          needsSync: syncStatus.needsSync,
          direction: syncStatus.direction,
          localUpdatedAt: syncStatus.localUpdatedAt,
          remoteUpdatedAt: syncStatus.remoteUpdatedAt,
        });

        if (syncStatus.needsSync) {
          console.log(
            `[AutoSync] 🔄 PERFORMING SYNC for ${screenName}:`,
            syncStatus.direction
          );
          const success = await SyncManager.performSync(syncStatus);

          if (success) {
            console.log(
              `[AutoSync] ✅ Sync completed successfully on ${screenName}`
            );
          } else {
            console.warn(`[AutoSync] ❌ Sync failed on ${screenName}`);
          }
        } else {
          console.log(`[AutoSync] ⏸️ No sync needed for ${screenName}`);
        }
      } catch (error) {
        // Handle auth errors gracefully - they trigger logout automatically
        if (
          error instanceof Error &&
          (error.message.includes("Authorization token required") ||
            error.message.includes("unauthorized") ||
            error.message.includes("401"))
        ) {
          console.log(
            `[AutoSync] Authentication required on ${screenName} - logout will be triggered`
          );
        } else {
          console.error(`[AutoSync] Error on ${screenName}:`, error);
        }
      }
    };

    // Trigger sync when screen changes
    performAutoSync();

    // No cleanup needed since sync operations should complete
    return () => {
      console.log(`[AutoSync] Screen ${screenName} unmounting`);
    };
  }, [screenName]); // Only trigger when screenName changes
};

/**
 * Hook to mark local data as updated and trigger sync
 * Use this when user makes changes to their profile
 */
export const useMarkUpdate = () => {
  const markUpdateAndSync = async () => {
    try {
      // Mark local data as updated with current timestamp
      await SyncManager.markLocalUpdate();
      console.log("[MarkUpdate] Local timestamp updated");
    } catch (error) {
      console.error("[MarkUpdate] Error:", error);
    }
  };

  return markUpdateAndSync;
};
