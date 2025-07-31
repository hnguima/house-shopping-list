// import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// import {
//   renderWithProviders,
//   screen,
//   fireEvent,
//   waitFor,
//   act,
// } from "../../test/testUtils";
// import UserProfileScreen from "../UserProfileScreen";
// import type { User } from "../../types/user";

// // Mock Capacitor Camera
// vi.mock("@capacitor/camera", () => ({
//   Camera: {
//     getPhoto: vi.fn(),
//   },
//   CameraResultType: {
//     DataUrl: "dataUrl",
//     Uri: "uri",
//   },
//   CameraSource: {
//     Camera: "camera",
//     Photos: "photos",
//     Prompt: "prompt",
//   },
// }));

// // Mock Capacitor Core
// vi.mock("@capacitor/core", () => ({
//   Capacitor: {
//     isNativePlatform: () => false,
//   },
// }));

// describe("UserProfileScreen", () => {
//   let userCache: UserCacheData;

//   const mockUser: User = {
//     id: "user-1",
//     username: "testuser",
//     email: "test@example.com",
//     name: "Test User",
//     photo: "https://example.com/photo.jpg",
//     provider: "google",
//     preferences: {
//       theme: "light",
//       language: "en",
//     },
//     createdAt: Date.now(),
//     updatedAt: Date.now(),
//   };

//   const mockProps = {
//     themeMode: "light" as const,
//     setThemeMode: vi.fn(),
//     language: "en",
//     setLanguage: vi.fn(),
//     user: mockUser,
//     onUserUpdate: vi.fn(),
//   };

//   beforeEach(async () => {
//     vi.clearAllMocks();

//     // Wait a bit to ensure caching system is ready
//     await new Promise((resolve) => setTimeout(resolve, 50));

//     // Get the real user cache and initialize it
//     userCache = cachingSystem.getCache("user") as UserCacheData;

//     // If cache doesn't exist yet, wait a bit longer and try again
//     if (!userCache) {
//       await new Promise((resolve) => setTimeout(resolve, 100));
//       userCache = cachingSystem.getCache("user") as UserCacheData;
//     }

//     // Clear any existing data and set up with mockUser
//     if (userCache) {
//       userCache.clearUser();
//       // Initialize with our test user
//       userCache.setUser(mockUser);
//     }

//     // Mock console methods to reduce noise
//     vi.spyOn(console, "log").mockImplementation(() => {});
//     vi.spyOn(console, "error").mockImplementation(() => {});
//   });

//   afterEach(() => {
//     // Clean up after each test
//     if (userCache) {
//       userCache.clearUser();
//     }
//     vi.restoreAllMocks();
//   });

//   describe("Basic Rendering", () => {
//     it("should render without crashing", () => {
//       expect(() =>
//         renderWithProviders(<UserProfileScreen {...mockProps} />)
//       ).not.toThrow();
//     });

//     it("should display user information", () => {
//       renderWithProviders(<UserProfileScreen {...mockProps} />);

//       // Check if name field has the right value (it uses editName state)
//       const nameInput = screen.getByDisplayValue(mockUser.name);
//       expect(nameInput).toBeInTheDocument();

//       // Check email field
//       const emailInput = screen.getByDisplayValue(mockUser.email);
//       expect(emailInput).toBeInTheDocument();
//     });

//     it("should display profile photo", () => {
//       renderWithProviders(<UserProfileScreen {...mockProps} />);

//       const profilePhoto = screen.getByRole("img", { name: /test user/i });
//       expect(profilePhoto).toBeInTheDocument();
//       expect(profilePhoto).toHaveAttribute("src", mockUser.photo);
//     });

//     it("should show current language setting", () => {
//       renderWithProviders(<UserProfileScreen {...mockProps} />);

//       const languageSelect = screen.getByRole("combobox");
//       expect(languageSelect).toBeInTheDocument();
//     });
//   });

//   describe("Cache Integration", () => {
//     it("should update name through cache system", async () => {
//       // Skip test if cache is not available
//       if (!userCache) {
//         console.warn("Skipping test: userCache not available");
//         return;
//       }

//       renderWithProviders(<UserProfileScreen {...mockProps} />);

//       const nameInput = screen.getByDisplayValue(mockUser.name);

//       // Change the name
//       fireEvent.change(nameInput, { target: { value: "Updated Name" } });
//       fireEvent.blur(nameInput);

//       // Wait for cache update
//       await waitFor(() => {
//         const userData = userCache.getUser();
//         expect(userData?.name).toBe("Updated Name");
//       });
//     });

//     it("should respond to cache changes from external sources", async () => {
//       // Skip test if cache is not available
//       if (!userCache) {
//         console.warn("Skipping test: userCache not available");
//         return;
//       }

//       renderWithProviders(<UserProfileScreen {...mockProps} />);

//       // Verify initial name
//       expect(screen.getByDisplayValue(mockUser.name)).toBeInTheDocument();

//       // Update user through cache externally
//       act(() => {
//         userCache.updateUser({ name: "External Update" });
//       });

//       // Wait for UI to update
//       await waitFor(() => {
//         expect(screen.getByDisplayValue("External Update")).toBeInTheDocument();
//       });
//     });

//     it("should handle empty name gracefully", async () => {
//       // Skip test if cache is not available
//       if (!userCache) {
//         console.warn("Skipping test: userCache not available");
//         return;
//       }

//       renderWithProviders(<UserProfileScreen {...mockProps} />);

//       const nameInput = screen.getByDisplayValue(mockUser.name);

//       // Clear the name and blur to trigger save
//       fireEvent.change(nameInput, { target: { value: "" } });
//       fireEvent.blur(nameInput);

//       // Should not update cache with empty name (component ignores empty changes)
//       await waitFor(
//         () => {
//           const userData = userCache.getUser();
//           expect(userData?.name).toBe(mockUser.name); // Should remain unchanged
//         },
//         { timeout: 1000 }
//       );
//     });
//   });

//   describe("Photo Management", () => {
//     it("should show photo upload option for web", () => {
//       renderWithProviders(<UserProfileScreen {...mockProps} />);

//       // Should show file input for web (not native)
//       const fileInput = screen.getByLabelText(/choose from gallery/i);
//       expect(fileInput).toBeInTheDocument();
//     });
//   });

//   describe("Settings Management", () => {
//     it("should show language select", async () => {
//       renderWithProviders(<UserProfileScreen {...mockProps} />);

//       // Find the language select
//       const languageSelect = screen.getByRole("combobox");
//       expect(languageSelect).toBeInTheDocument();

//       // Should be enabled and functional
//       expect(languageSelect).not.toBeDisabled();
//     });
//   });

//   describe("Snackbar Notifications", () => {
//     it("should show success message when name is updated", async () => {
//       renderWithProviders(<UserProfileScreen {...mockProps} />);

//       const nameInput = screen.getByDisplayValue(mockUser.name);

//       fireEvent.change(nameInput, { target: { value: "Success Name" } });
//       fireEvent.blur(nameInput);

//       await waitFor(() => {
//         expect(
//           screen.getByText(/name updated successfully/i)
//         ).toBeInTheDocument();
//       });
//     });
//   });
// });
