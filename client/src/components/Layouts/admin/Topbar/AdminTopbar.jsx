import React from "react";
import ShellTopbar from "../../common/ShellTopbar";

const AdminTopbar = ({
  onToggleSidebar,
  theme,
  toggleTheme,
  currentLanguage,
  changeLanguage,
  user,
  onLogout,
}) => (
  <ShellTopbar
    onToggleSidebar={onToggleSidebar}
    theme={theme}
    toggleTheme={toggleTheme}
    currentLanguage={currentLanguage}
    changeLanguage={changeLanguage}
    user={user}
    onLogout={onLogout}
    workspaceLabel="Admin workspace"
    searchPlaceholder="Search users, properties, or investments..."
  />
);

export default AdminTopbar;
