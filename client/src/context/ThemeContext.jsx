// src/context/ThemeContext.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { ThemeContext } from "./theme-context";

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const value = {
    theme,
    toggleTheme: () => setTheme((p) => (p === "light" ? "dark" : "light")),
    isDark: theme === "dark",
    isLight: theme === "light",
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

ThemeProvider.propTypes = { children: PropTypes.node.isRequired };
