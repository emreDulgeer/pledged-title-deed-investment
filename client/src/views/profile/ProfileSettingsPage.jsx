import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, Settings } from "lucide-react";
import { selectUser } from "../../store/slices/authSlice";
import { getUserId, getUserProfilePath } from "../../utils/profileRoutes";

const ProfileSettingsPage = () => {
  const currentUser = useSelector(selectUser);
  const currentProfilePath = getUserProfilePath(getUserId(currentUser));

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
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-day-text dark:text-night-text">
                Profile Settings
              </h1>
              <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
                This area is ready in the navigation, but the settings form will
                be added next.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-dashed border-day-border dark:border-night-border px-5 py-6 text-sm text-day-text/70 dark:text-night-text/70">
            Settings is currently a placeholder. The dropdown route is wired and
            you can safely navigate here from the avatar menu.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;
