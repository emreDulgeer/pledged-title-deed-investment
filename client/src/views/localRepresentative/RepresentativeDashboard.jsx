import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CircleDot,
  ClipboardCheck,
  Clock3,
  FileText,
  Globe2,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import InvestmentController from "../../controllers/investmentController";
import { selectUser } from "../../store/slices/authSlice";

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
  title_deed_pending:
    "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-300/15 dark:text-violet-200 dark:ring-violet-300/25",
  pending:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-300/15 dark:text-amber-200 dark:ring-amber-300/25",
};

const statusClassName = (status) =>
  STATUS_TONES[String(status || "").toLowerCase()] ||
  "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-300/15 dark:text-slate-200 dark:ring-slate-300/25";

const DashboardMetric = ({ icon, label, value, detail, tone = "text-sky-400" }) => (
  <div className="shell-subtle-surface px-4 py-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
          {label}
        </p>
        <p className={`mt-3 text-3xl font-semibold ${tone}`}>
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

const ListSkeleton = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((item) => (
      <div
        key={item}
        className="shell-subtle-surface h-28 animate-pulse bg-day-panel/70 dark:bg-night-panel/70"
      />
    ))}
  </div>
);

const EmptyPanel = ({ children }) => (
  <div className="shell-subtle-surface px-5 py-8 text-center text-sm text-day-muted dark:text-night-muted">
    {children}
  </div>
);

const RequestPreviewCard = ({ item }) => (
  <Link
    to={`/rep/investments/${item.id}`}
    className="group block shell-subtle-surface px-4 py-4 transition duration-200 hover:-translate-y-0.5 hover:border-day-primary/40 hover:shadow-shell dark:hover:border-night-primary/50"
  >
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold text-day-text dark:text-night-text">
            {getLocationLabel(item)}
          </h3>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-300/15 dark:text-amber-200 dark:ring-amber-300/25">
            {item.representativeRequest?.region || "Region pending"}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-day-muted dark:text-night-muted">
          {item.property?.fullAddress || "Address not provided"}
        </p>
      </div>

      <ArrowRight className="h-5 w-5 shrink-0 text-day-muted transition group-hover:translate-x-1 group-hover:text-day-primary dark:text-night-muted dark:group-hover:text-night-primary" />
    </div>

    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
          Requested
        </p>
        <p className="mt-1 font-medium text-day-text dark:text-night-text">
          {formatDate(item.representativeRequest?.requestDate)}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
          By
        </p>
        <p className="mt-1 font-medium capitalize text-day-text dark:text-night-text">
          {normalizeLabel(item.representativeRequest?.requestedByRole)}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
          Amount
        </p>
        <p className="mt-1 font-medium text-day-text dark:text-night-text">
          {formatCurrency(item.amountInvested, item.currency)}
        </p>
      </div>
    </div>
  </Link>
);

const CasePreviewCard = ({ item }) => (
  <Link
    to={`/rep/investments/${item.id}`}
    className="group block shell-subtle-surface px-4 py-4 transition duration-200 hover:-translate-y-0.5 hover:border-day-primary/40 hover:shadow-shell dark:hover:border-night-primary/50"
  >
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold text-day-text dark:text-night-text">
            {getLocationLabel(item)}
          </h3>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusClassName(
              item.status,
            )}`}
          >
            {normalizeLabel(item.status)}
          </span>
        </div>
        <p className="mt-2 text-sm text-day-muted dark:text-night-muted">
          {item.investor?.fullName || "Investor"} and{" "}
          {item.propertyOwner?.fullName || "Owner"}
        </p>
      </div>

      <ArrowRight className="h-5 w-5 shrink-0 text-day-muted transition group-hover:translate-x-1 group-hover:text-day-primary dark:text-night-muted dark:group-hover:text-night-primary" />
    </div>

    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
          Workflow Gate
        </p>
        <p className="mt-1 font-medium text-day-text dark:text-night-text">
          {item.nextStep || "-"}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
          Property
        </p>
        <p className="mt-1 font-medium capitalize text-day-text dark:text-night-text">
          {normalizeLabel(item.property?.propertyType)}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
          Amount
        </p>
        <p className="mt-1 font-medium text-day-text dark:text-night-text">
          {formatCurrency(item.amountInvested, item.currency)}
        </p>
      </div>
    </div>
  </Link>
);

const RepresentativeDashboard = () => {
  const user = useSelector(selectUser);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pool, setPool] = useState({ data: [], summary: { total: 0 } });
  const [assignments, setAssignments] = useState({
    data: [],
    summary: { total: 0, active: 0, titleDeedPending: 0 },
  });

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      try {
        setLoading(true);
        const [poolResponse, assignmentResponse] = await Promise.all([
          InvestmentController.getRepresentativeRequestPool(),
          InvestmentController.getRepresentativeAssignments(),
        ]);

        if (!ignore) {
          setPool(poolResponse?.data || { data: [], summary: { total: 0 } });
          setAssignments(
            assignmentResponse?.data || {
              data: [],
              summary: { total: 0, active: 0, titleDeedPending: 0 },
            },
          );
        }
      } catch (error) {
        console.error("Representative dashboard error:", error);
        if (!ignore) {
          setPool({ data: [], summary: { total: 0 } });
          setAssignments({
            data: [],
            summary: { total: 0, active: 0, titleDeedPending: 0 },
          });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadData();

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

  const poolItems = pool?.data || [];
  const assignmentItems = assignments?.data || [];
  const latestRequest = poolItems[0];
  const latestCase = assignmentItems[0];

  const stats = [
    {
      label: "Regions",
      value: loading ? "..." : assignedRegions.length,
      detail: "Assigned operating areas",
      tone: "text-sky-500 dark:text-sky-300",
      icon: Globe2,
    },
    {
      label: "Pending",
      value: loading ? "..." : pool?.summary?.total || 0,
      detail: "Open representative requests",
      tone: "text-amber-500 dark:text-amber-300",
      icon: Clock3,
    },
    {
      label: "Active",
      value: loading ? "..." : assignments?.summary?.active || 0,
      detail: "Claimed cases in workflow",
      tone: "text-emerald-500 dark:text-emerald-300",
      icon: BadgeCheck,
    },
    {
      label: "Title Deed",
      value: loading ? "..." : assignments?.summary?.titleDeedPending || 0,
      detail: "Cases waiting title deed",
      tone: "text-violet-500 dark:text-violet-300",
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="shell-surface relative overflow-hidden px-6 py-7 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.04),transparent)] dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.82),rgba(8,15,27,0.24))]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 ring-1 ring-sky-200 dark:bg-sky-300/10 dark:text-sky-200 dark:ring-sky-300/20">
              <ShieldCheck className="h-4 w-4" />
              Representative workspace
            </div>
            <h1 className="mt-5 text-3xl font-semibold text-day-text dark:text-night-text sm:text-4xl">
              Regional Workflow Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-day-muted dark:text-night-muted">
              Track incoming representative requests and the cases already under your follow-up.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/rep/request-pool"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-200"
            >
              Request Pool
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:border-day-primary/40 hover:text-day-primary dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:border-night-primary/50 dark:hover:text-night-primary"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr),minmax(300px,0.75fr)]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <DashboardMetric key={item.label} {...item} />
          ))}
        </div>

        <aside className="shell-surface px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-3xl bg-sky-300 text-slate-950">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-day-text dark:text-night-text">
                Assigned Regions
              </h2>
              <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
                Requests shown here are filtered by your regional coverage.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <RegionPills regions={assignedRegions} />
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
        <div className="shell-surface px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-600 dark:text-amber-300">
                <CircleDot className="h-3.5 w-3.5" />
                Open requests
              </div>
              <h2 className="mt-2 text-xl font-semibold text-day-text dark:text-night-text">
                New Request Pool
              </h2>
              <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
                Investors and owners waiting for representative review.
              </p>
            </div>
            <Link
              to="/rep/request-pool"
              className="inline-flex items-center gap-2 rounded-2xl border border-day-border bg-day-panel px-4 py-2.5 text-sm font-semibold text-day-text transition hover:border-day-primary/40 hover:text-day-primary dark:border-night-border dark:bg-night-panel dark:text-night-text dark:hover:border-night-primary/50 dark:hover:text-night-primary"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <ListSkeleton />
            ) : poolItems.length ? (
              poolItems
                .slice(0, 5)
                .map((item) => <RequestPreviewCard key={item.id} item={item} />)
            ) : (
              <EmptyPanel>No open requests in your regions right now.</EmptyPanel>
            )}
          </div>
        </div>

        <div className="shell-surface px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Claimed workflow
              </div>
              <h2 className="mt-2 text-xl font-semibold text-day-text dark:text-night-text">
                My Active Cases
              </h2>
              <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
                Claimed investments currently under your follow-up.
              </p>
            </div>
            <Link
              to="/rep/cases"
              className="inline-flex items-center gap-2 rounded-2xl border border-day-border bg-day-panel px-4 py-2.5 text-sm font-semibold text-day-text transition hover:border-day-primary/40 hover:text-day-primary dark:border-night-border dark:bg-night-panel dark:text-night-text dark:hover:border-night-primary/50 dark:hover:text-night-primary"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <ListSkeleton />
            ) : assignmentItems.length ? (
              assignmentItems
                .slice(0, 5)
                .map((item) => <CasePreviewCard key={item.id} item={item} />)
            ) : (
              <EmptyPanel>You have not claimed any case yet.</EmptyPanel>
            )}
          </div>
        </div>
      </section>

      <section className="shell-surface px-5 py-5 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
          <div className="shell-subtle-surface px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-300 text-slate-950">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
                  Next request
                </p>
                <p className="mt-1 text-sm font-semibold text-day-text dark:text-night-text">
                  {latestRequest
                    ? `${getLocationLabel(latestRequest)} · ${formatDate(
                        latestRequest.representativeRequest?.requestDate,
                      )}`
                    : "No request waiting"}
                </p>
              </div>
            </div>
          </div>

          <div className="shell-subtle-surface px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-300 text-slate-950">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
                  Latest case
                </p>
                <p className="mt-1 text-sm font-semibold text-day-text dark:text-night-text">
                  {latestCase
                    ? `${getLocationLabel(latestCase)} · ${normalizeLabel(
                        latestCase.status,
                      )}`
                    : "No claimed case yet"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RepresentativeDashboard;
