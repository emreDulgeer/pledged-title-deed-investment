import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CalendarDays,
  CircleDot,
  ClipboardCheck,
  FileText,
  Globe2,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import InvestmentController from "../../controllers/investmentController";
import { selectUser } from "../../store/slices/authSlice";

const createEmptyAssignments = () => ({
  data: [],
  summary: { total: 0, active: 0, titleDeedPending: 0 },
});

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const formatCurrency = (amount, currency = "") => {
  if (amount === null || amount === undefined || amount === "") {
    return "-";
  }

  const numericAmount = Number(amount);
  const formattedAmount = Number.isNaN(numericAmount)
    ? amount
    : numericAmount.toLocaleString();

  return `${formattedAmount} ${currency || ""}`.trim();
};

const normalizeLabel = (value) => String(value || "-").replaceAll("_", " ");

const getLocationLabel = (item) => {
  const city = item?.property?.city;
  const country = item?.property?.country;

  if (city && country) {
    return `${city}, ${country}`;
  }

  return city || country || "Property location pending";
};

const STATUS_TONES = {
  active:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-300/15 dark:text-emerald-200 dark:ring-emerald-300/25",
  approved:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-300/15 dark:text-emerald-200 dark:ring-emerald-300/25",
  title_deed_pending:
    "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-300/15 dark:text-violet-200 dark:ring-violet-300/25",
  pending:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-300/15 dark:text-amber-200 dark:ring-amber-300/25",
  rejected:
    "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-300/15 dark:text-rose-200 dark:ring-rose-300/25",
};

const statusClassName = (status) =>
  STATUS_TONES[String(status || "").toLowerCase()] ||
  "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-300/15 dark:text-slate-200 dark:ring-slate-300/25";

const CaseMetric = ({ detail, icon, label, tone = "text-sky-400", value }) => (
  <div className="shell-subtle-surface px-4 py-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
          {label}
        </p>
        <p className={`mt-3 text-3xl font-semibold ${tone}`}>{value}</p>
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

const RegionPills = ({ regions }) => {
  if (!regions.length) {
    return (
      <span className="rounded-full bg-day-panel px-3 py-1.5 text-xs font-semibold text-day-muted dark:bg-night-panel dark:text-night-muted">
        No assigned region
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {regions.map((region) => (
        <span
          key={region}
          className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-200 dark:bg-sky-300/15 dark:text-sky-200 dark:ring-sky-300/25"
        >
          {region}
        </span>
      ))}
    </div>
  );
};

const DetailTile = ({ icon, label, value }) => (
  <div className="rounded-2xl border border-day-border/70 bg-day-panel/70 px-4 py-4 dark:border-night-border/70 dark:bg-night-panel/70">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
      {React.createElement(icon, { className: "h-3.5 w-3.5" })}
      {label}
    </div>
    <p className="mt-2 text-sm font-semibold capitalize text-day-text dark:text-night-text">
      {value}
    </p>
  </div>
);

const CaseSkeleton = () => (
  <div className="grid gap-5 xl:grid-cols-2">
    {[0, 1, 2, 3].map((item) => (
      <div
        key={item}
        className="shell-surface h-80 animate-pulse bg-day-panel/70 dark:bg-night-panel/70"
      />
    ))}
  </div>
);

const EmptyState = ({ hasSearch }) => (
  <div className="shell-surface px-8 py-14 text-center">
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-day-panel text-day-muted dark:bg-night-panel dark:text-night-muted">
      <Search className="h-6 w-6" />
    </div>
    <h2 className="mt-5 text-lg font-semibold text-day-text dark:text-night-text">
      No claimed cases found
    </h2>
    <p className="mx-auto mt-2 max-w-md text-sm text-day-muted dark:text-night-muted">
      {hasSearch
        ? "Try another property, status, party, or workflow gate."
        : "You have not claimed any representative cases yet."}
    </p>
  </div>
);

const CaseCard = ({ item }) => (
  <article className="shell-surface overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-shell">
    <div className="px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-semibold text-day-text dark:text-night-text">
              {getLocationLabel(item)}
            </h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${statusClassName(
                item.status,
              )}`}
            >
              {normalizeLabel(item.status)}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-day-muted dark:text-night-muted">
            {item.property?.fullAddress || "Address not provided"}
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-day-panel px-3 py-1.5 text-xs font-semibold text-day-muted dark:bg-night-panel dark:text-night-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-300" />
          Claimed
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <DetailTile
          icon={ClipboardCheck}
          label="Workflow Gate"
          value={item.nextStep || "-"}
        />
        <DetailTile
          icon={Banknote}
          label="Investment Amount"
          value={formatCurrency(item.amountInvested, item.currency)}
        />
        <DetailTile
          icon={UserRound}
          label="Investor"
          value={item.investor?.fullName || "-"}
        />
        <DetailTile
          icon={Users}
          label="Owner"
          value={item.propertyOwner?.fullName || "-"}
        />
        <DetailTile
          icon={Building2}
          label="Property Type"
          value={normalizeLabel(item.property?.propertyType)}
        />
        <DetailTile
          icon={CalendarDays}
          label="Updated"
          value={formatDate(item.updatedAt || item.updated_at || item.createdAt)}
        />
      </div>
    </div>

    <div className="border-t border-day-border/70 bg-day-panel/45 px-5 py-4 dark:border-night-border/70 dark:bg-night-panel/45 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-day-muted dark:text-night-muted">
          <span className="font-semibold uppercase tracking-[0.18em]">
            Case ID
          </span>{" "}
          <span className="font-mono">{item.id || "-"}</span>
        </div>
        <Link
          to={`/rep/investments/${item.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-200"
        >
          Manage workflow
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </article>
);

const RepresentativeCases = () => {
  const user = useSelector(selectUser);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [assignments, setAssignments] = useState(createEmptyAssignments);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let ignore = false;

    const loadAssignments = async () => {
      try {
        setLoading(true);
        const response = await InvestmentController.getRepresentativeAssignments();
        if (!ignore) {
          setAssignments(response?.data || createEmptyAssignments());
        }
      } catch (error) {
        console.error("Representative assignments error:", error);
        if (!ignore) {
          setAssignments(createEmptyAssignments());
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadAssignments();

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const assignedRegions = useMemo(() => {
    if (Array.isArray(user?.regions) && user.regions.length) {
      return user.regions;
    }

    return user?.region ? [user.region] : [];
  }, [user]);

  const cases = useMemo(() => assignments.data || [], [assignments.data]);

  const filteredCases = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return cases;
    }

    return cases.filter((item) =>
      [
        item.property?.city,
        item.property?.country,
        item.property?.fullAddress,
        item.property?.propertyType,
        item.status,
        item.nextStep,
        item.investor?.fullName,
        item.propertyOwner?.fullName,
        item.amountInvested,
        item.currency,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [cases, deferredSearch]);

  const metrics = useMemo(() => {
    const regionCount = new Set(
      cases.map((item) => item.property?.country).filter(Boolean),
    ).size;

    return [
      {
        label: "Total",
        value: loading ? "..." : assignments.summary?.total || cases.length,
        detail: "Cases assigned to you",
        icon: ClipboardCheck,
        tone: "text-sky-500 dark:text-sky-300",
      },
      {
        label: "Active",
        value: loading ? "..." : assignments.summary?.active || 0,
        detail: "Cases currently in workflow",
        icon: BadgeCheck,
        tone: "text-emerald-500 dark:text-emerald-300",
      },
      {
        label: "Title Deed",
        value: loading ? "..." : assignments.summary?.titleDeedPending || 0,
        detail: "Waiting title deed progress",
        icon: FileText,
        tone: "text-violet-500 dark:text-violet-300",
      },
      {
        label: "Visible",
        value: loading ? "..." : filteredCases.length,
        detail: `${regionCount} property countries represented`,
        icon: Search,
        tone: "text-amber-500 dark:text-amber-300",
      },
    ];
  }, [
    assignments.summary?.active,
    assignments.summary?.titleDeedPending,
    assignments.summary?.total,
    cases,
    filteredCases.length,
    loading,
  ]);

  const searchLabel = deferredSearch.trim();

  return (
    <div className="space-y-6">
      <section className="shell-surface relative overflow-hidden px-6 py-7 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.04),transparent)] dark:bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.82),rgba(8,15,27,0.24))]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-300/10 dark:text-emerald-200 dark:ring-emerald-300/20">
              <ClipboardCheck className="h-4 w-4" />
              Claimed workflow
            </div>
            <h1 className="mt-5 text-3xl font-semibold text-day-text dark:text-night-text sm:text-4xl">
              My Representative Cases
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-day-muted dark:text-night-muted">
              Monitor the investments you manage, inspect the next workflow gate,
              and open the case detail when action is needed.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/rep/request-pool"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:border-day-primary/40 hover:text-day-primary dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:border-night-primary/50 dark:hover:text-night-primary"
            >
              Request Pool
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr),minmax(300px,0.36fr)]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <CaseMetric key={metric.label} {...metric} />
          ))}
        </div>

        <aside className="shell-surface px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-3xl bg-emerald-300 text-slate-950">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-day-text dark:text-night-text">
                Assigned Regions
              </h2>
              <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
                Claimed cases stay tied to your representative coverage.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <RegionPills regions={assignedRegions} />
          </div>
        </aside>
      </section>

      <section className="shell-surface px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-day-muted dark:text-night-muted">
            <span className="inline-flex items-center gap-2 rounded-full bg-day-panel px-3 py-1.5 dark:bg-night-panel">
              <CircleDot className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-300" />
              {filteredCases.length} visible
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-day-panel px-3 py-1.5 dark:bg-night-panel">
              <Globe2 className="h-3.5 w-3.5" />
              {cases.length} claimed records
            </span>
            {searchLabel ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-day-panel px-3 py-1.5 dark:bg-night-panel">
                Search: {searchLabel}
              </span>
            ) : null}
          </div>

          <label className="relative min-w-0 lg:w-96">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-day-muted dark:text-night-muted" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search cases, parties, status..."
              className="shell-input pl-11"
            />
          </label>
        </div>
      </section>

      {loading ? (
        <CaseSkeleton />
      ) : filteredCases.length === 0 ? (
        <EmptyState hasSearch={Boolean(searchLabel)} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredCases.map((item) => (
            <CaseCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default RepresentativeCases;
