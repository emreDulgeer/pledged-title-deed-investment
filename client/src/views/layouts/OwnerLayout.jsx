// src/views/layouts/OwnerLayout.jsx
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import LayoutShell from "../../components/Layouts/common/LayoutShell";
import OwnerSidebar from "../../components/Layouts/Owner/Sidebar/OwnerSidebar";
import OwnerTopbar from "../../components/Layouts/Owner/Topbar/OwnerTopbar";

import { selectUser, logout } from "../../store/slices/authSlice";
import { toggleSidebar, selectSidebarOpen } from "../../store/slices/uiSlice";
import { useTheme } from "../../utils/hooks/useTheme";
import { useLanguage } from "../../utils/hooks/useLanguage";

const OwnerLayout = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const user = useSelector(selectUser);
  const sidebarOpen = useSelector(selectSidebarOpen);

  const { theme, toggleTheme } = useTheme();
  const { currentLanguage, changeLanguage } = useLanguage();

  const menuItems = [
    {
      title: t("navigation.dashboard"),
      path: "/owner/dashboard",
      icon: <IconHome />,
    },
    {
      title: t("navigation.properties") || "Properties",
      path: "/owner/properties",
      icon: <IconBldg />,
    },
    {
      title: t("owner.add_property") || "Create Property",
      path: "/owner/properties/new",
      icon: <IconPlusSquare />,
    },
    {
      title: t("owner.tabs.offers") || "Offers",
      path: "/owner/offers",
      icon: <IconClipboardList />,
    },
    {
      title: t("owner.rental_payments") || "Rental Payments",
      path: "/owner/rental-payments",
      icon: <IconReceipt />,
    },
    {
      title: t("navigation.notifications") || "Notifications",
      path: "/owner/notifications",
      icon: <IconBell />,
    },
    {
      title: t("navigation.settings"),
      path: "/owner/settings",
      icon: <IconCog />,
    },
  ];

  return (
    <LayoutShell
      sidebarOpen={sidebarOpen}
      sidebar={
        <OwnerSidebar
          menuItems={menuItems}
          user={user}
          onLogout={() => dispatch(logout())}
        />
      }
      topbar={
        <OwnerTopbar
          onToggleSidebar={() => dispatch(toggleSidebar())}
          theme={theme}
          toggleTheme={toggleTheme}
          currentLanguage={currentLanguage}
          changeLanguage={changeLanguage}
          user={user}
          onLogout={() => dispatch(logout())}
        />
      }
    >
      <Outlet />
    </LayoutShell>
  );
};

// ── Icons ──────────────────────────────────────────────────────────────────────

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

const IconReceipt = () => (
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
      d="M9 14h6m-6-4h6M7 21l2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1-2-1-2 1v18z"
    />
  </svg>
);

const IconClipboardList = () => (
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
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6M9 16h6"
    />
  </svg>
);

const IconPlusSquare = () => (
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
      d="M12 9v6m3-3H9m-3 9h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const IconBell = () => (
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
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 01-6 0"
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

export default OwnerLayout;
