// src/components/Layouts/common/Sidebar/SidebarNavItem.jsx
import React from "react";
import { NavLink } from "react-router-dom";

const base =
  "flex items-center px-3 py-2.5 rounded-lg transition-colors text-sm";

const SidebarNavItem = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      [
        base,
        isActive
          ? "bg-day-primary text-white dark:bg-night-primary dark:text-night-background"
          : "text-day-text/90 dark:text-night-text/90 hover:bg-day-primary-light hover:text-white dark:hover:bg-night-primary-dark dark:hover:text-night-background",
      ].join(" ")
    }
  >
    {icon}
    <span className="ml-3 font-medium">{label}</span>
  </NavLink>
);

export default SidebarNavItem;
