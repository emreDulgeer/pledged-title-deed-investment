import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Mail,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import authController from "../../controllers/authController";

const DIRECTORY_CONFIG = {
  users: {
    titleKey: "navigation.users",
    subtitle: "Browse all registered accounts",
    roleFilter: null,
    accentClass: "text-cyan-300",
    badgeClass: "bg-cyan-300 text-slate-950",
    icon: Users,
  },
  investors: {
    titleKey: "navigation.investors",
    subtitle: "Monitor investor accounts and statuses",
    roleFilter: "investor",
    accentClass: "text-emerald-300",
    badgeClass: "bg-emerald-300 text-slate-950",
    icon: ShieldCheck,
  },
  propertyOwners: {
    titleKey: "navigation.property_owners",
    subtitle: "Review property owner profiles and activity",
    roleFilter: "property_owner",
    accentClass: "text-violet-300",
    badgeClass: "bg-violet-300 text-slate-950",
    icon: User,
  },
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

  return value || "-";
};

const AdminUserDirectory = ({ mode = "users" }) => {
  const { t } = useTranslation();
  const config = DIRECTORY_CONFIG[mode] || DIRECTORY_CONFIG.users;
  const TitleIcon = config.icon;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await authController.getAllUsers();
      setUsers(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error("AdminUserDirectory fetch error:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [mode]);

  const filteredUsers = users.filter((user) => {
    if (config.roleFilter && user.role !== config.roleFilter) {
      return false;
    }

    if (!search.trim()) {
      return true;
    }

    const haystack = [
      user.fullName,
      user.email,
      user.country,
      user.role,
      user.accountStatus,
      user.membershipPlan,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(search.trim().toLowerCase());
  });

  const activeCount = filteredUsers.filter(
    (user) => user.accountStatus === "active"
  ).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <TitleIcon className={`h-7 w-7 ${config.accentClass}`} />
            <h1 className="text-2xl font-bold text-day-text dark:text-night-text">
              {t(config.titleKey)}
            </h1>
          </div>
          <p className="mt-2 text-sm text-day-text/60 dark:text-night-text/60">
            {config.subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-day-text/45 dark:text-night-text/45" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("common.search")}
              className="w-full rounded-lg border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent sm:w-72"
            />
          </label>

          <button
            type="button"
            onClick={fetchUsers}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface px-4 py-2 text-sm font-medium text-day-text dark:text-night-text hover:bg-day-border/15 dark:hover:bg-night-border/15 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5">
          <p className="text-sm text-day-text/60 dark:text-night-text/60">
            {t("common.total")}
          </p>
          <p className="mt-2 text-3xl font-semibold text-day-text dark:text-night-text">
            {filteredUsers.length}
          </p>
        </div>

        <div className="rounded-xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5">
          <p className="text-sm text-day-text/60 dark:text-night-text/60">
            {t("common.status")}
          </p>
          <p className="mt-2 text-3xl font-semibold text-day-text dark:text-night-text">
            {activeCount}
          </p>
          <p className="mt-1 text-xs text-day-text/50 dark:text-night-text/50">
            Active
          </p>
        </div>

        <div className="rounded-xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5">
          <p className="text-sm text-day-text/60 dark:text-night-text/60">
            {t("common.search")}
          </p>
          <p className="mt-2 text-sm font-medium text-day-text dark:text-night-text">
            {search.trim() || "-"}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-day-border/10 dark:bg-night-border/10">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-day-text/55 dark:text-night-text/55">
                  {t("common.full_name")}
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-day-text/55 dark:text-night-text/55">
                  {t("common.email")}
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-day-text/55 dark:text-night-text/55">
                  {t("common.role")}
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-day-text/55 dark:text-night-text/55">
                  {t("common.country")}
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-day-text/55 dark:text-night-text/55">
                  {t("common.status")}
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-day-text/55 dark:text-night-text/55">
                  Membership
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-day-border dark:divide-night-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-day-text/60 dark:text-night-text/60"
                  >
                    {t("common.loading")}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-day-text/60 dark:text-night-text/60"
                  >
                    No records found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-day-border/5 dark:hover:bg-night-border/5"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`grid h-10 w-10 place-items-center rounded-full ${config.badgeClass}`}>
                          <User className="h-4 w-4" strokeWidth={2.4} />
                        </div>
                        <div>
                          <p className="font-medium text-day-text dark:text-night-text">
                            {user.fullName || "-"}
                          </p>
                          <p className="text-xs text-day-text/50 dark:text-night-text/50">
                            {user._id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-day-text dark:text-night-text">
                        <Mail className="h-4 w-4 text-day-text/45 dark:text-night-text/45" />
                        <span>{user.email || "-"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-day-text dark:text-night-text">
                      {roleLabel(user.role, t)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-day-text dark:text-night-text">
                        <MapPin className="h-4 w-4 text-day-text/45 dark:text-night-text/45" />
                        <span>{user.country || "-"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-day-border/20 dark:bg-night-border/20 px-3 py-1 text-xs font-medium text-day-text dark:text-night-text">
                        {user.accountStatus || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-day-text dark:text-night-text">
                      {user.membershipPlan || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUserDirectory;
