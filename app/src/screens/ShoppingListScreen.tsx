import React, { useState, useEffect, useCallback } from "react";
import { Box, CircularProgress } from "@mui/material";
import { styled } from "@mui/system";
import { getRandomColor } from "../utils/colorUtils";
import { ShoppingCacheManager, BackgroundSync } from "../utils/cache";
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
}

const Container = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  // Base styles - will be overridden by keyboard-aware styles
  paddingBottom: theme.spacing(10),
  minHeight: "calc(100vh - 140px)",
}));

const ShoppingListScreen: React.FC<ShoppingListScreenProps> = ({ user }) => {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(false); // Start with false, only show if no cached data
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

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
      // First try to get cached data immediately (no loading state)
      const cachedLists = await ShoppingCacheManager.getCachedShoppingLists();
      if (cachedLists.length > 0) {
        setLists(cachedLists);
        setLoading(false); // Stop loading since we have data
      } else {
        // Only show loading if we have no cached data at all
        setLoading(true);
      }

      // Then get fresh data in background (may update the UI seamlessly)
      const shoppingLists = await ShoppingCacheManager.getShoppingLists();

      // Only update if data actually changed to prevent unnecessary re-renders
      if (JSON.stringify(shoppingLists) !== JSON.stringify(cachedLists)) {
        setLists(shoppingLists);
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
    async (name: string) => {
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
          items: [],
          createdAt: createdAt,
          updatedAt: createdAt,
        };

        // Add to cache first (for immediate UI update)
        await ShoppingCacheManager.addShoppingListToCache(newList);

        // Update local state
        setLists((prev) => [...prev, newList]);

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
        // Remove from cache only (server sync happens on events)
        await ShoppingCacheManager.removeShoppingListFromCache(listId);

        // Update local state
        setLists((prev) => prev.filter((list) => list._id !== listId));

        showSnackbar("Shopping list deleted successfully", "success");
      } catch (error) {
        console.error("[ShoppingListScreen] Error in handleDeleteList:", error);
        showSnackbar("Failed to delete shopping list", "error");
      }
    },
    [showSnackbar]
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
            updatedAt: Date.now(),
          };
          await ShoppingCacheManager.updateShoppingListInCache(archivedList);

          // Update local state
          setLists((prev) =>
            prev.map((list) => (list._id === listId ? archivedList : list))
          );
        }

        showSnackbar("Shopping list archived successfully", "success");
      } catch (error) {
        console.error(
          "[ShoppingListScreen] Error in handleArchiveList:",
          error
        );
        showSnackbar("Failed to archive shopping list", "error");
      }
    },
    [showSnackbar, lists]
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
        {lists.map((list) => (
          <ShoppingListCard
            key={list._id}
            list={list}
            onUpdate={handleListUpdate}
            onDelete={handleDeleteList}
            onArchive={handleArchiveList}
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
