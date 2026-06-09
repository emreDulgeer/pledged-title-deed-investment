// src/components/Layouts/Investor/Sidebar/InvestorSidebar.jsx
import React from "react";
import SidebarNav from "../../common/Sidebar/SidebarNav";
import UserCard from "../../common/Sidebar/UserCard";
import SidebarLogo from "../../common/Sidebar/SidebarLogo";

const InvestorSidebar = ({ menuItems, user, onLogout }) => {
  return (
    <div className="flex h-full flex-col px-5 py-6">
      <div className="border-b border-day-border/70 pb-6 dark:border-night-border/70">
        <SidebarLogo subtitle="Investor workspace" />
      </div>

      <div className="flex-1 overflow-y-auto py-6">
        <SidebarNav items={menuItems} />
      </div>

      <div className="border-t border-day-border/70 pt-5 dark:border-night-border/70">
        <UserCard user={user} onLogout={onLogout} />
      </div>
    </div>
  );
};

export default InvestorSidebar;
