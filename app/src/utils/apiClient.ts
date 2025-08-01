/**
 * Secure API client for authenticated requests
 * Handles JWT tokens, automatic logout on expiration, and consistent error handling
 */

console.log("[ApiClient] Module loading...");

import { Preferences } from "@capacitor/preferences";

// Build API URL from environment variables
const getApiBaseUrl = (): string => {
  console.log("[ApiClient] Building API URL...");
  console.log("[ApiClient] VITE_API_URL:", import.meta.env.VITE_API_URL);
  console.log(
    "[ApiClient] VITE_TUNNEL_DOMAIN:",
    import.meta.env.VITE_TUNNEL_DOMAIN
  );
  console.log(
    "[ApiClient] VITE_API_SUBDOMAIN:",
    import.meta.env.VITE_API_SUBDOMAIN
  );

  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    console.log(
      "[ApiClient] Using explicit VITE_API_URL:",
      import.meta.env.VITE_API_URL
    );
    return import.meta.env.VITE_API_URL;
  }

  // If tunnel configuration is provided, build URL from subdomain and domain
  if (
    import.meta.env.VITE_TUNNEL_DOMAIN &&
    import.meta.env.VITE_API_SUBDOMAIN
  ) {
    const tunnelUrl = `https://${import.meta.env.VITE_API_SUBDOMAIN}.${
      import.meta.env.VITE_TUNNEL_DOMAIN
    }`;
    console.log("[ApiClient] Using tunnel URL:", tunnelUrl);
    return tunnelUrl;
  }

  // Default to localhost for development
  const localUrl = "http://localhost:5000";
  console.log("[ApiClient] Using localhost for development:", localUrl);
  return localUrl;
};

const API_BASE_URL = getApiBaseUrl();

// Debug logging for API URL configuration
console.log("[ApiClient] Configuration:", {
  API_BASE_URL,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_TUNNEL_DOMAIN: import.meta.env.VITE_TUNNEL_DOMAIN,
  VITE_API_SUBDOMAIN: import.meta.env.VITE_API_SUBDOMAIN,
});
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

interface ApiResponse<T = any> {
  data: T;
  status: number;
  ok: boolean;
}

// Custom error class for API errors
class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

class ApiClient {
  private static instance: ApiClient;

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Get stored access token
   */
  private async getAccessToken(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: ACCESS_TOKEN_KEY });
      return value;
    } catch (error) {
      console.error("[ApiClient] Error getting access token:", error);
      return null;
    }
  }

  /**
   * Get stored refresh token
   */
  private async getRefreshToken(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
      return value;
    } catch (error) {
      console.error("[ApiClient] Error getting refresh token:", error);
      return null;
    }
  }

  /**
   * Store authentication tokens
   */
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await Promise.all([
        Preferences.set({ key: ACCESS_TOKEN_KEY, value: accessToken }),
        Preferences.set({ key: REFRESH_TOKEN_KEY, value: refreshToken }),
      ]);
    } catch (error) {
      console.error("[ApiClient] Error setting tokens:", error);
    }
  }

  /**
   * Store access token (for token refresh)
   */
  async setAccessToken(token: string): Promise<void> {
    try {
      await Preferences.set({ key: ACCESS_TOKEN_KEY, value: token });
    } catch (error) {
      console.error("[ApiClient] Error setting access token:", error);
    }
  }

  /**
   * Clear all stored tokens (logout)
   */
  async clearTokens(): Promise<void> {
    try {
      await Promise.all([
        Preferences.remove({ key: ACCESS_TOKEN_KEY }),
        Preferences.remove({ key: REFRESH_TOKEN_KEY }),
      ]);
    } catch (error) {
      console.error("[ApiClient] Error clearing tokens:", error);
    }
  }

  /**
   * Backward compatibility - use access token
   */
  setToken(token: string): void {
    this.setAccessToken(token);
  }

  /**
   * Backward compatibility - clear all tokens
   */
  clearToken(): void {
    this.clearTokens().catch((error) => {
      console.error("[ApiClient] Error clearing tokens:", error);
    });
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  /**
   * Get valid access token, refresh if needed
   */
  private async getValidToken(): Promise<string | null> {
    const accessToken = await this.getAccessToken();

    if (!accessToken) {
      console.warn("[ApiClient] No access token found");
      return null;
    }

    // Check if access token is expired
    if (this.isTokenExpired(accessToken)) {
      console.warn("[ApiClient] Access token expired, attempting refresh");

      // Try to refresh the token
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        return await this.getAccessToken();
      } else {
        console.warn("[ApiClient] Token refresh failed, clearing tokens");
        await this.clearTokens();
        if (this.onTokenExpired) {
          this.onTokenExpired();
        }
        return null;
      }
    }

    return accessToken;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = await this.getRefreshToken();

      if (!refreshToken) {
        console.warn("[ApiClient] No refresh token available");
        return false;
      }

      if (this.isTokenExpired(refreshToken)) {
        console.warn("[ApiClient] Refresh token expired");
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        await this.setAccessToken(data.access_token);
        console.log("[ApiClient] Access token refreshed successfully");
        return true;
      } else {
        console.warn("[ApiClient] Token refresh failed:", response.status);
        return false;
      }
    } catch (error) {
      console.error("[ApiClient] Token refresh error:", error);
      return false;
    }
  }

  /**
   * Callback for when token expires (set by app)
   */
  onTokenExpired?: () => void;

  /**
   * Handle authentication errors and trigger logout
   */
  private handleAuthError(response: Response, errorMessage: string): void {
    const isAuthError =
      response.status === 401 ||
      errorMessage.toLowerCase().includes("authorization") ||
      errorMessage.toLowerCase().includes("token") ||
      errorMessage.toLowerCase().includes("unauthorized");

    if (isAuthError) {
      console.warn("[ApiClient] Authentication error detected:", errorMessage);
      this.clearTokens().catch((error) => {
        console.error(
          "[ApiClient] Error clearing tokens on auth error:",
          error
        );
      });
      if (this.onTokenExpired) {
        // Use setTimeout to avoid blocking the current execution
        setTimeout(() => {
          if (this.onTokenExpired) {
            this.onTokenExpired();
          }
        }, 0);
      }
    }
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const fullUrl = `${API_BASE_URL}${url}`;

    // Set up headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Add authorization header if token exists
    const token = await this.getValidToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });

      let data;
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        // Extract error message
        const errorMessage =
          data?.message || `HTTP ${response.status}: ${response.statusText}`;

        // Handle authentication errors
        this.handleAuthError(response, errorMessage);

        throw new ApiError(errorMessage, response.status);
      }

      return {
        data,
        status: response.status,
        ok: response.ok,
      };
    } catch (error) {
      console.error("[ApiClient] Request failed:", error);

      if (error instanceof ApiError) {
        throw error;
      }

      // Network or other errors
      throw new ApiError(
        error instanceof Error ? error.message : "Network error",
        0
      );
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: "GET" });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: "DELETE" });
  }

  /**
   * Upload file (multipart/form-data)
   */
  async uploadFile<T = any>(
    endpoint: string,
    file: File,
    fieldName: string = "file"
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append(fieldName, file);

    const token = await this.getValidToken();
    const headers: HeadersInit = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return this.makeRequest<T>(endpoint, {
      method: "POST",
      headers,
      body: formData,
    });
  }

  /**
   * Upload base64 image
   */
  async uploadBase64Image<T = any>(
    endpoint: string,
    base64Data: string
  ): Promise<ApiResponse<T>> {
    return this.post<T>(endpoint, { photo: base64Data });
  }

  // Authentication endpoints
  async login(credentials: { email: string; password: string }) {
    return this.post("/api/auth/login", credentials);
  }

  async register(userData: {
    email: string;
    password: string;
    username: string;
    name: string;
  }) {
    return this.post("/api/auth/register", userData);
  }

  async getCurrentUser() {
    return this.get("/api/auth/me");
  }

  // Lightweight timestamp check methods for sync optimization
  async getUserTimestamp() {
    return this.get("/api/user/sync-check");
  }

  async getShoppingListsTimestamps(
    includeArchived = false,
    homeId?: string,
    status?: "active" | "completed" | "archived" | "deleted" | "all"
  ) {
    const params = new URLSearchParams();
    if (includeArchived) params.append("include_archived", "true");
    if (homeId) params.append("home_id", homeId);
    if (status && status !== "all") params.append("status", status);
    else if (!includeArchived && !status) params.append("status", "active"); // Default to active only
    const queryString = params.toString();
    const endpoint = queryString
      ? `/api/shopping/sync-check?${queryString}`
      : "/api/shopping/sync-check";
    return this.get(endpoint);
  }

  async getShoppingListTimestamp(listId: string) {
    return this.get(`/api/shopping/lists/${listId}/timestamp`);
  }

  async logout() {
    try {
      await this.post("/api/auth/logout");
    } finally {
      // Always clear tokens locally, even if logout request fails
      await this.clearTokens();
    }
  }

  // New authentication methods for session management
  async refreshToken() {
    return this.refreshAccessToken();
  }

  async getUserSessions() {
    return this.get("/api/auth/sessions");
  }

  async invalidateSession(sessionId: string) {
    return this.delete(`/api/auth/sessions/${sessionId}`);
  }

  async invalidateAllSessions() {
    return this.delete("/api/auth/sessions/all");
  }

  // Session management
  async hasValidSession(): Promise<boolean> {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.getAccessToken(),
        this.getRefreshToken(),
      ]);
      return !!accessToken && !!refreshToken;
    } catch (error) {
      console.error("[ApiClient] Error checking session validity:", error);
      return false;
    }
  }

  // User endpoints
  async getUserProfile(): Promise<any> {
    const response = await this.get("/api/user/profile");
    return response.data.user;
  }

  async checkSyncStatus(): Promise<{ updatedAt: number; userId: string }> {
    const response = await this.get("/api/user/sync-check");
    return response.data;
  }

  async updateUserProfile(profileData: any): Promise<any> {
    return this.put("/api/user/profile", profileData);
  }

  async uploadProfilePhoto(base64Data: string) {
    return this.uploadBase64Image("/api/user/upload-photo", base64Data);
  }

  // Shopping Lists API
  async getShoppingLists(
    includeArchived = false,
    homeId?: string,
    status?: "active" | "completed" | "archived" | "deleted" | "all"
  ) {
    const params = new URLSearchParams();
    if (includeArchived) params.append("include_archived", "true");
    if (homeId) params.append("home_id", homeId);
    if (status && status !== "all") params.append("status", status);
    else if (!includeArchived && !status) params.append("status", "active"); // Default to active only
    const queryString = params.toString();
    const endpoint = queryString
      ? `/api/shopping/lists?${queryString}`
      : "/api/shopping/lists";
    return this.get(endpoint);
  }

  async createShoppingList(data: {
    _id?: string;
    name: string;
    description?: string;
    color?: string;
    status?: "active" | "completed" | "archived" | "deleted";
    items?: any[]; // Accept items array
    home_id?: string; // Optional home assignment
  }) {
    return this.post("/api/shopping/lists", data);
  }

  async getShoppingList(listId: string) {
    return this.get(`/api/shopping/lists/${listId}`);
  }

  async updateShoppingList(
    listId: string,
    data: {
      name?: string;
      description?: string;
      archived?: boolean;
      status?: "active" | "completed" | "archived" | "deleted";
      items?: any[]; // Accept items array
      home_id?: string;
    }
  ) {
    return this.put(`/api/shopping/lists/${listId}`, data);
  }

  async completeShoppingList(listId: string) {
    return this.post(`/api/shopping/lists/${listId}/complete`);
  }

  async deleteShoppingList(listId: string) {
    return this.delete(`/api/shopping/lists/${listId}`);
  }

  async archiveShoppingList(listId: string) {
    return this.post(`/api/shopping/lists/${listId}/archive`);
  }

  async unarchiveShoppingList(listId: string) {
    return this.post(`/api/shopping/lists/${listId}/unarchive`);
  }

  // Shopping Items API
  async addItemToList(
    listId: string,
    data: { name: string; quantity?: number; category?: string; notes?: string }
  ) {
    return this.post(`/api/shopping/lists/${listId}/items`, data);
  }

  async updateItemInList(
    listId: string,
    itemId: string,
    data: {
      name?: string;
      quantity?: number;
      category?: string;
      notes?: string;
      completed?: boolean;
    }
  ) {
    return this.put(`/api/shopping/lists/${listId}/items/${itemId}`, data);
  }

  async removeItemFromList(listId: string, itemId: string) {
    return this.delete(`/api/shopping/lists/${listId}/items/${itemId}`);
  }

  // Statistics API
  async getShoppingStats() {
    return this.get("/api/shopping/stats");
  }

  // Homes API
  async getHomes() {
    return this.get("/api/homes");
  }

  async createHome(data: { name: string; description?: string }) {
    return this.post("/api/homes", data);
  }

  async getHome(homeId: string) {
    return this.get(`/api/homes/${homeId}`);
  }

  async updateHome(
    homeId: string,
    data: { name?: string; description?: string }
  ) {
    return this.put(`/api/homes/${homeId}`, data);
  }

  async deleteHome(homeId: string) {
    return this.delete(`/api/homes/${homeId}`);
  }

  async leaveHome(homeId: string) {
    return this.post(`/api/homes/${homeId}/leave`);
  }

  async inviteUserToHome(
    homeId: string,
    data: { email: string; message?: string }
  ) {
    return this.post(`/api/homes/${homeId}/invite`, data);
  }

  async requestJoinHome(homeId: string, data: { message?: string }) {
    return this.post(`/api/homes/${homeId}/request-join`, data);
  }

  async getHomeMembers(homeId: string) {
    return this.get(`/api/homes/${homeId}/members`);
  }

  async removeMemberFromHome(homeId: string, memberId: string) {
    return this.delete(`/api/homes/${homeId}/members/${memberId}`);
  }

  // Home Invitations API
  async getInvitations() {
    return this.get("/api/homes/invitations");
  }

  async respondToInvitation(invitationId: string, action: "accept" | "reject") {
    return this.put(`/api/homes/invitations/${invitationId}/respond`, {
      action,
    });
  }

  async respondToJoinRequest(requestId: string, action: "accept" | "reject") {
    return this.put(`/api/homes/requests/${requestId}/respond`, {
      action,
    });
  }

  async getPendingRequests() {
    return this.get("/api/homes/pending-requests");
  }

  // Health check
  async healthCheck() {
    return this.get("/health");
  }
}

// Create singleton instance
const apiClient = ApiClient.getInstance();

export default apiClient;
export { ApiError };
export type { ApiResponse };
