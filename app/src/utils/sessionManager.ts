/**
 * Frontend session management
 * Handles user authentication state, token refresh, and session monitoring
 */

import apiClient from "./apiClient";

export interface UserSession {
  id: string;
  device_info: {
    user_agent: string;
    ip_address: string;
    accept_language: string;
    accept_encoding: string;
  };
  created_at: string;
  last_activity: string;
  is_current: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  session_id?: string;
}

export class SessionManager {
  private static refreshInProgress = false;
  private static refreshPromise: Promise<boolean> | null = null;

  /**
   * Handle login response and store tokens
   */
  static handleLoginResponse(response: any): boolean {
    try {
      const { access_token, refresh_token, session_id } = response;

      if (!access_token || !refresh_token) {
        console.error(
          "[SessionManager] Invalid login response: missing tokens"
        );
        return false;
      }

      // Store tokens
      apiClient.setTokens(access_token, refresh_token, session_id);

      console.log("[SessionManager] Login tokens stored successfully");
      return true;
    } catch (error) {
      console.error("[SessionManager] Error handling login response:", error);
      return false;
    }
  }

  /**
   * Check if user has valid session
   */
  static hasValidSession(): boolean {
    return apiClient.hasValidSession();
  }

  /**
   * Logout and cleanup session
   */
  static async logout(): Promise<boolean> {
    try {
      await apiClient.logout();
      console.log("[SessionManager] Logout successful");
      return true;
    } catch (error) {
      console.error("[SessionManager] Logout error:", error);
      // Still return true since tokens are cleared locally
      return true;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshInProgress) {
      return this.refreshPromise || Promise.resolve(false);
    }

    this.refreshInProgress = true;
    this.refreshPromise = this._performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshInProgress = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Internal token refresh implementation
   */
  private static async _performTokenRefresh(): Promise<boolean> {
    try {
      const result = await apiClient.refreshToken();
      if (result) {
        console.log("[SessionManager] Token refresh successful");
        return true;
      } else {
        console.warn("[SessionManager] Token refresh failed");
        this.handleExpiredSession();
        return false;
      }
    } catch (error) {
      console.error("[SessionManager] Token refresh error:", error);
      this.handleExpiredSession();
      return false;
    }
  }

  /**
   * Handle expired session
   */
  static handleExpiredSession(): void {
    console.log("[SessionManager] Session expired, cleaning up");
    apiClient.clearTokens();

    // Notify app about session expiration
    window.dispatchEvent(new CustomEvent("sessionExpired"));
  }

  /**
   * Get all user sessions
   */
  static async getUserSessions(): Promise<UserSession[]> {
    try {
      const response = await apiClient.getUserSessions();
      return response.data.sessions || [];
    } catch (error) {
      console.error("[SessionManager] Error getting user sessions:", error);
      return [];
    }
  }

  /**
   * Invalidate a specific session
   */
  static async invalidateSession(sessionId: string): Promise<boolean> {
    try {
      await apiClient.invalidateSession(sessionId);
      console.log(`[SessionManager] Session ${sessionId} invalidated`);
      return true;
    } catch (error) {
      console.error("[SessionManager] Error invalidating session:", error);
      return false;
    }
  }

  /**
   * Invalidate all other sessions (except current)
   */
  static async invalidateAllOtherSessions(): Promise<{
    success: boolean;
    count?: number;
  }> {
    try {
      const response = await apiClient.invalidateAllSessions();
      const count = response.data.invalidated_count || 0;
      console.log(`[SessionManager] Invalidated ${count} other sessions`);
      return { success: true, count };
    } catch (error) {
      console.error("[SessionManager] Error invalidating sessions:", error);
      return { success: false };
    }
  }

  /**
   * Initialize session monitoring
   */
  static initializeSessionMonitoring(): void {
    // Set up token expiration callback
    apiClient.onTokenExpired = () => {
      this.handleExpiredSession();
    };

    // Listen for session expiration events
    window.addEventListener("sessionExpired", () => {
      // Redirect to login or show notification
      console.log("[SessionManager] Session expired event received");
    });

    // Optional: Set up periodic session validation
    this.startSessionValidation();
  }

  /**
   * Start periodic session validation
   */
  private static startSessionValidation(): void {
    // Check session validity every 5 minutes
    setInterval(async () => {
      if (this.hasValidSession()) {
        try {
          // Make a light API call to verify session is still valid
          await apiClient.getCurrentUser();
        } catch (error) {
          // If current user request fails, session might be invalid
          console.warn("[SessionManager] Session validation failed:", error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Get current session info
   */
  static getSessionInfo(): {
    hasSession: boolean;
    sessionId: string | null;
  } {
    return {
      hasSession: this.hasValidSession(),
      sessionId: apiClient.getSessionId(),
    };
  }
}

// Initialize session management
SessionManager.initializeSessionMonitoring();
