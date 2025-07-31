import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";
import type { URLOpenListenerEvent } from "@capacitor/app";
import apiClient from "./apiClient";

const API_BASE_URL = "https://shop-list-api.the-cube-lab.com";

export interface AuthResult {
  success: boolean;
  user?: {
    username: string;
    email: string;
    name: string;
    provider: string;
    photo?: string;
  };
  error?: string;
}

export const isNativeMobile = () => {
  return Capacitor.isNativePlatform();
};

export const testConnectivity = async (): Promise<boolean> => {
  try {
    console.log("Testing API connectivity...");
    const response = await CapacitorHttp.get({
      url: `${API_BASE_URL}/health`,
      headers: {
        Accept: "application/json",
      },
    });

    console.log("Health check response:", response.status, response.data);
    return response.status === 200;
  } catch (error) {
    console.error("Connectivity test failed:", error);
    return false;
  }
};

export const handleOAuthLogin = async (): Promise<AuthResult> => {
  // First test basic connectivity on mobile
  if (isNativeMobile()) {
    const canConnect = await testConnectivity();
    if (!canConnect) {
      console.error("Cannot connect to API server");
      return {
        success: false,
        error:
          "Cannot connect to server. Please check your internet connection.",
      };
    }
    return handleMobileOAuth();
  } else {
    return handleWebOAuth();
  }
};

const handleWebOAuth = async (): Promise<AuthResult> => {
  try {
    // Get current port dynamically for the callback URL
    const currentPort =
      window.location.port ||
      (window.location.protocol === "https:" ? "443" : "80");
    const currentHost = window.location.hostname;
    const webRedirectUrl = `http://${currentHost}:${currentPort}`;

    console.log(`[handleWebOAuth] Using redirect URL: ${webRedirectUrl}`);

    const response = await CapacitorHttp.get({
      url: `${API_BASE_URL}/api/auth/google/url?target_redirect=web&web_redirect_url=${encodeURIComponent(
        webRedirectUrl
      )}`,
      headers: {
        Accept: "application/json",
      },
    });

    console.log(`[handleWebOAuth] OAuth URL response:`, response);

    if (response.status !== 200) {
      throw new Error(
        `HTTP ${response.status}: ${response.data?.error || "Unknown error"}`
      );
    }

    const { auth_url } = response.data;
    console.log(`[handleWebOAuth] Opening OAuth URL: ${auth_url}`);

    if (!auth_url) {
      throw new Error("No OAuth URL received from server");
    }

    // Open OAuth in a popup window
    return new Promise<AuthResult>((resolve, reject) => {
      const popup = window.open(
        auth_url,
        "oauth",
        "width=500,height=600,scrollbars=yes,resizable=yes"
      );

      if (!popup) {
        reject(
          new Error(
            "Failed to open popup window. Please allow popups for this site."
          )
        );
        return;
      }

      console.log(`[handleWebOAuth] Popup opened successfully`);

      // Listen for messages from the popup
      const messageHandler = async (event: MessageEvent) => {
        console.log(`[handleWebOAuth] Received message:`, event);

        // For debugging - allow any origin during development
        // In production, you should check: event.origin !== window.location.origin

        if (event.data.type === "OAUTH_SUCCESS") {
          console.log(`[handleWebOAuth] OAuth success message received`);
          window.removeEventListener("message", messageHandler);
          popup.close();

          // Set tokens in API client
          if (event.data.access_token && event.data.refresh_token) {
            await apiClient.setTokens(
              event.data.access_token,
              event.data.refresh_token
            );
            console.log("[handleWebOAuth] Tokens set in API client from popup");
          }

          let userData;
          try {
            userData = JSON.parse(event.data.user || "{}");
            // Ensure required fields are present
            if (
              !userData.username ||
              !userData.email ||
              !userData.name ||
              !userData.provider
            ) {
              throw new Error("Invalid user data structure received");
            }
          } catch (parseError) {
            console.error(
              "[handleWebOAuth] Failed to parse user data:",
              parseError
            );
            reject(new Error("Invalid user data received from OAuth"));
            return;
          }

          resolve({
            success: true,
            user: userData,
          });
        } else if (event.data.type === "OAUTH_ERROR") {
          console.log(
            `[handleWebOAuth] OAuth error message received:`,
            event.data.error
          );
          window.removeEventListener("message", messageHandler);
          popup.close();
          reject(new Error(event.data.error || "OAuth failed"));
        }
      };

      window.addEventListener("message", messageHandler);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          console.log(`[handleWebOAuth] Popup was closed manually`);
          clearInterval(checkClosed);
          window.removeEventListener("message", messageHandler);
          reject(new Error("OAuth was cancelled"));
        }
      }, 1000);

      // Add a timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.log(`[handleWebOAuth] OAuth timeout reached`);
        clearInterval(checkClosed);
        window.removeEventListener("message", messageHandler);
        if (!popup.closed) {
          popup.close();
        }
        reject(new Error("OAuth timeout - please try again"));
      }, 300000); // 5 minute timeout

      // Clean up timeout if popup closes naturally
      const originalClose = popup.close;
      popup.close = function () {
        clearTimeout(timeout);
        return originalClose.call(this);
      };
    });
  } catch (error: any) {
    console.error("Web OAuth error:", error);
    throw new Error(
      error.message || "Failed to initiate login. Please try again."
    );
  }
};

const handleMobileOAuth = async (): Promise<AuthResult> => {
  return new Promise((resolve) => {
    const handleAuth = async () => {
      try {
        console.log("Starting mobile OAuth flow...");
        console.log("Platform:", Capacitor.getPlatform());
        console.log("Native platform:", Capacitor.isNativePlatform());

        // Mobile OAuth flow - use the new /google/url endpoint with target_redirect parameter
        const url = `${API_BASE_URL}/api/auth/google/url?target_redirect=mobile`;
        console.log("Fetching URL:", url);

        // Use CapacitorHttp for better mobile compatibility
        const response = await CapacitorHttp.get({
          url: url,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });

        console.log("Response status:", response.status);

        if (response.status !== 200) {
          console.error(
            "Failed to fetch OAuth URL:",
            response.status,
            response.data
          );
          resolve({
            success: false,
            error: `Server error: ${response.status} - ${response.data}`,
          });
          return;
        }

        const data = response.data;
        console.log("OAuth URL response:", data);

        if (!data.auth_url) {
          console.error("No auth_url in response:", data);
          resolve({
            success: false,
            error: data.error || "Failed to get OAuth URL",
          });
          return;
        }

        console.log("Setting up deep link listener...");

        // Set up deep link listener for the callback
        const listener = await App.addListener(
          "appUrlOpen",
          async (event: URLOpenListenerEvent) => {
            console.log("Deep link received:", event.url);

            if (event.url.startsWith("com.houseshoppinglist://auth/callback")) {
              // Parse the callback URL
              const url = new URL(event.url);
              const params = new URLSearchParams(url.search);

              console.log(
                "Callback params:",
                Object.fromEntries(params.entries())
              );

              if (params.get("success") === "true") {
                console.log("OAuth success, resolving with user data");

                // Extract and store tokens
                const accessToken = params.get("access_token");
                const refreshToken = params.get("refresh_token");

                if (accessToken && refreshToken) {
                  console.log("Storing tokens from deep link callback");
                  await apiClient.setTokens(accessToken, refreshToken);
                  console.log("Tokens stored successfully");
                } else {
                  console.warn("Missing tokens in callback URL");
                }

                resolve({
                  success: true,
                  user: {
                    username: params.get("username") || "",
                    email: params.get("email") || "",
                    name: params.get("name") || "",
                    provider: params.get("provider") || "google",
                    photo: params.get("photo") || undefined,
                  },
                });
              } else {
                console.log("OAuth failed:", params.get("error"));
                resolve({
                  success: false,
                  error: params.get("error") || "Authentication failed",
                });
              }

              // Clean up listener
              listener.remove();
              Browser.close();
            }
          }
        );

        console.log("Opening OAuth URL in browser:", data.auth_url);

        // Open the OAuth URL in the system browser
        await Browser.open({
          url: data.auth_url,
          presentationStyle: "popover",
        });

        console.log("Browser opened successfully");
      } catch (error) {
        console.error("Mobile OAuth error:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        resolve({
          success: false,
          error: `Failed to initiate mobile login: ${errorMessage}`,
        });
      }
    };

    handleAuth();
  });
};
