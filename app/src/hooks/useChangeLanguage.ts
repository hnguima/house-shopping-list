import { useCallback } from "react";
import i18n from "i18next";

export function useChangeLanguage(setLanguage: (lang: string) => void) {
  return useCallback(
    (newLanguage: string) => {
      setLanguage(newLanguage);
      i18n.changeLanguage(newLanguage);
    },
    [setLanguage]
  );
}
