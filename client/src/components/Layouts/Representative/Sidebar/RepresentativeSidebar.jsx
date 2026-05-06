import React from "react";
import SidebarNav from "../../common/Sidebar/SidebarNav";
import UserCard from "../../common/Sidebar/UserCard";

const RepresentativeSidebar = ({ menuItems, user, onLogout }) => {
  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-day-primary dark:text-night-primary">
          EstateLink
        </h2>
        <p className="mt-1 text-sm text-day-text opacity-75 dark:text-night-text">
          Local Representative Panel
        </p>
      </div>

      <SidebarNav items={menuItems} />

      <div className="mt-auto border-t border-day-border pt-6 dark:border-night-border">
        <UserCard user={user} onLogout={onLogout} />
      </div>
    </div>
  );
};

export default RepresentativeSidebar;
