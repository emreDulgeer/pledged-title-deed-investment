// src/components/Dashboards/AdminDashboard.jsx
import React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  Clock3,
  Eye,
  FileSearch,
  Landmark,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from "lucide-react";

import bridge from "../../controllers/bridge";
import { selectUser } from "../../store/slices/authSlice";
import {
  getPrimaryPropertyImage,
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";

const REVIEW_LIMIT = 10;

const formatDate = (value) => {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const formatKeyLabel = (value = "") =>
  String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";

const getUserId = (user) => user?._id || user?.id || "";

const getUserName = (user) =>
  user?.fullName ||
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.email ||
  "Pending user";

const getUserInitials = (user) => {
  const name = getUserName(user);
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
};

const getPropertyId = (property) => property?.id || property?._id || "";

const getPropertyTitle = (property) =>
  property?.title ||
  property?.fullAddress ||
  [property?.city, property?.country].filter(Boolean).join(", ") ||
  "Property";

const getPropertyLocation = (property) =>
  [property?.city, property?.country].filter(Boolean).join(", ") ||
  property?.fullAddress ||
  "Location pending";

const normalizeArray = (value, fallbackKey = "") => {
  if (Array.isArray(value)) return value;
  if (fallbackKey && Array.isArray(value?.[fallbackKey])) {
    return value[fallbackKey];
  }
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const getOldestDate = (items) => {
  const timestamps = items
    .map((item) => new Date(item?.createdAt || item?.updatedAt || "").getTime())
    .filter((timestamp) => Number.isFinite(timestamp));

  if (timestamps.length === 0) return "";

  return new Date(Math.min(...timestamps)).toISOString();
};

const SummaryCard = ({
  label,
  value,
  helpText = "",
  icon: Icon,
  accentClass = "",
}) => (
  <div className="shell-subtle-surface px-4 py-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
          {label}
        </p>
        <p
          className={`mt-3 text-2xl font-semibold text-day-text dark:text-night-text ${accentClass}`.trim()}
        >
          {value}
        </p>
        {helpText ? (
          <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
            {helpText}
          </p>
        ) : null}
      </div>

      {Icon ? (
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-day-surface text-day-primary dark:bg-night-surface dark:text-night-primary">
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </div>
      ) : null}
    </div>
  </div>
);

const LoadingRows = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="shell-subtle-surface flex animate-pulse items-center gap-4 px-4 py-4"
      >
        <div className="h-14 w-14 rounded-2xl bg-day-surface dark:bg-night-surface" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-2/3 rounded-full bg-day-surface dark:bg-night-surface" />
          <div className="h-3 w-1/2 rounded-full bg-day-surface dark:bg-night-surface" />
        </div>
        <div className="h-10 w-24 rounded-2xl bg-day-surface dark:bg-night-surface" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ icon, title, copy, actionLabel, onAction }) => (
  <div className="px-6 py-12 text-center">
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
      {React.createElement(icon, { className: "h-6 w-6", strokeWidth: 2.1 })}
    </div>
    <h3 className="mt-5 text-xl font-semibold text-day-text dark:text-night-text">
      {title}
    </h3>
    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-day-muted dark:text-night-muted">
      {copy}
    </p>
    {actionLabel ? (
      <button
        type="button"
        onClick={onAction}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark"
      >
        {actionLabel}
        <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
      </button>
    ) : null}
  </div>
);

const QueuePanel = ({
  title,
  copy,
  count,
  icon,
  accentClass = "",
  actionLabel,
  onAction,
  children,
}) => (
  <section className="shell-surface overflow-hidden">
    <div className="border-b border-day-border/70 px-5 py-5 dark:border-night-border/70 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary ${accentClass}`.trim()}
          >
            {React.createElement(icon, {
              className: "h-5 w-5",
              strokeWidth: 2.2,
            })}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-day-text dark:text-night-text">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
              {copy}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-day-border/70 bg-day-panel/70 px-3 py-1.5 text-xs font-semibold text-day-muted dark:border-night-border/70 dark:bg-night-panel/70 dark:text-night-muted">
            {count} item{count === 1 ? "" : "s"}
          </span>
          {actionLabel ? (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-2 rounded-2xl border border-day-border bg-day-surface px-3 py-2 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
            >
              {actionLabel}
              <ArrowRight className="h-4 w-4" strokeWidth={2.1} />
            </button>
          ) : null}
        </div>
      </div>
    </div>

    <div className="p-5 sm:p-6">{children}</div>
  </section>
);

const UserReviewRow = ({ user, onOpen }) => (
  <div className="shell-subtle-surface px-4 py-4">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-day-primary/10 text-sm font-semibold text-day-primary dark:bg-night-primary/15 dark:text-night-primary">
          {getUserInitials(user)}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-day-text dark:text-night-text">
              {getUserName(user)}
            </h3>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              KYC pending
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-day-muted dark:text-night-muted">
            {user.email || "Email missing"}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-day-muted dark:text-night-muted">
            <span>{user.country || "Country pending"}</span>
            <span>Created {formatDate(user.createdAt)}</span>
            {user.role ? <span>{formatKeyLabel(user.role)}</span> : null}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark"
      >
        Review KYC
        <Eye className="h-4 w-4" strokeWidth={2.1} />
      </button>
    </div>
  </div>
);

const PropertyReviewRow = ({ property, onOpen }) => {
  const image = getPrimaryPropertyImage(property);
  const imageUrl = getPropertyImageUrl(image);

  return (
    <div className="shell-subtle-surface px-4 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[24px] bg-day-panel dark:bg-night-panel">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={getPropertyTitle(property)}
                className="h-full w-full object-cover"
                style={getPropertyImageStyle(image)}
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-day-primary/35 dark:text-night-primary/35">
                <Building2 className="h-8 w-8" strokeWidth={1.8} />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                {formatKeyLabel(property.status || "draft")}
              </span>
              <span className="rounded-full bg-day-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-primary dark:bg-night-surface dark:text-night-primary">
                {formatKeyLabel(property.propertyType || "property")}
              </span>
            </div>

            <h3 className="mt-3 text-base font-semibold text-day-text dark:text-night-text">
              {getPropertyTitle(property)}
            </h3>
            <div className="mt-2 flex items-start gap-2 text-sm text-day-muted dark:text-night-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{getPropertyLocation(property)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-day-muted dark:text-night-muted">
              <span>Created {formatDate(property.createdAt)}</span>
              {property.owner?.fullName ? (
                <span>Owner {property.owner.fullName}</span>
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark"
        >
          Review property
          <Eye className="h-4 w-4" strokeWidth={2.1} />
        </button>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const adminUser = useSelector(selectUser);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingProperties, setPendingProperties] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [errors, setErrors] = useState([]);

  const fetchPendingUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await bridge.auth.getPendingKycUsers();
      if (response?.success) {
        setPendingUsers(normalizeArray(response.data, "users"));
      } else {
        setPendingUsers([]);
      }
    } catch (error) {
      console.error("Error fetching pending users:", error);
      setPendingUsers([]);
      setErrors((current) => [
        ...current.filter((item) => item !== "users"),
        "users",
      ]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchPendingProperties = useCallback(async () => {
    setLoadingProperties(true);
    try {
      const response = await bridge.properties.adminGetAll({
        status: "draft",
        limit: REVIEW_LIMIT,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (response?.success) {
        setPendingProperties(
          normalizeArray(response.data).filter(
            (property) => property.status === "draft",
          ),
        );
      } else {
        setPendingProperties([]);
      }
    } catch (error) {
      console.error("Error fetching pending properties:", error);
      setPendingProperties([]);
      setErrors((current) => [
        ...current.filter((item) => item !== "properties"),
        "properties",
      ]);
    } finally {
      setLoadingProperties(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setErrors([]);
    fetchPendingUsers();
    fetchPendingProperties();
  }, [fetchPendingProperties, fetchPendingUsers]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const dashboardStats = useMemo(() => {
    const totalPending = pendingUsers.length + pendingProperties.length;
    const oldestUserDate = getOldestDate(pendingUsers);
    const oldestPropertyDate = getOldestDate(pendingProperties);

    return {
      totalPending,
      oldestUserDate,
      oldestPropertyDate,
      hasReviewLoad: totalPending > 0,
    };
  }, [pendingProperties, pendingUsers]);

  const loadingAny = loadingUsers || loadingProperties;
  const adminName =
    adminUser?.fullName ||
    [adminUser?.firstName, adminUser?.lastName].filter(Boolean).join(" ") ||
    adminUser?.email ||
    "Admin";

  return (
    <div className="space-y-6 p-4 sm:p-6 xl:p-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
        <div className="shell-surface flex h-full flex-col justify-between px-6 py-7 sm:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-day-primary dark:border-night-border/70 dark:bg-night-surface dark:text-night-primary">
              Admin command center
            </span>
            <span className="rounded-full border border-day-border/70 bg-day-panel/70 px-3 py-1 text-xs font-medium text-day-muted dark:border-night-border/70 dark:bg-night-panel/70 dark:text-night-muted">
              Review operations
            </span>
          </div>

          <div className="mt-6 max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
              {t("navigation.admin_panel", "Admin Panel")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-day-muted dark:text-night-muted">
              Welcome back,{" "}
              <span className="font-semibold text-day-text dark:text-night-text">
                {adminName}
              </span>
              . Triage KYC reviews, property approvals, and platform exceptions
              from one focused workspace.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label={t("dashboard.kyc_pending", "KYC pending")}
              value={loadingUsers ? "—" : pendingUsers.length}
              helpText={
                dashboardStats.oldestUserDate
                  ? `Oldest request ${formatDate(dashboardStats.oldestUserDate)}.`
                  : "No loaded KYC request is waiting."
              }
              icon={UserCheck}
              accentClass={
                pendingUsers.length > 0
                  ? "text-amber-700 dark:text-amber-200"
                  : "text-emerald-600 dark:text-emerald-300"
              }
            />
            <SummaryCard
              label={t("dashboard.properties_pending", "Properties pending")}
              value={loadingProperties ? "—" : pendingProperties.length}
              helpText={
                dashboardStats.oldestPropertyDate
                  ? `Oldest draft ${formatDate(dashboardStats.oldestPropertyDate)}.`
                  : "No loaded property draft is waiting."
              }
              icon={Building2}
              accentClass={
                pendingProperties.length > 0
                  ? "text-amber-700 dark:text-amber-200"
                  : "text-emerald-600 dark:text-emerald-300"
              }
            />
            <SummaryCard
              label={t("dashboard.total_pending", "Total pending")}
              value={loadingAny ? "—" : dashboardStats.totalPending}
              helpText="Combined KYC and property review workload."
              icon={AlertTriangle}
              accentClass={
                dashboardStats.totalPending > 0
                  ? "text-rose-700 dark:text-rose-300"
                  : "text-emerald-600 dark:text-emerald-300"
              }
            />
            <SummaryCard
              label="Review health"
              value={
                loadingAny
                  ? "—"
                  : dashboardStats.hasReviewLoad
                    ? "Action needed"
                    : "Clear"
              }
              helpText="Refresh pulls the latest pending queues."
              icon={ShieldCheck}
            />
          </div>
        </div>

        <aside className="shell-surface flex h-full flex-col px-6 py-7 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-day-muted dark:text-night-muted">
                Primary actions
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
                Move reviews faster
              </h2>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
              <FileSearch className="h-5 w-5" strokeWidth={2.2} />
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-day-muted dark:text-night-muted">
            Jump into the queues that unblock users and properties, then refresh
            this surface after each decision pass.
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => navigate("/admin/properties?tab=draft")}
              className="inline-flex w-full items-center justify-between rounded-2xl bg-day-primary px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
            >
              <span>Open property review</span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin/users")}
              className="inline-flex w-full items-center justify-between rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 focus:outline-none focus:ring-4 focus:ring-day-primary/10 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60 dark:focus:ring-night-primary/10"
            >
              <span>Open user directory</span>
              <UsersRound className="h-4 w-4" strokeWidth={2.1} />
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex w-full items-center justify-between rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 focus:outline-none focus:ring-4 focus:ring-day-primary/10 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60 dark:focus:ring-night-primary/10"
            >
              <span>{t("dashboard.refresh", "Refresh")}</span>
              {loadingAny ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
              ) : (
                <RefreshCw className="h-4 w-4" strokeWidth={2.2} />
              )}
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            <SummaryCard
              label="KYC queue"
              value={loadingUsers ? "—" : pendingUsers.length}
              helpText="Identity documents awaiting admin review."
              icon={BadgeCheck}
            />
            <SummaryCard
              label="Property queue"
              value={loadingProperties ? "—" : pendingProperties.length}
              helpText={`${REVIEW_LIMIT} newest draft assets are loaded here.`}
              icon={Clock3}
            />
          </div>
        </aside>
      </section>

      {errors.length > 0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          Some admin queues could not be loaded: {errors.join(", ")}.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <QueuePanel
          title={t("dashboard.users_pending_kyc", "Users pending KYC approval")}
          copy="Review identity status, country, registration date, and supporting KYC detail from the dedicated user file."
          count={pendingUsers.length}
          icon={UserCheck}
          actionLabel="View users"
          onAction={() => navigate("/admin/users")}
        >
          {loadingUsers ? (
            <LoadingRows count={4} />
          ) : pendingUsers.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title={t("dashboard.no_users_pending", "No users pending")}
              copy="No KYC request is waiting in the loaded queue right now."
              actionLabel="Open user directory"
              onAction={() => navigate("/admin/users")}
            />
          ) : (
            <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
              {pendingUsers.map((user, index) => (
                <UserReviewRow
                  key={getUserId(user) || `${user.email || "user"}-${index}`}
                  user={user}
                  onOpen={() => {
                    const userId = getUserId(user);
                    if (userId) {
                      navigate(`/auth/admin/pending-kyc/${userId}`);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </QueuePanel>

        <QueuePanel
          title={t("dashboard.properties_pending", "Properties pending")}
          copy="Inspect draft property submissions before they enter marketplace visibility and official-data review."
          count={pendingProperties.length}
          icon={Building2}
          actionLabel="View queue"
          onAction={() => navigate("/admin/properties?tab=draft")}
        >
          {loadingProperties ? (
            <LoadingRows count={4} />
          ) : pendingProperties.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title={t(
                "dashboard.no_properties_pending",
                "No properties pending",
              )}
              copy="No draft property is waiting in the loaded admin review queue."
              actionLabel="Open property review"
              onAction={() => navigate("/admin/properties?tab=draft")}
            />
          ) : (
            <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
              {pendingProperties.map((property, index) => (
                <PropertyReviewRow
                  key={getPropertyId(property) || `property-${index}`}
                  property={property}
                  onOpen={() => {
                    const propertyId = getPropertyId(property);
                    if (propertyId) {
                      navigate(`/admin/properties/${propertyId}`);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </QueuePanel>
      </section>
    </div>
  );
};

export default AdminDashboard;
