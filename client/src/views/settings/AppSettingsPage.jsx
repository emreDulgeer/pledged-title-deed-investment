import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Globe2,
  MonitorCog,
  Palette,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useSelector } from "react-redux";

import { selectUser } from "../../store/slices/authSlice";
import {
  getAppSettingsPath,
  getProfileSettingsPath,
  getUserId,
  getUserProfilePath,
} from "../../utils/profileRoutes";

const ROLE_LABELS = {
  admin: "Admin Workspace",
  investor: "Investor Workspace",
  property_owner: "Owner Workspace",
  local_representative: "Representative Workspace",
};

const AppSettingsPage = () => {
  const currentUser = useSelector(selectUser);
  const currentProfilePath = getUserProfilePath(getUserId(currentUser));
  const currentAppSettingsPath = getAppSettingsPath(currentUser?.role);
  const workspaceLabel =
    ROLE_LABELS[currentUser?.role] || "Application Workspace";

  return (
    <div className="min-h-screen bg-day-background px-4 py-6 dark:bg-night-background sm:px-6 xl:px-8">
      <div className="mx-auto max-w-shell space-y-6">
        <Link
          to={currentProfilePath}
          className="inline-flex items-center gap-2 text-sm font-semibold text-day-primary transition hover:underline dark:text-night-primary"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.1} />
          Back to profile
        </Link>

        <section className="shell-surface overflow-hidden">
          <div className="relative px-6 py-7 sm:px-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-r from-day-primary/10 via-day-panel to-day-accent/10 dark:from-night-primary/10 dark:via-night-panel/40 dark:to-night-accent/10" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:border-night-border/70 dark:bg-night-surface dark:text-night-muted">
                  App settings
                </span>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
                  {workspaceLabel}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-day-muted dark:text-night-muted">
                  Central place for workspace preferences, account shortcuts,
                  notification defaults, and interface controls.
                </p>
              </div>

              <div className="rounded-3xl border border-day-border/70 bg-day-panel/70 px-5 py-4 dark:border-night-border/70 dark:bg-night-panel/70">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-day-primary text-white dark:bg-night-primary dark:text-night-background">
                    <MonitorCog className="h-5 w-5" strokeWidth={2.1} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
                      Active route
                    </p>
                    <p className="mt-1 text-sm font-semibold text-day-text dark:text-night-text">
                      {currentAppSettingsPath}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <Link
              to={getProfileSettingsPath()}
              className="shell-surface group block px-5 py-5 transition hover:-translate-y-0.5 hover:shadow-shell sm:px-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
                    <UserRound className="h-5 w-5" strokeWidth={2.1} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
                      Account
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-day-text dark:text-night-text">
                      Profile Settings
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                      Manage profile details and personal account metadata.
                    </p>
                  </div>
                </div>
                <ChevronRight className="mt-2 h-5 w-5 text-day-muted transition group-hover:translate-x-0.5 group-hover:text-day-text dark:text-night-muted dark:group-hover:text-night-text" />
              </div>
            </Link>

            <div className="shell-surface px-5 py-5 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
                Session
              </p>
              <h2 className="mt-2 text-xl font-semibold text-day-text dark:text-night-text">
                Signed-in workspace
              </h2>
              <div className="mt-5 grid gap-3">
                <InfoPill label="Role" value={currentUser?.role || "-"} />
                <InfoPill label="User ID" value={getUserId(currentUser) || "-"} />
                <InfoPill
                  label="Email"
                  value={currentUser?.email || "No email on file"}
                />
              </div>
            </div>
          </div>

          <div className="shell-surface px-5 py-5 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
                <Palette className="h-5 w-5" strokeWidth={2.1} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
                  Preferences
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-day-text dark:text-night-text">
                  Workspace controls
                </h2>
                <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                  These settings are visually ready and can be connected to
                  persisted user preferences as the backend endpoints arrive.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <PreferenceCard
                icon={Palette}
                title="Theme"
                copy="Theme switching is available from the topbar."
                status="Connected globally"
              />
              <PreferenceCard
                icon={Globe2}
                title="Language"
                copy="Language selection is handled in the shell topbar."
                status="Connected globally"
              />
              <PreferenceCard
                icon={Bell}
                title="Notifications"
                copy="Notification center and alerts are wired in the app shell."
                status="Uses workspace defaults"
              />
              <PreferenceCard
                icon={ShieldCheck}
                title="Privacy"
                copy="Profile visibility is controlled by the profile view mode."
                status="Role-aware"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const InfoPill = ({ label, value }) => (
  <div className="rounded-2xl border border-day-border/70 bg-day-panel/60 px-4 py-3 dark:border-night-border/70 dark:bg-night-panel/60">
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-day-muted dark:text-night-muted">
      {label}
    </p>
    <p className="mt-1 break-words text-sm font-semibold text-day-text dark:text-night-text">
      {value}
    </p>
  </div>
);

const PreferenceCard = ({ icon, title, copy, status }) => (
  <div className="rounded-3xl border border-day-border/70 bg-day-panel/60 px-4 py-4 dark:border-night-border/70 dark:bg-night-panel/60">
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-day-surface text-day-primary dark:bg-night-surface dark:text-night-primary">
        {React.createElement(icon, {
          className: "h-4 w-4",
          strokeWidth: 2.1,
        })}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-day-text dark:text-night-text">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-6 text-day-muted dark:text-night-muted">
          {copy}
        </p>
      </div>
    </div>
    <p className="mt-4 rounded-2xl bg-day-surface px-3 py-2 text-xs font-semibold text-day-text dark:bg-night-surface dark:text-night-text">
      {status}
    </p>
  </div>
);

export default AppSettingsPage;
