// src/components/Layouts/Investor/Sidebar/InvestorSidebar.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import SidebarNav from "../../common/Sidebar/SidebarNav";
import UserCard from "../../common/Sidebar/UserCard";

const InvestorSidebar = ({ menuItems, user, onLogout }) => {
  const { t } = useTranslation();

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-day-primary dark:text-night-primary">
          EstateLink
        </h2>
        <p className="text-sm mt-1 text-day-text dark:text-night-text opacity-75">
          {t("navigation.investor_panel") || "Investor Panel"}
        </p>
      </div>

      <SidebarNav items={menuItems} />

      <div className="mt-auto pt-6 border-t border-day-border dark:border-night-border">
        <UserCard user={user} onLogout={onLogout} />
      </div>
    </div>
  );
};

export default InvestorSidebar;
