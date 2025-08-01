import apiClient from "../apiClient";
import type { Home, HomeInvitation } from "../../types/home";

export interface CachedHomeData {
  homes: Home[];
  invitations: HomeInvitation[];
  timestamp: number;
}

interface HomeCache {
  homes: Home[];
  invitations: HomeInvitation[];
  lastFetch: number;
  pendingChanges: any[];
}

const CACHE_KEY = "homes_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class HomeCacheManagerClass {
  private cache: HomeCache | null = null;
  private cachePromise: Promise<HomeCache> | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        this.cache = JSON.parse(stored);
        console.log(
          "[HomeCacheManager] Loaded cache from localStorage:",
          this.cache
        );
      }
    } catch (error) {
      console.error(
        "[HomeCacheManager] Error loading cache from localStorage:",
        error
      );
      this.cache = null;
    }
  }

  private saveToStorage(): void {
    try {
      if (this.cache) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));
        console.log("[HomeCacheManager] Saved cache to localStorage");
      }
    } catch (error) {
      console.error(
        "[HomeCacheManager] Error saving cache to localStorage:",
        error
      );
    }
  }

  private isCacheValid(): boolean {
    return !!(this.cache && Date.now() - this.cache.lastFetch < CACHE_DURATION);
  }

  private createEmptyCache(): HomeCache {
    return {
      homes: [],
      invitations: [],
      lastFetch: 0,
      pendingChanges: [],
    };
  }

  async getHomes(): Promise<Home[]> {
    console.log("[HomeCacheManager] getHomes() called");
    const cache = await this.ensureCache();
    return cache.homes;
  }

  async getInvitations(): Promise<HomeInvitation[]> {
    console.log("[HomeCacheManager] getInvitations() called");
    const cache = await this.ensureCache();
    return cache.invitations;
  }

  private async ensureCache(): Promise<HomeCache> {
    // Return existing promise if already fetching
    if (this.cachePromise) {
      return this.cachePromise;
    }

    // Return cache if valid
    if (this.isCacheValid()) {
      return this.cache!;
    }

    // Create new fetch promise
    this.cachePromise = this.fetchFromServer();

    try {
      const result = await this.cachePromise;
      this.cachePromise = null;
      return result;
    } catch (error) {
      this.cachePromise = null;
      throw error;
    }
  }

  private async fetchFromServer(): Promise<HomeCache> {
    console.log("[HomeCacheManager] Fetching homes from server...");

    try {
      console.log("[HomeCacheManager] Making API calls...");
      const [homesResponse, invitationsResponse] = await Promise.all([
        apiClient.getHomes(),
        apiClient.getInvitations(),
      ]);

      console.log("[HomeCacheManager] Got responses:", {
        homesResponse,
        invitationsResponse,
      });

      const homes = homesResponse?.data?.homes || [];
      const invitations = invitationsResponse?.data?.invitations || [];

      console.log("[HomeCacheManager] Parsed data:", {
        homes: homes.length,
        invitations: invitations.length,
      });

      this.cache = {
        homes,
        invitations,
        lastFetch: Date.now(),
        pendingChanges: this.cache?.pendingChanges || [],
      };

      this.saveToStorage();
      console.log(
        "[HomeCacheManager] Successfully fetched and cached homes:",
        homes.length
      );

      return this.cache;
    } catch (error) {
      console.error(
        "[HomeCacheManager] Error fetching homes from server:",
        error
      );

      // Return existing cache if available, otherwise empty cache
      if (this.cache) {
        console.log(
          "[HomeCacheManager] Using existing cache due to fetch error"
        );
        return this.cache;
      } else {
        console.log(
          "[HomeCacheManager] Creating empty cache due to fetch error"
        );
        this.cache = this.createEmptyCache();
        return this.cache;
      }
    }
  }

  async createHome(homeData: {
    name: string;
    description?: string;
  }): Promise<Home | null> {
    try {
      console.log("[HomeCacheManager] Creating home:", homeData);
      const response = await apiClient.createHome(homeData);

      if (response?.data?.home) {
        const newHome = response.data.home;

        // Update cache
        if (this.cache) {
          this.cache.homes = [...this.cache.homes, newHome];
          this.saveToStorage();
        }

        console.log("[HomeCacheManager] Successfully created home:", newHome);
        return newHome;
      }

      return null;
    } catch (error) {
      console.error("[HomeCacheManager] Error creating home:", error);
      return null;
    }
  }

  async leaveHome(homeId: string): Promise<boolean> {
    try {
      console.log("[HomeCacheManager] Leaving home:", homeId);
      await apiClient.leaveHome(homeId);

      // Update cache
      if (this.cache) {
        this.cache.homes = this.cache.homes.filter(
          (home) => home._id !== homeId
        );
        this.saveToStorage();
      }

      console.log("[HomeCacheManager] Successfully left home:", homeId);
      return true;
    } catch (error) {
      console.error("[HomeCacheManager] Error leaving home:", error);
      return false;
    }
  }

  async updateHome(
    homeId: string,
    homeData: { name: string; description?: string }
  ): Promise<boolean> {
    try {
      console.log("[HomeCacheManager] Updating home:", homeId, homeData);
      const response = await apiClient.updateHome(homeId, homeData);

      if (response?.data?.home && this.cache) {
        const updatedHome = response.data.home;
        // Update cache
        const homeIndex = this.cache.homes.findIndex((h) => h._id === homeId);
        if (homeIndex !== -1) {
          this.cache.homes[homeIndex] = updatedHome;
          this.saveToStorage();
        }
      }

      console.log("[HomeCacheManager] Successfully updated home:", homeId);
      return true;
    } catch (error) {
      console.error("[HomeCacheManager] Error updating home:", error);
      return false;
    }
  }

  async deleteHome(homeId: string): Promise<boolean> {
    try {
      console.log("[HomeCacheManager] Deleting home:", homeId);
      await apiClient.deleteHome(homeId);

      // Update cache
      if (this.cache) {
        this.cache.homes = this.cache.homes.filter(
          (home) => home._id !== homeId
        );
        this.saveToStorage();
      }

      console.log("[HomeCacheManager] Successfully deleted home:", homeId);
      return true;
    } catch (error) {
      console.error("[HomeCacheManager] Error deleting home:", error);
      return false;
    }
  }

  async inviteToHome(
    homeId: string,
    inviteData: { email: string; message?: string }
  ): Promise<boolean> {
    try {
      console.log("[HomeCacheManager] Inviting to home:", homeId, inviteData);
      await apiClient.inviteUserToHome(homeId, inviteData);

      // Refresh invitations
      await this.refreshInvitations();

      console.log("[HomeCacheManager] Successfully sent invitation");
      return true;
    } catch (error) {
      console.error("[HomeCacheManager] Error inviting to home:", error);
      return false;
    }
  }

  async requestJoinHome(homeId: string, message?: string): Promise<boolean> {
    try {
      console.log(
        "[HomeCacheManager] Requesting to join home:",
        homeId,
        message
      );
      await apiClient.requestJoinHome(homeId, { message });

      // Refresh invitations to show the new request
      await this.refreshInvitations();

      console.log("[HomeCacheManager] Successfully sent join request");
      return true;
    } catch (error) {
      console.error("[HomeCacheManager] Error requesting to join home:", error);
      return false;
    }
  }

  async respondToInvitation(
    invitationId: string,
    accept: boolean
  ): Promise<boolean> {
    try {
      console.log(
        "[HomeCacheManager] Responding to invitation:",
        invitationId,
        accept
      );

      // Find the invitation to determine its type
      const invitation = this.cache?.invitations.find(
        (inv) => inv._id === invitationId
      );
      if (!invitation) {
        console.error("[HomeCacheManager] Invitation not found in cache");
        return false;
      }

      // Use the correct endpoint based on invitation type
      if (invitation.type === "request") {
        // This is a join request, use the requests endpoint
        await apiClient.respondToJoinRequest(
          invitationId,
          accept ? "accept" : "reject"
        );
      } else {
        // This is a regular invitation, use the invitations endpoint
        await apiClient.respondToInvitation(
          invitationId,
          accept ? "accept" : "reject"
        );
      }

      // Update cache
      if (this.cache) {
        this.cache.invitations = this.cache.invitations.filter(
          (inv) => inv._id !== invitationId
        );

        // If accepted, refresh homes to get the new one
        if (accept) {
          await this.invalidateCache();
          await this.ensureCache();
        } else {
          this.saveToStorage();
        }
      }

      console.log("[HomeCacheManager] Successfully responded to invitation");
      return true;
    } catch (error) {
      console.error(
        "[HomeCacheManager] Error responding to invitation:",
        error
      );
      return false;
    }
  }

  private async refreshInvitations(): Promise<void> {
    try {
      console.log("[HomeCacheManager] Refreshing invitations...");
      const response = await apiClient.getInvitations();
      if (response?.data?.invitations && this.cache) {
        this.cache.invitations = response.data.invitations;
        this.saveToStorage();
        console.log(
          "[HomeCacheManager] Successfully refreshed invitations:",
          response.data.invitations.length
        );
      }
    } catch (error) {
      console.error("[HomeCacheManager] Error refreshing invitations:", error);
    }
  }

  async forceRefreshAll(): Promise<{
    homes: Home[];
    invitations: HomeInvitation[];
  }> {
    console.log("[HomeCacheManager] Force refreshing all data...");
    await this.invalidateCache();
    const cache = await this.ensureCache();
    return {
      homes: cache.homes,
      invitations: cache.invitations,
    };
  }

  async forceRefreshInvitations(): Promise<void> {
    console.log("[HomeCacheManager] Force refreshing invitations...");
    await this.refreshInvitations();
  }

  async invalidateCache(): Promise<void> {
    console.log("[HomeCacheManager] Invalidating cache");
    this.cache = null;
    this.cachePromise = null;
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error(
        "[HomeCacheManager] Error removing cache from localStorage:",
        error
      );
    }
  }

  async uploadPendingChanges(): Promise<void> {
    if (!this.cache || this.cache.pendingChanges.length === 0) {
      return;
    }

    console.log(
      "[HomeCacheManager] Uploading pending changes:",
      this.cache.pendingChanges.length
    );

    // For now, homes don't have complex offline changes like shopping lists
    // This is a placeholder for future offline functionality
    this.cache.pendingChanges = [];
    this.saveToStorage();
  }

  // Get cache stats for debugging
  getCacheStats(): {
    isLoaded: boolean;
    homesCount: number;
    invitationsCount: number;
    lastFetch: Date | null;
    pendingChanges: number;
  } {
    return {
      isLoaded: !!this.cache,
      homesCount: this.cache?.homes?.length || 0,
      invitationsCount: this.cache?.invitations?.length || 0,
      lastFetch: this.cache?.lastFetch ? new Date(this.cache.lastFetch) : null,
      pendingChanges: this.cache?.pendingChanges?.length || 0,
    };
  }
}

export const HomeCacheManager = new HomeCacheManagerClass();
