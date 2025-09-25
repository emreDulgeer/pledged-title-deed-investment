// src/views/layouts/AdminLayout.jsx  (container)
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import LayoutShell from "../../components/Layouts/common/LayoutShell";
import AdminSidebar from "../../components/Layouts/Admin/Sidebar/AdminSidebar";
import AdminTopbar from "../../components/Layouts/admin/Topbar/AdminTopbar";
import { selectUser, logout } from "../../store/slices/authSlice";
import { toggleSidebar, selectSidebarOpen } from "../../store/slices/uiSlice";
import { useTheme } from "../../utils/hooks/useTheme";
import { useLanguage } from "../../utils/hooks/useLanguage";
import { Outlet } from "react-router-dom";

const AdminLayout = () => {
  console.log("Rendering AdminLayout");
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const sidebarOpen = useSelector(selectSidebarOpen);
  const { theme, toggleTheme } = useTheme();
  const { currentLanguage, changeLanguage } = useLanguage();

  const menuItems = [
    {
      title: t("navigation.dashboard"),
      path: "/admin/dashboard",
      icon: <IconHome />,
    },
    {
      title: t("navigation.properties"),
      path: "/admin/properties",
      icon: <IconBldg />,
    },
    {
      title: t("navigation.investments"),
      path: "/admin/investments",
      icon: <IconCoin />,
    },
    {
      title: t("navigation.investors"),
      path: "/admin/investors",
      icon: <IconUsers />,
    },
    {
      title: t("navigation.property_owners"),
      path: "/admin/property-owners",
      icon: <IconUser />,
    },
    {
      title: t("navigation.users"),
      path: "/admin/users",
      icon: <IconUsers2 />,
    },
    {
      title: t("navigation.membership_plans") || "Membership Plans",
      path: "/admin/membership-plans",
      icon: <IconCrown />,
    },
    {
      title: t("navigation.reports"),
      path: "/admin/reports",
      icon: <IconReport />,
    },
    {
      title: t("navigation.settings"),
      path: "/admin/settings",
      icon: <IconCog />,
    },
  ];

  return (
    <LayoutShell
      sidebarOpen={sidebarOpen}
      sidebar={
        <AdminSidebar
          menuItems={menuItems}
          user={user}
          onLogout={() => dispatch(logout())}
        />
      }
      topbar={
        <AdminTopbar
          onToggleSidebar={() => dispatch(toggleSidebar())}
          theme={theme}
          toggleTheme={toggleTheme}
          currentLanguage={currentLanguage}
          changeLanguage={changeLanguage}
          user={user}
        />
      }
    >
      {/* ⬇️ Alt route içerikleri burada gösterilecek */}
      <Outlet />
    </LayoutShell>
  );
};

const IconHome = () => (
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
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const IconBldg = () => (
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
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

const IconCoin = () => (
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
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const IconUsers = () => (
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
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);

const IconUser = () => (
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
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const IconUsers2 = () => (
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
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const IconCrown = () => (
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
      d="M5 13l4 4L19 7M5 13l-1-5 4 2 4-7 4 7 4-2-1 5M5 13h14v7a1 1 0 01-1 1H6a1 1 0 01-1-1v-7z"
    />
  </svg>
);

const IconReport = () => (
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
      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const IconCog = () => (
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
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

export default AdminLayout;
