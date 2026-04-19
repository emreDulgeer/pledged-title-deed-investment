// src/components/Layouts/Admin/Topbar/ProfileButton.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Settings, UserRound } from "lucide-react";
import {
  getProfileSettingsPath,
  getUserProfilePath,
  getUserId,
} from "../../../utils/profileRoutes";

const ProfileButton = ({ theme, user }) => {
  const location = useLocation();
  const dropdownRef = useRef(null);
  const [open, setOpen] = useState(false);
  const profilePath = getUserProfilePath(getUserId(user));
  const settingsPath = getProfileSettingsPath();

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
        className="flex items-center gap-2 rounded-xl p-2 hover:bg-day-primary-light/30 dark:hover:bg-night-primary-dark/40 transition-colors"
      >
        <img
          className="h-9 w-9 rounded-full border border-day-border dark:border-night-border"
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
            user?.fullName || "User",
          )}&background=${theme === "dark" ? "00C896" : "0F9D58"}&color=fff`}
          alt="Profile"
        />
        <ChevronDown
          className={`h-4 w-4 text-day-text/70 dark:text-night-text/70 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface shadow-xl">
          <div className="border-b border-day-border dark:border-night-border px-4 py-3">
            <p className="text-sm font-semibold text-day-text dark:text-night-text">
              {user?.fullName || "User"}
            </p>
            <p className="mt-1 text-xs text-day-text/60 dark:text-night-text/60">
              {user?.email || user?.role || "Profile menu"}
            </p>
          </div>

          <div className="p-2">
            <Link
              to={profilePath}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-day-text dark:text-night-text hover:bg-day-background dark:hover:bg-night-background transition-colors"
            >
              <UserRound className="h-4 w-4" />
              Profile
            </Link>
            <Link
              to={settingsPath}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-day-text dark:text-night-text hover:bg-day-background dark:hover:bg-night-background transition-colors"
            >
              <Settings className="h-4 w-4" />
              Profile Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileButton;
