import React from "react";
import PropTypes from "prop-types";
import { Menu, Search } from "lucide-react";

import ThemeToggle from "./ThemeToggle";
import LanguageDropdown from "./LanguageDropdown";
import NotificationBell from "../../Notifications/NotificationBell";
import ProfileButton from "./ProfileButton";

const ShellTopbar = ({
  onToggleSidebar,
  theme,
  toggleTheme,
  currentLanguage,
  changeLanguage,
  user,
  onLogout,
  workspaceLabel,
  searchPlaceholder = "Search portfolios, assets, or markets...",
}) => {
  return (
    <div className="flex w-full items-center gap-3 sm:gap-4">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="shell-icon-button lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative hidden min-w-0 flex-1 md:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-day-muted dark:text-night-muted" />
          <input
            type="search"
            className="shell-input pl-11 pr-4"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </div>

        {workspaceLabel ? (
          <div className="hidden xl:flex xl:items-center">
            <span className="rounded-full border border-day-border/80 bg-day-panel/75 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:border-night-border/80 dark:bg-night-panel/75 dark:text-night-muted">
              {workspaceLabel}
            </span>
          </div>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        <LanguageDropdown
          currentLanguage={currentLanguage || "en"}
          changeLanguage={changeLanguage}
        />
        <NotificationBell />
        <ProfileButton theme={theme} user={user} onLogout={onLogout} />
      </div>
    </div>
  );
};

ShellTopbar.propTypes = {
  onToggleSidebar: PropTypes.func.isRequired,
  theme: PropTypes.string,
  toggleTheme: PropTypes.func.isRequired,
  currentLanguage: PropTypes.string,
  changeLanguage: PropTypes.func.isRequired,
  user: PropTypes.object,
  onLogout: PropTypes.func,
  workspaceLabel: PropTypes.string,
  searchPlaceholder: PropTypes.string,
};

export default ShellTopbar;
