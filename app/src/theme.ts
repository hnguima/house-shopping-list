import { createTheme } from "@mui/material";
import type { Theme } from "@mui/material";

function getCssVar(name: string, fallback: string = ""): string {
  if (typeof window === "undefined") return fallback;
  try {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return value || fallback;
  } catch (error) {
    console.warn(`Failed to get CSS variable ${name}:`, error);
    return fallback;
  }
}

export const getLightTheme = (): Theme =>
  createTheme({
    palette: {
      mode: "light",
      primary: {
        main: getCssVar("--color-primary-light", "#2e7d32"),
        light: "#4caf50",
        dark: "#1b5e20",
        contrastText: "#fff",
      },
      secondary: {
        main: getCssVar("--color-secondary-light", "#ff6f00"),
        light: "#ffa726",
        dark: "#e65100",
        contrastText: "#fff",
      },
      background: {
        default: getCssVar("--color-bg-light", "#f5f5f5"),
        paper: getCssVar("--color-bg-light-paper", "#ffffff"),
      },
      text: {
        primary: getCssVar("--color-text-light", "#222222"),
        secondary: "#757575",
        disabled: "#bdbdbd",
      },
      error: {
        main: "#d32f2f",
        light: "#ef5350",
        dark: "#c62828",
        contrastText: "#fff",
      },
      warning: {
        main: "#ed6c02",
        light: "#ff9800",
        dark: "#e65100",
        contrastText: "#fff",
      },
      info: {
        main: "#0288d1",
        light: "#03a9f4",
        dark: "#01579b",
        contrastText: "#fff",
      },
      success: {
        main: "#2e7d32",
        light: "#4caf50",
        dark: "#1b5e20",
        contrastText: "#fff",
      },
      divider: "#e0e0e0",
      header: {
        main: getCssVar("--color-header-bg-light", "#2e7d32"),
      },
    } as any,
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
  });

export const getDarkTheme = (): Theme =>
  createTheme({
    palette: {
      mode: "dark",
      primary: {
        main: getCssVar("--color-primary-dark", "#4caf50"),
        light: "#81c784",
        dark: "#388e3c",
        contrastText: "#000",
      },
      secondary: {
        main: getCssVar("--color-secondary-dark", "#ffa726"),
        light: "#ffcc80",
        dark: "#ff8f00",
        contrastText: "#000",
      },
      background: {
        default: getCssVar("--color-bg-dark", "#18111e"),
        paper: getCssVar("--color-bg-dark-paper", "#262231"),
      },
      text: {
        primary: getCssVar("--color-text-dark", "#ffffff"),
        secondary: "#aaaaaa",
        disabled: "#666666",
      },
      error: {
        main: "#f44336",
        light: "#e57373",
        dark: "#d32f2f",
        contrastText: "#fff",
      },
      warning: {
        main: "#ffa726",
        light: "#ffb74d",
        dark: "#f57c00",
        contrastText: "#000",
      },
      info: {
        main: "#29b6f6",
        light: "#4fc3f7",
        dark: "#0288d1",
        contrastText: "#000",
      },
      success: {
        main: "#66bb6a",
        light: "#81c784",
        dark: "#388e3c",
        contrastText: "#000",
      },
      divider: "#424242",
      header: {
        main: getCssVar("--color-header-bg-dark", "#4caf50"),
      },
    } as any,
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
  });
