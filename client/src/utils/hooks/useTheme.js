// src/hooks/useTheme.ts (veya .js)
import { useContext } from "react";
import { ThemeContext } from "../../context/theme-context";

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
};
