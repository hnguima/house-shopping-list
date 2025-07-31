// import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// import {
//   render,
//   screen,
//   waitFor,
//   fireEvent,
//   act,
// } from "@testing-library/react";
// import App from "../App";
// import { cachingSystem } from "../utils/caching";
// import { UserCacheData } from "../utils/caching/UserCacheData";
// import apiClient from "../utils/apiClient";

// // Mock Capacitor Preferences
// vi.mock("@capacitor/preferences", () => ({
//   Preferences: {
//     get: vi.fn(() => Promise.resolve({ value: null })),
//     set: vi.fn(() => Promise.resolve()),
//     remove: vi.fn(() => Promise.resolve()),
//   },
// }));

// // Mock all the lazy-loaded components
// vi.mock("../screens/ShoppingListScreen", () => ({
//   default: () => (
//     <div data-testid="shopping-list-screen">Shopping List Screen</div>
//   ),
// }));

// vi.mock("../screens/UserProfileScreen", () => ({
//   default: () => (
//     <div data-testid="user-profile-screen">User Profile Screen</div>
//   ),
// }));

// vi.mock("../screens/LoginScreen", () => ({
//   default: ({ onLogin, onError }: any) => (
//     <div data-testid="login-screen">
//       <button
//         onClick={() =>
//           onLogin({
//             id: "123",
//             email: "test@example.com",
//             name: "Test User",
//           })
//         }
//         data-testid="login-button"
//       >
//         Login
//       </button>
//       <button onClick={() => onError("Test error")} data-testid="error-button">
//         Trigger Error
//       </button>
//     </div>
//   ),
// }));

// vi.mock("../screens/CacheDebugScreen", () => ({
//   default: ({ onClose }: any) => (
//     <div data-testid="cache-debug-screen">
//       <span>Cache Debug Screen</span>
//       <button onClick={onClose} data-testid="close-debug">
//         Close
//       </button>
//     </div>
//   ),
// }));

// // Mock Header component
// vi.mock("../components/Header", () => ({
//   default: () => <div data-testid="header">Header</div>,
// }));

// // Mock hooks
// vi.mock("../hooks/useChangeLanguage", () => ({
//   useChangeLanguage: () => vi.fn(),
// }));

// // Don't mock useCachingSystem - we need the real one for cache initialization
// // vi.mock("../hooks/useCachingSystem", () => ({
// //   useCachingSystem: vi.fn(),
// // }));

// // Don't mock the caching system - use the real one
// // vi.mock("../utils/caching", () => ({
// //   cachingSystem: {
// //     getCache: vi.fn(),
// //   },
// // }));

// vi.mock("../utils/apiClient", () => ({
//   default: {
//     getCurrentUser: vi.fn(),
//     onTokenExpired: null,
//     clearTokens: vi.fn(),
//   },
// }));

// // Mock Material-UI components
// vi.mock("@mui/material/CssBaseline", () => ({
//   default: () => null,
// }));

// vi.mock("@mui/material/CircularProgress", () => ({
//   default: ({ size }: any) => (
//     <div className="MuiCircularProgress-root" data-size={size}>
//       Loading...
//     </div>
//   ),
// }));

// vi.mock("@mui/material/Fab", () => ({
//   default: ({ children, onClick, "aria-label": ariaLabel, ...props }: any) => (
//     <button onClick={onClick} aria-label={ariaLabel} {...props}>
//       {children}
//     </button>
//   ),
// }));

// vi.mock("@mui/icons-material/BugReport", () => ({
//   default: () => <span>🐛</span>,
// }));

// // Mock Container component to avoid breakpoint issues
// vi.mock("@mui/material/Container", () => ({
//   default: ({ children, ...props }: any) => (
//     <div data-testid="mui-container" {...props}>
//       {children}
//     </div>
//   ),
// }));

// // Use real theme - no mocking

// // Use real theme - no mocking

// // Mock i18n related modules
// vi.mock("i18next", () => ({
//   default: {
//     language: "en",
//     changeLanguage: vi.fn(),
//     t: vi.fn((key: string) => key),
//   },
// }));

// vi.mock("react-i18next", () => ({
//   useTranslation: () => ({
//     t: vi.fn((key: string) => key),
//     i18n: { language: "en", changeLanguage: vi.fn() },
//   }),
//   initReactI18next: { type: "3rdParty", init: vi.fn() },
// }));

// vi.mock("../i18n", () => ({
//   default: {
//     language: "en",
//     changeLanguage: vi.fn(),
//     t: vi.fn((key: string) => key),
//   },
// }));

// describe("App.tsx", () => {
//   const mockUser = {
//     id: "123",
//     username: "testuser",
//     email: "test@example.com",
//     name: "Test User",
//     photo: "https://example.com/photo.jpg",
//     provider: "google",
//     preferences: {
//       theme: "light" as const,
//       language: "en",
//     },
//     createdAt: Date.now(),
//     updatedAt: Date.now(),
//   };

//   beforeEach(() => {
//     vi.clearAllMocks();

//     // Clear the real cache before each test
//     const userCache = cachingSystem.getCache("user") as UserCacheData;
//     if (userCache?.clearUser) {
//       userCache.clearUser();
//     }

//     localStorage.clear();

//     // Mock console methods (but allow some through for debugging)
//     // vi.spyOn(console, "log").mockImplementation(() => {});
//     vi.spyOn(console, "error").mockImplementation(() => {});
//     vi.spyOn(console, "warn").mockImplementation(() => {});

//     // Mock window methods but allow sessionExpired listener to work
//     const originalAddEventListener = window.addEventListener;
//     const originalRemoveEventListener = window.removeEventListener;

//     vi.spyOn(window, "addEventListener").mockImplementation(
//       (event: string, listener: any, options?: any) => {
//         // Allow sessionExpired event listener to be set up for real
//         if (event === "sessionExpired") {
//           return originalAddEventListener.call(
//             window,
//             event,
//             listener,
//             options
//           );
//         }
//         // Mock other event listeners
//       }
//     );

//     vi.spyOn(window, "removeEventListener").mockImplementation(
//       (event: string, listener: any, options?: any) => {
//         // Allow sessionExpired event listener to be removed for real
//         if (event === "sessionExpired") {
//           return originalRemoveEventListener.call(
//             window,
//             event,
//             listener,
//             options
//           );
//         }
//         // Mock other event listeners
//       }
//     );
//   });

//   afterEach(() => {
//     vi.restoreAllMocks();

//     // Clear the real cache after each test
//     const userCache = cachingSystem.getCache("user") as UserCacheData;
//     if (userCache?.clearUser) {
//       userCache.clearUser();
//     }

//     localStorage.clear();
//   });

//   describe("Basic Functionality", () => {
//     it("should initialize caching system correctly", async () => {
//       await act(async () => {
//         render(<App />);
//       });

//       // Wait for cache initialization and initial render
//       await waitFor(() => {
//         expect(screen.getByTestId("login-screen")).toBeInTheDocument();
//       });
//     });

//     it("should setup event listeners for session management", async () => {
//       render(<App />);
//       await waitFor(() => {
//         expect(window.addEventListener).toHaveBeenCalledWith(
//           "sessionExpired",
//           expect.any(Function)
//         );
//       });
//     });

//     it("should cleanup event listeners on unmount", () => {
//       const { unmount } = render(<App />);
//       unmount();
//       expect(window.removeEventListener).toHaveBeenCalledWith(
//         "sessionExpired",
//         expect.any(Function)
//       );
//     });

//     it("should handle missing cache gracefully", () => {
//       // This test just ensures the app doesn't crash
//       expect(() => render(<App />)).not.toThrow();
//     });
//   });

//   describe("Authentication", () => {
//     it("should show login screen when no user is present", async () => {
//       await act(async () => {
//         render(<App />);
//       });

//       await waitFor(() => {
//         expect(screen.getByTestId("login-screen")).toBeInTheDocument();
//       });
//     });

//     it("should handle successful login flow", async () => {
//       vi.mocked(apiClient.getCurrentUser).mockResolvedValue({
//         status: 200,
//         ok: true,
//         data: { user: mockUser },
//       });

//       await act(async () => {
//         render(<App />);
//       });

//       await waitFor(() => {
//         expect(screen.getByTestId("login-screen")).toBeInTheDocument();
//       });

//       await act(async () => {
//         const loginButton = screen.getByTestId("login-button");
//         fireEvent.click(loginButton);
//       });

//       await waitFor(
//         () => {
//           // Check if setUser was called on the real cache
//           const userCache = cachingSystem.getCache("user") as UserCacheData;
//           const user = userCache?.getUser() || null;
//           expect(user).toMatchObject({
//             id: "123",
//             email: "test@example.com",
//             name: "Test User",
//           });
//         },
//         { timeout: 2000 }
//       );
//     });

//     it("should handle login errors gracefully", async () => {
//       await act(async () => {
//         render(<App />);
//       });

//       await waitFor(() => {
//         expect(screen.getByTestId("login-screen")).toBeInTheDocument();
//       });

//       await act(async () => {
//         const errorButton = screen.getByTestId("error-button");
//         fireEvent.click(errorButton);
//       });

//       expect(screen.getByTestId("login-screen")).toBeInTheDocument();
//     });
//   });

//   describe("User State Management", () => {
//     it("should handle user cache subscription", async () => {
//       await act(async () => {
//         render(<App />);
//       });

//       // The real cache system should be working
//       const userCache = cachingSystem.getCache("user");
//       expect(userCache).toBeDefined();
//     });

//     it("should handle user data from cache subscription", async () => {
//       // Create a test with better debugging
//       console.log(
//         "=== TEST START: should handle user data from cache subscription ==="
//       );

//       await act(async () => {
//         render(<App />);
//       });

//       // Wait for the cache to be initialized
//       await waitFor(
//         () => {
//           const userCache = cachingSystem.getCache("user");
//           expect(userCache).toBeDefined();
//         },
//         { timeout: 1000 }
//       );
//       console.log("=== CACHE INITIALIZED ===");

//       // Wait for initial render and ensure we're showing login screen first
//       await waitFor(() => {
//         expect(screen.getByTestId("login-screen")).toBeInTheDocument();
//       });
//       console.log("=== LOGIN SCREEN RENDERED ===");

//       // Give the App component time to set up its subscription
//       await new Promise((resolve) => setTimeout(resolve, 100));
//       console.log("=== WAITED FOR SUBSCRIPTION SETUP ===");

//       // Set user directly in cache
//       const userCache = cachingSystem.getCache("user") as UserCacheData;
//       if (userCache) {
//         console.log("=== SETTING USER IN CACHE ===");
//         await act(async () => {
//           userCache.setUser(mockUser);
//         });
//         console.log("=== USER SET IN CACHE ===");
//       }

//       // Give time for the subscription to trigger and state to update
//       await new Promise((resolve) => setTimeout(resolve, 200));
//       console.log("=== WAITED FOR STATE UPDATE ===");

//       // Check if App component updated its state and shows main screen instead of login
//       await waitFor(
//         () => {
//           console.log("=== CHECKING FOR SCREEN TRANSITION ===");
//           expect(screen.queryByTestId("login-screen")).not.toBeInTheDocument();
//           // Should show either shopping list screen or dashboard
//           const hasShoppingListScreen = screen.queryByTestId(
//             "shopping-list-screen"
//           );
//           const hasDashboardScreen = screen.queryByTestId("dashboard-screen");
//           console.log("=== SCREENS FOUND ===", {
//             hasShoppingListScreen: !!hasShoppingListScreen,
//             hasDashboardScreen: !!hasDashboardScreen,
//           });
//           expect(hasShoppingListScreen || hasDashboardScreen).toBeTruthy();
//         },
//         { timeout: 2000 }
//       );

//       console.log("=== TEST COMPLETED SUCCESSFULLY ===");
//     });
//   });

//   describe("Theme Management", () => {
//     it("should show loading spinner when theme is not loaded", async () => {
//       render(<App />);

//       // App should show login screen when no user
//       await waitFor(() => {
//         expect(screen.getByTestId("login-screen")).toBeInTheDocument();
//       });
//     });
//   });

//   describe("Screen Navigation", () => {
//     it("should render dashboard screen when user is logged in", async () => {
//       await act(async () => {
//         render(<App />);
//       });

//       // Wait for initial login screen to render
//       await waitFor(() => {
//         expect(screen.getByTestId("login-screen")).toBeInTheDocument();
//       });

//       // Set user directly in cache to simulate successful login
//       const userCache = cachingSystem.getCache("user") as UserCacheData;
//       if (userCache) {
//         await act(async () => {
//           userCache.setUser(mockUser);
//         });
//       }

//       // Should transition to main app and show shopping list screen
//       await waitFor(
//         () => {
//           expect(screen.queryByTestId("login-screen")).not.toBeInTheDocument();
//           expect(
//             screen.getByTestId("shopping-list-screen")
//           ).toBeInTheDocument();
//         },
//         { timeout: 3000 }
//       );
//     });

//     it("should show cache debug screen when debug button is clicked", async () => {
//       await act(async () => {
//         render(<App />);
//       });

//       // Wait for initial login screen
//       await waitFor(() => {
//         expect(screen.getByTestId("login-screen")).toBeInTheDocument();
//       });

//       // Set user in cache after App is rendered and subscription is set up
//       const userCache = cachingSystem.getCache("user") as UserCacheData;
//       if (userCache) {
//         await act(async () => {
//           userCache.setUser(mockUser);
//         });
//       }

//       // Wait for user state to be set and main app to render
//       await waitFor(() => {
//         expect(screen.getByTestId("shopping-list-screen")).toBeInTheDocument();
//       });

//       // Find and click the debug button
//       const debugButton = screen.getByLabelText("debug");
//       await act(async () => {
//         fireEvent.click(debugButton);
//       });

//       await waitFor(() => {
//         expect(screen.getByTestId("cache-debug-screen")).toBeInTheDocument();
//       });
//     });
//   });

//   describe("Login Flow with API", () => {
//     it("should handle successful login with existing user from API", async () => {
//       const existingUser = { ...mockUser, name: "Existing User" };
//       vi.mocked(apiClient.getCurrentUser).mockResolvedValue({
//         status: 200,
//         ok: true,
//         data: { user: existingUser },
//       });

//       await act(async () => {
//         render(<App />);
//       });

//       await waitFor(() => {
//         expect(screen.getByTestId("login-screen")).toBeInTheDocument();
//       });

//       await act(async () => {
//         const loginButton = screen.getByTestId("login-button");
//         fireEvent.click(loginButton);
//       });

//       await waitFor(() => {
//         const userCache = cachingSystem.getCache("user") as UserCacheData;
//         const user = userCache ? userCache.getUser() : null;
//         expect(user).toMatchObject({
//           name: "Existing User",
//           preferences: expect.objectContaining({
//             theme: "light",
//             language: "en",
//           }),
//         });
//       });
//     });

//     it("should handle API error during login and create new user with defaults", async () => {
//       vi.mocked(apiClient.getCurrentUser).mockRejectedValue(
//         new Error("API Error")
//       );

//       await act(async () => {
//         render(<App />);
//       });

//       await waitFor(() => {
//         expect(screen.getByTestId("login-screen")).toBeInTheDocument();
//       });

//       await act(async () => {
//         const loginButton = screen.getByTestId("login-button");
//         fireEvent.click(loginButton);
//       });

//       await waitFor(() => {
//         const userCache = cachingSystem.getCache("user") as UserCacheData;
//         const user = userCache ? userCache.getUser() : null;
//         expect(user).toMatchObject({
//           id: "123",
//           email: "test@example.com",
//           name: "Test User",
//           provider: "google",
//           preferences: {
//             theme: "light",
//             language: "en",
//           },
//         });
//       });
//     });

//     it("should handle API response without user data", async () => {
//       vi.mocked(apiClient.getCurrentUser).mockResolvedValue({
//         status: 200,
//         ok: true,
//         data: {},
//       });

//       await act(async () => {
//         render(<App />);
//       });

//       await waitFor(() => {
//         expect(screen.getByTestId("login-screen")).toBeInTheDocument();
//       });

//       await act(async () => {
//         const loginButton = screen.getByTestId("login-button");
//         fireEvent.click(loginButton);
//       });

//       await waitFor(() => {
//         const userCache = cachingSystem.getCache("user") as UserCacheData;
//         const user = userCache ? userCache.getUser() : null;
//         expect(user).toMatchObject({
//           preferences: {
//             theme: "light",
//             language: "en",
//           },
//         });
//       });
//     });
//   });

//   describe("Logout Functionality", () => {
//     it("should handle logout properly", async () => {
//       const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

//       await act(async () => {
//         render(<App />);
//       });

//       // Wait for initial login screen
//       await waitFor(() => {
//         expect(screen.getByTestId("login-screen")).toBeInTheDocument();
//       });

//       // Set user in cache after App is rendered and subscription is set up
//       const userCache = cachingSystem.getCache("user") as UserCacheData;
//       if (userCache) {
//         await act(async () => {
//           userCache.setUser(mockUser);
//         });
//       }

//       // Wait for user state to be set and main app to render
//       await waitFor(() => {
//         expect(screen.getByTestId("shopping-list-screen")).toBeInTheDocument();
//       });

//       // Give more time for all useEffect hooks to settle, including the session event listener
//       await new Promise((resolve) => setTimeout(resolve, 300));

//       // Check if event listener was set up
//       const mockAddEventListener = vi.mocked(window.addEventListener);
//       const sessionExpiredListener = mockAddEventListener.mock.calls.find(
//         (call) => call[0] === "sessionExpired"
//       );
//       expect(sessionExpiredListener).toBeTruthy();

//       // Simulate session expired event which triggers logout
//       await act(async () => {
//         console.log("[TEST] Dispatching sessionExpired event...");
//         window.dispatchEvent(new Event("sessionExpired"));
//       });

//       // Wait longer for the logout to process completely
//       await waitFor(
//         () => {
//           // Check if the console log was called indicating logout started
//           expect(logSpy).toHaveBeenCalledWith(
//             "[App] Session expired event received"
//           );
//         },
//         { timeout: 1000 }
//       );

//       await waitFor(
//         () => {
//           expect(apiClient.clearTokens).toHaveBeenCalled();
//         },
//         { timeout: 1000 }
//       );

//       // Check that user was cleared
//       const user = userCache ? userCache.getUser() : null;
//       expect(user).toBeNull();

//       logSpy.mockRestore();
//     });
//   });

//   describe("Error Handling", () => {
//     it("should handle user update errors gracefully", async () => {
//       await act(async () => {
//         render(<App />);
//       });

//       await waitFor(() => {
//         expect(screen.getByTestId("login-screen")).toBeInTheDocument();
//       });

//       // This should not crash despite any potential cache errors
//       await act(async () => {
//         const loginButton = screen.getByTestId("login-button");
//         fireEvent.click(loginButton);
//       });

//       // Should still work and create user
//       await waitFor(() => {
//         const userCache = cachingSystem.getCache("user") as UserCacheData;
//         const user = userCache ? userCache.getUser() : null;
//         expect(user).toBeDefined();
//       });
//     });
//   });
// });
