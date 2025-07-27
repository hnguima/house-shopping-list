/**
 * Secure API client for authenticated requests
 * Handles JWT tokens, automatic logout on expiration, and consistent error handling
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
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
  private getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Get stored refresh token
   */
  private getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Store authentication tokens
   */
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Store access token (for token refresh)
   */
  setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  /**
   * Clear all stored tokens (logout)
   */
  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
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
    this.clearTokens();
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
    const accessToken = this.getAccessToken();

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
        return this.getAccessToken();
      } else {
        console.warn("[ApiClient] Token refresh failed, clearing tokens");
        this.clearTokens();
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
      const refreshToken = this.getRefreshToken();

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
        this.setAccessToken(data.access_token);
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
      this.clearTokens();
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

  async logout() {
    try {
      await this.post("/api/auth/logout");
    } finally {
      // Always clear tokens locally, even if logout request fails
      this.clearTokens();
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
  hasValidSession(): boolean {
    return !!this.getAccessToken() && !!this.getRefreshToken();
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
    const response = await this.put("/api/user/profile", profileData);
    return response.data.user;
  }

  async uploadProfilePhoto(base64Data: string) {
    return this.uploadBase64Image("/api/user/upload-photo", base64Data);
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
