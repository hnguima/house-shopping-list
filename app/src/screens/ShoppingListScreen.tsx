import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, CircularProgress } from "@mui/material";
import { styled } from "@mui/system";
import { getRandomColor } from "../utils/colorUtils";
import { ShoppingCacheManager, BackgroundSync } from "../utils/cache";
import { HomeCacheManager } from "../utils/cache/homeCacheManager";
import {
  useKeyboardAwareness,
  getKeyboardAwareStyles,
  useInputScrollIntoView,
  getKeyboardSpacerHeight,
} from "../hooks/useKeyboardAwareness";
import ShoppingListCard from "../components/ShoppingListCard";
import GhostShoppingListCard from "../components/GhostShoppingListCard";
import type { ShoppingList } from "../types/shopping";
import type { User } from "../types/user";

interface ShoppingListScreenProps {
  user: User | null;
  selectedHomeId?: string[];
}

const Container = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  // Base styles - will be overridden by keyboard-aware styles
  paddingBottom: theme.spacing(10),
  minHeight: "calc(100vh - 140px)",
}));

const ShoppingListScreen: React.FC<ShoppingListScreenProps> = ({
  user,
  selectedHomeId,
}) => {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(false); // Start with false, only show if no cached data
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  // Filter lists based on selected homes
  const filteredLists = useMemo(() => {
    console.log("[ShoppingListScreen] Filtering lists:", {
      totalLists: lists.length,
      selectedHomeId,
      listsWithHomes: lists.filter((l) => l.home_id).length,
      personalLists: lists.filter((l) => !l.home_id).length,
    });

    if (!selectedHomeId || selectedHomeId.includes("all")) {
      console.log("[ShoppingListScreen] Showing all lists:", lists.length);
      return lists; // Show all lists
    }

    const filtered = lists.filter((list) => {
      // Check if "personal" is selected and this is a personal list
      if (selectedHomeId.includes("personal") && !list.home_id) {
        return true;
      }

      // Check if the list's home is in the selected homes
      if (list.home_id && selectedHomeId.includes(list.home_id)) {
        return true;
      }

      return false;
    });

    console.log("[ShoppingListScreen] Filtered to:", filtered.length, "lists");
    return filtered;
  }, [lists, selectedHomeId]);

  // Use the new caching system
  // Add keyboard awareness for mobile
  const keyboardInfo = useKeyboardAwareness();
  useInputScrollIntoView(keyboardInfo);

  // Load shopping lists on component mount
  useEffect(() => {
    loadShoppingListsFromCache();
  }, []);

  // Load shopping lists from new cache system - optimized for seamless UX
  const loadShoppingListsFromCache = async () => {
    try {
      console.log("[ShoppingListScreen] Starting to load shopping lists...");

      // First try to get cached data immediately (no loading state)
      const cachedLists = await ShoppingCacheManager.getCachedShoppingLists();
      console.log(
        "[ShoppingListScreen] Got cached lists:",
        cachedLists.length,
        cachedLists
      );

      if (cachedLists.length > 0) {
        setLists(cachedLists);
        setLoading(false); // Stop loading since we have data
      } else {
        // Only show loading if we have no cached data at all
        setLoading(true);
      }

      // Then get fresh data in background (may update the UI seamlessly)
      const shoppingLists = await ShoppingCacheManager.getShoppingLists();
      console.log(
        "[ShoppingListScreen] Got fresh lists from server:",
        shoppingLists.length,
        shoppingLists
      );

      // Only update if data actually changed to prevent unnecessary re-renders
      if (JSON.stringify(shoppingLists) !== JSON.stringify(cachedLists)) {
        console.log("[ShoppingListScreen] Lists changed, updating state");
        setLists(shoppingLists);
      } else {
        console.log("[ShoppingListScreen] Lists unchanged");
      }
      setLoading(false);

      // Trigger background sync (completely silent)
      BackgroundSync.syncOnNavigation();
    } catch (error) {
      console.error(
        "[ShoppingListScreen] Error loading shopping lists:",
        error
      );
      setLoading(false);
      showSnackbar("Failed to load shopping lists", "error");
    }
  };

  const showSnackbar = useCallback(
    (message: string, severity: typeof snackbar.severity) => {
      setSnackbar({ open: true, message, severity });
    },
    []
  );

  const handleCreateList = useCallback(
    async (name: string, homeId?: string) => {
      try {
        if (!name.trim()) {
          showSnackbar("Please enter a list name", "warning");
          return;
        }

        if (!user?.id) {
          showSnackbar("User not found", "error");
          return;
        }

        const color = getRandomColor();
        const createdAt = Date.now();

        // Generate frontend ID: userId_createdAt
        const listId = `${user.id}_${createdAt}`;

        // Create list object with frontend-generated ID
        const newList: ShoppingList = {
          _id: listId, // Frontend-generated ID
          user_id: user.id,
          name: name.trim(),
          description: "",
          color: color, // Store color locally (API doesn't support it)
          archived: false,
          status: "active",
          home_id: homeId || null, // Add home assignment
          items: [],
          createdAt: createdAt,
          updatedAt: createdAt,
        };

        // Add home info immediately if homeId is provided
        if (homeId) {
          // Get home data from HomeCacheManager
          try {
            const homes = await HomeCacheManager.getHomes();
            const selectedHome = homes.find((h) => h._id === homeId);
            if (selectedHome) {
              (newList as any).home = {
                id: selectedHome._id,
                name: selectedHome.name,
              };
            }
          } catch (error) {
            console.error(
              "[ShoppingListScreen] Error getting home info:",
              error
            );
          }

          // Add creator info (current user)
          (newList as any).creator = {
            id: user.id,
            name: user.name,
            photo: user.photo,
          };
        }

        // Add to cache first (for immediate UI update)
        await ShoppingCacheManager.addShoppingListToCache(newList);

        // Update local state
        setLists((prev) => [...prev, newList]);

        // Force immediate sync to backend
        console.log(
          "[ShoppingListScreen] Forcing immediate sync after list creation"
        );
        ShoppingCacheManager.uploadPendingChanges().catch((error) => {
          console.error("[ShoppingListScreen] Error in immediate sync:", error);
        });

        showSnackbar("Shopping list created successfully", "success");
      } catch (error) {
        console.error("[ShoppingListScreen] Error in handleCreateList:", error);
        showSnackbar("Failed to create shopping list", "error");
      }
    },
    [showSnackbar, user]
  );

  const handleDeleteList = useCallback(
    async (listId: string) => {
      try {
        // Mark as deleted in cache only (server sync happens on events)
        const listToDelete = lists.find((list) => list._id === listId);
        if (listToDelete) {
          const deletedList = {
            ...listToDelete,
            status: "deleted" as const,
            updatedAt: Date.now(),
          };
          await ShoppingCacheManager.updateShoppingListInCache(deletedList);

          // Remove deleted list from UI immediately (hide it)
          setLists((prev) => prev.filter((list) => list._id !== listId));
        }
      } catch (error) {
        console.error("[ShoppingListScreen] Error in handleDeleteList:", error);
      }
    },
    [lists]
  );

  const handleArchiveList = useCallback(
    async (listId: string) => {
      try {
        // Archive in cache only (server sync happens on events)
        const listToArchive = lists.find((list) => list._id === listId);
        if (listToArchive) {
          const archivedList = {
            ...listToArchive,
            archived: true,
            status: "archived" as const,
            updatedAt: Date.now(),
          };
          await ShoppingCacheManager.updateShoppingListInCache(archivedList);

          // Remove archived list from UI immediately (hide it)
          setLists((prev) => prev.filter((list) => list._id !== listId));
        }
      } catch (error) {
        console.error(
          "[ShoppingListScreen] Error in handleArchiveList:",
          error
        );
      }
    },
    [lists]
  );

  const handleCompleteList = useCallback(
    async (listId: string) => {
      try {
        // Mark list as completed
        const listToComplete = lists.find((list) => list._id === listId);
        if (listToComplete) {
          const completedList = {
            ...listToComplete,
            status: "completed" as const,
            updatedAt: Date.now(),
          };
          await ShoppingCacheManager.updateShoppingListInCache(completedList);

          // Remove completed list from UI immediately (hide it)
          setLists((prev) => prev.filter((list) => list._id !== listId));
        }
      } catch (error) {
        console.error(
          "[ShoppingListScreen] Error in handleCompleteList:",
          error
        );
      }
    },
    [lists]
  );

  const handleListUpdate = useCallback(async (updatedList: ShoppingList) => {
    try {
      // Ensure the list has a current timestamp
      const listWithTimestamp = {
        ...updatedList,
        updatedAt: Date.now(),
      };

      // Update in cache only (server sync happens on events)
      await ShoppingCacheManager.updateShoppingListInCache(listWithTimestamp);

      // Update local state
      setLists((prev) =>
        prev.map((list) =>
          list._id === listWithTimestamp._id ? listWithTimestamp : list
        )
      );
    } catch (error) {
      console.error("[ShoppingListScreen] Error in handleListUpdate:", error);
    }
  }, []);

  if (loading) {
    return (
      <Container>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={200}
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Apply keyboard-aware styles
  const containerStyles = getKeyboardAwareStyles(keyboardInfo);
  const spacerHeight = getKeyboardSpacerHeight(keyboardInfo);

  // Debug keyboard state
  console.log(
    "[ShoppingListScreen] Keyboard state:",
    `isVisible=${keyboardInfo.isVisible}, height=${keyboardInfo.height}, spacerHeight=${spacerHeight}`
  );

  return (
    <Container
      sx={{
        ...containerStyles,
      }}
    >
      <Box>
        {filteredLists.map((list) => (
          <ShoppingListCard
            key={list._id}
            list={list}
            onUpdate={handleListUpdate}
            onDelete={handleDeleteList}
            onArchive={handleArchiveList}
            onComplete={handleCompleteList}
            currentUserId={user?.id}
          />
        ))}
      </Box>

      {/* Ghost card for creating new lists */}
      <GhostShoppingListCard onCreate={handleCreateList} />

      {/* Keyboard spacer - creates space to push content up when keyboard appears */}
      {spacerHeight > 0 && (
        <Box
          sx={{
            height: `${spacerHeight}px`,
            width: "100%",
            transition: "height 0.3s ease",
            flexShrink: 0,
            backgroundColor: "transparent",
          }}
        />
      )}
    </Container>
  );
};

export default ShoppingListScreen;
