// src/components/Layouts/Admin/Sidebar/SidebarLogo.jsx
import React from "react";
import { useTranslation } from "react-i18next";

const SidebarLogo = () => {
  const { t } = useTranslation();
  return (
    <>
      <h2 className="text-2xl font-bold text-day-primary dark:text-night-primary">
        EstateLink
      </h2>
      <p className="text-sm mt-1 text-day-text dark:text-night-text opacity-75">
        {t("navigation.admin_panel")}
      </p>
    </>
  );
};

export default SidebarLogo;
