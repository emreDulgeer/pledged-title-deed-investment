// src/components/Layouts/Admin/Sidebar/AdminSidebar.jsx
import React from "react";
import SidebarNav from "../../common/Sidebar/SidebarNav";
import UserCard from "../../common/Sidebar/UserCard";
import Logo from "../../common/Sidebar/SidebarLogo";

const AdminSidebar = ({ menuItems, user, onLogout }) => (
  <div className="h-full flex flex-col">
    {/* Logo */}
    <div className="px-5 pt-5 pb-4 border-b border-day-border/60 dark:border-night-border/60">
      <h2 className="text-xl font-bold text-day-primary dark:text-night-primary">
        EstateLink
      </h2>
      <p className="text-xs mt-1 text-day-text/70 dark:text-night-text/70">
        Admin Panel
      </p>
    </div>

    {/* Nav */}
    <div className="flex-1 overflow-y-auto p-4">
      <SidebarNav items={menuItems} />
    </div>

    {/* User */}
    <div className="px-5 py-4 border-t border-day-border/60 dark:border-night-border/60">
      <UserCard user={user} onLogout={onLogout} />
    </div>
  </div>
);

export default AdminSidebar;
