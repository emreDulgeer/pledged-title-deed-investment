// src/components/Layouts/Admin/Topbar/ProfileButton.jsx
import React from "react";

const ProfileButton = ({ theme, user }) => (
  <div className="relative">
    <button className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-night-primary-dark">
      <img
        className="w-8 h-8 rounded-full"
        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
          user?.fullName || "Admin"
        )}&background=${theme === "dark" ? "00C896" : "6B4DE6"}&color=fff`}
        alt="Profile"
      />
    </button>
  </div>
);

export default ProfileButton;
