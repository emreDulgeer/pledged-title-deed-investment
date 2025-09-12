// src/components/Layouts/Admin/Topbar/AdminTopbar.jsx
import React from "react";
import ThemeToggle from "../../common/ThemeToggle";
import LanguageDropdown from "../../common/LanguageDropdown";
import NotificationsButton from "../../common/NotificationsButton";
import ProfileButton from "../../common/ProfileButton";

const iconBtn =
  "p-2 rounded-lg hover:bg-day-primary-light/30 dark:hover:bg-night-primary-dark/40 transition-colors";

const AdminTopbar = ({
  onToggleSidebar,
  theme,
  toggleTheme,
  currentLanguage,
  changeLanguage,
  user,
}) => (
  <>
    <button
      onClick={onToggleSidebar}
      className={iconBtn}
      aria-label="Toggle sidebar"
    >
      <svg
        className="w-6 h-6 text-day-text dark:text-night-text"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </button>

    <div className="flex items-center gap-3 ml-auto">
      <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      <LanguageDropdown
        currentLanguage={currentLanguage}
        changeLanguage={changeLanguage}
      />
      <NotificationsButton />
      <ProfileButton theme={theme} user={user} />
    </div>
  </>
);

export default AdminTopbar;
