// src/components/Layouts/common/Sidebar/SidebarNavItem.jsx
import React from "react";
import { NavLink } from "react-router-dom";

const base =
  "group flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-[15px] font-medium transition-all duration-200";

const SidebarNavItem = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      [
        base,
        isActive
          ? "border-day-border bg-day-panel text-day-primary shadow-sm dark:border-night-border dark:bg-night-panel dark:text-night-primary"
          : "border-transparent text-day-muted hover:border-day-border/70 hover:bg-day-panel/70 hover:text-day-text dark:text-night-muted dark:hover:border-night-border/70 dark:hover:bg-night-panel/70 dark:hover:text-night-text",
      ].join(" ")
    }
  >
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-day-border/70 bg-day-surface text-current transition-colors dark:border-night-border/70 dark:bg-night-surface/80 [&_svg]:h-5 [&_svg]:w-5">
      {icon}
    </span>
    <span className="truncate">{label}</span>
  </NavLink>
);

export default SidebarNavItem;
