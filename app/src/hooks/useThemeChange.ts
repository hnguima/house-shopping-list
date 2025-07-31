import { useState, useEffect } from "react";
import { createTheme } from "@mui/material";
import { getLightTheme, getDarkTheme } from "../theme";
import type { Theme } from "@mui/material";

export const useThemeChange = (themeMode: "light" | "dark") => {
  const [theme, setTheme] = useState<Theme | null>(null);

  // Initialize with a minimal theme immediately to avoid blocking render
  useEffect(() => {
    const minimalTheme = createTheme({
      palette: {
        mode: "light",
        primary: {
          main: "#2e7d32",
          light: "#4caf50",
          dark: "#1b5e20",
          contrastText: "#fff",
        },
        secondary: {
          main: "#ff6f00",
          light: "#ffa726",
          dark: "#e65100",
          contrastText: "#fff",
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
        background: {
          default: "#f5f5f5",
          paper: "#ffffff",
        },
        text: {
          primary: "#222222",
          secondary: "#757575",
          disabled: "#bdbdbd",
        },
      },
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      },
    });
    setTheme(minimalTheme);
  }, []);

  // Update theme when themeMode changes
  useEffect(() => {
    if (themeMode) {
      try {
        const fullTheme =
          themeMode === "dark" ? getDarkTheme() : getLightTheme();
        setTheme(fullTheme);
      } catch (error) {
        console.warn("Failed to apply custom theme, keeping fallback:", error);
        // Keep the existing minimal theme if custom theme fails
      }
    }
  }, [themeMode]);

  return theme;
};
