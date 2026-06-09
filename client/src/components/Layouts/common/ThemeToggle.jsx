import React from "react";
import { MoonStar, SunMedium } from "lucide-react";

const ThemeToggle = ({ theme, toggleTheme }) => (
  <button
    onClick={toggleTheme}
    className="shell-icon-button"
    title="Toggle theme"
    aria-label="Toggle theme"
  >
    {theme === "dark" ? (
      <SunMedium className="h-5 w-5" />
    ) : (
      <MoonStar className="h-5 w-5" />
    )}
  </button>
);

export default ThemeToggle;
