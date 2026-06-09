import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  MonitorCog,
  Settings,
  UserRound,
} from "lucide-react";
import {
  getAppSettingsPath,
  getProfileSettingsPath,
  getUserProfilePath,
  getUserId,
} from "../../../utils/profileRoutes";

const menuItemClassName =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-day-text transition-colors hover:bg-day-panel/80 dark:text-night-text dark:hover:bg-night-panel/80";

const ProfileButton = ({ theme, user, onLogout }) => {
  const location = useLocation();
  const dropdownRef = useRef(null);
  const [open, setOpen] = useState(false);
  const profilePath = getUserProfilePath(getUserId(user));
  const settingsPath = getProfileSettingsPath();
  const appSettingsPath = getAppSettingsPath(user?.role);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="Open profile menu"
        className="flex items-center gap-3 rounded-2xl border border-transparent px-2 py-1.5 transition-all hover:border-day-border hover:bg-day-panel dark:hover:border-night-border dark:hover:bg-night-panel"
      >
        <img
          className="h-9 w-9 rounded-full border border-day-border dark:border-night-border"
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
            user?.fullName || "User",
          )}&background=${theme === "dark" ? "95D3BA" : "003527"}&color=fff`}
          alt="Profile"
        />
        <div className="hidden text-left xl:block">
          <p className="max-w-[10rem] truncate text-sm font-semibold text-day-text dark:text-night-text">
            {user?.fullName || "User"}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
            {user?.role?.replaceAll("_", " ") || "Workspace"}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-day-muted dark:text-night-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-[28px] border border-day-border/80 bg-day-surface shadow-panel dark:border-night-border/80 dark:bg-night-surface">
          <div className="border-b border-day-border/70 px-4 py-4 dark:border-night-border/70">
            <p className="text-sm font-semibold text-day-text dark:text-night-text">
              {user?.fullName || "User"}
            </p>
            <p className="mt-1 text-xs text-day-text/60 dark:text-night-text/60">
              {user?.email || user?.role || "Profile menu"}
            </p>
          </div>

          <div className="p-2">
            <Link to={profilePath} className={menuItemClassName}>
              <UserRound className="h-4 w-4" />
              Profile
            </Link>
            <Link to={settingsPath} className={menuItemClassName}>
              <Settings className="h-4 w-4" />
              Profile Settings
            </Link>
            <Link to={appSettingsPath} className={menuItemClassName}>
              <MonitorCog className="h-4 w-4" />
              App Settings
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout?.();
              }}
              className={menuItemClassName}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileButton;
