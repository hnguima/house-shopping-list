// import { describe, it, expect, vi, beforeEach } from "vitest";
// import {
//   renderWithProviders,
//   screen,
//   fireEvent,
//   waitFor,
// } from "../../test/testUtils";
// import LoginScreen from "../LoginScreen";

// // Mock the auth utils
// vi.mock("../../utils/authUtils", () => ({
//   handleOAuthLogin: vi.fn(),
// }));

// describe("LoginScreen", () => {
//   const mockOnLogin = vi.fn();
//   const mockOnError = vi.fn();

//   beforeEach(() => {
//     vi.clearAllMocks();
//   });

//   it("should render login form", () => {
//     renderWithProviders(
//       <LoginScreen onLogin={mockOnLogin} onError={mockOnError} />
//     );

//     expect(
//       screen.getByRole("heading", { name: "Sign In" })
//     ).toBeInTheDocument();
//     expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
//     expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
//     expect(
//       screen.getByRole("button", { name: /continue with google/i })
//     ).toBeInTheDocument();
//   });

//   it("should toggle between login and register modes", async () => {
//     renderWithProviders(
//       <LoginScreen onLogin={mockOnLogin} onError={mockOnError} />
//     );

//     // Initially in login mode
//     expect(
//       screen.getByRole("heading", { name: "Sign In" })
//     ).toBeInTheDocument();

//     // Click to switch to register mode
//     fireEvent.click(screen.getByText(/create one/i));

//     await waitFor(() => {
//       expect(
//         screen.getByRole("heading", { name: "Create Account" })
//       ).toBeInTheDocument();
//       expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
//       expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
//     });

//     // Click to switch back to login mode
//     fireEvent.click(screen.getByText(/sign in/i));

//     await waitFor(() => {
//       expect(
//         screen.getByRole("heading", { name: "Sign In" })
//       ).toBeInTheDocument();
//     });
//   });

//   it("should handle form submission", async () => {
//     renderWithProviders(
//       <LoginScreen onLogin={mockOnLogin} onError={mockOnError} />
//     );

//     const emailInput = screen.getByLabelText(/email/i);
//     const passwordInput = screen.getByLabelText(/password/i);
//     const submitButton = screen.getByRole("button", { name: /sign in/i });

//     fireEvent.change(emailInput, { target: { value: "test@example.com" } });
//     fireEvent.change(passwordInput, { target: { value: "password123" } });
//     fireEvent.click(submitButton);

//     // Form should show loading state
//     await waitFor(() => {
//       expect(screen.getByText(/processing/i)).toBeInTheDocument();
//     });
//   });

//   it("should handle Google OAuth login", async () => {
//     const { handleOAuthLogin } = await import("../../utils/authUtils");
//     vi.mocked(handleOAuthLogin).mockResolvedValue({
//       success: true,
//       user: {
//         id: "test-id",
//         email: "test@example.com",
//         name: "Test User",
//         username: "testuser",
//         provider: "google",
//       },
//     });

//     renderWithProviders(
//       <LoginScreen onLogin={mockOnLogin} onError={mockOnError} />
//     );

//     const googleButton = screen.getByText(/continue with google/i);
//     fireEvent.click(googleButton);

//     await waitFor(() => {
//       expect(handleOAuthLogin).toHaveBeenCalled();
//       expect(mockOnLogin).toHaveBeenCalled();
//     });
//   });

//   it("should handle OAuth error", async () => {
//     const { handleOAuthLogin } = await import("../../utils/authUtils");
//     vi.mocked(handleOAuthLogin).mockResolvedValue({
//       success: false,
//       error: "OAuth failed",
//     });

//     renderWithProviders(
//       <LoginScreen onLogin={mockOnLogin} onError={mockOnError} />
//     );

//     const googleButton = screen.getByText(/continue with google/i);
//     fireEvent.click(googleButton);

//     await waitFor(() => {
//       expect(mockOnError).toHaveBeenCalledWith("OAuth failed");
//     });
//   });

//   it("should validate form inputs", async () => {
//     renderWithProviders(
//       <LoginScreen onLogin={mockOnLogin} onError={mockOnError} />
//     );

//     const submitButton = screen.getByRole("button", { name: /sign in/i });
//     fireEvent.click(submitButton);

//     // Should not proceed without valid inputs
//     expect(mockOnLogin).not.toHaveBeenCalled();
//   });
// });
