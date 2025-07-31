import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { handlers } from "../../test/mswHandlers";
import apiClient from "../apiClient";

const server = setupServer(...handlers);

describe("apiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.resetHandlers();
    localStorage.clear();
  });

  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  describe("authentication", () => {
    it("should set and get tokens", () => {
      const accessToken = "test-access-token";
      const refreshToken = "test-refresh-token";

      apiClient.setTokens(accessToken, refreshToken);

      expect(localStorage.getItem("access_token")).toBe(accessToken);
      expect(localStorage.getItem("refresh_token")).toBe(refreshToken);
    });

    it("should clear tokens", () => {
      // First set tokens
      apiClient.setTokens("test-access", "test-refresh");

      // Clear tokens
      apiClient.clearTokens();

      expect(localStorage.getItem("access_token")).toBeNull();
      expect(localStorage.getItem("refresh_token")).toBeNull();
    });
  });

  describe("API calls", () => {
    beforeEach(() => {
      // Mock isTokenExpired to always return false for tests
      vi.spyOn(apiClient as any, "isTokenExpired").mockReturnValue(false);
      apiClient.setTokens("test-access-token", "test-refresh-token");
    });

    it("should get current user", async () => {
      const response = await apiClient.getCurrentUser();
      expect(response.data.data.user).toBeDefined();
      expect(response.data.data.user.email).toBe("test@example.com");
    });

    it("should login user", async () => {
      const credentials = {
        email: "test@example.com",
        password: "password123",
      };

      const response = await apiClient.login(credentials);
      expect(response.data.data.user).toBeDefined();
      expect(response.data.data.access_token).toBeDefined();
    });

    it("should update user profile", async () => {
      const updateData = {
        name: "Updated Name",
        preferences: { theme: "dark" },
      };

      const response = await apiClient.updateUserProfile(updateData);
      expect(response.data.data.user).toBeDefined();
    });

    it("should get shopping lists", async () => {
      const response = await apiClient.getShoppingLists();
      expect(response.data.data.lists).toBeDefined();
      expect(Array.isArray(response.data.data.lists)).toBe(true);
    });

    it("should create shopping list", async () => {
      const listData = {
        name: "Test List",
        description: "Test Description",
        color: "#2e7d32",
      };

      const response = await apiClient.createShoppingList(listData);
      expect(response.data.data.list).toBeDefined();
    });

    it("should handle API errors", async () => {
      // Mock an error response
      server.use(
        http.get("https://shop-list-api.the-cube-lab.com/api/auth/me", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      await expect(apiClient.getCurrentUser()).rejects.toThrow();
    });
  });
});
