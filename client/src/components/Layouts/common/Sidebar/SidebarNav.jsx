// src/components/Layouts/common/Sidebar/SidebarNav.jsx
import React from "react";
import SidebarNavItem from "./SidebarNavItem";
const SidebarNav = ({ items }) => (
  <nav className="space-y-2">
    {items.map((it) => (
      <SidebarNavItem
        key={it.path}
        to={it.path}
        icon={it.icon}
        label={it.title}
      />
    ))}
  </nav>
);
export default SidebarNav;
