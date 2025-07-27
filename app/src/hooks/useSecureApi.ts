import { useState, useCallback } from 'react';
import apiClient from '../utils/apiClient';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for making secure API requests with loading states
 */
export function useSecureApi<T = any>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (apiCall: () => Promise<any>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiCall();
      setState({
        data: response.data,
        loading: false,
        error: null,
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred';
      setState({
        data: null,
        loading: false,
        error: errorMessage,
      });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Hook for user profile operations
 */
export function useUserProfile() {
  const api = useSecureApi();

  const getUserProfile = useCallback(() => {
    return api.execute(() => apiClient.getUserProfile());
  }, [api]);

  const updateProfile = useCallback((data: any) => {
    return api.execute(() => apiClient.updateUserProfile(data));
  }, [api]);

  const uploadPhoto = useCallback((base64Data: string) => {
    return api.execute(() => apiClient.uploadProfilePhoto(base64Data));
  }, [api]);

  return {
    ...api,
    getUserProfile,
    updateProfile,
    uploadPhoto,
  };
}
