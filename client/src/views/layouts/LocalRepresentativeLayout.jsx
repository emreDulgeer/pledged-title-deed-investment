import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet } from "react-router-dom";

import LayoutShell from "../../components/Layouts/common/LayoutShell";
import RepresentativeSidebar from "../../components/Layouts/Representative/Sidebar/RepresentativeSidebar";
import OwnerTopbar from "../../components/Layouts/Owner/Topbar/OwnerTopbar";
import { selectUser, logout } from "../../store/slices/authSlice";
import { toggleSidebar, selectSidebarOpen } from "../../store/slices/uiSlice";
import { useTheme } from "../../utils/hooks/useTheme";
import { useLanguage } from "../../utils/hooks/useLanguage";

const LocalRepresentativeLayout = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const sidebarOpen = useSelector(selectSidebarOpen);
  const { theme, toggleTheme } = useTheme();
  const { currentLanguage, changeLanguage } = useLanguage();

  const menuItems = [
    {
      title: "Dashboard",
      path: "/rep/dashboard",
      icon: <IconHome />,
    },
    {
      title: "Request Pool",
      path: "/rep/request-pool",
      icon: <IconInbox />,
    },
    {
      title: "My Cases",
      path: "/rep/cases",
      icon: <IconFolder />,
    },
    {
      title: "Settings",
      path: "/rep/settings",
      icon: <IconCog />,
    },
  ];

  return (
    <LayoutShell
      sidebarOpen={sidebarOpen}
      sidebar={
        <RepresentativeSidebar
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

const IconInbox = () => (
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
      d="M20 13V5a2 2 0 00-2-2H6a2 2 0 00-2 2v8m16 0l-2.586 2.586A2 2 0 0114.586 16H9.414a2 2 0 01-1.414-.586L5 13m15 0H5"
    />
  </svg>
);

const IconFolder = () => (
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
      d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
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

export default LocalRepresentativeLayout;
