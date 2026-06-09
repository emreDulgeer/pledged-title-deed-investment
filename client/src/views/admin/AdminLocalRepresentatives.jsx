import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  CircleDot,
  ExternalLink,
  Globe2,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserRoundPlus,
  Users,
} from "lucide-react";

import authController from "../../controllers/authController";
import { SUPPORTED_PROPERTY_COUNTRIES } from "../../constants/propertyCountries";
import { getUserId, getUserProfilePath } from "../../utils/profileRoutes";
import { useAppFeedback } from "../../utils/hooks/useAppFeedback";

const createEmptyForm = () => ({
  fullName: "",
  email: "",
  password: "",
  phoneNumber: "",
  country: "",
  regions: [],
});

const regionOptions = SUPPORTED_PROPERTY_COUNTRIES.map((item) => item.name);

const toggleRegion = (regions, regionName) =>
  regions.includes(regionName)
    ? regions.filter((item) => item !== regionName)
    : [...regions, regionName];

const normalizeText = (value) => String(value || "").toLowerCase();

const statusClassName = (status) => {
  const normalizedStatus = normalizeText(status);

  if (normalizedStatus === "active" || normalizedStatus === "approved") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-300/15 dark:text-emerald-200 dark:ring-emerald-300/25";
  }

  if (normalizedStatus === "pending") {
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-300/15 dark:text-amber-200 dark:ring-amber-300/25";
  }

  if (normalizedStatus === "suspended" || normalizedStatus === "rejected") {
    return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-300/15 dark:text-rose-200 dark:ring-rose-300/25";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-300/15 dark:text-slate-200 dark:ring-slate-300/25";
};

const getInitials = (name = "Representative") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "LR";

const RegionPills = ({ regions = [] }) => {
  if (!regions.length) {
    return (
      <span className="rounded-full bg-day-panel px-3 py-1 text-xs font-semibold text-day-muted dark:bg-night-panel dark:text-night-muted">
        No region assigned
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {regions.map((region) => (
        <span
          key={region}
          className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200 dark:bg-sky-300/15 dark:text-sky-200 dark:ring-sky-300/25"
        >
          {region}
        </span>
      ))}
    </div>
  );
};

const FormField = ({
  autoComplete,
  children,
  icon,
  label,
  onChange,
  placeholder,
  required = false,
  type = "text",
  value,
}) => (
  <label className="space-y-2">
    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
      {label}
    </span>
    <span className="relative block">
      {React.createElement(icon, {
        className:
          "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-day-muted dark:text-night-muted",
      })}
      <input
        autoComplete={autoComplete}
        className="shell-input pl-11"
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </span>
    {children}
  </label>
);

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

const RegionSelector = ({ regions, setRegions }) => (
  <div className="grid gap-2 sm:grid-cols-2">
    {regionOptions.map((regionName) => {
      const selected = regions.includes(regionName);

      return (
        <button
          key={regionName}
          type="button"
          onClick={() => setRegions((current) => toggleRegion(current, regionName))}
          className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
            selected
              ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm dark:border-sky-400 dark:bg-sky-400/15 dark:text-sky-200"
              : "border-day-border bg-day-panel text-day-text hover:border-day-primary/40 dark:border-night-border dark:bg-night-panel dark:text-night-text dark:hover:border-night-primary/50"
          }`}
        >
          <span className="flex items-center justify-between gap-3">
            {regionName}
            {selected ? <BadgeCheck className="h-4 w-4" /> : null}
          </span>
        </button>
      );
    })}
  </div>
);

const AdminLocalRepresentatives = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const feedback = useAppFeedback();
  const [representatives, setRepresentatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(createEmptyForm);
  const [editingRepresentativeId, setEditingRepresentativeId] = useState(null);
  const [editingRegions, setEditingRegions] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let ignore = false;

    const loadRepresentatives = async () => {
      try {
        setLoading(true);
        const response = await authController.getLocalRepresentatives();
        if (!ignore) {
          setRepresentatives(Array.isArray(response?.data) ? response.data : []);
        }
      } catch (error) {
        console.error("Local representative list error:", error);
        if (!ignore) {
          setRepresentatives([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadRepresentatives();

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const filteredRepresentatives = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return representatives;
    }

    return representatives.filter((representative) =>
      [
        representative.fullName,
        representative.email,
        representative.phoneNumber,
        representative.country,
        representative.accountStatus,
        ...(representative.regions || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [deferredSearch, representatives]);

  const metrics = useMemo(() => {
    const coveredRegions = new Set(
      representatives.flatMap((representative) => representative.regions || []),
    );
    const activeCount = representatives.filter(
      (representative) =>
        normalizeText(representative.accountStatus || "active") === "active",
    ).length;
    const assignments = representatives.reduce(
      (total, representative) => total + (representative.regions || []).length,
      0,
    );

    return [
      {
        label: "Representatives",
        value: representatives.length,
        detail: "Total local accounts",
        icon: Users,
      },
      {
        label: "Active",
        value: activeCount,
        detail: "Accounts ready for work",
        icon: ShieldCheck,
      },
      {
        label: "Coverage",
        value: coveredRegions.size,
        detail: "Supported countries covered",
        icon: Globe2,
      },
      {
        label: "Assignments",
        value: assignments,
        detail: "Region links assigned",
        icon: MapPin,
      },
    ];
  }, [representatives]);

  const handleCreateRepresentative = async (event) => {
    event.preventDefault();

    if (!form.regions.length) {
      feedback.warning("Please assign at least one region.");
      return;
    }

    try {
      setSaving(true);
      const response = await authController.createLocalRepresentative(form);
      if (response?.success) {
        setForm(createEmptyForm());
        setRefreshKey((current) => current + 1);
        feedback.success("Local representative created successfully.");
      }
    } catch (error) {
      console.error("Create local representative error:", error);
      feedback.error(error.message || "Failed to create local representative.");
    } finally {
      setSaving(false);
    }
  };

  const startEditingRegions = (representative) => {
    setEditingRepresentativeId(getUserId(representative));
    setEditingRegions(representative.regions || []);
  };

  const handleSaveRegions = async (representativeId) => {
    if (!editingRegions.length) {
      feedback.warning("Please keep at least one region selected.");
      return;
    }

    try {
      setSaving(true);
      const response = await authController.updateLocalRepresentativeRegions(
        representativeId,
        editingRegions,
      );

      if (response?.success) {
        setEditingRepresentativeId(null);
        setEditingRegions([]);
        setRefreshKey((current) => current + 1);
        feedback.success("Representative regions updated.");
      }
    } catch (error) {
      console.error("Update representative regions error:", error);
      feedback.error(error.message || "Failed to update representative regions.");
    } finally {
      setSaving(false);
    }
  };

  const selectedRegionCount = form.regions.length;
  const searchLabel = deferredSearch.trim();

  return (
    <div className="space-y-6">
      <section className="shell-surface relative overflow-hidden px-6 py-7 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.04),transparent)] dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.82),rgba(8,15,27,0.2))]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 ring-1 ring-sky-200 dark:bg-sky-300/10 dark:text-sky-200 dark:ring-sky-300/20">
              <UserRoundPlus className="h-4 w-4" />
              Regional operations
            </div>
            <h1 className="mt-5 text-3xl font-semibold text-day-text dark:text-night-text sm:text-4xl">
              Local Representatives
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-day-muted dark:text-night-muted">
              Create representative accounts and keep their country coverage aligned with the supported investment markets.
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-day-muted dark:text-night-muted">
            <span className="inline-flex items-center gap-2 rounded-full bg-day-panel px-3 py-1.5 dark:bg-night-panel">
              <CircleDot className="h-3.5 w-3.5 text-sky-400" />
              {filteredRepresentatives.length} visible
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-day-panel px-3 py-1.5 dark:bg-night-panel">
              <MapPin className="h-3.5 w-3.5" />
              {regionOptions.length} supported regions
            </span>
            {searchLabel ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-day-panel px-3 py-1.5 dark:bg-night-panel">
                Search: {searchLabel}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative min-w-0 sm:w-80">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-day-muted dark:text-night-muted" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("common.search")}
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
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.95fr),minmax(0,1.35fr)]">
        <form
          onSubmit={handleCreateRepresentative}
          className="shell-surface px-5 py-6 sm:px-6"
        >
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-3xl bg-emerald-300 text-slate-950">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
                Create Representative
              </h2>
              <p className="mt-1 text-sm leading-6 text-day-muted dark:text-night-muted">
                Account credentials and at least one region are required before the representative can be created.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <FormField
              icon={UserRoundPlus}
              label={t("common.full_name")}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  fullName: event.target.value,
                }))
              }
              placeholder={t("common.full_name")}
              required
              value={form.fullName}
            />
            <FormField
              autoComplete="email"
              icon={Mail}
              label={t("common.email")}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder={t("common.email")}
              required
              type="email"
              value={form.email}
            />
            <FormField
              autoComplete="new-password"
              icon={KeyRound}
              label={t("auth.password")}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder={t("auth.password")}
              required
              type="password"
              value={form.password}
            />
            <FormField
              autoComplete="tel"
              icon={Phone}
              label={t("common.phone")}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  phoneNumber: event.target.value,
                }))
              }
              placeholder={t("common.phone")}
              value={form.phoneNumber}
            />
            <div className="sm:col-span-2">
              <FormField
                autoComplete="country-name"
                icon={Globe2}
                label={`${t("common.country")} (optional)`}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    country: event.target.value,
                  }))
                }
                placeholder={`${t("common.country")} (optional)`}
                value={form.country}
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-day-text dark:text-night-text">
                  Assigned Regions
                </h3>
                <p className="mt-1 text-xs text-day-muted dark:text-night-muted">
                  {selectedRegionCount} selected for the new account
                </p>
              </div>
            </div>

            <div className="mt-3">
              <RegionSelector
                regions={form.regions}
                setRegions={(updater) =>
                  setForm((current) => ({
                    ...current,
                    regions: updater(current.regions),
                  }))
                }
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" />
            {saving ? "Saving..." : "Create Representative"}
          </button>
        </form>

        <section className="shell-surface px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
                Current Coverage
              </h2>
              <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
                Representative accounts and their assigned operating regions.
              </p>
            </div>
            <span className="rounded-full bg-day-panel px-3 py-1.5 text-xs font-semibold text-day-muted dark:bg-night-panel dark:text-night-muted">
              {filteredRepresentatives.length} accounts
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {loading ? (
              [0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="shell-subtle-surface h-36 animate-pulse bg-day-panel/70 dark:bg-night-panel/70"
                />
              ))
            ) : filteredRepresentatives.length === 0 ? (
              <div className="shell-subtle-surface px-6 py-12 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-day-panel text-day-muted dark:bg-night-panel dark:text-night-muted">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-day-text dark:text-night-text">
                  No representative accounts found
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-day-muted dark:text-night-muted">
                  {searchLabel
                    ? "Try another name, email, status, country, or region."
                    : "Create the first local representative from the form."}
                </p>
              </div>
            ) : (
              filteredRepresentatives.map((representative) => {
                const representativeId = getUserId(representative);
                const isEditing = representativeId === editingRepresentativeId;
                const status = representative.accountStatus || "active";

                return (
                  <article
                    key={representativeId || representative.email}
                    className="shell-subtle-surface px-4 py-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-3xl bg-sky-300 text-slate-950 text-sm font-bold">
                          {getInitials(representative.fullName || representative.email)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-day-text dark:text-night-text">
                              {representative.fullName || "-"}
                            </h3>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusClassName(
                                status,
                              )}`}
                            >
                              {status}
                            </span>
                          </div>

                          <div className="mt-2 grid gap-2 text-sm text-day-muted dark:text-night-muted sm:grid-cols-2">
                            <span className="flex min-w-0 items-center gap-2">
                              <Mail className="h-4 w-4 shrink-0" />
                              <span className="truncate">
                                {representative.email || "-"}
                              </span>
                            </span>
                            <span className="flex min-w-0 items-center gap-2">
                              <Phone className="h-4 w-4 shrink-0" />
                              <span className="truncate">
                                {representative.phoneNumber || "-"}
                              </span>
                            </span>
                            <span className="flex min-w-0 items-center gap-2 sm:col-span-2">
                              <Globe2 className="h-4 w-4 shrink-0" />
                              <span className="truncate">
                                {representative.country || "Country not set"}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(getUserProfilePath(representativeId))
                          }
                          className="inline-flex items-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-2.5 text-sm font-semibold text-day-text transition hover:border-day-primary/40 hover:text-day-primary dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:border-night-primary/50 dark:hover:text-night-primary"
                        >
                          Profile
                          <ExternalLink className="h-4 w-4" />
                        </button>

                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRepresentativeId(null);
                                setEditingRegions([]);
                              }}
                              className="rounded-2xl border border-day-border bg-day-surface px-4 py-2.5 text-sm font-semibold text-day-text transition hover:bg-day-panel dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel"
                            >
                              {t("common.cancel")}
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleSaveRegions(representativeId)}
                              className="inline-flex items-center gap-2 rounded-2xl bg-sky-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Save className="h-4 w-4" />
                              Save Regions
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditingRegions(representative)}
                            className="rounded-2xl border border-day-border bg-day-surface px-4 py-2.5 text-sm font-semibold text-day-text transition hover:border-day-primary/40 hover:text-day-primary dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:border-night-primary/50 dark:hover:text-night-primary"
                          >
                            Edit Regions
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 border-t border-day-border/70 pt-4 dark:border-night-border/70">
                      {isEditing ? (
                        <RegionSelector
                          regions={editingRegions}
                          setRegions={setEditingRegions}
                        />
                      ) : (
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-1 h-4 w-4 shrink-0 text-sky-400" />
                          <RegionPills regions={representative.regions || []} />
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminLocalRepresentatives;
