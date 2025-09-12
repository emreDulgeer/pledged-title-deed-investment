// src/components/Layouts/common/LayoutShell.jsx
import React from "react";
import PropTypes from "prop-types";

const SIDEBAR_W = 280; // px

const LayoutShell = ({ sidebar, topbar, sidebarOpen, children }) => {
  return (
    <div className="min-h-screen bg-day-background dark:bg-night-background text-day-text dark:text-night-text">
      {/* Sidebar */}
      <aside
        className={[
          "fixed top-0 left-0 z-40 h-screen shadow-xl",
          "bg-day-surface dark:bg-night-surface",
          "border-r border-day-border dark:border-night-border",
          "transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={{ width: `${SIDEBAR_W}px` }}
      >
        {sidebar}
      </aside>

      {/* Main */}
      <div
        className="min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? `${SIDEBAR_W}px` : 0 }}
      >
        <header className="h-16 px-6 flex items-center justify-between bg-white dark:bg-night-surface/90 backdrop-blur shadow-sm border-b border-day-border dark:border-night-border">
          {topbar}
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

LayoutShell.propTypes = {
  sidebar: PropTypes.node.isRequired,
  topbar: PropTypes.node.isRequired,
  sidebarOpen: PropTypes.bool.isRequired,
  children: PropTypes.node,
};

export default LayoutShell;
