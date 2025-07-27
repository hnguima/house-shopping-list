import { createTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";

function getCssVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export const getLightTheme = (): Theme =>
  createTheme({
    palette: {
      mode: "light",
      primary: { main: getCssVar("--color-primary-light") },
      secondary: { main: getCssVar("--color-secondary-light") },
      background: {
        default: getCssVar("--color-bg-light"),
        paper: getCssVar("--color-bg-light-paper"),
      },
      text: {
        primary: getCssVar("--color-text-light"),
      },
      header: {
        main: getCssVar("--color-header-bg-light"),
      },
    } as any,
  });

export const getDarkTheme = (): Theme =>
  createTheme({
    palette: {
      mode: "dark",
      primary: { main: getCssVar("--color-primary-dark") },
      secondary: { main: getCssVar("--color-secondary-dark") },
      background: {
        default: getCssVar("--color-bg-dark"),
        paper: getCssVar("--color-bg-dark-paper"),
      },
      text: {
        primary: getCssVar("--color-text-dark"),
      },
      header: {
        main: getCssVar("--color-header-bg-dark"),
      },
    } as any,
  });
