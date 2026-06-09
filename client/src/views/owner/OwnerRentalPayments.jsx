// src/views/owner/OwnerRentalPayments.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Building2,
  CalendarClock,
  Download,
  Landmark,
  MapPin,
  ReceiptText,
  RefreshCw,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";

import bridge from "../../controllers/bridge";
import DocumentPreviewModal from "../../components/common/DocumentPreviewModal";
import {
  getPrimaryPropertyImage,
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";
import { APP_CURRENCY } from "../../utils/currency";

const DEFAULT_PAGINATION = {
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  itemsPerPage: 20,
  hasPrev: false,
  hasNext: false,
};

const DEFAULT_FILTERS = {
  status: "",
  sortBy: "-month",
  limit: 20,
  page: 1,
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "delayed", label: "Delayed" },
];

const SORT_OPTIONS = [
  { value: "-month", label: "Newest cycle first" },
  { value: "month", label: "Oldest cycle first" },
  { value: "-amount", label: "Highest amount first" },
  { value: "amount", label: "Lowest amount first" },
];

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const PAYMENT_STATUS_STYLES = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  delayed:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
};

const PAYMENT_STATUS_DOT_STYLES = {
  pending: "bg-amber-500",
  paid: "bg-emerald-500",
  delayed: "bg-rose-500",
};

const formatAmount = (value, currency = APP_CURRENCY) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatCompactAmount = (value, currency = APP_CURRENCY) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
};

const formatMonthLabel = (value) => {
  if (!value) return "Pending schedule";

  if (/^\d{4}-\d{2}$/.test(value)) {
    const date = new Date(`${value}-01T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(date);
    }
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  return value;
};

const formatKeyLabel = (value = "") =>
  String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";

const formatPropertyType = (value = "") =>
  String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Property";

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

const getPaymentStatusClass = (status) =>
  PAYMENT_STATUS_STYLES[status] ||
  "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200";

const getPaymentStatusDotClass = (status) =>
  PAYMENT_STATUS_DOT_STYLES[status] || "bg-slate-400";

const getPaymentProperty = (payment) => {
  const candidate =
    payment?.investment?.property ||
    payment?.property ||
    payment?.propertySnapshot ||
    null;

  return candidate && typeof candidate === "object" ? candidate : null;
};

const getInvestmentId = (payment) =>
  payment?.investment?.id ||
  payment?.investment?._id ||
  payment?.investmentId ||
  "";

const getPropertyId = (payment) => {
  const property = getPaymentProperty(payment);
  return property?.id || property?._id || payment?.propertyId || "";
};

const getPropertyLabel = (payment) => {
  const property = getPaymentProperty(payment);

  return (
    property?.title ||
    [property?.city, property?.country].filter(Boolean).join(", ") ||
    (getPropertyId(payment) ? `Property ${String(getPropertyId(payment)).slice(-6)}` : "") ||
    "Associated property"
  );
};

const getPropertyLocation = (payment) => {
  const property = getPaymentProperty(payment);

  return (
    property?.fullAddress ||
    property?.mapSearchAddress ||
    [property?.city, property?.country].filter(Boolean).join(", ") ||
    "Location pending"
  );
};

const getMapReferenceAddress = (property) =>
  property?.mapSearchAddress && property.mapSearchAddress !== property?.fullAddress
    ? property.mapSearchAddress
    : "";

const resolveReceiptUrl = (payment) =>
  payment?.receiptUrl ||
  payment?.rentalReceiptUrl ||
  payment?.receipt?.url ||
  payment?.receipt?.fileUrl ||
  payment?.receipt?.downloadUrl ||
  payment?.rentalReceipt?.url ||
  payment?.rentalReceipt?.fileUrl ||
  payment?.rentalReceipt?.downloadUrl ||
  (typeof payment?.receipt === "string" ? payment.receipt : "");

const getMonthTime = (value) => {
  if (!value) return 0;
  const normalized = /^\d{4}-\d{2}$/.test(value) ? `${value}-01T00:00:00` : value;
  const timestamp = new Date(normalized).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const pickLatestMonth = (current, candidate) => {
  if (!current) return candidate || "";
  if (!candidate) return current;

  const currentTime = getMonthTime(current);
  const candidateTime = getMonthTime(candidate);

  if (currentTime || candidateTime) {
    return candidateTime > currentTime ? candidate : current;
  }

  return String(candidate) > String(current) ? candidate : current;
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
      </div>
      {Icon ? (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-day-surface text-day-primary dark:bg-night-surface dark:text-night-primary">
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </div>
      ) : null}
    </div>
    {helpText ? (
      <p className="mt-3 text-sm leading-6 text-day-muted dark:text-night-muted">
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
    <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 animate-pulse rounded-[24px] bg-day-panel/70 dark:bg-night-panel/70" />
        <div className="flex-1 space-y-3">
          <div className="h-3 w-28 animate-pulse rounded-full bg-day-panel/70 dark:bg-night-panel/70" />
          <div className="h-7 w-2/3 animate-pulse rounded-full bg-day-panel/70 dark:bg-night-panel/70" />
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-day-panel/70 dark:bg-night-panel/70" />
        </div>
      </div>
      <div className="h-32 animate-pulse rounded-3xl bg-day-panel/70 dark:bg-night-panel/70" />
      <div className="h-12 w-36 animate-pulse self-center justify-self-start rounded-2xl bg-day-panel/70 dark:bg-night-panel/70 lg:justify-self-end" />
    </div>
  </div>
);

const EmptyState = ({ onOpenProperties }) => (
  <div className="px-6 py-14 text-center sm:px-10">
    <div className="mx-auto max-w-lg">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
        <WalletCards className="h-7 w-7" strokeWidth={2.1} />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-day-text dark:text-night-text">
        No rental payments in this view
      </h2>
      <p className="mt-3 text-sm leading-6 text-day-muted dark:text-night-muted">
        Once active investments begin distributing rent, every owner-side cycle
        will appear here with settlement state, official property context, and
        receipt access.
      </p>
      <button
        type="button"
        onClick={onOpenProperties}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
      >
        Review properties
        <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
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
        Showing {start}-{end} of {pagination.totalItems} rental payment
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

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getPaymentStatusClass(
      status,
    )}`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${getPaymentStatusDotClass(status)}`} />
    {formatKeyLabel(status)}
  </span>
);

const PaymentRow = ({ payment, onPreviewReceipt }) => {
  const receiptUrl = resolveReceiptUrl(payment);
  const status = payment.status || "pending";

  return (
    <div className="shell-subtle-surface flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-day-text dark:text-night-text">
            {formatMonthLabel(payment.month)}
          </p>
          <StatusBadge status={status} />
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-day-muted dark:text-night-muted">
          <span>Settled {payment.paidAt ? formatDate(payment.paidAt) : "-"}</span>
          <span>Receipt {receiptUrl ? "available" : "not provided"}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:justify-end">
        <span className="text-base font-semibold text-day-text dark:text-night-text">
          {formatAmount(payment.amount)}
        </span>

        {receiptUrl ? (
          <button
            type="button"
            onClick={() => onPreviewReceipt?.(receiptUrl, payment)}
            className="inline-flex items-center gap-2 rounded-2xl border border-day-border bg-day-surface px-3 py-2 text-sm font-medium text-day-text transition hover:bg-day-panel/60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
          >
            <ReceiptText className="h-4 w-4" strokeWidth={2.1} />
            View receipt
          </button>
        ) : (
          <span className="rounded-2xl border border-day-border/70 px-3 py-2 text-sm text-day-muted dark:border-night-border/70 dark:text-night-muted">
            No receipt
          </span>
        )}
      </div>
    </div>
  );
};

const PaymentGroupCard = ({
  group,
  onOpenInvestment,
  onOpenProperty,
  onPreviewReceipt,
}) => {
  const property = group.property;
  const image = getPrimaryPropertyImage(property);
  const mapReferenceAddress = getMapReferenceAddress(property);
  const investmentCode = group.investmentId
    ? `#${String(group.investmentId).slice(-6)}`
    : "No investment id";

  return (
    <div className="shell-surface overflow-hidden">
      <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] lg:items-start">
        <div className="flex items-start gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[24px] bg-day-panel dark:bg-night-panel">
            {image ? (
              <img
                src={getPropertyImageUrl(image)}
                alt={group.propertyLabel}
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
              <span className="rounded-full bg-day-panel px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-primary dark:bg-night-panel dark:text-night-primary">
                {formatPropertyType(property?.propertyType)}
              </span>
              <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:border-night-border/70 dark:bg-night-surface dark:text-night-muted">
                {group.paymentCount} cycle{group.paymentCount === 1 ? "" : "s"}
              </span>
              <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:border-night-border/70 dark:bg-night-surface dark:text-night-muted">
                {investmentCode}
              </span>
            </div>

            <h2 className="mt-3 text-xl font-semibold text-day-text dark:text-night-text">
              {group.propertyLabel}
            </h2>

            <div className="mt-2 flex items-start gap-2 text-sm text-day-muted dark:text-night-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{group.locationLabel}</span>
            </div>

            {mapReferenceAddress ? (
              <div className="mt-2 rounded-2xl border border-day-border/70 bg-day-surface px-3 py-2 text-xs leading-5 text-day-muted dark:border-night-border/70 dark:bg-night-surface dark:text-night-muted">
                <span className="font-semibold text-day-text dark:text-night-text">
                  Map search address:
                </span>{" "}
                {mapReferenceAddress}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-day-muted dark:text-night-muted">
              <span>{group.paidCount} paid</span>
              <span>{group.pendingCount} pending</span>
              <span>{group.delayedCount} delayed</span>
              <span>{group.receiptCount} receipt{group.receiptCount === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <MetricBlock
            label="Collected income"
            value={formatAmount(group.paidAmount)}
            accentClass="text-emerald-600 dark:text-emerald-300"
          />
          <MetricBlock
            label="Outstanding amount"
            value={formatAmount(group.pendingAmount + group.delayedAmount)}
            accentClass={
              group.pendingAmount + group.delayedAmount > 0
                ? "text-amber-700 dark:text-amber-200"
                : ""
            }
          />
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <button
            type="button"
            onClick={onOpenInvestment}
            disabled={!group.investmentId}
            className="inline-flex items-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark disabled:cursor-not-allowed disabled:opacity-40 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark"
          >
            View investment
            <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={onOpenProperty}
            disabled={!group.propertyId}
            className="inline-flex items-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
          >
            View property
            <Building2 className="h-4 w-4" strokeWidth={2.1} />
          </button>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-day-border bg-day-surface px-3 py-2 text-sm text-day-muted dark:border-night-border dark:bg-night-surface dark:text-night-muted">
            <CalendarClock className="h-4 w-4" strokeWidth={2.1} />
            Latest cycle {group.latestMonthLabel}
          </div>
        </div>
      </div>

      <div className="border-t border-day-border/70 px-5 py-5 dark:border-night-border/70">
        <div className="space-y-3">
          {group.payments.map((payment, index) => (
            <PaymentRow
              key={`${payment._id || payment.id || payment.month || "payment"}-${index}`}
              payment={payment}
              onPreviewReceipt={onPreviewReceipt}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const OwnerRentalPayments = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [previewDocument, setPreviewDocument] = useState(null);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = { ...filters };
      if (!params.status) delete params.status;

      const response =
        await bridge.investments.getPropertyOwnerRentalPayments(params);

      if (response?.success) {
        const items = response.data || [];
        setPayments(items);
        setPagination(normalizePagination(response.pagination, items.length));
      } else {
        setPayments([]);
        setPagination(DEFAULT_PAGINATION);
        setError("Rental payments could not be loaded.");
      }
    } catch (loadError) {
      console.error("Owner rental payments load error:", loadError);
      setPayments([]);
      setPagination(DEFAULT_PAGINATION);
      setError(loadError.message || "Rental payments could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const stats = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const paidPayments = payments.filter((payment) => payment.status === "paid");
    const pendingPayments = payments.filter(
      (payment) => payment.status === "pending",
    );
    const delayedPayments = payments.filter(
      (payment) => payment.status === "delayed",
    );
    const thisMonthPaid = paidPayments
      .filter((payment) => payment.month === currentMonth)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return {
      paidAmount: paidPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      ),
      pendingAmount: pendingPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      ),
      delayedAmount: delayedPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      ),
      paidCount: paidPayments.length,
      pendingCount: pendingPayments.length,
      delayedCount: delayedPayments.length,
      receiptCount: payments.filter((payment) => resolveReceiptUrl(payment))
        .length,
      thisMonthPaid,
    };
  }, [payments]);

  const groupedPayments = useMemo(() => {
    const mapped = new Map();

    payments.forEach((payment, index) => {
      const investmentId = String(getInvestmentId(payment) || "");
      const propertyId = String(getPropertyId(payment) || "");
      const groupKey =
        investmentId || propertyId || `${getPropertyLabel(payment)}-${index}`;
      const property = getPaymentProperty(payment) || {};
      const existing = mapped.get(groupKey) || {
        property,
        investmentId,
        propertyId,
        propertyLabel: getPropertyLabel(payment),
        locationLabel: getPropertyLocation(payment),
        payments: [],
        paymentCount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        delayedAmount: 0,
        paidCount: 0,
        pendingCount: 0,
        delayedCount: 0,
        receiptCount: 0,
        latestMonth: "",
      };

      existing.payments.push(payment);
      existing.paymentCount += 1;
      existing.latestMonth = pickLatestMonth(existing.latestMonth, payment.month);

      if (resolveReceiptUrl(payment)) {
        existing.receiptCount += 1;
      }

      if (payment.status === "paid") {
        existing.paidAmount += Number(payment.amount || 0);
        existing.paidCount += 1;
      } else if (payment.status === "pending") {
        existing.pendingAmount += Number(payment.amount || 0);
        existing.pendingCount += 1;
      } else if (payment.status === "delayed") {
        existing.delayedAmount += Number(payment.amount || 0);
        existing.delayedCount += 1;
      }

      mapped.set(groupKey, existing);
    });

    return Array.from(mapped.values()).map((group) => ({
      ...group,
      latestMonthLabel: formatMonthLabel(group.latestMonth),
    }));
  }, [payments]);

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
    const rows = payments.map((payment) => ({
      investmentId: getInvestmentId(payment) || "",
      propertyId: getPropertyId(payment) || "",
      property: getPropertyLabel(payment),
      titleDeedAddress: getPaymentProperty(payment)?.fullAddress || "",
      mapSearchAddress: getPaymentProperty(payment)?.mapSearchAddress || "",
      month: payment.month || "",
      amount: payment.amount || "",
      status: formatKeyLabel(payment.status),
      paidAt: payment.paidAt || "",
      receipt: resolveReceiptUrl(payment) ? "available" : "missing",
    }));

    const headers = Object.keys(
      rows[0] || {
        investmentId: "",
        propertyId: "",
        property: "",
        titleDeedAddress: "",
        mapSearchAddress: "",
        month: "",
        amount: "",
        status: "",
        paidAt: "",
        receipt: "",
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
    link.setAttribute("download", "owner-rental-payments.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const selectedStatusLabel =
    STATUS_OPTIONS.find((option) => option.value === filters.status)?.label ||
    "All statuses";
  const selectedSortLabel =
    SORT_OPTIONS.find((option) => option.value === filters.sortBy)?.label ||
    "Newest cycle first";

  return (
    <div className="space-y-6 p-4 sm:p-6 xl:p-8">
      {previewDocument?.url ? (
        <DocumentPreviewModal
          title={previewDocument.title}
          url={previewDocument.url}
          onClose={() => setPreviewDocument(null)}
        />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
        <div className="shell-surface flex h-full flex-col justify-between px-6 py-7 sm:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-day-primary dark:border-night-border/70 dark:bg-night-surface dark:text-night-primary">
              Owner income ledger
            </span>
            <span className="rounded-full border border-day-border/70 bg-day-panel/70 px-3 py-1 text-xs font-medium text-day-muted dark:border-night-border/70 dark:bg-night-panel/70 dark:text-night-muted">
              Rental cycle operations
            </span>
          </div>

          <div className="mt-6 max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
              {t("owner.rental_payments", "Rental payments")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-day-muted dark:text-night-muted">
              Track incoming rental cycles by property, verify settled income,
              spot delayed rent, and keep receipts connected to the investment
              record.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Collected rent"
              value={formatCompactAmount(stats.paidAmount)}
              helpText={`${stats.paidCount} paid cycle${stats.paidCount === 1 ? "" : "s"} loaded.`}
              icon={Banknote}
              accentClass="text-emerald-600 dark:text-emerald-300"
            />
            <SummaryCard
              label="Outstanding"
              value={formatCompactAmount(stats.pendingAmount + stats.delayedAmount)}
              helpText={`${stats.pendingCount + stats.delayedCount} open cycle${
                stats.pendingCount + stats.delayedCount === 1 ? "" : "s"
              } on this page.`}
              icon={AlertTriangle}
              accentClass={
                stats.pendingAmount + stats.delayedAmount > 0
                  ? "text-amber-700 dark:text-amber-200"
                  : ""
              }
            />
            <SummaryCard
              label="This month paid"
              value={formatCompactAmount(stats.thisMonthPaid)}
              helpText="Settled income for the current rental month."
              icon={CalendarClock}
            />
            <SummaryCard
              label="Visible cycles"
              value={pagination.totalItems || payments.length}
              helpText={`${groupedPayments.length} property ledger group${
                groupedPayments.length === 1 ? "" : "s"
              } visible.`}
              icon={WalletCards}
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
            Refresh the owner ledger, export the currently visible records, or
            jump back to the property pipeline when rent movement needs context.
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => navigate("/owner/properties")}
              className="inline-flex w-full items-center justify-between rounded-2xl bg-day-primary px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
            >
              <span>Open properties</span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </button>

            <button
              type="button"
              onClick={loadPayments}
              className="inline-flex w-full items-center justify-between rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 focus:outline-none focus:ring-4 focus:ring-day-primary/10 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60 dark:focus:ring-night-primary/10"
            >
              <span>{t("common.refresh", "Refresh")}</span>
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
              <span>Export ledger</span>
              <Download className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            <SummaryCard label="Status filter" value={selectedStatusLabel} />
            <SummaryCard label="Sort order" value={selectedSortLabel} />
            <SummaryCard label="Receipts visible" value={stats.receiptCount} />
          </div>
        </aside>
      </section>

      <section className="shell-surface px-4 py-4 sm:px-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)_minmax(200px,0.55fr)_auto] xl:items-end">
          <FilterField label={t("owner.status", "Status")}>
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

          <FilterField label={t("owner.sortBy", "Sort by")}>
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

          <FilterField label={t("owner.itemsPerPage", "Items per page")}>
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
            onClick={loadPayments}
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
            {loading && payments.length > 0
              ? "Refreshing owner payment results"
              : `Showing ${payments.length} payment line${
                  payments.length === 1 ? "" : "s"
                } on this page`}
          </p>
          <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
            {pagination.totalItems > 0
              ? `${pagination.totalItems} rental payment record${
                  pagination.totalItems === 1 ? "" : "s"
                } are currently visible in the owner ledger.`
              : "Rental cycles will appear here after accepted investments begin generating paid, pending, or delayed rent."}
          </p>
        </div>

        {stats.delayedAmount > 0 ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            <AlertTriangle className="h-4 w-4" strokeWidth={2.2} />
            {formatCompactAmount(stats.delayedAmount)} delayed
          </div>
        ) : null}
      </div>

      <section className="grid grid-cols-1 gap-5">
        {loading && payments.length === 0
          ? Array.from({ length: 3 }).map((_, index) => (
              <LoadingCard key={index} />
            ))
          : null}

        {!loading && groupedPayments.length === 0 ? (
          <div className="shell-surface overflow-hidden">
            <EmptyState onOpenProperties={() => navigate("/owner/properties")} />
          </div>
        ) : null}

        {groupedPayments.map((group) => (
          <PaymentGroupCard
            key={group.investmentId || group.propertyId || group.propertyLabel}
            group={group}
            onOpenInvestment={() => {
              if (group.investmentId) {
                navigate(`/owner/investments/${group.investmentId}`);
              }
            }}
            onOpenProperty={() => {
              if (group.propertyId) {
                navigate(`/owner/properties/${group.propertyId}`);
              }
            }}
            onPreviewReceipt={(receiptUrl, payment) =>
              setPreviewDocument({
                url: receiptUrl,
                title: `Receipt ${formatMonthLabel(payment?.month)}`,
              })
            }
          />
        ))}
      </section>

      {!loading ? (
        <Pagination pagination={pagination} onPageChange={handlePageChange} />
      ) : null}
    </div>
  );
};

export default OwnerRentalPayments;
