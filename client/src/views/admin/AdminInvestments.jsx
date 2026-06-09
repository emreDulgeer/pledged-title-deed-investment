// client/src/views/admin/AdminInvestments.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowRight,
  ArrowUpDown,
  BadgeCheck,
  Banknote,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Landmark,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";

import { fetchInvestments } from "../../store/slices/investmentSlice";
import {
  selectInvestmentError,
  selectInvestmentLoading,
  selectInvestmentPagination,
  selectInvestments,
} from "../../store/slices/investmentSlice";
import {
  getInvestmentDetailPath,
  getInvestmentPropertyPath,
  getUserId,
  getUserProfilePath,
} from "../../utils/profileRoutes";
import {
  getPrimaryPropertyImage,
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";
import { APP_CURRENCY } from "../../utils/currency";

const DEFAULT_FILTERS = {
  query: "",
  status: "",
  minAmount: "",
  maxAmount: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  limit: 10,
};

const EMPTY_INVESTMENTS = [];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "offer_sent", label: "Offer sent" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "payment_received", label: "Payment received" },
  { value: "contract_pending", label: "Contract pending" },
  { value: "contract_signed", label: "Contract signed" },
  { value: "title_deed_pending", label: "Title deed pending" },
  { value: "title_deed_received", label: "Title deed received" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "refunded", label: "Refunded" },
  { value: "defaulted", label: "Defaulted" },
  { value: "rejected", label: "Rejected" },
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Created date" },
  { value: "amountInvested", label: "Amount invested" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const STATUS_STYLES = {
  offer_sent:
    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200",
  pending_payment:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  payment_received:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  contract_pending:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200",
  contract_signed:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200",
  title_deed_pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
  title_deed_received:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-200",
  active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  completed:
    "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
  refunded:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200",
  defaulted:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
  rejected:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
};

const formatAmount = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: APP_CURRENCY,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatCompactAmount = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: APP_CURRENCY,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

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

const normalizePagination = (pagination, fallbackCount = 0, fallbackLimit = 10) => {
  const currentPage = Number(pagination?.currentPage || pagination?.page || 1);
  const totalPages = Number(pagination?.totalPages || pagination?.pages || 1);
  const totalItems = Number(
    pagination?.totalItems || pagination?.total || fallbackCount || 0,
  );
  const itemsPerPage = Number(
    pagination?.itemsPerPage || pagination?.limit || fallbackLimit,
  );

  return {
    currentPage,
    totalPages: Math.max(1, totalPages),
    totalItems,
    itemsPerPage,
    hasPrev:
      typeof pagination?.hasPrev === "boolean"
        ? pagination.hasPrev
        : currentPage > 1,
    hasNext:
      typeof pagination?.hasNext === "boolean"
        ? pagination.hasNext
        : currentPage < totalPages,
  };
};

const getInvestmentId = (investment) => investment?.id || investment?._id || "";

const getStatusClass = (status) =>
  STATUS_STYLES[status] ||
  "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200";

const getPersonName = (person, fallback = "Unknown") =>
  person?.fullName ||
  [person?.firstName, person?.lastName].filter(Boolean).join(" ") ||
  person?.email ||
  fallback;

const getPersonInitials = (person, fallback = "NA") => {
  const name = getPersonName(person, fallback);
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
};

const getPropertyTitle = (investment) =>
  investment?.property?.title ||
  investment?.property?.fullAddress ||
  [investment?.property?.city, investment?.property?.country]
    .filter(Boolean)
    .join(", ") ||
  "Property";

const getPropertyLocation = (investment) =>
  [investment?.property?.city, investment?.property?.country]
    .filter(Boolean)
    .join(", ") ||
  investment?.property?.fullAddress ||
  "Location pending";

const getPropertyId = (investment) =>
  investment?.property?.id || investment?.property?._id || investment?.propertyId || "";

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

const FilterField = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
      {label}
    </span>
    {children}
  </label>
);

const MetricBlock = ({ label, value, accentClass = "" }) => (
  <div className="shell-subtle-surface px-4 py-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
      {label}
    </p>
    <p
      className={`mt-3 text-base font-semibold text-day-text dark:text-night-text ${accentClass}`.trim()}
    >
      {value}
    </p>
  </div>
);

const StatusBadge = ({ status, t }) => (
  <span
    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getStatusClass(
      status,
    )}`}
  >
    {t(`investments.status.${status}`, formatKeyLabel(status))}
  </span>
);

const LoadingCard = () => (
  <div className="shell-surface overflow-hidden">
    <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_auto]">
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 animate-pulse rounded-[24px] bg-day-panel/70 dark:bg-night-panel/70" />
        <div className="flex-1 space-y-3">
          <div className="h-3 w-28 animate-pulse rounded-full bg-day-panel/70 dark:bg-night-panel/70" />
          <div className="h-7 w-2/3 animate-pulse rounded-full bg-day-panel/70 dark:bg-night-panel/70" />
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-day-panel/70 dark:bg-night-panel/70" />
        </div>
      </div>
      <div className="h-28 animate-pulse rounded-3xl bg-day-panel/70 dark:bg-night-panel/70" />
      <div className="h-28 animate-pulse rounded-3xl bg-day-panel/70 dark:bg-night-panel/70" />
      <div className="h-12 w-36 animate-pulse self-center justify-self-start rounded-2xl bg-day-panel/70 dark:bg-night-panel/70 lg:justify-self-end" />
    </div>
  </div>
);

const EmptyState = ({ onClear }) => (
  <div className="shell-surface overflow-hidden px-6 py-14 text-center sm:px-10">
    <div className="mx-auto max-w-lg">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
        <Search className="h-7 w-7" strokeWidth={2.1} />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-day-text dark:text-night-text">
        No investments in this view
      </h2>
      <p className="mt-3 text-sm leading-6 text-day-muted dark:text-night-muted">
        Try clearing filters or widening the amount range to inspect more
        investment lifecycle records.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
      >
        Clear filters
        <X className="h-4 w-4" strokeWidth={2.2} />
      </button>
    </div>
  </div>
);

const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  const start = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
  const end = Math.min(
    pagination.currentPage * pagination.itemsPerPage,
    pagination.totalItems,
  );

  return (
    <div className="shell-surface flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-day-muted dark:text-night-muted">
        Showing {start}-{end} of {pagination.totalItems} investment record
        {pagination.totalItems === 1 ? "" : "s"}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!pagination.hasPrev}
          onClick={() => onPageChange(pagination.currentPage - 1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-day-border bg-day-surface text-day-text transition hover:bg-day-panel/60 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <div className="rounded-2xl border border-day-border bg-day-surface px-4 py-2.5 text-sm font-medium text-day-text dark:border-night-border dark:bg-night-surface dark:text-night-text">
          {pagination.currentPage} / {pagination.totalPages}
        </div>
        <button
          type="button"
          disabled={!pagination.hasNext}
          onClick={() => onPageChange(pagination.currentPage + 1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-day-border bg-day-surface text-day-text transition hover:bg-day-panel/60 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
};

const PersonPill = ({ person, label, onOpen }) => {
  const hasProfile = Boolean(getUserId(person));

  return (
    <div className="shell-subtle-surface flex items-center gap-3 px-3 py-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-day-surface text-xs font-semibold text-day-primary dark:bg-night-surface dark:text-night-primary">
        {getPersonInitials(person, label)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-day-muted dark:text-night-muted">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-day-text dark:text-night-text">
          {getPersonName(person, label)}
        </p>
      </div>
      {hasProfile ? (
        <button
          type="button"
          onClick={onOpen}
          className="rounded-xl border border-day-border bg-day-surface px-3 py-1.5 text-xs font-semibold text-day-text transition hover:bg-day-panel dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel"
        >
          Profile
        </button>
      ) : null}
    </div>
  );
};

const InvestmentCard = ({ investment, t, onOpen, onOpenInvestor, onOpenOwner, onOpenProperty }) => {
  const image = getPrimaryPropertyImage(investment?.property);
  const imageUrl = getPropertyImageUrl(image);
  const investmentId = getInvestmentId(investment);
  const propertyId = getPropertyId(investment);

  return (
    <article className="shell-surface overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-shell">
      <div className="grid gap-5 px-5 py-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-start">
        <div className="flex items-start gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[24px] bg-day-panel dark:bg-night-panel">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={getPropertyTitle(investment)}
                className="h-full w-full object-cover"
                style={getPropertyImageStyle(image)}
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-day-primary/35 dark:text-night-primary/35">
                <Landmark className="h-8 w-8" strokeWidth={1.8} />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={investment.status} t={t} />
              <span className="rounded-full bg-day-panel px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-primary dark:bg-night-panel dark:text-night-primary">
                {investmentId ? `#${String(investmentId).slice(-6)}` : "No id"}
              </span>
            </div>

            <h2 className="mt-3 text-xl font-semibold text-day-text dark:text-night-text">
              {getPropertyTitle(investment)}
            </h2>
            <div className="mt-2 flex items-start gap-2 text-sm text-day-muted dark:text-night-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{getPropertyLocation(investment)}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-day-muted dark:text-night-muted">
              <span>Opened {formatDate(investment.createdAt)}</span>
              <span>Updated {formatDate(investment.updatedAt || investment.createdAt)}</span>
              {propertyId ? <span>Property linked</span> : null}
            </div>
          </div>
        </div>

        <MetricBlock
          label={t("investments.amount_invested", "Amount invested")}
          value={formatAmount(investment.amountInvested)}
          accentClass="text-emerald-600 dark:text-emerald-300"
        />

        <div className="space-y-3">
          <PersonPill
            person={investment.investor}
            label="Investor"
            onOpen={onOpenInvestor}
          />
          <PersonPill
            person={investment.propertyOwner}
            label="Owner"
            onOpen={onOpenOwner}
          />
        </div>

        <div className="flex flex-col items-start gap-3 xl:items-end">
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
          >
            View investment
            <Eye className="h-4 w-4" strokeWidth={2.1} />
          </button>
          {propertyId ? (
            <button
              type="button"
              onClick={onOpenProperty}
              className="inline-flex items-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
            >
              View property
              <Building2 className="h-4 w-4" strokeWidth={2.1} />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
};

const AdminInvestments = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const loading = useSelector(selectInvestmentLoading);
  const error = useSelector(selectInvestmentError);
  const investments = useSelector(selectInvestments) || EMPTY_INVESTMENTS;
  const rawPagination = useSelector(selectInvestmentPagination);
  const [page, setPage] = useState(1);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);

  const pagination = useMemo(
    () =>
      normalizePagination(
        rawPagination,
        investments.length,
        appliedFilters.limit,
      ),
    [appliedFilters.limit, investments.length, rawPagination],
  );

  const loadInvestments = useCallback(
    (nextPage = page, nextFilters = appliedFilters) => {
      dispatch(
        fetchInvestments({
          page: nextPage,
          limit: nextFilters.limit,
          q: nextFilters.query || undefined,
          status: nextFilters.status || undefined,
          amountInvestedMin: nextFilters.minAmount || undefined,
          amountInvestedMax: nextFilters.maxAmount || undefined,
          sortBy: nextFilters.sortBy,
          sortOrder: nextFilters.sortOrder,
        }),
      );
    },
    [appliedFilters, dispatch, page],
  );

  useEffect(() => {
    loadInvestments();
  }, [loadInvestments]);

  const pageSummary = useMemo(() => {
    const totalAmount = investments.reduce(
      (sum, investment) => sum + Number(investment?.amountInvested || 0),
      0,
    );
    const activeCount = investments.filter((investment) =>
      ["contract_signed", "title_deed_pending", "active"].includes(
        investment.status,
      ),
    ).length;
    const exceptionCount = investments.filter((investment) =>
      ["defaulted", "refunded", "rejected"].includes(investment.status),
    ).length;
    const titleDeedCount = investments.filter(
      (investment) => investment.status === "title_deed_pending",
    ).length;

    return {
      totalAmount,
      activeCount,
      exceptionCount,
      titleDeedCount,
    };
  }, [investments]);

  const selectedStatusLabel =
    STATUS_OPTIONS.find((option) => option.value === appliedFilters.status)
      ?.label || "All statuses";
  const selectedSortLabel =
    SORT_OPTIONS.find((option) => option.value === appliedFilters.sortBy)
      ?.label || "Created date";
  const selectedSortDirection =
    appliedFilters.sortOrder === "asc" ? "Ascending" : "Descending";

  const handleDraftFilterChange = (key, value) => {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleApplyFilters = () => {
    setPage(1);
    setAppliedFilters(draftFilters);
  };

  const handleClearFilters = () => {
    setPage(1);
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
  };

  const handleExport = () => {
    const rows = investments.map((investment) => ({
      id: getInvestmentId(investment),
      investor: getPersonName(investment.investor, "Investor"),
      investorEmail: investment.investor?.email || "",
      propertyOwner: getPersonName(investment.propertyOwner, "Owner"),
      property: getPropertyTitle(investment),
      location: getPropertyLocation(investment),
      amountInvested: investment.amountInvested || "",
      currency: APP_CURRENCY,
      status: formatKeyLabel(investment.status),
      createdAt: investment.createdAt || "",
    }));

    const headers = Object.keys(
      rows[0] || {
        id: "",
        investor: "",
        investorEmail: "",
        propertyOwner: "",
        property: "",
        location: "",
        amountInvested: "",
        currency: "",
        status: "",
        createdAt: "",
      },
    );
    const escapeCell = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((header) => escapeCell(row[header])).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "admin-investments.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const openInvestment = (investment) => {
    const investmentPath = getInvestmentDetailPath(
      "admin",
      getInvestmentId(investment),
    );

    if (investmentPath) {
      navigate(investmentPath);
    }
  };

  const openPersonProfile = (person) => {
    const personId = getUserId(person);
    if (personId) {
      navigate(getUserProfilePath(personId));
    }
  };

  const openProperty = (investment) => {
    const propertyPath = getInvestmentPropertyPath(
      "admin",
      getPropertyId(investment),
    );

    if (propertyPath) {
      navigate(propertyPath);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 xl:p-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
        <div className="shell-surface flex h-full flex-col justify-between px-6 py-7 sm:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-day-primary dark:border-night-border/70 dark:bg-night-surface dark:text-night-primary">
              Investment oversight
            </span>
            <span className="rounded-full border border-day-border/70 bg-day-panel/70 px-3 py-1 text-xs font-medium text-day-muted dark:border-night-border/70 dark:bg-night-panel/70 dark:text-night-muted">
              Platform lifecycle ledger
            </span>
          </div>

          <div className="mt-6 max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
              {t("admin.investments.title", "Investments")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-day-muted dark:text-night-muted">
              {t(
                "admin.investments.subtitle",
                "Monitor investor capital, property ownership context, lifecycle status, and exceptions across the platform.",
              )}
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total records"
              value={pagination.totalItems || investments.length}
              helpText={`${investments.length} loaded on this page.`}
              icon={ShieldCheck}
            />
            <SummaryCard
              label="Capital on page"
              value={formatCompactAmount(pageSummary.totalAmount)}
              helpText="Sum of visible investment amounts."
              icon={Banknote}
              accentClass="text-emerald-600 dark:text-emerald-300"
            />
            <SummaryCard
              label="Active flow"
              value={pageSummary.activeCount}
              helpText={`${pageSummary.titleDeedCount} title-deed case${
                pageSummary.titleDeedCount === 1 ? "" : "s"
              } visible.`}
              icon={BadgeCheck}
            />
            <SummaryCard
              label="Exceptions"
              value={pageSummary.exceptionCount}
              helpText="Defaulted, refunded, rejected records on page."
              icon={Filter}
              accentClass={
                pageSummary.exceptionCount > 0
                  ? "text-rose-700 dark:text-rose-300"
                  : ""
              }
            />
          </div>
        </div>

        <aside className="shell-surface flex h-full flex-col px-6 py-7 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-day-muted dark:text-night-muted">
                Ledger controls
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
                Manage this view
              </h2>
            </div>

            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
              <SlidersHorizontal className="h-5 w-5" strokeWidth={2.2} />
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-day-muted dark:text-night-muted">
            Filter the ledger, export the visible slice, or refresh the current
            lifecycle records after admin decisions.
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => navigate("/admin/properties")}
              className="inline-flex w-full items-center justify-between rounded-2xl bg-day-primary px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
            >
              <span>Open properties</span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </button>

            <button
              type="button"
              onClick={() => loadInvestments()}
              className="inline-flex w-full items-center justify-between rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 focus:outline-none focus:ring-4 focus:ring-day-primary/10 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60 dark:focus:ring-night-primary/10"
            >
              <span>Refresh ledger</span>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
              ) : (
                <RefreshCw className="h-4 w-4" strokeWidth={2.2} />
              )}
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex w-full items-center justify-between rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 focus:outline-none focus:ring-4 focus:ring-day-primary/10 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60 dark:focus:ring-night-primary/10"
            >
              <span>Export CSV</span>
              <Download className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            <SummaryCard label="Status filter" value={selectedStatusLabel} />
            <SummaryCard
              label="Sort order"
              value={`${selectedSortLabel}, ${selectedSortDirection}`}
            />
            <SummaryCard
              label="Page size"
              value={`${appliedFilters.limit} per page`}
            />
          </div>
        </aside>
      </section>

      <section className="shell-surface px-4 py-4 sm:px-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(190px,0.7fr)_minmax(160px,0.45fr)_minmax(160px,0.45fr)]">
          <FilterField label={t("common.search", "Search")}>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-day-muted dark:text-night-muted"
                strokeWidth={2.2}
              />
              <input
                value={draftFilters.query}
                onChange={(event) =>
                  handleDraftFilterChange("query", event.target.value)
                }
                className="shell-input pl-11"
                placeholder="Search investor, owner, property, or id"
              />
            </div>
          </FilterField>

          <FilterField label={t("common.status", "Status")}>
            <select
              value={draftFilters.status}
              onChange={(event) =>
                handleDraftFilterChange("status", event.target.value)
              }
              className="shell-input"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label={t("admin.investments.min_amount", "Min amount")}>
            <input
              value={draftFilters.minAmount}
              onChange={(event) =>
                handleDraftFilterChange(
                  "minAmount",
                  event.target.value.replace(/\D/g, ""),
                )
              }
              inputMode="numeric"
              className="shell-input"
              placeholder="0"
            />
          </FilterField>

          <FilterField label={t("admin.investments.max_amount", "Max amount")}>
            <input
              value={draftFilters.maxAmount}
              onChange={(event) =>
                handleDraftFilterChange(
                  "maxAmount",
                  event.target.value.replace(/\D/g, ""),
                )
              }
              inputMode="numeric"
              className="shell-input"
              placeholder="No limit"
            />
          </FilterField>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(220px,0.8fr)_minmax(180px,0.55fr)_minmax(160px,0.45fr)_auto] xl:items-end">
          <FilterField label={t("admin.investments.sort_by", "Sort by")}>
            <select
              value={draftFilters.sortBy}
              onChange={(event) =>
                handleDraftFilterChange("sortBy", event.target.value)
              }
              className="shell-input"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Direction">
            <select
              value={draftFilters.sortOrder}
              onChange={(event) =>
                handleDraftFilterChange("sortOrder", event.target.value)
              }
              className="shell-input"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </FilterField>

          <FilterField label="Page size">
            <select
              value={draftFilters.limit}
              onChange={(event) =>
                handleDraftFilterChange("limit", Number(event.target.value))
              }
              className="shell-input"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} per page
                </option>
              ))}
            </select>
          </FilterField>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleApplyFilters}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
            >
              <ArrowUpDown className="h-4 w-4" strokeWidth={2.2} />
              {t("common.apply_filters", "Apply filters")}
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3.5 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
            >
              <X className="h-4 w-4" strokeWidth={2.2} />
              {t("common.clear", "Clear")}
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-day-text dark:text-night-text">
            {loading && investments.length > 0
              ? "Refreshing investment records"
              : `Showing ${investments.length} investment record${
                  investments.length === 1 ? "" : "s"
                } on this page`}
          </p>
          <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
            {pagination.totalItems > 0
              ? `${pagination.totalItems} total investment record${
                  pagination.totalItems === 1 ? "" : "s"
                } match the current admin filter set.`
              : "No investment lifecycle record matches the current filters."}
          </p>
        </div>

        {loading && investments.length > 0 ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-day-border/70 bg-day-surface px-3 py-2 text-sm text-day-muted dark:border-night-border/70 dark:bg-night-surface dark:text-night-muted">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
            Updating
          </div>
        ) : null}
      </div>

      <section className="grid grid-cols-1 gap-5">
        {loading && investments.length === 0
          ? Array.from({ length: 4 }).map((_, index) => (
              <LoadingCard key={index} />
            ))
          : null}

        {!loading && investments.length === 0 ? (
          <EmptyState onClear={handleClearFilters} />
        ) : null}

        {investments.map((investment, index) => (
          <InvestmentCard
            key={getInvestmentId(investment) || `investment-${index}`}
            investment={investment}
            t={t}
            onOpen={() => openInvestment(investment)}
            onOpenInvestor={() => openPersonProfile(investment.investor)}
            onOpenOwner={() => openPersonProfile(investment.propertyOwner)}
            onOpenProperty={() => openProperty(investment)}
          />
        ))}
      </section>

      {!loading ? (
        <Pagination pagination={pagination} onPageChange={handlePageChange} />
      ) : null}
    </div>
  );
};

export default AdminInvestments;
