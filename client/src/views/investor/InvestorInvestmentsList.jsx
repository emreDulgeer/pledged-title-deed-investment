import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Download,
  FileStack,
  Landmark,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import InvestmentController from "../../controllers/investmentController";
import {
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";
import { APP_CURRENCY } from "../../utils/currency";

const DEFAULT_STATUS_QUERY =
  "contract_signed,title_deed_pending,active,completed,refunded,defaulted";

const DEFAULT_PAGINATION = {
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  itemsPerPage: 10,
  hasPrev: false,
  hasNext: false,
};

const DEFAULT_FILTERS = {
  status: "",
  sortBy: "-createdAt",
  page: 1,
  limit: 10,
};

const STATUS_OPTIONS = [
  { value: "", label: "All active investment statuses" },
  { value: "contract_signed", label: "Contract signed" },
  { value: "title_deed_pending", label: "Title deed pending" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "refunded", label: "Refunded" },
  { value: "defaulted", label: "Defaulted" },
];

const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest first" },
  { value: "createdAt", label: "Oldest first" },
  { value: "-amountInvested", label: "Highest amount invested" },
  { value: "amountInvested", label: "Lowest amount invested" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const STATUS_STYLES = {
  offer_sent:
    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200",
  contract_signed:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200",
  title_deed_pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
  active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  completed:
    "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
  refunded:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-200",
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

const formatPropertyType = (value = "") =>
  String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Property";

const formatStatusLabel = (value = "") =>
  String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";

const normalizePagination = (pagination, fallbackCount = 0) => {
  const currentPage = Number(pagination?.currentPage || pagination?.page || 1);
  const totalPages = Number(pagination?.totalPages || pagination?.pages || 1);
  const totalItems = Number(
    pagination?.totalItems || pagination?.total || fallbackCount || 0,
  );
  const itemsPerPage = Number(
    pagination?.itemsPerPage || pagination?.limit || DEFAULT_FILTERS.limit,
  );

  return {
    currentPage,
    totalPages,
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

const getPropertyLabel = (investment) =>
  investment?.property?.title ||
  [investment?.property?.city, investment?.property?.country]
    .filter(Boolean)
    .join(", ") ||
  "Portfolio holding";

const getPropertyLocation = (investment) =>
  [investment?.property?.city, investment?.property?.country]
    .filter(Boolean)
    .join(", ") || "Location pending";

const getStatusClass = (status) =>
  STATUS_STYLES[status] ||
  "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200";

const getEarnedAmount = (investment) =>
  Number(
    investment?.rentalPaymentsSummary?.totalPaidAmount ||
      investment?.calculations?.totalPaidAmount ||
      0,
  );

const getExpectedIncome = (investment) =>
  Number(
    investment?.expectedTotalIncome ||
      investment?.calculations?.expectedTotalIncome ||
      0,
  );

const getYieldValue = (investment) => {
  const explicitYield = Number(
    investment?.offerTerms?.annualYieldPercent ??
      investment?.property?.annualYieldPercent ??
      0,
  );

  if (explicitYield > 0) {
    return `${explicitYield % 1 === 0 ? explicitYield.toFixed(0) : explicitYield.toFixed(2)}%`;
  }

  const invested = Number(investment?.amountInvested || 0);
  const expectedIncome = getExpectedIncome(investment);
  if (invested > 0 && expectedIncome > 0) {
    const derivedYield = (expectedIncome / invested) * 100;
    return `${derivedYield.toFixed(2)}%`;
  }

  return "—";
};

const getProgressSummary = (investment) => {
  const totalPayments = Number(investment?.rentalPaymentsSummary?.totalPayments || 0);
  const paidPayments = Number(investment?.rentalPaymentsSummary?.paidPayments || 0);
  const percent =
    totalPayments > 0 ? Math.round((paidPayments / totalPayments) * 100) : 0;

  return {
    totalPayments,
    paidPayments,
    percent,
  };
};

const SummaryCard = ({ label, value, helpText = "", accentClass = "" }) => (
  <div className="shell-subtle-surface px-4 py-4">
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

const LoadingCard = () => (
  <div className="shell-surface overflow-hidden">
    <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 animate-pulse rounded-[24px] bg-day-panel/70 dark:bg-night-panel/70" />
        <div className="flex-1 space-y-3">
          <div className="h-3 w-28 animate-pulse rounded-full bg-day-panel/70 dark:bg-night-panel/70" />
          <div className="h-7 w-2/3 animate-pulse rounded-full bg-day-panel/70 dark:bg-night-panel/70" />
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-day-panel/70 dark:bg-night-panel/70" />
        </div>
      </div>
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={index}
          className="h-28 animate-pulse rounded-3xl bg-day-panel/70 dark:bg-night-panel/70"
        />
      ))}
      <div className="h-12 w-36 animate-pulse self-center justify-self-start rounded-2xl bg-day-panel/70 dark:bg-night-panel/70 lg:justify-self-end" />
    </div>
  </div>
);

const EmptyState = ({ onBrowse }) => (
  <div className="px-6 py-14 text-center sm:px-10">
    <div className="mx-auto max-w-lg">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
        <Search className="h-7 w-7" strokeWidth={2.1} />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-day-text dark:text-night-text">
        No investments in this view
      </h2>
      <p className="mt-3 text-sm leading-6 text-day-muted dark:text-night-muted">
        Once an offer is accepted, the investment will appear here for lifecycle
        tracking, document handling, and rental income reporting.
      </p>
      <button
        type="button"
        onClick={onBrowse}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
      >
        Browse properties
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
        Showing {start}-{end} of {pagination.totalItems} portfolio result
        {pagination.totalItems === 1 ? "" : "s"}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!pagination.hasPrev}
          onClick={() => onPageChange(pagination.currentPage - 1)}
          className="rounded-2xl border border-day-border bg-day-surface px-4 py-2.5 text-sm font-medium text-day-text transition hover:bg-day-panel/60 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
        >
          Previous
        </button>
        <div className="rounded-2xl border border-day-border bg-day-surface px-4 py-2.5 text-sm font-medium text-day-text dark:border-night-border dark:bg-night-surface dark:text-night-text">
          {pagination.currentPage} / {pagination.totalPages}
        </div>
        <button
          type="button"
          disabled={!pagination.hasNext}
          onClick={() => onPageChange(pagination.currentPage + 1)}
          className="rounded-2xl border border-day-border bg-day-surface px-4 py-2.5 text-sm font-medium text-day-text transition hover:bg-day-panel/60 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
        >
          Next
        </button>
      </div>
    </div>
  );
};

const InvestmentCard = ({ investment, onOpen }) => {
  const image = investment?.property?.thumbnail;
  const progress = getProgressSummary(investment);
  const earnedAmount = getEarnedAmount(investment);
  const expectedIncome = getExpectedIncome(investment);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group shell-surface overflow-hidden text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-shell"
    >
      <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-start">
        <div className="flex items-start gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[24px] bg-day-panel dark:bg-night-panel">
            {image ? (
              <img
                src={getPropertyImageUrl(image)}
                alt={getPropertyLabel(investment)}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
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
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getStatusClass(
                  investment.status,
                )}`}
              >
                {formatStatusLabel(investment.status)}
              </span>
              <span className="rounded-full bg-day-panel px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-primary dark:bg-night-panel dark:text-night-primary">
                {formatPropertyType(investment?.property?.propertyType)}
              </span>
            </div>

            <h2 className="mt-3 text-xl font-semibold text-day-text dark:text-night-text">
              {getPropertyLabel(investment)}
            </h2>

            <div className="mt-2 flex items-start gap-2 text-sm text-day-muted dark:text-night-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{getPropertyLocation(investment)}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-day-muted dark:text-night-muted">
              <span>Opened {formatDate(investment.createdAt)}</span>
              <span>Yield {getYieldValue(investment)}</span>
              <span>
                {progress.totalPayments > 0
                  ? `${progress.paidPayments}/${progress.totalPayments} rent cycles paid`
                  : "Rental schedule pending"}
              </span>
            </div>
          </div>
        </div>

        <MetricBlock
          label="Capital deployed"
          value={formatAmount(investment.amountInvested)}
        />

        <div className="space-y-3">
          <MetricBlock
            label="Income collected"
            value={formatAmount(earnedAmount)}
            accentClass="text-emerald-600 dark:text-emerald-300"
          />
          <div className="shell-subtle-surface px-4 py-4">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
              <span>Payment progress</span>
              <span>{progress.percent}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-day-border/50 dark:bg-night-border/50">
              <div
                className="h-full rounded-full bg-day-primary dark:bg-night-primary"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-day-muted dark:text-night-muted">Expected total</span>
              <span className="font-semibold text-day-text dark:text-night-text">
                {expectedIncome > 0 ? formatAmount(expectedIncome) : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
          >
            View investment
            <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          </button>

          <div className="inline-flex items-center gap-2 rounded-2xl border border-day-border bg-day-surface px-3 py-2 text-sm text-day-muted dark:border-night-border dark:bg-night-surface dark:text-night-muted">
            <CalendarClock className="h-4 w-4" strokeWidth={2.1} />
            {formatDate(investment.updatedAt || investment.createdAt)}
          </div>
        </div>
      </div>
    </button>
  );
};

const InvestorInvestmentsList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [investments, setInvestments] = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const loadInvestments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await InvestmentController.getMyInvestments({
        ...filters,
        status: filters.status || DEFAULT_STATUS_QUERY,
      });

      if (response?.success) {
        setInvestments(response.data || []);
        setPagination(
          normalizePagination(response.pagination, response.data?.length || 0),
        );
      } else {
        setInvestments([]);
        setPagination(DEFAULT_PAGINATION);
      }
    } catch (loadError) {
      console.error("Investor investments load error:", loadError);
      setError(loadError.message || "Investments could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadInvestments();
  }, [loadInvestments]);

  const portfolioSummary = useMemo(() => {
    const totalInvested = investments.reduce(
      (sum, investment) => sum + Number(investment?.amountInvested || 0),
      0,
    );
    const totalEarned = investments.reduce(
      (sum, investment) => sum + getEarnedAmount(investment),
      0,
    );
    const activeCount = investments.filter((investment) =>
      ["contract_signed", "title_deed_pending", "active"].includes(
        investment.status,
      ),
    ).length;
    const paymentSchedulesInMotion = investments.filter((investment) => {
      const progress = getProgressSummary(investment);
      return progress.totalPayments > 0 && progress.paidPayments < progress.totalPayments;
    }).length;

    return {
      totalInvested,
      totalEarned,
      activeCount,
      paymentSchedulesInMotion,
    };
  }, [investments]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: 1,
    }));
  };

  const handlePageChange = (page) => {
    setFilters((current) => ({
      ...current,
      page,
    }));
  };

  const handleExport = () => {
    const rows = investments.map((investment) => ({
      id: investment.id || "",
      property: getPropertyLabel(investment),
      city: investment.property?.city || "",
      country: investment.property?.country || "",
      propertyType: formatPropertyType(investment.property?.propertyType),
      amountInvested: investment.amountInvested || "",
      status: formatStatusLabel(investment.status),
      earnedAmount: getEarnedAmount(investment),
      expectedIncome: getExpectedIncome(investment),
      createdAt: investment.createdAt || "",
    }));

    const headers = Object.keys(rows[0] || {
      id: "",
      property: "",
      city: "",
      country: "",
      propertyType: "",
      amountInvested: "",
      status: "",
      earnedAmount: "",
      expectedIncome: "",
      createdAt: "",
    });

    const escapeCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "investor-investments.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const selectedStatusLabel =
    STATUS_OPTIONS.find((option) => option.value === filters.status)?.label ||
    "All active investment statuses";
  const selectedSortLabel =
    SORT_OPTIONS.find((option) => option.value === filters.sortBy)?.label ||
    "Newest first";

  return (
    <div className="space-y-6 p-4 sm:p-6 xl:p-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
        <div className="shell-surface flex h-full flex-col justify-between px-6 py-7 sm:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-day-primary dark:border-night-border/70 dark:bg-night-surface dark:text-night-primary">
              Portfolio
            </span>
            <span className="rounded-full border border-day-border/70 bg-day-panel/70 px-3 py-1 text-xs font-medium text-day-muted dark:border-night-border/70 dark:bg-night-panel/70 dark:text-night-muted">
              Active investment book
            </span>
          </div>

          <div className="mt-6 max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
              {t("investor.myInvestments", "My investments")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-day-muted dark:text-night-muted">
              Track live positions, review payout progress, and open any
              investment detail to continue document, title deed, and income
              workflows.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Portfolio results"
              value={pagination.totalItems || investments.length}
            />
            <SummaryCard
              label="Capital deployed"
              value={formatCompactAmount(portfolioSummary.totalInvested)}
            />
            <SummaryCard
              label="Income collected"
              value={formatCompactAmount(portfolioSummary.totalEarned)}
              accentClass="text-emerald-600 dark:text-emerald-300"
            />
            <SummaryCard
              label="Active positions"
              value={portfolioSummary.activeCount}
              helpText={`${portfolioSummary.paymentSchedulesInMotion} payment schedules still in motion.`}
            />
          </div>
        </div>

        <aside className="shell-surface flex h-full flex-col px-6 py-7 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-day-muted dark:text-night-muted">
                Portfolio controls
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
            Filter the active book, export the current results, or pivot into new
            opportunities and pending offer tracking.
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => navigate("/investor/properties")}
              className="inline-flex w-full items-center justify-between rounded-2xl bg-day-primary px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
            >
              <span>Browse properties</span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/investor/offers")}
              className="inline-flex w-full items-center justify-between rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 focus:outline-none focus:ring-4 focus:ring-day-primary/10 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60 dark:focus:ring-night-primary/10"
            >
              <span>View pending offers</span>
              <FileStack className="h-4 w-4" strokeWidth={2.1} />
            </button>

            <button
              type="button"
              onClick={loadInvestments}
              className="inline-flex w-full items-center justify-between rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 focus:outline-none focus:ring-4 focus:ring-day-primary/10 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60 dark:focus:ring-night-primary/10"
            >
              <span>Refresh portfolio</span>
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                strokeWidth={2.2}
              />
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
            <SummaryCard label="Sort order" value={selectedSortLabel} />
            <SummaryCard label="Page size" value={`${filters.limit} per page`} />
          </div>
        </aside>
      </section>

      <section className="shell-surface px-4 py-4 sm:px-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)_minmax(200px,0.55fr)_auto] xl:items-end">
          <FilterField label={t("investor.status", "Status")}>
            <select
              value={filters.status}
              onChange={(event) => handleFilterChange("status", event.target.value)}
              className="shell-input"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label={t("investor.sortBy", "Sort by")}>
            <select
              value={filters.sortBy}
              onChange={(event) => handleFilterChange("sortBy", event.target.value)}
              className="shell-input"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label={t("investor.itemsPerPage", "Items per page")}>
            <select
              value={filters.limit}
              onChange={(event) =>
                handleFilterChange("limit", Number(event.target.value))
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

          <button
            type="button"
            onClick={loadInvestments}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3.5 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 focus:outline-none focus:ring-4 focus:ring-day-primary/10 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60 dark:focus:ring-night-primary/10"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              strokeWidth={2.2}
            />
            Refresh
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-day-text dark:text-night-text">
            {loading && investments.length > 0
              ? "Refreshing investment results"
              : `Showing ${investments.length} result${investments.length === 1 ? "" : "s"} on this page`}
          </p>
          <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
            {pagination.totalItems > 0
              ? `${pagination.totalItems} investment record${pagination.totalItems === 1 ? "" : "s"} are currently in your active portfolio book.`
              : "Accepted investments will appear here once your first opportunity moves beyond the offer stage."}
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
          <div className="shell-surface overflow-hidden">
            <EmptyState onBrowse={() => navigate("/investor/properties")} />
          </div>
        ) : null}

        {investments.map((investment) => (
          <InvestmentCard
            key={investment.id}
            investment={investment}
            onOpen={() => navigate(`/investor/investments/${investment.id}`)}
          />
        ))}
      </section>

      {!loading ? (
        <Pagination pagination={pagination} onPageChange={handlePageChange} />
      ) : null}
    </div>
  );
};

export default InvestorInvestmentsList;
