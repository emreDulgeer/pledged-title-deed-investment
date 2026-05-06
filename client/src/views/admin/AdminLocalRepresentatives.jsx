import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  MapPin,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

import authController from "../../controllers/authController";
import { SUPPORTED_PROPERTY_COUNTRIES } from "../../constants/propertyCountries";

const DEFAULT_FORM = {
  fullName: "",
  email: "",
  password: "",
  phoneNumber: "",
  country: "",
  regions: [],
};

const regionOptions = SUPPORTED_PROPERTY_COUNTRIES.map((item) => item.name);

const toggleRegion = (regions, regionName) =>
  regions.includes(regionName)
    ? regions.filter((item) => item !== regionName)
    : [...regions, regionName];

const RegionPills = ({ regions = [] }) => (
  <div className="flex flex-wrap gap-2">
    {regions.map((region) => (
      <span
        key={region}
        className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-200"
      >
        {region}
      </span>
    ))}
  </div>
);

const AdminLocalRepresentatives = () => {
  const { t } = useTranslation();
  const [representatives, setRepresentatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingRepresentativeId, setEditingRepresentativeId] = useState(null);
  const [editingRegions, setEditingRegions] = useState([]);

  const loadRepresentatives = async () => {
    try {
      setLoading(true);
      const response = await authController.getLocalRepresentatives();
      setRepresentatives(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error("Local representative list error:", error);
      setRepresentatives([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepresentatives();
  }, []);

  const filteredRepresentatives = useMemo(() => {
    if (!search.trim()) {
      return representatives;
    }

    const query = search.trim().toLowerCase();
    return representatives.filter((representative) =>
      [
        representative.fullName,
        representative.email,
        representative.accountStatus,
        ...(representative.regions || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [representatives, search]);

  const handleCreateRepresentative = async (event) => {
    event.preventDefault();

    if (!form.regions.length) {
      window.alert("Please assign at least one region.");
      return;
    }

    try {
      setSaving(true);
      const response = await authController.createLocalRepresentative(form);
      if (response?.success) {
        setForm(DEFAULT_FORM);
        await loadRepresentatives();
        window.alert("Local representative created successfully.");
      }
    } catch (error) {
      console.error("Create local representative error:", error);
      window.alert(error.message || "Failed to create local representative.");
    } finally {
      setSaving(false);
    }
  };

  const startEditingRegions = (representative) => {
    setEditingRepresentativeId(representative._id);
    setEditingRegions(representative.regions || []);
  };

  const handleSaveRegions = async (representativeId) => {
    if (!editingRegions.length) {
      window.alert("Please keep at least one region selected.");
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
        await loadRepresentatives();
        window.alert("Representative regions updated.");
      }
    } catch (error) {
      console.error("Update representative regions error:", error);
      window.alert(error.message || "Failed to update representative regions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Users className="h-7 w-7 text-sky-400" />
            <h1 className="text-2xl font-bold text-day-text dark:text-night-text">
              Local Representatives
            </h1>
          </div>
          <p className="mt-2 text-sm text-day-text/60 dark:text-night-text/60">
            Create regional representative accounts and keep their coverage aligned
            with your supported investment countries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-day-text/45 dark:text-night-text/45" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("common.search")}
              className="w-72 rounded-lg border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </label>

          <button
            type="button"
            onClick={loadRepresentatives}
            className="inline-flex items-center gap-2 rounded-lg border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface px-4 py-2 text-sm font-medium text-day-text dark:text-night-text hover:bg-day-border/10 dark:hover:bg-night-border/10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,1.4fr]">
        <form
          onSubmit={handleCreateRepresentative}
          className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <PlusCircle className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
              Create Representative
            </h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <input
              type="text"
              value={form.fullName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  fullName: event.target.value,
                }))
              }
              placeholder={t("common.full_name")}
              className="rounded-xl border border-day-border dark:border-night-border bg-transparent px-4 py-3 text-sm text-day-text dark:text-night-text focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder={t("common.email")}
              className="rounded-xl border border-day-border dark:border-night-border bg-transparent px-4 py-3 text-sm text-day-text dark:text-night-text focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder={t("auth.password")}
              className="rounded-xl border border-day-border dark:border-night-border bg-transparent px-4 py-3 text-sm text-day-text dark:text-night-text focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
            <input
              type="text"
              value={form.phoneNumber}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  phoneNumber: event.target.value,
                }))
              }
              placeholder={t("common.phone")}
              className="rounded-xl border border-day-border dark:border-night-border bg-transparent px-4 py-3 text-sm text-day-text dark:text-night-text focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <input
              type="text"
              value={form.country}
              onChange={(event) =>
                setForm((current) => ({ ...current, country: event.target.value }))
              }
              placeholder={`${t("common.country")} (optional)`}
              className="rounded-xl border border-day-border dark:border-night-border bg-transparent px-4 py-3 text-sm text-day-text dark:text-night-text focus:outline-none focus:ring-2 focus:ring-sky-500 sm:col-span-2"
            />
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-day-text dark:text-night-text">
              Assigned Regions
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {regionOptions.map((regionName) => {
                const selected = form.regions.includes(regionName);
                return (
                  <button
                    key={regionName}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        regions: toggleRegion(current.regions, regionName),
                      }))
                    }
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      selected
                        ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200"
                        : "border-day-border dark:border-night-border text-day-text dark:text-night-text hover:bg-day-border/10 dark:hover:bg-night-border/10"
                    }`}
                  >
                    {regionName}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" />
            {saving ? "Saving..." : "Create Representative"}
          </button>
        </form>

        <div className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
                Current Coverage
              </h2>
              <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
                {filteredRepresentatives.length} representative accounts
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {loading ? (
              <div className="rounded-xl border border-dashed border-day-border dark:border-night-border p-6 text-center text-sm text-day-text/60 dark:text-night-text/60">
                {t("common.loading")}
              </div>
            ) : filteredRepresentatives.length === 0 ? (
              <div className="rounded-xl border border-dashed border-day-border dark:border-night-border p-6 text-center text-sm text-day-text/60 dark:text-night-text/60">
                No representative accounts found.
              </div>
            ) : (
              filteredRepresentatives.map((representative) => {
                const isEditing =
                  representative._id === editingRepresentativeId;

                return (
                  <div
                    key={representative._id}
                    className="rounded-2xl border border-day-border dark:border-night-border bg-day-background/60 dark:bg-night-background/30 p-5"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-day-text dark:text-night-text">
                            {representative.fullName}
                          </h3>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                            {representative.accountStatus || "active"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
                          {representative.email}
                        </p>
                        <div className="mt-3 flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 text-sky-500" />
                          <RegionPills regions={representative.regions || []} />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRepresentativeId(null);
                                setEditingRegions([]);
                              }}
                              className="rounded-xl border border-day-border dark:border-night-border px-4 py-2 text-sm text-day-text dark:text-night-text"
                            >
                              {t("common.cancel")}
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                handleSaveRegions(representative._id)
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                            >
                              <Save className="h-4 w-4" />
                              Save Regions
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditingRegions(representative)}
                            className="rounded-xl border border-day-border dark:border-night-border px-4 py-2 text-sm text-day-text dark:text-night-text hover:bg-day-border/10 dark:hover:bg-night-border/10"
                          >
                            Edit Regions
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {regionOptions.map((regionName) => {
                          const selected = editingRegions.includes(regionName);
                          return (
                            <button
                              key={regionName}
                              type="button"
                              onClick={() =>
                                setEditingRegions((current) =>
                                  toggleRegion(current, regionName),
                                )
                              }
                              className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                                selected
                                  ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200"
                                  : "border-day-border dark:border-night-border text-day-text dark:text-night-text hover:bg-day-border/10 dark:hover:bg-night-border/10"
                              }`}
                            >
                              {regionName}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLocalRepresentatives;
