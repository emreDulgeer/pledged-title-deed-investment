import React from "react";
import ShellTopbar from "../../common/ShellTopbar";

const InvestorTopbar = ({
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
    workspaceLabel="Investor workspace"
    searchPlaceholder="Search markets, properties, or portfolio activity..."
  />
);

export default InvestorTopbar;
