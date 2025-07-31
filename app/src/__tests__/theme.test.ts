import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getLightTheme, getDarkTheme } from "../theme";

describe("theme.ts", () => {
  const mockPropertyValue = vi.fn();
  const mockGetComputedStyle = vi.fn();

  beforeEach(() => {
    mockPropertyValue.mockReturnValue("");
    mockGetComputedStyle.mockReturnValue({
      getPropertyValue: mockPropertyValue,
    } as Partial<CSSStyleDeclaration>);

    // Mock window.getComputedStyle
    Object.defineProperty(window, "getComputedStyle", {
      value: mockGetComputedStyle,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getCssVar function", () => {
    it("should return CSS variable value when available", () => {
      mockPropertyValue.mockReturnValue("  #123456  ");

      const theme = getLightTheme();

      expect(mockGetComputedStyle).toHaveBeenCalled();
      expect(theme.palette.mode).toBe("light");
    });

    it("should return fallback value when CSS variable is not available", () => {
      mockPropertyValue.mockReturnValue("");

      const theme = getLightTheme();

      // Should use fallback values
      expect(theme.palette.primary.main).toBe("#2e7d32");
      expect(theme.palette.secondary.main).toBe("#ff6f00");
    });

    it("should handle errors gracefully and return fallback", () => {
      mockGetComputedStyle.mockImplementation(() => {
        throw new Error("CSS error");
      });

      // Mock console.warn to avoid noise in tests
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const theme = getLightTheme();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to get CSS variable"),
        expect.any(Error)
      );
      expect(theme.palette.primary.main).toBe("#2e7d32");

      consoleSpy.mockRestore();
    });

    it("should return fallback when window is undefined (SSR)", () => {
      // Test the SSR path by temporarily removing window
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const theme = getLightTheme();
      expect(theme.palette.primary.main).toBe("#2e7d32");

      // Restore window
      global.window = originalWindow;
    });
  });

  describe("getLightTheme", () => {
    beforeEach(() => {
      mockPropertyValue.mockReturnValue("");
    });

    it("should create a light theme with correct structure", () => {
      const theme = getLightTheme();

      expect(theme.palette.mode).toBe("light");
      expect(theme.palette.primary.main).toBe("#2e7d32");
      expect(theme.palette.secondary.main).toBe("#ff6f00");
      expect(theme.palette.background.default).toBe("#f5f5f5");
      expect(theme.palette.background.paper).toBe("#ffffff");
      expect(theme.palette.text.primary).toBe("#222222");
    });

    it("should have all required color properties", () => {
      const theme = getLightTheme();

      // Test primary colors
      expect(theme.palette.primary).toMatchObject({
        main: expect.any(String),
        light: "#4caf50",
        dark: "#1b5e20",
        contrastText: "#fff",
      });

      // Test secondary colors
      expect(theme.palette.secondary).toMatchObject({
        main: expect.any(String),
        light: "#ffa726",
        dark: "#e65100",
        contrastText: "#fff",
      });

      // Test semantic colors
      expect(theme.palette.error.main).toBe("#d32f2f");
      expect(theme.palette.warning.main).toBe("#ed6c02");
      expect(theme.palette.info.main).toBe("#0288d1");
      expect(theme.palette.success.main).toBe("#2e7d32");
    });

    it("should have correct typography settings", () => {
      const theme = getLightTheme();

      expect(theme.typography.fontFamily).toBe(
        '"Roboto", "Helvetica", "Arial", sans-serif'
      );
    });

    it("should have custom header color", () => {
      const theme = getLightTheme();

      expect((theme.palette as any).header.main).toBe("#2e7d32");
    });
  });

  describe("getDarkTheme", () => {
    beforeEach(() => {
      mockPropertyValue.mockReturnValue("");
    });

    it("should create a dark theme with correct structure", () => {
      const theme = getDarkTheme();

      expect(theme.palette.mode).toBe("dark");
      expect(theme.palette.primary.main).toBe("#4caf50");
      expect(theme.palette.secondary.main).toBe("#ffa726");
      expect(theme.palette.background.default).toBe("#18111e");
      expect(theme.palette.background.paper).toBe("#262231");
      expect(theme.palette.text.primary).toBe("#ffffff");
    });

    it("should have all required dark theme color properties", () => {
      const theme = getDarkTheme();

      // Test primary colors
      expect(theme.palette.primary).toMatchObject({
        main: "#4caf50",
        light: "#81c784",
        dark: "#388e3c",
        contrastText: "#000",
      });

      // Test secondary colors
      expect(theme.palette.secondary).toMatchObject({
        main: "#ffa726",
        light: "#ffcc80",
        dark: "#ff8f00",
        contrastText: "#000",
      });

      // Test text colors for dark theme
      expect(theme.palette.text.secondary).toBe("#aaaaaa");
      expect(theme.palette.text.disabled).toBe("#666666");
    });

    it("should have different colors from light theme", () => {
      const lightTheme = getLightTheme();
      const darkTheme = getDarkTheme();

      expect(darkTheme.palette.background.default).not.toBe(
        lightTheme.palette.background.default
      );
      expect(darkTheme.palette.background.paper).not.toBe(
        lightTheme.palette.background.paper
      );
      expect(darkTheme.palette.text.primary).not.toBe(
        lightTheme.palette.text.primary
      );
      expect(darkTheme.palette.divider).not.toBe(lightTheme.palette.divider);
    });

    it("should have correct typography settings", () => {
      const theme = getDarkTheme();

      expect(theme.typography.fontFamily).toBe(
        '"Roboto", "Helvetica", "Arial", sans-serif'
      );
    });

    it("should have custom header color", () => {
      const theme = getDarkTheme();

      expect((theme.palette as any).header.main).toBe("#4caf50");
    });
  });

  describe("theme consistency", () => {
    it("should have same structure between light and dark themes", () => {
      const lightTheme = getLightTheme();
      const darkTheme = getDarkTheme();

      // Both should have same structure
      expect(Object.keys(lightTheme.palette)).toEqual(
        Object.keys(darkTheme.palette)
      );
      expect(lightTheme.typography.fontFamily).toBe(
        darkTheme.typography.fontFamily
      );
    });

    it("should be valid Material-UI themes", () => {
      const lightTheme = getLightTheme();
      const darkTheme = getDarkTheme();

      // Should have required MUI properties
      expect(lightTheme.palette).toBeDefined();
      expect(lightTheme.typography).toBeDefined();
      expect(darkTheme.palette).toBeDefined();
      expect(darkTheme.typography).toBeDefined();
    });
  });
});
