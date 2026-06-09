// src/components/Layouts/common/LayoutShell.jsx
import React from "react";
import PropTypes from "prop-types";

const SIDEBAR_W = 288; // px

const LayoutShell = ({
  sidebar,
  topbar,
  sidebarOpen,
  onCloseSidebar,
  children,
}) => {
  return (
    <div className="min-h-screen bg-day-background text-day-text dark:bg-night-background dark:text-night-text">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onCloseSidebar}
          className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 h-screen overflow-hidden",
          "border-r border-day-border/80 bg-day-surface/[0.95] backdrop-blur-xl dark:border-night-border/80 dark:bg-night-surface/[0.92]",
          "shadow-shell lg:shadow-none",
          "transition-transform duration-300 ease-out",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={{ width: `${SIDEBAR_W}px` }}
      >
        <div className="h-full overflow-y-auto">{sidebar}</div>
      </aside>

      <div className="min-h-screen lg:pl-[288px]">
        <header className="sticky top-0 z-20 border-b border-day-border/80 bg-day-surface/[0.85] backdrop-blur-xl dark:border-night-border/80 dark:bg-night-surface/[0.80]">
          <div className="mx-auto flex h-20 w-full max-w-shell items-center px-5 sm:px-6 lg:px-8">
            {topbar}
          </div>
        </header>

        <main className="mx-auto w-full max-w-shell px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
};

LayoutShell.propTypes = {
  sidebar: PropTypes.node.isRequired,
  topbar: PropTypes.node.isRequired,
  sidebarOpen: PropTypes.bool.isRequired,
  onCloseSidebar: PropTypes.func,
  children: PropTypes.node,
};

export default LayoutShell;
