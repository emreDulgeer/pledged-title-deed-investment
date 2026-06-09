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
  Clock3,
  Globe2,
  Handshake,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import InvestmentController from "../../controllers/investmentController";
import { selectUser } from "../../store/slices/authSlice";
import { useAppFeedback } from "../../utils/hooks/useAppFeedback";

const createEmptyPool = () => ({ data: [], summary: { total: 0 } });

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

const RequestMetric = ({ detail, icon, label, value, tone = "text-sky-400" }) => (
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

const RequestSkeleton = () => (
  <div className="grid gap-4 xl:grid-cols-2">
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
      No open requests found
    </h2>
    <p className="mx-auto mt-2 max-w-md text-sm text-day-muted dark:text-night-muted">
      {hasSearch
        ? "Try another city, region, party, status, or property type."
        : "There are no representative requests in your assigned regions right now."}
    </p>
  </div>
);

const RequestCard = ({ claimingId, item, onClaim }) => {
  const isClaiming = claimingId === item.id;

  return (
    <article className="shell-surface overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-shell">
      <div className="px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold text-day-text dark:text-night-text">
                {getLocationLabel(item)}
              </h2>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-300/15 dark:text-amber-200 dark:ring-amber-300/25">
                {item.representativeRequest?.region || "Region pending"}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-day-muted dark:text-night-muted">
              {item.property?.fullAddress || "Address not provided"}
            </p>
          </div>

          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-day-panel px-3 py-1.5 text-xs font-semibold capitalize text-day-muted dark:bg-night-panel dark:text-night-muted">
            <CircleDot className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300" />
            {normalizeLabel(item.status)}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <DetailTile
            icon={Banknote}
            label="Investment Amount"
            value={formatCurrency(item.amountInvested, item.currency)}
          />
          <DetailTile
            icon={Building2}
            label="Property Type"
            value={normalizeLabel(item.property?.propertyType)}
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
            icon={Handshake}
            label="Requested By"
            value={normalizeLabel(item.representativeRequest?.requestedByRole)}
          />
          <DetailTile
            icon={CalendarDays}
            label="Requested On"
            value={formatDate(item.representativeRequest?.requestDate)}
          />
        </div>
      </div>

      <div className="border-t border-day-border/70 bg-day-panel/45 px-5 py-4 dark:border-night-border/70 dark:bg-night-panel/45 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to={`/rep/investments/${item.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:border-day-primary/40 hover:text-day-primary dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:border-night-primary/50 dark:hover:text-night-primary"
          >
            Review Opportunity
            <ArrowRight className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={() => onClaim(item.id)}
            disabled={isClaiming}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isClaiming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <BadgeCheck className="h-4 w-4" />
                Claim and Manage
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};

const RepresentativeRequestPool = () => {
  const user = useSelector(selectUser);
  const feedback = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [pool, setPool] = useState(createEmptyPool);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let ignore = false;

    const loadPool = async () => {
      try {
        setLoading(true);
        const response = await InvestmentController.getRepresentativeRequestPool();
        if (!ignore) {
          setPool(response?.data || createEmptyPool());
        }
      } catch (error) {
        console.error("Representative request pool error:", error);
        if (!ignore) {
          setPool(createEmptyPool());
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadPool();

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

  const requests = useMemo(() => pool.data || [], [pool.data]);
  const filteredRequests = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return requests;
    }

    return requests.filter((item) =>
      [
        item.property?.city,
        item.property?.country,
        item.property?.fullAddress,
        item.property?.propertyType,
        item.status,
        item.representativeRequest?.region,
        item.representativeRequest?.requestedByRole,
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
  }, [deferredSearch, requests]);

  const metrics = useMemo(() => {
    const regions = new Set(
      requests
        .map((item) => item.representativeRequest?.region)
        .filter(Boolean),
    );
    const parties = new Set(
      requests.flatMap((item) =>
        [item.investor?.fullName, item.propertyOwner?.fullName].filter(Boolean),
      ),
    );

    return [
      {
        label: "Open",
        value: loading ? "..." : pool.summary?.total || requests.length,
        detail: "Requests available to claim",
        icon: Clock3,
        tone: "text-amber-500 dark:text-amber-300",
      },
      {
        label: "Visible",
        value: loading ? "..." : filteredRequests.length,
        detail: "Matched by current filters",
        icon: Search,
        tone: "text-sky-500 dark:text-sky-300",
      },
      {
        label: "Regions",
        value: loading ? "..." : regions.size,
        detail: "Request regions represented",
        icon: Globe2,
        tone: "text-cyan-500 dark:text-cyan-300",
      },
      {
        label: "Parties",
        value: loading ? "..." : parties.size,
        detail: "Investors and owners in queue",
        icon: Users,
        tone: "text-emerald-500 dark:text-emerald-300",
      },
    ];
  }, [filteredRequests.length, loading, pool.summary?.total, requests]);

  const handleClaim = async (investmentId) => {
    try {
      setClaimingId(investmentId);
      const response =
        await InvestmentController.claimRepresentativeRequest(investmentId);

      if (response?.success) {
        const poolResponse =
          await InvestmentController.getRepresentativeRequestPool();
        setPool(poolResponse?.data || createEmptyPool());
        feedback.success("Request claimed successfully.");
      }
    } catch (error) {
      console.error("Claim representative request error:", error);
      feedback.error(error.message || "Failed to claim representative request.");
    } finally {
      setClaimingId(null);
    }
  };

  const searchLabel = deferredSearch.trim();

  return (
    <div className="space-y-6">
      <section className="shell-surface relative overflow-hidden px-6 py-7 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.04),transparent)] dark:bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.82),rgba(8,15,27,0.24))]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700 ring-1 ring-amber-200 dark:bg-amber-300/10 dark:text-amber-200 dark:ring-amber-300/20">
              <Handshake className="h-4 w-4" />
              Claim queue
            </div>
            <h1 className="mt-5 text-3xl font-semibold text-day-text dark:text-night-text sm:text-4xl">
              Representative Request Pool
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-day-muted dark:text-night-muted">
              Review regional requests, inspect the parties and property context,
              then claim the cases you will manage.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/rep/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:border-day-primary/40 hover:text-day-primary dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:border-night-primary/50 dark:hover:text-night-primary"
            >
              Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-200"
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
            <RequestMetric key={metric.label} {...metric} />
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
                Pool visibility follows your regional assignment.
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
              <CircleDot className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300" />
              {filteredRequests.length} visible
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-day-panel px-3 py-1.5 dark:bg-night-panel">
              <ShieldCheck className="h-3.5 w-3.5" />
              Claiming moves the request into your cases
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
              placeholder="Search city, region, party, status..."
              className="shell-input pl-11"
            />
          </label>
        </div>
      </section>

      {loading ? (
        <RequestSkeleton />
      ) : filteredRequests.length === 0 ? (
        <EmptyState hasSearch={Boolean(searchLabel)} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredRequests.map((item) => (
            <RequestCard
              key={item.id}
              claimingId={claimingId}
              item={item}
              onClaim={handleClaim}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RepresentativeRequestPool;
