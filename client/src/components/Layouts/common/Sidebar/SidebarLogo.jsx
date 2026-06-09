// src/components/Layouts/Admin/Sidebar/SidebarLogo.jsx
import React from "react";
import PropTypes from "prop-types";
import { Building2 } from "lucide-react";

const SidebarLogo = ({ subtitle = "Institutional grade" }) => {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-day-primary text-white shadow-accent dark:bg-night-primary dark:text-night-background">
        <Building2 className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h2 className="font-display text-3xl font-semibold leading-none text-day-primary dark:text-night-primary">
          EstateLink
        </h2>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
          {subtitle}
        </p>
      </div>
    </div>
  );
};

SidebarLogo.propTypes = {
  subtitle: PropTypes.string,
};

export default SidebarLogo;
