import { useState, useEffect, useCallback } from "react";
import { HomeCacheManager } from "../utils/cache/homeCacheManager";
import type { Home, HomeInvitation } from "../types/home";

interface UseHomesResult {
  homes: Home[];
  invitations: HomeInvitation[];
  loading: boolean;
  error: string | null;
  refreshHomes: () => Promise<void>;
  refreshInvitations: () => Promise<void>;
  createHome: (name: string, description?: string) => Promise<Home | null>;
  updateHome: (
    homeId: string,
    name: string,
    description?: string
  ) => Promise<boolean>;
  deleteHome: (homeId: string) => Promise<boolean>;
  leaveHome: (homeId: string) => Promise<boolean>;
  inviteToHome: (
    homeId: string,
    email: string,
    message?: string
  ) => Promise<boolean>;
  requestJoinHome: (homeId: string, message?: string) => Promise<boolean>;
  respondToInvitation: (
    invitationId: string,
    accept: boolean
  ) => Promise<boolean>;
}

export const useHomes = (): UseHomesResult => {
  const [homes, setHomes] = useState<Home[]>([]);
  const [invitations, setInvitations] = useState<HomeInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshHomes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("[useHomes] Starting to refresh homes...");
      const cachedHomes = await HomeCacheManager.getHomes();
      console.log("[useHomes] Got homes from cache manager:", cachedHomes);
      setHomes(cachedHomes);
    } catch (err) {
      console.error("[useHomes] Error fetching homes:", err);
      setError("Failed to load homes");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshInvitations = useCallback(async () => {
    try {
      setError(null);
      const cachedInvitations = await HomeCacheManager.getInvitations();
      setInvitations(cachedInvitations);
    } catch (err) {
      console.error("[useHomes] Error fetching invitations:", err);
      setError("Failed to load invitations");
    }
  }, []);

  const createHome = useCallback(
    async (name: string, description?: string): Promise<Home | null> => {
      try {
        setError(null);
        const newHome = await HomeCacheManager.createHome({
          name,
          description,
        });
        if (newHome) {
          // Update local state
          setHomes((prev) => [...prev, newHome]);
          return newHome;
        }
        return null;
      } catch (err) {
        console.error("[useHomes] Error creating home:", err);
        setError("Failed to create home");
        return null;
      }
    },
    []
  );

  const leaveHome = useCallback(async (homeId: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await HomeCacheManager.leaveHome(homeId);
      if (success) {
        setHomes((prev) => prev.filter((home) => home._id !== homeId));
      }
      return success;
    } catch (err) {
      console.error("[useHomes] Error leaving home:", err);
      setError("Failed to leave home");
      return false;
    }
  }, []);

  const updateHome = useCallback(
    async (
      homeId: string,
      name: string,
      description?: string
    ): Promise<boolean> => {
      try {
        setError(null);
        const success = await HomeCacheManager.updateHome(homeId, {
          name,
          description,
        });
        if (success) {
          // Refresh homes to get updated data
          await refreshHomes();
        }
        return success;
      } catch (err) {
        console.error("[useHomes] Error updating home:", err);
        setError("Failed to update home");
        return false;
      }
    },
    [refreshHomes]
  );

  const deleteHome = useCallback(async (homeId: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await HomeCacheManager.deleteHome(homeId);
      if (success) {
        setHomes((prev) => prev.filter((home) => home._id !== homeId));
      }
      return success;
    } catch (err) {
      console.error("[useHomes] Error deleting home:", err);
      setError("Failed to delete home");
      return false;
    }
  }, []);

  const inviteToHome = useCallback(
    async (
      homeId: string,
      email: string,
      message?: string
    ): Promise<boolean> => {
      try {
        setError(null);
        const success = await HomeCacheManager.inviteToHome(homeId, {
          email,
          message,
        });
        if (success) {
          // Refresh invitations to show the new one
          await refreshInvitations();
        }
        return success;
      } catch (err) {
        console.error("[useHomes] Error inviting to home:", err);
        setError("Failed to send invitation");
        return false;
      }
    },
    [refreshInvitations]
  );

  const requestJoinHome = useCallback(
    async (homeId: string, message?: string): Promise<boolean> => {
      try {
        setError(null);
        const success = await HomeCacheManager.requestJoinHome(homeId, message);
        if (success) {
          // Refresh invitations to show the new request
          await refreshInvitations();
        }
        return success;
      } catch (err) {
        console.error("[useHomes] Error requesting to join home:", err);
        setError("Failed to send join request");
        return false;
      }
    },
    [refreshInvitations]
  );

  const respondToInvitation = useCallback(
    async (invitationId: string, accept: boolean): Promise<boolean> => {
      try {
        setError(null);
        const success = await HomeCacheManager.respondToInvitation(
          invitationId,
          accept
        );
        if (success) {
          // Remove the invitation from the list
          setInvitations((prev) =>
            prev.filter((inv) => inv._id !== invitationId)
          );

          // If accepted, refresh homes to show the new one
          if (accept) {
            await refreshHomes();
          }
        }
        return success;
      } catch (err) {
        console.error("[useHomes] Error responding to invitation:", err);
        setError("Failed to respond to invitation");
        return false;
      }
    },
    [refreshHomes]
  );

  // Load initial data
  useEffect(() => {
    refreshHomes();
    refreshInvitations();
  }, [refreshHomes, refreshInvitations]);

  return {
    homes,
    invitations,
    loading,
    error,
    refreshHomes,
    refreshInvitations,
    createHome,
    updateHome,
    deleteHome,
    leaveHome,
    inviteToHome,
    requestJoinHome,
    respondToInvitation,
  };
};
