import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  useTheme,
} from "@mui/material";
import { styled } from "@mui/system";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import ArchiveIcon from "@mui/icons-material/Archive";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import PaletteIcon from "@mui/icons-material/Palette";
import type { ShoppingList, UpdateShoppingListData } from "../types/shopping";
import apiClient from "../utils/apiClient";
import { ShoppingStorageManager } from "../utils/shoppingStorageManager";
import {
  getContrastTextColor,
  getThemeAwareCardColor,
} from "../utils/colorUtils";
import ColorPickerDialog from "./ColorPickerDialog";
import InlineColorPicker from "./InlineColorPicker";

const StyledCard = styled(Card)(({ theme }: any) => ({
  marginBottom: theme.spacing(2),
  transition: "box-shadow 0.2s ease",
  "&:hover": {
    boxShadow: theme.shadows?.[4] || "0 4px 8px rgba(0,0,0,0.12)",
  },
}));

const ListHeader = styled(Box)(({ theme }: any) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: theme.spacing(1),
}));

interface ShoppingListCardProps {
  list: ShoppingList;
  onUpdate: (updatedList: ShoppingList) => void;
  onDelete: (listId: string) => void;
  onArchive: (listId: string) => void;
}

const ShoppingListCard: React.FC<ShoppingListCardProps> = ({
  list,
  onUpdate,
  onDelete,
  onArchive,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDarkTheme = theme.palette.mode === "dark";
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [editData, setEditData] = useState<UpdateShoppingListData>({
    name: list.name,
    description: list.description,
    color: list.color,
  });
  const [editingListName, setEditingListName] = useState(false);
  const [tempListName, setTempListName] = useState(list.name);
  const [editingItem, setEditingItem] = useState(false);
  const [tempItemName, setTempItemName] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [swipeItemId, setSwipeItemId] = useState<string | null>(null);
  const [swipeProgress, setSwipeProgress] = useState<number>(0);
  const [isSwipeActive, setIsSwipeActive] = useState<boolean>(false);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const addItemInputRef = useRef<HTMLInputElement>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const menuOpen = Boolean(anchorEl);
  const completedItems = list.items.filter((item) => item.completed).length;
  const totalItems = list.items.length;
  const completionRate =
    totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  // Sort items by creation order (oldest first - newest items go to bottom)
  const sortedItems = [...list.items].sort((a, b) => {
    const aTime = Number(a.createdAt ?? a.updatedAt ?? 0);
    const bTime = Number(b.createdAt ?? b.updatedAt ?? 0);
    return aTime - bTime; // Oldest first (creation order)
  });

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;

    try {
      setAddingItem(true);
      const response = await apiClient.addItemToList(list._id, {
        name: newItemText.trim(),
        quantity: 1,
      });
      const updatedList: ShoppingList = response.data.shopping_list;

      // Update local storage
      await ShoppingStorageManager.updateShoppingList(updatedList);

      // Update UI
      onUpdate(updatedList);
      setNewItemText("");
    } catch (error) {
      console.error("Error adding item:", error);
    } finally {
      setAddingItem(false);
      // Ensure focus returns to the input field after the state update
      setTimeout(() => {
        if (addItemInputRef.current) {
          addItemInputRef.current.focus();
        }
      }, 50);
    }
  };

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    try {
      const response = await apiClient.updateItemInList(list._id, itemId, {
        completed,
      });
      const updatedList: ShoppingList = response.data.shopping_list;

      // Update local storage
      await ShoppingStorageManager.updateShoppingList(updatedList);

      // Update UI
      onUpdate(updatedList);
    } catch (error) {
      console.error("Error toggling item:", error);
    }
  };

  const handleSwipeStart = (e: React.TouchEvent, itemId: string) => {
    setSwipeStartX(e.touches[0].clientX);
    setSwipeItemId(itemId);
    setIsSwipeActive(true);
    setSwipeProgress(0);
    setSwipeOffset(0);
  };

  const handleSwipeMove = (e: React.TouchEvent, item: any) => {
    if (swipeStartX === null || swipeItemId !== item.id || !isSwipeActive)
      return;

    const currentX = e.touches[0].clientX;
    const diffX = currentX - swipeStartX; // Keep sign for direction
    const absDistance = Math.abs(diffX);
    const progress = Math.min(absDistance / 100, 1); // Progress from 0 to 1 (100px = full swipe)

    setSwipeProgress(progress);
    setSwipeOffset(diffX); // Store the actual offset for visual sliding
  };

  const handleSaveItemEdit = async () => {
    if (!editingItemId || !tempItemName.trim()) {
      handleCancelItemEdit();
      return;
    }
    try {
      const response = await apiClient.updateItemInList(
        list._id,
        editingItemId,
        {
          name: tempItemName.trim(),
        }
      );
      const updatedList: ShoppingList = response.data.shopping_list;

      // Update local storage
      await ShoppingStorageManager.updateShoppingList(updatedList);

      // Update UI
      onUpdate(updatedList);

      // Reset editing state
      setEditingItem(false);
      setEditingItemId(null);
      setTempItemName("");
    } catch (error) {
      console.error("Error updating item:", error);
      handleCancelItemEdit();
    }
  };

  const handleCancelItemEdit = () => {
    setEditingItem(false);
    setEditingItemId(null);
    setTempItemName("");
  };

  const handleSwipeEnd = async (e: React.TouchEvent, item: any) => {
    if (swipeStartX === null || swipeItemId !== item.id) return;

    const endX = e.changedTouches[0].clientX;
    const diffX = Math.abs(endX - swipeStartX);

    // If swipe distance is more than 100px in any direction, delete the item
    if (diffX > 100) {
      try {
        const response = await apiClient.removeItemFromList(list._id, item.id);
        const updatedList: ShoppingList = response.data.shopping_list;

        // Update local storage
        await ShoppingStorageManager.updateShoppingList(updatedList);

        // Update UI
        onUpdate(updatedList);
      } catch (error) {
        console.error("Error deleting item:", error);
      }
    }

    // Reset swipe state
    setSwipeStartX(null);
    setSwipeItemId(null);
    setIsSwipeActive(false);
    setSwipeProgress(0);
    setSwipeOffset(0);
  };

  const handleListNameClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setTempListName(list.name);
    setEditingListName(true);
  };

  const handleSaveListName = async () => {
    if (!tempListName.trim()) return;
    try {
      const response = await apiClient.updateShoppingList(list._id, {
        name: tempListName.trim(),
        description: list.description,
      });
      const updatedList: ShoppingList = response.data.shopping_list;

      // Update local storage
      await ShoppingStorageManager.updateShoppingList(updatedList);

      // Update UI
      onUpdate(updatedList);
    } catch (error) {
      console.error("Error updating list name:", error);
    }
    setEditingListName(false);
  };

  const handleCancelListNameEdit = () => {
    setEditingListName(false);
    setTempListName(list.name);
  };

  const handleColorSelect = async (color: string) => {
    try {
      const updateData: any = {
        name: list.name,
        description: list.description,
        color: color,
      };

      const response = await apiClient.updateShoppingList(list._id, updateData);
      const updatedList: ShoppingList = response.data.shopping_list;

      // Update local storage
      await ShoppingStorageManager.updateShoppingList(updatedList);

      // Update UI
      onUpdate(updatedList);
    } catch (error) {
      console.error("Error updating list color:", error);
    }
  };

  const handleEditDialogColorSelect = (color: string) => {
    setEditData((prev) => ({
      ...prev,
      color: color,
    }));
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    setEditData({
      name: list.name,
      description: list.description,
      color: list.color,
    });
    setEditDialogOpen(true);
  };

  const handleArchive = () => {
    handleMenuClose();
    onArchive(list._id);
  };

  const handleChangeColor = () => {
    handleMenuClose();
    setColorPickerOpen(true);
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete(list._id);
  };

  const handleSaveEdit = async () => {
    try {
      const response = await apiClient.updateShoppingList(list._id, editData);
      const updatedList: ShoppingList = response.data.shopping_list;

      onUpdate(updatedList);
      setEditDialogOpen(false);
    } catch (error) {
      console.error("[ShoppingListCard] Error updating list:", error);
    }
  };

  return (
    <>
      <StyledCard
        sx={{
          backgroundColor: getThemeAwareCardColor(
            list.color || "#1976d2",
            isDarkTheme
          ),
          border: `1px solid ${list.color || "#1976d2"}20`,
          overflow: "hidden", // This helps remove any border artifacts
        }}
      >
        <CardContent
          sx={{
            padding: 0,
            pb: "0 !important", // Force remove bottom padding
            "&:last-child": {
              paddingBottom: 0,
            },
          }}
        >
          <ListHeader
            sx={{
              margin: 0,
              padding: 1,
              backgroundColor: list.color || "#1976d2",
              borderRadius: "8px 8px 0 0",
              border: "none",
              outline: "none",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flex: 1,
                minHeight: "40px",
                width: "100%",
                overflow: "hidden",
              }}
            >
              {editingListName ? (
                <TextField
                  variant="standard"
                  value={tempListName}
                  onChange={(e) => setTempListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveListName();
                    } else if (e.key === "Escape") {
                      handleCancelListNameEdit();
                    }
                  }}
                  onBlur={handleSaveListName}
                  autoFocus
                  slotProps={{
                    input: {
                      style: { fontSize: "1.25rem", fontWeight: 500 },
                    },
                  }}
                  sx={{
                    flex: 1,
                    width: "100%",
                    maxWidth: "100%",
                    "& .MuiInputBase-input": {
                      color: getContrastTextColor(list.color || "#1976d2"),
                    },
                    "& .MuiInput-underline:before": {
                      borderBottomColor: getContrastTextColor(
                        list.color || "#1976d2"
                      ),
                    },
                    "& .MuiInput-underline:after": {
                      borderBottomColor: getContrastTextColor(
                        list.color || "#1976d2"
                      ),
                    },
                  }}
                />
              ) : (
                <Typography
                  variant="h6"
                  component="h2"
                  onClick={handleListNameClick}
                  sx={{
                    cursor: "pointer",
                    flex: 1,
                    py: 0.5,
                    px: 0.5,
                    borderRadius: 1,
                    width: "100%",
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: getContrastTextColor(list.color || "#1976d2"),
                    "&:hover": {
                      backgroundColor: "rgba(255,255,255,0.1)",
                    },
                  }}
                >
                  {list.name}
                </Typography>
              )}
            </Box>
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              aria-label="more"
              sx={{
                width: 32,
                height: 32,
                minWidth: 32,
                flexShrink: 0,
                color: getContrastTextColor(list.color || "#1976d2"),
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </ListHeader>

          {/* Items List */}
          <Box sx={{ mt: 2 }}>
            <List sx={{ py: 0 }}>
              {sortedItems.map((item) => (
                <ListItem
                  key={item.id}
                  onTouchStart={(e) => handleSwipeStart(e, item.id)}
                  onTouchMove={(e) => handleSwipeMove(e, item)}
                  onTouchEnd={(e) => handleSwipeEnd(e, item)}
                  sx={{
                    px: 0,
                    py: 0.5,
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    minHeight: "40px",
                    backgroundColor:
                      isSwipeActive && swipeItemId === item.id
                        ? `rgba(255, 0, 0, ${swipeProgress * 0.3})` // Red background that intensifies with swipe
                        : "transparent",
                    transform:
                      isSwipeActive && swipeItemId === item.id
                        ? `translateX(${swipeOffset}px)` // Slide the item with the finger
                        : "translateX(0px)",
                    transition:
                      isSwipeActive && swipeItemId === item.id
                        ? "background-color 0.1s ease"
                        : "all 0.2s ease",
                    "&:hover": {
                      backgroundColor:
                        isSwipeActive && swipeItemId === item.id
                          ? `rgba(255, 0, 0, ${swipeProgress * 0.3})`
                          : "rgba(0,0,0,0.04)",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <Checkbox
                      checked={item.completed}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleItem(item.id, e.target.checked);
                      }}
                      size="small"
                      sx={{
                        color: list.color || "#1976d2",
                        "&.Mui-checked": {
                          color: list.color || "#1976d2",
                        },
                      }}
                    />
                  </ListItemIcon>
                  {editingItem && editingItemId === item.id ? (
                    <TextField
                      variant="standard"
                      value={tempItemName}
                      onChange={(e) => setTempItemName(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveItemEdit();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          handleCancelItemEdit();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={handleSaveItemEdit}
                      autoFocus
                      fullWidth
                      size="small"
                      sx={{
                        flex: 1,
                        pr: 1,
                        "& .MuiInput-underline:after": {
                          borderBottomColor: list.color || "#1976d2",
                        },
                        "& .MuiInputBase-input": {
                          color: theme.palette.text.primary,
                        },
                      }}
                    />
                  ) : (
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTempItemName(item.name);
                            setEditingItemId(item.id);
                            setEditingItem(true);
                          }}
                          sx={{
                            textDecoration: item.completed
                              ? "line-through"
                              : "none",
                            color: item.completed
                              ? "text.secondary"
                              : "text.primary",
                            cursor: "pointer",
                            "&:hover": {
                              // backgroundColor: "rgba(0,0,0,0.04)",
                              borderRadius: 1,
                              padding: "2px 4px",
                              margin: "-2px -4px",
                            },
                          }}
                        >
                          {item.name}
                        </Typography>
                      }
                      sx={{ flex: 1 }}
                    />
                  )}
                </ListItem>
              ))}

              {/* Add Item Input */}
              <ListItem
                sx={{
                  px: 0,
                  py: 0.5,
                  display: "flex",
                  alignItems: "center",
                  minHeight: "40px",
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <AddIcon color="action" fontSize="small" />
                </ListItemIcon>
                <TextField
                  inputRef={addItemInputRef}
                  placeholder={t("addItem")}
                  variant="standard"
                  size="small"
                  fullWidth
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddItem();
                    }
                  }}
                  disabled={addingItem}
                  sx={{
                    flex: 1,
                    pr: 1,
                    "& .MuiInput-underline:before": {
                      borderBottom: "1px solid transparent",
                    },
                    "& .MuiInput-underline:hover:before": {
                      borderBottom: "1px solid rgba(0,0,0,0.42)",
                    },
                    "& .MuiInput-underline:after": {
                      borderBottomColor: list.color || "#1976d2",
                    },
                  }}
                />
              </ListItem>
            </List>
            {totalItems > 0 && (
              <Box sx={{ mt: 2, mb: 0 }}>
                <LinearProgress
                  variant="determinate"
                  value={completionRate}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "rgba(0,0,0,0.1)",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 3,
                      backgroundColor: list.color || "#1976d2",
                    },
                  }}
                />
              </Box>
            )}
          </Box>
        </CardContent>
      </StyledCard>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} />
          {t("edit")}
        </MenuItem>
        <MenuItem onClick={handleChangeColor}>
          <PaletteIcon sx={{ mr: 1 }} />
          Color
        </MenuItem>
        <MenuItem onClick={handleArchive}>
          <ArchiveIcon sx={{ mr: 1 }} />
          {t("archive")}
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
          <DeleteIcon sx={{ mr: 1 }} />
          {t("delete")}
        </MenuItem>
      </Menu>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("editList")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t("listName")}
            fullWidth
            variant="outlined"
            value={editData.name}
            onChange={(e) =>
              setEditData((prev) => ({ ...prev, name: e.target.value }))
            }
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label={t("description")}
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={editData.description}
            onChange={(e) =>
              setEditData((prev) => ({ ...prev, description: e.target.value }))
            }
            sx={{ mb: 2 }}
          />

          {/* Color Selection */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              List Color
            </Typography>
            <InlineColorPicker
              currentColor={editData.color || "#1976d2"}
              onColorSelect={handleEditDialogColorSelect}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={!editData.name?.trim()}
          >
            {t("save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Color Picker Dialog */}
      <ColorPickerDialog
        open={colorPickerOpen}
        onClose={() => setColorPickerOpen(false)}
        onColorSelect={handleColorSelect}
        currentColor={list.color || "#1976d2"}
      />
    </>
  );
};

export default ShoppingListCard;
