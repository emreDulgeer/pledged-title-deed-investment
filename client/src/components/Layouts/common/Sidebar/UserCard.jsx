// src/components/Layouts/common/Sidebar/UserCard.jsx
import React from "react";
import { LogOut } from "lucide-react";

const getInitials = (fullName = "User") =>
  fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

const formatRole = (role = "") =>
  role
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ") || "Workspace";

const UserCard = ({ user, onLogout, logoutTitle = "Logout" }) => (
  <div className="shell-subtle-surface p-4">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-day-primary text-sm font-semibold text-white shadow-accent dark:bg-night-primary dark:text-night-background">
        {getInitials(user?.fullName)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-day-text dark:text-night-text">
          {user?.fullName || "User"}
        </p>
        <p className="truncate text-xs text-day-muted dark:text-night-muted">
          {user?.email || "No email available"}
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-day-muted/85 dark:text-night-muted/85">
          {formatRole(user?.role)}
        </p>
      </div>

      <button
        onClick={onLogout}
        className="shell-icon-button h-10 w-10 shrink-0"
        title={logoutTitle}
        aria-label={logoutTitle}
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  </div>
);

export default UserCard;
