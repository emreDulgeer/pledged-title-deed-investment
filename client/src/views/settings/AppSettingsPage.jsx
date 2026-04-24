import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MonitorCog, UserRound } from "lucide-react";
import { useSelector } from "react-redux";
import { selectUser } from "../../store/slices/authSlice";
import {
  getAppSettingsPath,
  getProfileSettingsPath,
  getUserId,
  getUserProfilePath,
} from "../../utils/profileRoutes";

const AppSettingsPage = () => {
  const currentUser = useSelector(selectUser);
  const currentProfilePath = getUserProfilePath(getUserId(currentUser));
  const currentAppSettingsPath = getAppSettingsPath(currentUser?.role);

  return (
    <div className="min-h-screen bg-day-background dark:bg-night-background px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          to={currentProfilePath}
          className="inline-flex items-center gap-2 text-sm font-medium text-day-text dark:text-night-text hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Link>

        <div className="rounded-3xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-day-accent/10 p-3 text-day-accent dark:bg-night-accent/15 dark:text-night-accent">
              <MonitorCog className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-day-text dark:text-night-text">
                App Settings
              </h1>
              <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
                Central place for application-level preferences and account shortcuts.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              to={getProfileSettingsPath()}
              className="rounded-2xl border border-day-border dark:border-night-border px-5 py-4 transition-colors hover:bg-day-background dark:hover:bg-night-background"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-day-primary-light/20 p-2 text-day-primary dark:bg-night-primary-dark/20 dark:text-night-primary">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-day-text dark:text-night-text">
                    Profile Settings
                  </p>
                  <p className="mt-1 text-xs text-day-text/60 dark:text-night-text/60">
                    Manage your profile details and personal information.
                  </p>
                </div>
              </div>
            </Link>

            <div className="rounded-2xl border border-dashed border-day-border dark:border-night-border px-5 py-4 text-sm text-day-text/70 dark:text-night-text/70">
              App settings route is active at <span className="font-medium">{currentAppSettingsPath}</span>.
              Additional preferences can be added here next.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppSettingsPage;
