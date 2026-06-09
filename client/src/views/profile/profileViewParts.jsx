import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  FolderLock,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";
import { APP_CURRENCY } from "../../utils/currency";
import { ROLE_LABELS, STAT_LABELS } from "./profileViewConstants";

const formatDate = (value) => {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
};

const formatAmount = (value) =>
  value || value === 0 ? `${Number(value).toLocaleString("en-US")} ${APP_CURRENCY}` : "-";

export const InfoRow = ({ icon, label, value }) => {
  const Icon = icon;

  return (
    <div className="rounded-3xl border border-day-border/70 bg-day-panel/60 px-4 py-4 dark:border-night-border/70 dark:bg-night-panel/60">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-day-surface text-day-primary dark:bg-night-surface dark:text-night-primary">
          <Icon className="h-4 w-4" strokeWidth={2.1} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-day-muted dark:text-night-muted">
            {label}
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-day-text dark:text-night-text">
            {value || "-"}
          </p>
        </div>
      </div>
    </div>
  );
};

export const StatCard = ({ label, value }) => (
  <div className="shell-subtle-surface px-4 py-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
      {label}
    </p>
    <p className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
      {value}
    </p>
  </div>
);

export const PropertyCard = ({ property, detailPath }) => {
  const Wrapper = detailPath ? Link : "div";
  const thumbnailUrl = getPropertyImageUrl(property.thumbnail);
  const wrapperProps = detailPath ? { to: detailPath } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`group block overflow-hidden rounded-[28px] border border-day-border/80 bg-day-surface shadow-panel dark:border-night-border/80 dark:bg-night-surface ${
        detailPath ? "transition hover:-translate-y-0.5 hover:shadow-shell" : ""
      }`}
    >
      <div className="relative h-44 bg-day-panel dark:bg-night-panel">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`${property.city || "Property"} cover`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            style={getPropertyImageStyle(property.thumbnail)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-day-muted dark:text-night-muted">
            <Building2 className="h-9 w-9" strokeWidth={2.1} />
          </div>
        )}
        <div className="absolute left-4 top-4 rounded-full bg-day-surface/90 px-3 py-1 text-xs font-semibold text-day-text backdrop-blur dark:bg-night-surface/90 dark:text-night-text">
          {property.status || "Status pending"}
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h3 className="text-lg font-semibold text-day-text dark:text-night-text">
            {property.city || "Property"}, {property.country || "-"}
          </h3>
          <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
            {property.propertyType || "Property"} ·{" "}
            {formatAmount(property.requestedInvestment)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MiniMetric label="Yield" value={`${property.annualYieldPercent ?? "-"}%`} />
          <MiniMetric
            label="Contract"
            value={`${property.contractPeriodMonths ?? "-"} months`}
          />
        </div>

        {detailPath ? (
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-day-primary dark:text-night-primary">
            Open property
            <ArrowRight className="h-4 w-4" strokeWidth={2.1} />
          </p>
        ) : null}
      </div>
    </Wrapper>
  );
};

export const InvestmentCard = ({ investment, detailPath }) => {
  const Wrapper = detailPath ? Link : "div";
  const wrapperProps = detailPath ? { to: detailPath } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`shell-surface block p-5 ${
        detailPath ? "transition hover:-translate-y-0.5 hover:shadow-shell" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
            Investment
          </p>
          <h3 className="mt-2 text-lg font-semibold text-day-text dark:text-night-text">
            {investment.property?.city || "Property"},{" "}
            {investment.property?.country || "-"}
          </h3>
        </div>
        <span className="rounded-full border border-day-border bg-day-panel px-3 py-1 text-xs font-semibold text-day-text dark:border-night-border dark:bg-night-panel dark:text-night-text">
          {investment.status || "-"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <MiniMetric
          label="Amount"
          value={formatAmount(investment.amountInvested)}
        />
        <MiniMetric label="Created" value={formatDate(investment.createdAt)} />
      </div>

      <div className="mt-5 space-y-2 text-sm text-day-muted dark:text-night-muted">
        {investment.investor?.fullName ? (
          <RoleLine label="Investor" value={investment.investor.fullName} />
        ) : null}
        {investment.propertyOwner?.fullName ? (
          <RoleLine label="Owner" value={investment.propertyOwner.fullName} />
        ) : null}
        {investment.localRepresentative?.fullName ? (
          <RoleLine
            label="Representative"
            value={investment.localRepresentative.fullName}
          />
        ) : null}
      </div>

      {detailPath ? (
        <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-day-primary dark:text-night-primary">
          Open investment
          <ArrowRight className="h-4 w-4" strokeWidth={2.1} />
        </p>
      ) : null}
    </Wrapper>
  );
};

export const ProfilePageLayout = ({
  profile,
  isOwnProfile,
  onBack,
  children,
}) => {
  const avatarName = encodeURIComponent(profile?.fullName || "User");
  const stats = Object.entries(profile?.stats || {}).filter(
    ([, value]) => value !== null && value !== undefined,
  );
  const isPrivateView = profile?.viewMode === "private";

  return (
    <div className="min-h-screen bg-day-background px-4 py-6 dark:bg-night-background sm:px-6 xl:px-8">
      <div className="mx-auto max-w-shell space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-day-primary transition hover:underline dark:text-night-primary"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.1} />
            Back
          </button>

          {isOwnProfile ? (
            <Link
              to="/profile/settings"
              className="inline-flex items-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel"
            >
              <FolderLock className="h-4 w-4" strokeWidth={2.1} />
              Profile Settings
            </Link>
          ) : null}
        </div>

        <section className="shell-surface overflow-hidden">
          <div className="relative px-6 py-7 sm:px-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-r from-day-primary/10 via-day-panel to-day-accent/10 dark:from-night-primary/10 dark:via-night-panel/40 dark:to-night-accent/10" />
            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <img
                  className="h-24 w-24 rounded-3xl border border-day-border object-cover shadow-panel dark:border-night-border"
                  src={`https://ui-avatars.com/api/?name=${avatarName}&background=003527&color=fff&size=160`}
                  alt={profile.fullName}
                />

                <div className="min-w-0 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:border-night-border/70 dark:bg-night-surface dark:text-night-muted">
                      User profile
                    </span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
                      {isPrivateView ? "Private View" : "Public View"}
                    </span>
                  </div>

                  <div>
                    <h1 className="text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
                      {profile.fullName || "User"}
                    </h1>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-day-muted dark:text-night-muted">
                      {isPrivateView
                        ? "Admin view includes private contact details plus this user's related properties and investments."
                        : "Public view shares non-sensitive profile information and published listings only."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <ProfileChip icon={UserRound}>
                      {ROLE_LABELS[profile.role] || profile.role || "Role"}
                    </ProfileChip>
                    <ProfileChip icon={MapPin}>
                      {profile.country || "Country not set"}
                    </ProfileChip>
                    <ProfileChip icon={ShieldCheck}>
                      KYC: {profile.kycStatus || "Unknown"}
                    </ProfileChip>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-day-border/70 bg-day-panel/70 px-5 py-4 dark:border-night-border/70 dark:bg-night-panel/70">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-surface text-day-primary dark:bg-night-surface dark:text-night-primary">
                    <CalendarDays className="h-5 w-5" strokeWidth={2.1} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
                      Member Since
                    </p>
                    <p className="mt-1 text-lg font-semibold text-day-text dark:text-night-text">
                      {formatDate(profile.memberSince)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-day-muted dark:text-night-muted">
                  Trust Score:{" "}
                  <span className="font-semibold text-day-text dark:text-night-text">
                    {profile.trustScore ?? "-"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {stats.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map(([key, value]) => (
              <StatCard
                key={key}
                label={STAT_LABELS[key] || key}
                value={value}
              />
            ))}
          </section>
        ) : null}

        {children}
      </div>
    </div>
  );
};

const ProfileChip = ({ icon, children }) => {
  const Icon = icon;

  return (
    <span className="inline-flex items-center gap-2 rounded-2xl border border-day-border/70 bg-day-surface px-3 py-2 text-sm font-semibold text-day-text dark:border-night-border/70 dark:bg-night-surface dark:text-night-text">
      <Icon className="h-4 w-4 text-day-primary dark:text-night-primary" strokeWidth={2.1} />
      {children}
    </span>
  );
};

const MiniMetric = ({ label, value }) => (
  <div className="rounded-2xl border border-day-border/70 bg-day-panel/70 px-4 py-3 dark:border-night-border/70 dark:bg-night-panel/70">
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-day-muted dark:text-night-muted">
      {label}
    </p>
    <p className="mt-1 text-sm font-semibold text-day-text dark:text-night-text">
      {value}
    </p>
  </div>
);

const RoleLine = ({ label, value }) => (
  <p>
    {label}:{" "}
    <span className="font-semibold text-day-text dark:text-night-text">
      {value}
    </span>
  </p>
);
