import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  Bell,
  Contact,
  LayoutDashboard,
  LockKeyhole,
  Save,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { selectUser } from "../../store/slices/authSlice";
import { getUserId, getUserProfilePath } from "../../utils/profileRoutes";
import { defaultPathByRole } from "../../utils/roleRedirect";

const ProfileSettingsPage = () => {
  const currentUser = useSelector(selectUser);
  const currentProfilePath = getUserProfilePath(getUserId(currentUser));
  const dashboardPath = defaultPathByRole(currentUser?.role);
  const displayName =
    currentUser?.fullName ||
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
    "Profile";

  return (
    <div className="min-h-screen bg-day-background px-4 py-6 dark:bg-night-background sm:px-6 xl:px-8">
      <div className="mx-auto max-w-shell space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={currentProfilePath}
            className="inline-flex items-center gap-2 text-sm font-semibold text-day-primary transition hover:underline dark:text-night-primary"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.1} />
            Back to profile
          </Link>

          <Link
            to={dashboardPath}
            className="inline-flex items-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel"
          >
            <LayoutDashboard className="h-4 w-4" strokeWidth={2.1} />
            Go to dashboard
          </Link>
        </div>

        <section className="shell-surface overflow-hidden">
          <div className="relative px-6 py-7 sm:px-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-r from-day-primary/10 via-day-panel to-day-accent/10 dark:from-night-primary/10 dark:via-night-panel/40 dark:to-night-accent/10" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:border-night-border/70 dark:bg-night-surface dark:text-night-muted">
                  Profile settings
                </span>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
                  Manage your identity workspace
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-day-muted dark:text-night-muted">
                  Review how your profile appears across EstateLink. Editing is
                  staged here for the next settings form pass.
                </p>
              </div>

              <div className="rounded-3xl border border-day-border/70 bg-day-panel/70 px-5 py-4 dark:border-night-border/70 dark:bg-night-panel/70">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-day-primary text-white dark:bg-night-primary dark:text-night-background">
                    <UserRound className="h-5 w-5" strokeWidth={2.1} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
                      Signed in as
                    </p>
                    <p className="mt-1 text-lg font-semibold text-day-text dark:text-night-text">
                      {displayName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="shell-surface px-5 py-5 sm:px-6">
            <SectionHeader
              icon={Contact}
              eyebrow="Identity"
              title="Profile information"
              copy="These fields mirror the current account payload."
            />

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <PreviewField label="Full name" value={displayName} />
              <PreviewField label="Email" value={currentUser?.email || "-"} />
              <PreviewField label="Role" value={currentUser?.role || "-"} />
              <PreviewField
                label="User ID"
                value={getUserId(currentUser) || "-"}
              />
            </div>

            <div className="mt-5 rounded-3xl border border-dashed border-day-border bg-day-panel/70 px-5 py-4 text-sm leading-6 text-day-muted dark:border-night-border dark:bg-night-panel/70 dark:text-night-muted">
              Profile editing controls can plug into this surface without
              changing the route or dropdown navigation.
            </div>
          </div>

          <div className="space-y-6">
            <SettingsPanel
              icon={ShieldCheck}
              title="Verification"
              copy="KYC and trust indicators stay visible on your profile."
              status={currentUser?.kycStatus || "Managed by verification flow"}
            />
            <SettingsPanel
              icon={Bell}
              title="Notifications"
              copy="Notification preferences are ready to connect when per-user controls are added."
              status="Uses current workspace defaults"
            />
            <SettingsPanel
              icon={LockKeyhole}
              title="Security"
              copy="Password, session, and device controls can live here next."
              status="Account protected"
            />
          </div>
        </section>

        <section className="shell-surface flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
              <Settings className="h-5 w-5" strokeWidth={2.1} />
            </div>
            <div>
              <p className="text-sm font-semibold text-day-text dark:text-night-text">
                Settings form placeholder
              </p>
              <p className="text-sm text-day-muted dark:text-night-muted">
                Route is wired; save action is intentionally disabled until
                backend update endpoints are connected.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-day-panel px-5 py-3 text-sm font-semibold text-day-muted dark:bg-night-panel dark:text-night-muted"
          >
            <Save className="h-4 w-4" strokeWidth={2.1} />
            Save changes
          </button>
        </section>
      </div>
    </div>
  );
};

const SectionHeader = ({ icon, eyebrow, title, copy }) => (
  <div className="flex items-start gap-3">
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
      {React.createElement(icon, {
        className: "h-5 w-5",
        strokeWidth: 2.1,
      })}
    </div>
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-day-text dark:text-night-text">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-day-muted dark:text-night-muted">
        {copy}
      </p>
    </div>
  </div>
);

const PreviewField = ({ label, value }) => (
  <div className="rounded-3xl border border-day-border/70 bg-day-panel/60 px-4 py-4 dark:border-night-border/70 dark:bg-night-panel/60">
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-day-muted dark:text-night-muted">
      {label}
    </p>
    <p className="mt-2 break-words text-sm font-semibold text-day-text dark:text-night-text">
      {value}
    </p>
  </div>
);

const SettingsPanel = ({ icon, title, copy, status }) => (
  <div className="shell-surface px-5 py-5 sm:px-6">
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
        {React.createElement(icon, {
          className: "h-5 w-5",
          strokeWidth: 2.1,
        })}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-day-text dark:text-night-text">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
          {copy}
        </p>
      </div>
    </div>
    <p className="mt-4 rounded-2xl border border-day-border/70 bg-day-panel/70 px-4 py-3 text-sm font-semibold text-day-text dark:border-night-border/70 dark:bg-night-panel/70 dark:text-night-text">
      {status}
    </p>
  </div>
);

export default ProfileSettingsPage;
