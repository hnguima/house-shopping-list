import { render } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";

const testTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2e7d32" },
    secondary: { main: "#ff6f00" },
  },
});

export const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={testTheme}>
      <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
    </ThemeProvider>
  );
};

export * from "@testing-library/react";
