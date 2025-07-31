import "@testing-library/jest-dom";
import { beforeAll, vi } from "vitest";

// Mock Capacitor
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => "web"),
  },
  CapacitorHttp: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@capacitor/browser", () => ({
  Browser: {
    open: vi.fn(),
    close: vi.fn(),
  },
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));

vi.mock("@capacitor/status-bar", () => ({
  StatusBar: {
    getInfo: vi.fn(() => Promise.resolve({ height: 0 })),
  },
}));

// Mock localStorage with actual storage functionality
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock window.open for OAuth popup
Object.defineProperty(window, "open", {
  value: vi.fn(() => ({
    close: vi.fn(),
    closed: false,
  })),
});

// Mock postMessage
Object.defineProperty(window, "postMessage", {
  value: vi.fn(),
});

// Mock environment variables
Object.defineProperty(import.meta, "env", {
  value: {
    VITE_API_URL: "https://shop-list-api.the-cube-lab.com",
    MODE: "test",
  },
});

beforeAll(() => {
  // Clear all mocks before each test suite
  vi.clearAllMocks();
});
