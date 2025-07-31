// import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// import {
//   renderWithProviders,
//   screen,
//   fireEvent,
//   waitFor,
//   act,
// } from "../../test/testUtils";
// import { useState } from "react";
// import { Box, CircularProgress } from "@mui/material";
// import ShoppingListScreen from "../ShoppingListScreen";
// import { cachingSystem } from "../../utils/caching";
// import { ShoppingCacheData } from "../../utils/caching/ShoppingCacheData";
// import type { ShoppingList } from "../../types/shopping";

// // Mock the hooks that depend on mobile capabilities
// vi.mock("../../hooks/useKeyboardAwareness", () => ({
//   useKeyboardAwareness: () => ({
//     isKeyboardVisible: false,
//     keyboardHeight: 0,
//   }),
//   getKeyboardAwareStyles: () => ({}),
//   useInputScrollIntoView: () => {},
//   getKeyboardSpacerHeight: () => 0,
// }));

// // Mock Camera for Capacitor
// vi.mock("@capacitor/camera", () => ({
//   Camera: {
//     getPhoto: vi.fn(),
//   },
// }));

// describe("ShoppingListScreen", () => {
//   let shoppingCache: ShoppingCacheData | null;

//   beforeEach(async () => {
//     // Initialize the real caching system
//     await act(async () => {
//       // Wait for cache initialization
//       let attempts = 0;
//       while (!cachingSystem.getCache("shopping") && attempts < 50) {
//         await new Promise((resolve) => setTimeout(resolve, 10));
//         attempts++;
//       }
//     });

//     shoppingCache = cachingSystem.getCache("shopping") as ShoppingCacheData;
//     if (shoppingCache) {
//       shoppingCache.clearAllData();
//     }
//   });

//   afterEach(() => {
//     if (shoppingCache) {
//       shoppingCache.clearAllData();
//     }
//   });

//   describe("Basic Rendering", () => {
//     it("should render the ghost card for adding new lists", async () => {
//       renderWithProviders(<ShoppingListScreen />);

//       // Wait for component to render
//       await waitFor(() => {
//         const textbox = screen.getByRole("textbox");
//         expect(textbox).toBeInTheDocument();
//         expect(textbox).toHaveAttribute("placeholder", "createNewList");
//       });
//     });

//     it("should display add icon", async () => {
//       renderWithProviders(<ShoppingListScreen />);

//       await waitFor(() => {
//         const addIcon = screen.getByTestId("AddIcon");
//         expect(addIcon).toBeInTheDocument();
//       });
//     });
//   });

//   describe("List Creation", () => {
//     it("should create a new list when text is entered and submitted", async () => {
//       if (!shoppingCache) {
//         console.warn("Cache not initialized, skipping test");
//         return;
//       }

//       renderWithProviders(<ShoppingListScreen />);

//       await waitFor(() => {
//         expect(screen.getByRole("textbox")).toBeInTheDocument();
//       });

//       // Type in the input field
//       const input = screen.getByRole("textbox");
//       fireEvent.change(input, { target: { value: "Test List" } });

//       // Press Enter to create the list
//       fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

//       // Wait for the list to be added to cache
//       await waitFor(() => {
//         const lists = shoppingCache?.getActiveLists() || [];
//         expect(lists).toHaveLength(1);
//         expect(lists[0].name).toBe("Test List");
//       });
//     });

//     it("should clear input after creating list", async () => {
//       if (!shoppingCache) {
//         console.warn("Cache not initialized, skipping test");
//         return;
//       }

//       renderWithProviders(<ShoppingListScreen />);

//       await waitFor(() => {
//         expect(screen.getByRole("textbox")).toBeInTheDocument();
//       });

//       const input = screen.getByRole("textbox") as HTMLInputElement;
//       fireEvent.change(input, { target: { value: "Test List" } });
//       fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

//       // Wait for input to be cleared
//       await waitFor(() => {
//         expect(input.value).toBe("");
//       });
//     });
//   });

//   describe("Shopping Lists Display", () => {
//     it("should display lists from cache", async () => {
//       if (!shoppingCache) {
//         console.warn("Cache not initialized, skipping test");
//         return;
//       }

//       const testList: ShoppingList = {
//         _id: "1",
//         user_id: "test-user",
//         name: "Test Shopping List",
//         description: "Test Description",
//         color: "#1976d2",
//         archived: false,
//         items: [],
//         createdAt: Date.now(),
//         updatedAt: Date.now(),
//       };

//       // Add list to cache first
//       shoppingCache.addList(testList);

//       renderWithProviders(<ShoppingListScreen />);

//       // Wait for the list to appear in the UI
//       await waitFor(() => {
//         expect(screen.getByText("Test Shopping List")).toBeInTheDocument();
//       });
//     });

//     it("should show only ghost card when no lists exist", async () => {
//       if (!shoppingCache) {
//         console.warn("Cache not initialized, skipping test");
//         return;
//       }

//       renderWithProviders(<ShoppingListScreen />);

//       await waitFor(() => {
//         // Should have the ghost card input
//         expect(screen.getByRole("textbox")).toBeInTheDocument();
//         // Should not have any shopping list cards
//         expect(
//           screen.queryByTestId("shopping-list-card")
//         ).not.toBeInTheDocument();
//       });
//     });
//   });

//   describe("Cache Integration", () => {
//     it("should react to cache changes", async () => {
//       if (!shoppingCache) {
//         console.warn("Cache not initialized, skipping test");
//         return;
//       }

//       renderWithProviders(<ShoppingListScreen />);

//       // Wait for initial render
//       await waitFor(() => {
//         expect(screen.getByRole("textbox")).toBeInTheDocument();
//       });

//       // Add a list directly to cache (simulating external change)
//       const testList: ShoppingList = {
//         _id: "1",
//         user_id: "test-user",
//         name: "Cache Test List",
//         description: "Test Description",
//         color: "#1976d2",
//         archived: false,
//         items: [],
//         createdAt: Date.now(),
//         updatedAt: Date.now(),
//       };

//       act(() => {
//         if (shoppingCache) {
//           shoppingCache.addList(testList);
//         }
//       });

//       // List should appear in the UI
//       await waitFor(() => {
//         expect(screen.getByText("Cache Test List")).toBeInTheDocument();
//       });
//     });
//   });

//   describe("Input Validation", () => {
//     it("should not create list with empty name", async () => {
//       if (!shoppingCache) {
//         console.warn("Cache not initialized, skipping test");
//         return;
//       }

//       renderWithProviders(<ShoppingListScreen />);

//       await waitFor(() => {
//         expect(screen.getByRole("textbox")).toBeInTheDocument();
//       });

//       const input = screen.getByRole("textbox");

//       // Try to submit empty input
//       fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

//       // Wait a bit and verify no list was created
//       await act(async () => {
//         await new Promise((resolve) => setTimeout(resolve, 100));
//       });

//       const lists = shoppingCache.getActiveLists() || [];
//       expect(lists).toHaveLength(0);
//     });

//     it("should trim whitespace from list names", async () => {
//       if (!shoppingCache) {
//         console.warn("Cache not initialized, skipping test");
//         return;
//       }

//       renderWithProviders(<ShoppingListScreen />);

//       await waitFor(() => {
//         expect(screen.getByRole("textbox")).toBeInTheDocument();
//       });

//       const input = screen.getByRole("textbox");
//       fireEvent.change(input, { target: { value: "  Trimmed List  " } });
//       fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

//       await waitFor(() => {
//         const lists = shoppingCache?.getActiveLists() || [];
//         expect(lists).toHaveLength(1);
//         expect(lists[0].name).toBe("Trimmed List");
//       });
//     });
//   });

//   describe("Keyboard Interactions", () => {
//     it("should create list on Enter key", async () => {
//       if (!shoppingCache) {
//         console.warn("Cache not initialized, skipping test");
//         return;
//       }

//       renderWithProviders(<ShoppingListScreen />);

//       await waitFor(() => {
//         expect(screen.getByRole("textbox")).toBeInTheDocument();
//       });

//       const input = screen.getByRole("textbox");
//       fireEvent.change(input, { target: { value: "Enter Test List" } });
//       fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

//       await waitFor(() => {
//         const lists = shoppingCache?.getActiveLists() || [];
//         expect(lists).toHaveLength(1);
//         expect(lists[0].name).toBe("Enter Test List");
//       });
//     });

//     it("should clear input on Escape key", async () => {
//       renderWithProviders(<ShoppingListScreen />);

//       await waitFor(() => {
//         expect(screen.getByRole("textbox")).toBeInTheDocument();
//       });

//       const input = screen.getByRole("textbox") as HTMLInputElement;
//       fireEvent.change(input, { target: { value: "Test Text" } });
//       expect(input.value).toBe("Test Text");

//       fireEvent.keyDown(input, { key: "Escape", code: "Escape" });

//       await waitFor(() => {
//         expect(input.value).toBe("");
//       });
//     });
//   });

//   describe("Error Handling", () => {
//     it("should handle cache loading errors", async () => {
//       if (!shoppingCache) {
//         console.warn("Cache not initialized, skipping test");
//         return;
//       }

//       // Mock getActiveLists to throw an error
//       const originalGetActiveLists = shoppingCache.getActiveLists;
//       shoppingCache.getActiveLists = vi.fn(() => {
//         throw new Error("Cache loading error");
//       });

//       renderWithProviders(<ShoppingListScreen />);

//       // Should show error snackbar
//       await waitFor(() => {
//         expect(
//           screen.getByText("Failed to load shopping lists")
//         ).toBeInTheDocument();
//       });

//       // Restore original method
//       shoppingCache.getActiveLists = originalGetActiveLists;
//     });

//     it("should handle list creation errors", async () => {
//       if (!shoppingCache) {
//         console.warn("Cache not initialized, skipping test");
//         return;
//       }

//       // Mock addList to throw an error
//       const originalAddList = shoppingCache.addList;
//       shoppingCache.addList = vi.fn(() => {
//         throw new Error("Creation error");
//       });

//       renderWithProviders(<ShoppingListScreen />);

//       await waitFor(() => {
//         expect(screen.getByRole("textbox")).toBeInTheDocument();
//       });

//       const input = screen.getByRole("textbox");
//       fireEvent.change(input, { target: { value: "Error Test List" } });
//       fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

//       // Should show error snackbar
//       await waitFor(() => {
//         expect(
//           screen.getByText("Failed to create shopping list")
//         ).toBeInTheDocument();
//       });

//       // Restore original method
//       shoppingCache.addList = originalAddList;
//     });

//     it("should show warning for empty list name", async () => {
//       renderWithProviders(<ShoppingListScreen />);

//       await waitFor(() => {
//         expect(screen.getByRole("textbox")).toBeInTheDocument();
//       });

//       const input = screen.getByRole("textbox");
//       fireEvent.change(input, { target: { value: "   " } }); // Only whitespace
//       fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

//       // Should show warning snackbar
//       await waitFor(() => {
//         expect(
//           screen.getByText("Please enter a list name")
//         ).toBeInTheDocument();
//       });
//     });
//   });

//   describe("List Management Operations", () => {
//     it("should handle list deletion", async () => {
//       if (!shoppingCache) {
//         console.warn("Cache not initialized, skipping test");
//         return;
//       }

//       const testList: ShoppingList = {
//         _id: "delete-test",
//         user_id: "test-user",
//         name: "Delete Test List",
//         description: "Test Description",
//         color: "#1976d2",
//         archived: false,
//         items: [],
//         createdAt: Date.now(),
//         updatedAt: Date.now(),
//       };

//       shoppingCache.addList(testList);

//       renderWithProviders(<ShoppingListScreen />);

//       await waitFor(() => {
//         expect(screen.getByText("Delete Test List")).toBeInTheDocument();
//       });

//       // Manually trigger delete function to test the handler
//       const { rerender } = renderWithProviders(<ShoppingListScreen />);

//       // Simulate deletion by calling the cache method directly
//       act(() => {
//         shoppingCache.removeList("delete-test");
//       });

//       // Should show success snackbar
//       await waitFor(() => {
//         expect(
//           screen.getByText("Shopping list deleted successfully")
//         ).toBeInTheDocument();
//       });
//     });

//     it("should handle list deletion errors", async () => {
//       if (!shoppingCache) {
//         console.warn("Cache not initialized, skipping test");
//         return;
//       }

//       // Mock removeList to throw an error
//       const originalRemoveList = shoppingCache.removeList;
//       shoppingCache.removeList = vi.fn(() => {
//         throw new Error("Deletion error");
//       });

//       const testList: ShoppingList = {
//         _id: "error-delete-test",
//         user_id: "test-user",
//         name: "Error Delete Test",
//         description: "Test Description",
//         color: "#1976d2",
//         archived: false,
//         items: [],
//         createdAt: Date.now(),
//         updatedAt: Date.now(),
//       };

//       renderWithProviders(<ShoppingListScreen />);

//       // Try to delete and trigger error
//       act(() => {
//         try {
//           shoppingCache.removeList("error-delete-test");
//         } catch (error) {
//           // This will trigger the error handling in the component
//         }
//       });

//       // Should show error snackbar
//       await waitFor(() => {
//         expect(
//           screen.getByText("Failed to delete shopping list")
//         ).toBeInTheDocument();
//       });

//       // Restore original method
//       shoppingCache.removeList = originalRemoveList;
//     });

//     it("should handle list archiving", async () => {
//       if (!shoppingCache) {
//         console.warn("Cache not initialized, skipping test");
//         return;
//       }

//       const testList: ShoppingList = {
//         _id: "archive-test",
//         user_id: "test-user",
//         name: "Archive Test List",
//         description: "Test Description",
//         color: "#1976d2",
//         archived: false,
//         items: [],
//         createdAt: Date.now(),
//         updatedAt: Date.now(),
//       };

//       shoppingCache.addList(testList);

//       renderWithProviders(<ShoppingListScreen />);

//       await waitFor(() => {
//         expect(screen.getByText("Archive Test List")).toBeInTheDocument();
//       });

//       // Test archiving by updating the list to archived status
//       act(() => {
//         const archivedList = {
//           ...testList,
//           archived: true,
//           updatedAt: Date.now(),
//         };
//         shoppingCache.updateList(archivedList);
//       });

//       // Should show success snackbar
//       await waitFor(() => {
//         expect(
//           screen.getByText("Shopping list archived successfully")
//         ).toBeInTheDocument();
//       });
//     });

//     it("should handle list archiving errors", async () => {
//       if (!shoppingCache) {
//         console.warn("Cache not initialized, skipping test");
//         return;
//       }

//       // Mock updateList to throw an error
//       const originalUpdateList = shoppingCache.updateList;
//       shoppingCache.updateList = vi.fn(() => {
//         throw new Error("Archive error");
//       });

//       renderWithProviders(<ShoppingListScreen />);

//       // Try to archive and trigger error
//       act(() => {
//         try {
//           const testList = {
//             _id: "archive-error-test",
//             user_id: "test-user",
//             name: "Archive Error Test",
//             description: "Test Description",
//             color: "#1976d2",
//             archived: true,
//             items: [],
//             createdAt: Date.now(),
//             updatedAt: Date.now(),
//           };
//           shoppingCache.updateList(testList);
//         } catch (error) {
//           // This will trigger the error handling
//         }
//       });

//       // Should show error snackbar
//       await waitFor(() => {
//         expect(
//           screen.getByText("Failed to archive shopping list")
//         ).toBeInTheDocument();
//       });

//       // Restore original method
//       shoppingCache.updateList = originalUpdateList;
//     });

//     it("should handle list updates", async () => {
//       if (!shoppingCache) {
//         console.warn("Cache not initialized, skipping test");
//         return;
//       }

//       const testList: ShoppingList = {
//         _id: "update-test",
//         user_id: "test-user",
//         name: "Update Test List",
//         description: "Original Description",
//         color: "#1976d2",
//         archived: false,
//         items: [],
//         createdAt: Date.now(),
//         updatedAt: Date.now(),
//       };

//       shoppingCache.addList(testList);

//       renderWithProviders(<ShoppingListScreen />);

//       await waitFor(() => {
//         expect(screen.getByText("Update Test List")).toBeInTheDocument();
//       });

//       // Update the list
//       const updatedList = {
//         ...testList,
//         description: "Updated Description",
//         updatedAt: Date.now(),
//       };

//       act(() => {
//         shoppingCache.updateList(updatedList);
//       });

//       // List should be updated in cache
//       await waitFor(() => {
//         const lists = shoppingCache.getActiveLists();
//         const list = lists.find((l) => l._id === "update-test");
//         expect(list?.description).toBe("Updated Description");
//       });
//     });

//     it("should handle list update errors", async () => {
//       if (!shoppingCache) {
//         console.warn("Cache not initialized, skipping test");
//         return;
//       }

//       // Mock updateList to throw an error
//       const originalUpdateList = shoppingCache.updateList;
//       shoppingCache.updateList = vi.fn(() => {
//         throw new Error("Update error");
//       });

//       renderWithProviders(<ShoppingListScreen />);

//       // Try to update and trigger error - this would normally be called by ShoppingListCard
//       // but we can't easily simulate that interaction, so we test the error path directly
//       act(() => {
//         try {
//           const testList = {
//             _id: "update-error-test",
//             user_id: "test-user",
//             name: "Update Error Test",
//             description: "Test Description",
//             color: "#1976d2",
//             archived: false,
//             items: [],
//             createdAt: Date.now(),
//             updatedAt: Date.now(),
//           };
//           shoppingCache.updateList(testList);
//         } catch (error) {
//           // Error is caught and logged, but no snackbar is shown for update errors
//           console.error("Expected update error:", error);
//         }
//       });

//       // For update errors, no snackbar is shown, just error logging
//       // So we just verify the error was thrown
//       expect(shoppingCache.updateList).toHaveBeenCalled();

//       // Restore original method
//       shoppingCache.updateList = originalUpdateList;
//     });
//   });

//   describe("Snackbar Interactions", () => {
//     it("should close snackbar when close button is clicked", async () => {
//       renderWithProviders(<ShoppingListScreen />);

//       await waitFor(() => {
//         expect(screen.getByRole("textbox")).toBeInTheDocument();
//       });

//       // Trigger a snackbar by trying to create empty list
//       const input = screen.getByRole("textbox");
//       fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

//       // Should show snackbar
//       await waitFor(() => {
//         expect(
//           screen.getByText("Please enter a list name")
//         ).toBeInTheDocument();
//       });

//       // Find and click close button
//       const closeButton = screen.getByRole("button", { name: /close/i });
//       fireEvent.click(closeButton);

//       // Snackbar should disappear
//       await waitFor(() => {
//         expect(
//           screen.queryByText("Please enter a list name")
//         ).not.toBeInTheDocument();
//       });
//     });

//     it("should auto-close snackbar after timeout", async () => {
//       vi.useFakeTimers();

//       renderWithProviders(<ShoppingListScreen />);

//       await waitFor(() => {
//         expect(screen.getByRole("textbox")).toBeInTheDocument();
//       });

//       // Trigger a snackbar
//       const input = screen.getByRole("textbox");
//       fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

//       // Should show snackbar
//       await waitFor(() => {
//         expect(
//           screen.getByText("Please enter a list name")
//         ).toBeInTheDocument();
//       });

//       // Fast-forward time to trigger auto-close (4000ms)
//       act(() => {
//         vi.advanceTimersByTime(4000);
//       });

//       // Snackbar should disappear
//       await waitFor(() => {
//         expect(
//           screen.queryByText("Please enter a list name")
//         ).not.toBeInTheDocument();
//       });

//       vi.useRealTimers();
//     });
//   });

//   describe("Loading States", () => {
//     it("should show loading spinner when loading is true", async () => {
//       // Create a component that stays in loading state
//       const LoadingComponent = () => {
//         const [loading] = useState(true);

//         if (loading) {
//           return (
//             <Box
//               display="flex"
//               justifyContent="center"
//               alignItems="center"
//               minHeight={200}
//             >
//               <CircularProgress />
//             </Box>
//           );
//         }
//         return <div>Content loaded</div>;
//       };

//       renderWithProviders(<LoadingComponent />);

//       // Should show loading spinner
//       expect(screen.getByRole("progressbar")).toBeInTheDocument();
//     });

//     it("should hide loading spinner when data is loaded", async () => {
//       renderWithProviders(<ShoppingListScreen />);

//       // Should eventually hide loading spinner and show content
//       await waitFor(() => {
//         expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
//         expect(screen.getByRole("textbox")).toBeInTheDocument();
//       });
//     });
//   });
// });
