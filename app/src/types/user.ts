export interface UserPreferences {
  theme: "light" | "dark";
  language: string;
  primaryColor?: string;
  fontSize?: "small" | "medium" | "large";
}

export interface User {
  id?: string;
  username: string;
  email: string;
  name: string;
  photo?: string; // Base64 data URL or blob URL
  provider?: string;
  preferences: UserPreferences;
  createdAt?: number; // Unix timestamp
  updatedAt?: number; // Unix timestamp
}

export interface AppState {
  user: User | null;
  lastSyncAt?: string;
  version: string; // For future migration purposes
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "light",
  language: "en",
  primaryColor: "#2E7D32",
  fontSize: "medium",
};

export const createDefaultUser = (): User => ({
  username: "",
  email: "",
  name: "",
  preferences: { ...DEFAULT_PREFERENCES },
  createdAt: Math.floor(Date.now() / 1000), // Unix timestamp
  updatedAt: Math.floor(Date.now() / 1000), // Unix timestamp
});
