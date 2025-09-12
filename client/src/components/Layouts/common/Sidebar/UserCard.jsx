// src/components/Layouts/common/Sidebar/UserCard.jsx
import React from "react";
const UserCard = ({ user, onLogout, logoutTitle = "Logout" }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-day-text dark:text-night-text">
        {user?.fullName || "User"}
      </p>
      <p className="text-xs text-day-text dark:text-night-text opacity-75">
        {user?.email}
      </p>
    </div>
    <button
      onClick={onLogout}
      className="p-2 rounded-lg transition-colors text-day-text dark:text-night-text hover:bg-day-primary-light hover:text-white dark:hover:bg-night-primary-dark dark:hover:text-night-background"
      title={logoutTitle}
    >
      {/* icon */}
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
    </button>
  </div>
);
export default UserCard;
