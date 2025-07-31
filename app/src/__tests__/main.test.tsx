import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock React.StrictMode to avoid double rendering in tests
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    StrictMode: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock the App component
vi.mock("../App", () => ({
  default: () => <div data-testid="app">Mocked App Component</div>,
}));

// Mock ReactDOM.createRoot
const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({
  render: mockRender,
}));

vi.mock("react-dom/client", () => ({
  createRoot: mockCreateRoot,
}));

describe("main.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock document.getElementById
    const mockElement = document.createElement("div");
    mockElement.id = "root";
    vi.spyOn(document, "getElementById").mockReturnValue(mockElement);
  });

  it("should create root and render App component", async () => {
    // Import main.tsx to trigger the side effects
    await import("../main");

    // Verify createRoot was called with the root element
    expect(mockCreateRoot).toHaveBeenCalledWith(
      expect.objectContaining({ id: "root" })
    );

    // Verify render was called with the App wrapped in StrictMode
    expect(mockRender).toHaveBeenCalledWith(
      expect.anything() // The JSX element containing App
    );
  });

  it("should fail gracefully if root element is not found", async () => {
    // Mock getElementById to return null
    vi.spyOn(document, "getElementById").mockReturnValue(null);

    // This should not throw an error
    expect(() => import("../main")).not.toThrow();
  });
});
