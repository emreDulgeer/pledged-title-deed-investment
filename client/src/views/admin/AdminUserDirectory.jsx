import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  Building2,
  CircleDot,
  Crown,
  ExternalLink,
  Globe2,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";

import authController from "../../controllers/authController";
import { getUserId, getUserProfilePath } from "../../utils/profileRoutes";

const DIRECTORY_CONFIG = {
  users: {
    titleKey: "navigation.users",
    eyebrow: "Admin directory",
    subtitle: "Browse every registered account and open the full profile when review is needed.",
    roleFilter: null,
    route: "/admin/users",
    accentClass: "text-cyan-300",
    accentBgClass: "bg-cyan-300 text-slate-950",
    softAccentClass:
      "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-300/10 dark:text-cyan-200 dark:ring-cyan-300/20",
    icon: Users,
    emptyTitle: "No accounts found",
  },
  investors: {
    titleKey: "navigation.investors",
    eyebrow: "Investor registry",
    subtitle: "Monitor investor accounts, membership plans, country coverage, and profile access.",
    roleFilter: "investor",
    route: "/admin/investors",
    accentClass: "text-emerald-300",
    accentBgClass: "bg-emerald-300 text-slate-950",
    softAccentClass:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-300/10 dark:text-emerald-200 dark:ring-emerald-300/20",
    icon: ShieldCheck,
    emptyTitle: "No investors found",
  },
  propertyOwners: {
    titleKey: "navigation.property_owners",
    eyebrow: "Owner registry",
    subtitle: "Review property owner accounts and keep owner profile access one click away.",
    roleFilter: "property_owner",
    route: "/admin/property-owners",
    accentClass: "text-violet-300",
    accentBgClass: "bg-violet-300 text-slate-950",
    softAccentClass:
      "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-300/10 dark:text-violet-200 dark:ring-violet-300/20",
    icon: Building2,
    emptyTitle: "No property owners found",
  },
};

const DIRECTORY_SEGMENTS = [
  { mode: "users", label: "All users", route: "/admin/users" },
  { mode: "investors", label: "Investors", route: "/admin/investors" },
  {
    mode: "propertyOwners",
    label: "Property owners",
    route: "/admin/property-owners",
  },
  {
    mode: "localRepresentatives",
    label: "Local reps",
    route: "/admin/local-representatives",
  },
];

const ROLE_TONE = {
  admin:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-300/15 dark:text-amber-200 dark:ring-amber-300/25",
  investor:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-300/15 dark:text-emerald-200 dark:ring-emerald-300/25",
  property_owner:
    "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-300/15 dark:text-violet-200 dark:ring-violet-300/25",
  local_representative:
    "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-300/15 dark:text-sky-200 dark:ring-sky-300/25",
};

const STATUS_TONE = {
  active:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-300/15 dark:text-emerald-200 dark:ring-emerald-300/25",
  approved:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-300/15 dark:text-emerald-200 dark:ring-emerald-300/25",
  pending:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-300/15 dark:text-amber-200 dark:ring-amber-300/25",
  suspended:
    "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-300/15 dark:text-rose-200 dark:ring-rose-300/25",
  inactive:
    "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-300/15 dark:text-slate-200 dark:ring-slate-300/25",
  rejected:
    "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-300/15 dark:text-rose-200 dark:ring-rose-300/25",
};

const roleLabel = (value, t) => {
  if (value === "property_owner") {
    return t("navigation.property_owners");
  }

  if (value === "investor") {
    return t("navigation.investors");
  }

  if (value === "admin") {
    return t("navigation.admin_panel");
  }

  if (value === "local_representative") {
    return "Local Representative";
  }

  return value || "-";
};

const getInitials = (name = "User") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";

const getStatus = (user) => user?.accountStatus || user?.status || "unknown";

const getMembershipLabel = (membershipPlan) => {
  if (!membershipPlan) {
    return "-";
  }

  if (typeof membershipPlan === "string") {
    return membershipPlan;
  }

  return (
    membershipPlan.displayName ||
    membershipPlan.name ||
    membershipPlan.plan ||
    membershipPlan.type ||
    "-"
  );
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const normalizeText = (value) => String(value || "").toLowerCase();

const statusClassName = (status) =>
  STATUS_TONE[normalizeText(status)] ||
  "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-300/15 dark:text-slate-200 dark:ring-slate-300/25";

const roleClassName = (role) =>
  ROLE_TONE[role] ||
  "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-300/15 dark:text-slate-200 dark:ring-slate-300/25";

const DirectoryMetric = ({ icon, label, value, detail }) => (
  <div className="shell-subtle-surface px-4 py-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
          {label}
        </p>
        <p className="mt-3 text-3xl font-semibold text-day-text dark:text-night-text">
          {value}
        </p>
      </div>
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-muted dark:bg-night-panel dark:text-night-muted">
        {React.createElement(icon, { className: "h-5 w-5" })}
      </div>
    </div>
    <p className="mt-2 text-xs text-day-muted dark:text-night-muted">
      {detail}
    </p>
  </div>
);

const DirectorySkeleton = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((item) => (
      <div
        key={item}
        className="shell-subtle-surface h-28 animate-pulse bg-day-panel/70 dark:bg-night-panel/70"
      />
    ))}
  </div>
);

const EmptyDirectory = ({ title, search }) => (
  <div className="shell-surface px-8 py-14 text-center">
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-day-panel text-day-muted dark:bg-night-panel dark:text-night-muted">
      <Search className="h-6 w-6" />
    </div>
    <h2 className="mt-5 text-lg font-semibold text-day-text dark:text-night-text">
      {title}
    </h2>
    <p className="mx-auto mt-2 max-w-md text-sm text-day-muted dark:text-night-muted">
      {search
        ? "Try a different name, email, country, role, status, or membership search."
        : "There are no records in this directory yet."}
    </p>
  </div>
);

const UserDirectoryRow = ({ config, navigate, t, user }) => {
  const userId = getUserId(user);
  const status = getStatus(user);
  const membership = getMembershipLabel(user.membershipPlan);

  return (
    <article className="group shell-surface overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-shell">
      <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(270px,1.25fr)_minmax(180px,0.8fr)_minmax(160px,0.75fr)_minmax(180px,0.8fr)_auto] lg:items-center sm:px-6">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className={`grid h-14 w-14 shrink-0 place-items-center rounded-3xl text-base font-bold shadow-sm ${config.accentBgClass}`}
          >
            {getInitials(user.fullName || user.email)}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-day-text dark:text-night-text">
                {user.fullName || "-"}
              </h3>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${roleClassName(
                  user.role,
                )}`}
              >
                {roleLabel(user.role, t)}
              </span>
            </div>

            <div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-day-muted dark:text-night-muted">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{user.email || "-"}</span>
            </div>

            <p className="mt-2 truncate font-mono text-[11px] uppercase tracking-[0.14em] text-day-muted/80 dark:text-night-muted/80">
              {userId || "-"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
            {t("common.status")}
          </p>
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold capitalize ring-1 ${statusClassName(
              status,
            )}`}
          >
            {status || "-"}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
            {t("common.country")}
          </p>
          <div className="flex items-center gap-2 text-sm font-medium text-day-text dark:text-night-text">
            <MapPin className="h-4 w-4 text-day-muted dark:text-night-muted" />
            <span>{user.country || "-"}</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
            Membership
          </p>
          <div className="flex items-center gap-2 text-sm font-medium text-day-text dark:text-night-text">
            <Crown className="h-4 w-4 text-day-muted dark:text-night-muted" />
            <span className="truncate">{membership}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(getUserProfilePath(userId))}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-panel px-4 py-3 text-sm font-semibold text-day-text transition hover:border-day-primary/40 hover:text-day-primary dark:border-night-border dark:bg-night-panel dark:text-night-text dark:hover:border-night-primary/50 dark:hover:text-night-primary"
        >
          View profile
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>

      <div className="border-t border-day-border/70 bg-day-panel/45 px-5 py-3 dark:border-night-border/70 dark:bg-night-panel/45 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-day-muted dark:text-night-muted">
          <span>Joined {formatDate(user.createdAt || user.created_at)}</span>
          <span>Role {roleLabel(user.role, t)}</span>
          <span>Membership {membership}</span>
        </div>
      </div>
    </article>
  );
};

const AdminUserDirectory = ({ mode = "users" }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const config = DIRECTORY_CONFIG[mode] || DIRECTORY_CONFIG.users;
  const TitleIcon = config.icon;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let ignore = false;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await authController.getAllUsers();
        if (!ignore) {
          setUsers(Array.isArray(response?.data) ? response.data : []);
        }
      } catch (error) {
        console.error("AdminUserDirectory fetch error:", error);
        if (!ignore) {
          setUsers([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      ignore = true;
    };
  }, [mode, refreshKey]);

  const filteredUsers = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return users.filter((user) => {
      if (config.roleFilter && user.role !== config.roleFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        user.fullName,
        user.email,
        user.country,
        user.role,
        getStatus(user),
        getMembershipLabel(user.membershipPlan),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [config.roleFilter, deferredSearch, users]);

  const metrics = useMemo(() => {
    const activeCount = filteredUsers.filter(
      (user) => normalizeText(getStatus(user)) === "active",
    ).length;
    const countries = new Set(
      filteredUsers.map((user) => user.country).filter(Boolean),
    );
    const withMembership = filteredUsers.filter(
      (user) => getMembershipLabel(user.membershipPlan) !== "-",
    ).length;

    return [
      {
        label: "Records",
        value: filteredUsers.length,
        detail: config.roleFilter ? "Visible in this role" : "All account types",
        icon: Users,
      },
      {
        label: "Active",
        value: activeCount,
        detail: "Accounts marked active",
        icon: BadgeCheck,
      },
      {
        label: "Countries",
        value: countries.size,
        detail: "Unique profile countries",
        icon: Globe2,
      },
      {
        label: "Plans",
        value: withMembership,
        detail: "Membership values present",
        icon: Crown,
      },
    ];
  }, [config.roleFilter, filteredUsers]);

  const searchLabel = deferredSearch.trim();

  return (
    <div className="space-y-6">
      <section className="shell-surface relative overflow-hidden px-6 py-7 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(94,234,212,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.04),transparent)] dark:bg-[radial-gradient(circle_at_top_left,rgba(94,234,212,0.18),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.82),rgba(8,15,27,0.2))]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] ring-1 ${config.softAccentClass}`}
            >
              <TitleIcon className="h-4 w-4" />
              {config.eyebrow}
            </div>
            <h1 className="mt-5 text-3xl font-semibold text-day-text dark:text-night-text sm:text-4xl">
              {t(config.titleKey)}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-day-muted dark:text-night-muted">
              {config.subtitle}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[520px]">
            {metrics.map((metric) => (
              <DirectoryMetric key={metric.label} {...metric} />
            ))}
          </div>
        </div>
      </section>

      <section className="shell-surface px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {DIRECTORY_SEGMENTS.map((segment) => {
              const isActive = segment.mode === mode;

              return (
                <button
                  key={segment.mode}
                  type="button"
                  onClick={() => navigate(segment.route)}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-day-primary text-white shadow-sm dark:bg-night-primary dark:text-slate-950"
                      : "bg-day-panel text-day-muted hover:text-day-text dark:bg-night-panel dark:text-night-muted dark:hover:text-night-text"
                  }`}
                >
                  {segment.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative min-w-0 sm:w-80">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-day-muted dark:text-night-muted" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, country, status..."
                className="shell-input pl-11"
              />
            </label>

            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:border-day-primary/40 hover:text-day-primary dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:border-night-primary/50 dark:hover:text-night-primary"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t("common.refresh")}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-day-muted dark:text-night-muted">
          <span className="inline-flex items-center gap-2 rounded-full bg-day-panel px-3 py-1.5 dark:bg-night-panel">
            <CircleDot className={`h-3.5 w-3.5 ${config.accentClass}`} />
            {filteredUsers.length} visible
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-day-panel px-3 py-1.5 dark:bg-night-panel">
            <UserRoundCheck className="h-3.5 w-3.5" />
            {config.roleFilter ? roleLabel(config.roleFilter, t) : "All roles"}
          </span>
          {searchLabel ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-day-panel px-3 py-1.5 dark:bg-night-panel">
              Search: {searchLabel}
            </span>
          ) : null}
        </div>
      </section>

      {loading ? (
        <DirectorySkeleton />
      ) : filteredUsers.length === 0 ? (
        <EmptyDirectory title={config.emptyTitle} search={searchLabel} />
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <UserDirectoryRow
              key={getUserId(user) || user.email}
              config={config}
              navigate={navigate}
              t={t}
              user={user}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminUserDirectory;
