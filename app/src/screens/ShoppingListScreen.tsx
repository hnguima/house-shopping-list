import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/system";
import { ShoppingStorageManager } from "../utils/shoppingStorageManager";
import { ShoppingSyncManager } from "../utils/shoppingSyncManager";
import { getRandomColor } from "../utils/colorUtils";
import apiClient from "../utils/apiClient";
import { useAutoSync } from "../hooks/useAutoSync";
import ShoppingListCard from "../components/ShoppingListCard";
import GhostShoppingListCard from "../components/GhostShoppingListCard";
import type { ShoppingList, CreateShoppingListData } from "../types/shopping";

const Container = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const EmptyState = styled(Box)(({ theme }) => ({
  textAlign: "center",
  padding: theme.spacing(4),
  color: theme.palette.text.secondary,
}));

const ShoppingListScreen: React.FC = () => {
  const { t } = useTranslation();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  // Enable auto-sync for this screen
  useAutoSync("shopping-lists");

  // Load shopping lists on component mount
  useEffect(() => {
    loadShoppingLists();
  }, []);

  const loadShoppingLists = async () => {
    try {
      setLoading(true);

      // Load from local storage first
      const localLists = await ShoppingStorageManager.getShoppingLists();
      setLists(localLists.filter((list) => !list.archived)); // Show only active lists

      // Try to sync with remote
      try {
        const syncStatus = await ShoppingSyncManager.checkSyncStatus();
        if (syncStatus.needsSync) {
          await ShoppingSyncManager.performSync(syncStatus);

          // Reload from storage after sync
          const updatedLists = await ShoppingStorageManager.getShoppingLists();
          setLists(updatedLists.filter((list) => !list.archived));
        }
      } catch (syncError) {
        console.log(
          "[ShoppingListScreen] Sync failed, using cached data:",
          syncError
        );
        // Continue with cached data
      }
    } catch (error) {
      console.error(
        "[ShoppingListScreen] Error loading shopping lists:",
        error
      );
      showSnackbar("Failed to load shopping lists", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (name: string) => {
    try {
      if (!name.trim()) {
        showSnackbar("Please enter a list name", "warning");
        return;
      }

      const newListData: CreateShoppingListData = {
        name: name.trim(),
        description: "",
        color: getRandomColor(), // Assign random color from predefined colors
      };

      // Create via API
      const response = await apiClient.createShoppingList(newListData);
      const newList: ShoppingList = response.data.shopping_list;

      // Update local storage
      await ShoppingStorageManager.updateShoppingList(newList);

      // Update UI - add to end so newest appears at bottom
      setLists((prev) => [...prev, newList]);

      showSnackbar("Shopping list created successfully", "success");
    } catch (error) {
      console.error("[ShoppingListScreen] Error creating list:", error);
      showSnackbar("Failed to create shopping list", "error");
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      // Delete via API
      await apiClient.deleteShoppingList(listId);

      // Update local storage
      await ShoppingStorageManager.removeShoppingList(listId);

      // Update UI
      setLists((prev) => prev.filter((list) => list._id !== listId));
      showSnackbar("Shopping list deleted successfully", "success");
    } catch (error) {
      console.error("[ShoppingListScreen] Error deleting list:", error);
      showSnackbar("Failed to delete shopping list", "error");
    }
  };

  const handleArchiveList = async (listId: string) => {
    try {
      // Archive via API
      await apiClient.archiveShoppingList(listId);

      // Update local storage
      const list = lists.find((l) => l._id === listId);
      if (list) {
        const archivedList = { ...list, archived: true };
        await ShoppingStorageManager.updateShoppingList(archivedList);
      }

      // Update UI (remove from active lists)
      setLists((prev) => prev.filter((list) => list._id !== listId));
      showSnackbar("Shopping list archived successfully", "success");
    } catch (error) {
      console.error("[ShoppingListScreen] Error archiving list:", error);
      showSnackbar("Failed to archive shopping list", "error");
    }
  };

  const handleListUpdate = async (updatedList: ShoppingList) => {
    try {
      // Update local storage
      await ShoppingStorageManager.updateShoppingList(updatedList);

      // Update UI
      setLists((prev) =>
        prev.map((list) => (list._id === updatedList._id ? updatedList : list))
      );
    } catch (error) {
      console.error(
        "[ShoppingListScreen] Error updating list in storage:",
        error
      );
    }
  };

  const showSnackbar = (
    message: string,
    severity: typeof snackbar.severity
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

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

  return (
    <Container>
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

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ShoppingListScreen;
