import React from "react";
import ShellTopbar from "../../common/ShellTopbar";

const OwnerTopbar = ({
  onToggleSidebar,
  theme,
  toggleTheme,
  currentLanguage,
  changeLanguage,
  user,
  onLogout,
  workspaceLabel = "Owner workspace",
  searchPlaceholder = "Search properties, payments, or documents...",
}) => (
  <ShellTopbar
    onToggleSidebar={onToggleSidebar}
    theme={theme}
    toggleTheme={toggleTheme}
    currentLanguage={currentLanguage}
    changeLanguage={changeLanguage}
    user={user}
    onLogout={onLogout}
    workspaceLabel={workspaceLabel}
    searchPlaceholder={searchPlaceholder}
  />
);

export default OwnerTopbar;
