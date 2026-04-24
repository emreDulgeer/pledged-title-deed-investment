import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
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

export const ROLE_LABELS = {
  admin: "Admin",
  investor: "Investor",
  property_owner: "Property Owner",
  local_representative: "Local Representative",
};

export const STAT_LABELS = {
  totalProperties: "Total Properties",
  publishedProperties: "Published Properties",
  totalInvestments: "Total Investments",
  activeInvestments: "Active Investments",
  completedContracts: "Completed Contracts",
  ongoingContracts: "Ongoing Contracts",
  investmentLimit: "Investment Limit",
  activeInvestmentCount: "Active Investment Count",
};

export const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-day-border/70 dark:border-night-border/70 px-4 py-3">
    <div className="rounded-xl bg-day-background dark:bg-night-background p-2">
      <Icon className="h-4 w-4 text-day-text/70 dark:text-night-text/70" />
    </div>
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-day-text/45 dark:text-night-text/45">
        {label}
      </p>
      <p className="text-sm font-medium text-day-text dark:text-night-text">
        {value || "-"}
      </p>
    </div>
  </div>
);

export const StatCard = ({ label, value }) => (
  <div className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-4">
    <p className="text-xs uppercase tracking-[0.16em] text-day-text/45 dark:text-night-text/45">
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
      className={`block rounded-3xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface overflow-hidden shadow-sm ${
        detailPath ? "transition-transform hover:-translate-y-0.5" : ""
      }`}
    >
      <div className="h-40 bg-day-background dark:bg-night-background">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`${property.city || "Property"} cover`}
            className="h-full w-full object-cover"
            style={getPropertyImageStyle(property.thumbnail)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-day-text/40 dark:text-night-text/40">
            <Building2 className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-day-text dark:text-night-text">
              {property.city || "Property"}, {property.country || "-"}
            </h3>
            <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
              {property.propertyType || "Property"} ·{" "}
              {property.requestedInvestment?.toLocaleString?.() || "-"}{" "}
              {APP_CURRENCY}
            </p>
          </div>
          <span className="rounded-full bg-day-accent/10 px-3 py-1 text-xs font-medium text-day-accent dark:bg-night-accent/15 dark:text-night-accent">
            {property.status || "-"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-day-text/70 dark:text-night-text/70">
          <div>
            <p className="text-xs uppercase tracking-[0.12em]">Yield</p>
            <p className="mt-1 font-medium text-day-text dark:text-night-text">
              {property.annualYieldPercent ?? "-"}%
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em]">Contract</p>
            <p className="mt-1 font-medium text-day-text dark:text-night-text">
              {property.contractPeriodMonths ?? "-"} months
            </p>
          </div>
        </div>

        {detailPath && (
          <p className="text-sm font-medium text-day-accent dark:text-night-accent">
            Open property
          </p>
        )}
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
      className={`block rounded-3xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5 shadow-sm ${
        detailPath ? "transition-transform hover:-translate-y-0.5" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-day-text/45 dark:text-night-text/45">
            Investment
          </p>
          <h3 className="mt-2 text-lg font-semibold text-day-text dark:text-night-text">
            {investment.property?.city || "Property"},{" "}
            {investment.property?.country || "-"}
          </h3>
        </div>
        <span className="rounded-full bg-day-primary/10 px-3 py-1 text-xs font-medium text-day-primary dark:bg-night-primary/15 dark:text-night-primary">
          {investment.status || "-"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-day-text/70 dark:text-night-text/70 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.12em]">Amount</p>
          <p className="mt-1 font-medium text-day-text dark:text-night-text">
            {investment.amountInvested?.toLocaleString?.() || "-"}{" "}
            {APP_CURRENCY}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em]">Created</p>
          <p className="mt-1 font-medium text-day-text dark:text-night-text">
            {investment.createdAt
              ? new Date(investment.createdAt).toLocaleDateString()
              : "-"}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-day-text/70 dark:text-night-text/70">
        {investment.investor?.fullName && (
          <p>
            Investor:{" "}
            <span className="font-medium text-day-text dark:text-night-text">
              {investment.investor.fullName}
            </span>
          </p>
        )}
        {investment.propertyOwner?.fullName && (
          <p>
            Owner:{" "}
            <span className="font-medium text-day-text dark:text-night-text">
              {investment.propertyOwner.fullName}
            </span>
          </p>
        )}
        {investment.localRepresentative?.fullName && (
          <p>
            Representative:{" "}
            <span className="font-medium text-day-text dark:text-night-text">
              {investment.localRepresentative.fullName}
            </span>
          </p>
        )}
      </div>

      {detailPath && (
        <p className="mt-4 text-sm font-medium text-day-accent dark:text-night-accent">
          Open investment
        </p>
      )}
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
    <div className="min-h-screen bg-day-background dark:bg-night-background px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-day-text dark:text-night-text hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {isOwnProfile && (
            <Link
              to="/profile/settings"
              className="inline-flex items-center gap-2 rounded-full border border-day-border dark:border-night-border px-4 py-2 text-sm font-medium text-day-text dark:text-night-text hover:bg-day-surface dark:hover:bg-night-surface transition-colors"
            >
              <FolderLock className="h-4 w-4" />
              Profile Settings
            </Link>
          )}
        </div>

        <section className="rounded-[2rem] border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-5">
              <img
                className="h-24 w-24 rounded-3xl border border-day-border dark:border-night-border object-cover"
                src={`https://ui-avatars.com/api/?name=${avatarName}&background=0F9D58&color=fff&size=160`}
                alt={profile.fullName}
              />

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold text-day-text dark:text-night-text">
                    {profile.fullName}
                  </h1>
                  <span className="rounded-full bg-day-accent/10 px-3 py-1 text-sm font-medium text-day-accent dark:bg-night-accent/15 dark:text-night-accent">
                    {ROLE_LABELS[profile.role] || profile.role}
                  </span>
                  <span className="rounded-full bg-day-primary/10 px-3 py-1 text-sm font-medium text-day-primary dark:bg-night-primary/15 dark:text-night-primary">
                    {isPrivateView ? "Private View" : "Public View"}
                  </span>
                </div>

                <p className="max-w-2xl text-sm leading-6 text-day-text/65 dark:text-night-text/65">
                  {isPrivateView
                    ? "Admin view includes private contact details plus this user's related properties and investments."
                    : "Public view shares non-sensitive profile information and published listings only."}
                </p>

                <div className="flex flex-wrap gap-3 text-sm text-day-text/70 dark:text-night-text/70">
                  <span className="inline-flex items-center gap-2 rounded-full bg-day-background dark:bg-night-background px-3 py-2">
                    <MapPin className="h-4 w-4" />
                    {profile.country || "Country not set"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-day-background dark:bg-night-background px-3 py-2">
                    <ShieldCheck className="h-4 w-4" />
                    KYC: {profile.kycStatus || "Unknown"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-day-background dark:bg-night-background px-3 py-2">
                    <UserRound className="h-4 w-4" />
                    Trust Score: {profile.trustScore ?? "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-5 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-day-text/45 dark:text-night-text/45">
                Member Since
              </p>
              <p className="mt-2 text-lg font-semibold text-day-text dark:text-night-text">
                {profile.memberSince
                  ? new Date(profile.memberSince).toLocaleDateString()
                  : "-"}
              </p>
            </div>
          </div>
        </section>

        {stats.length > 0 && (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map(([key, value]) => (
              <StatCard
                key={key}
                label={STAT_LABELS[key] || key}
                value={value}
              />
            ))}
          </section>
        )}

        {children}
      </div>
    </div>
  );
};
