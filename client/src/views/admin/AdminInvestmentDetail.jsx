// client/src/views/admin/AdminInvestmentDetail.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CalendarClock,
  Clock3,
  Download,
  FileCheck2,
  FileDown,
  FileText,
  HandCoins,
  Landmark,
  Loader2,
  MapPin,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchInvestmentById,
  selectCurrentInvestment,
  selectInvestmentLoading,
} from "../../store/slices/investmentSlice";
import InvestmentPropertyPanel from "../../components/investments/InvestmentPropertyPanel";
import bridge from "../../controllers/bridge";
import { useAppFeedback } from "../../utils/hooks/useAppFeedback";
import {
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

const STATUS_STYLES = {
  offer_sent:
    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200",
  rejected:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
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
};

const PAYMENT_STATUS_STYLES = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  delayed:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
  cancelled:
    "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
  refunded:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200",
};

const PRINCIPAL_STATUS_STYLES = {
  not_started:
    "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
  instructions_ready:
    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200",
  receipt_uploaded:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  confirmed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  failed:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
  cancelled:
    "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
};

const TAB_LABELS = {
  overview: "Overview",
  property: "Property",
  payments: "Payments",
  documents: "Documents",
};

const PROCESS_LABELS = {
  offerSent: "Offer Received",
  contractSigning: "Contract Signing",
  principalPayment: "Principal Payment",
  titleDeedRegistration: "Title Deed Registration",
  rentalPeriod: "Rental Period",
  completion: "Completion",
};

const EMPTY_RENTAL_PAYMENTS = [];

const formatAmount = (value, currency = APP_CURRENCY) => {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(parsed);
};

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

const formatDateTime = (value) => {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

const formatPercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "—";

  return `${parsed % 1 === 0 ? parsed.toFixed(0) : parsed.toFixed(2)}%`;
};

const getStatusClass = (status) =>
  STATUS_STYLES[status] ||
  "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200";

const getPaymentStatusClass = (status) =>
  PAYMENT_STATUS_STYLES[status] ||
  "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200";

const getPrincipalStatusClass = (status) =>
  PRINCIPAL_STATUS_STYLES[status] || PRINCIPAL_STATUS_STYLES.not_started;

const getInvestmentId = (investment) => investment?.id || investment?._id || "";

const getPropertyId = (property) =>
  property?.id || property?._id || property?.propertyId || "";

const getPropertyHeadline = (property) =>
  property?.title ||
  [property?.city, property?.country].filter(Boolean).join(", ") ||
  property?.fullAddress ||
  "Associated property";

const getPropertyLocation = (property) =>
  property?.fullAddress ||
  property?.mapSearchAddress ||
  [property?.city, property?.country].filter(Boolean).join(", ") ||
  "Address not yet available";

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

const getExpectedIncome = (investment) =>
  Number(
    investment?.calculations?.totalExpectedIncome ||
      investment?.expectedTotalIncome ||
      investment?.calculations?.expectedTotalIncome ||
      0,
  );

const getCollectedIncome = (investment) =>
  Number(
    investment?.calculations?.totalPaidAmount ||
      investment?.rentalPaymentsSummary?.totalPaidAmount ||
      0,
  );

const getPaymentProgress = (investment) => {
  const explicit = Number(investment?.calculations?.paymentProgress);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const totalPayments = Number(investment?.rentalPaymentsSummary?.totalPayments || 0);
  const paidPayments = Number(investment?.rentalPaymentsSummary?.paidPayments || 0);
  if (totalPayments <= 0) return 0;

  return Math.round((paidPayments / totalPayments) * 100);
};

const getDocumentId = (document) =>
  document?.fileId || document?.id || document?._id || "";

const SectionCard = ({
  eyebrow = "",
  title,
  description = "",
  action = null,
  children,
}) => (
  <section className="shell-surface px-5 py-5 sm:px-6">
    {(eyebrow || title || description || action) && (
      <div className="flex flex-col gap-4 border-b border-day-border/70 pb-4 dark:border-night-border/70 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h2 className="mt-2 text-2xl font-semibold text-day-text dark:text-night-text">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-day-muted dark:text-night-muted">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
    )}
    <div className={eyebrow || title || description || action ? "pt-5" : ""}>
      {children}
    </div>
  </section>
);

const MetricCard = ({ label, value, hint = "", icon: Icon, accentClass = "" }) => (
  <div className="shell-subtle-surface px-4 py-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
          {label}
        </p>
        <p
          className={`mt-3 text-xl font-semibold text-day-text dark:text-night-text ${accentClass}`.trim()}
        >
          {value}
        </p>
        {hint ? (
          <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
            {hint}
          </p>
        ) : null}
      </div>

      {Icon ? (
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-surface text-day-primary dark:bg-night-surface dark:text-night-primary">
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </div>
      ) : null}
    </div>
  </div>
);

const DetailRow = ({ label, value, valueClassName = "" }) => (
  <div className="flex items-start justify-between gap-4 border-b border-day-border/70 py-3 first:pt-0 last:border-b-0 last:pb-0 dark:border-night-border/70">
    <span className="text-sm text-day-muted dark:text-night-muted">{label}</span>
    <span
      className={`text-right text-sm font-medium text-day-text dark:text-night-text ${valueClassName}`.trim()}
    >
      {value}
    </span>
  </div>
);

const TabButton = ({ active, children, ...props }) => (
  <button
    type="button"
    className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
      active
        ? "bg-day-primary text-white shadow-sm dark:bg-night-primary dark:text-night-background"
        : "bg-day-surface text-day-muted hover:bg-day-panel hover:text-day-text dark:bg-night-surface dark:text-night-muted dark:hover:bg-night-panel dark:hover:text-night-text"
    }`}
    {...props}
  >
    {children}
  </button>
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

const PersonCard = ({ label, person, profilePath }) => (
  <div className="shell-subtle-surface px-4 py-4">
    <div className="flex items-start gap-4">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-day-surface text-sm font-semibold text-day-primary dark:bg-night-surface dark:text-night-primary">
        {getPersonInitials(person, label)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
          {label}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-day-text dark:text-night-text">
          {getPersonName(person, label)}
        </h3>
        {person?.email ? (
          <p className="mt-1 truncate text-sm text-day-muted dark:text-night-muted">
            {person.email}
          </p>
        ) : null}
        <div className="mt-3 space-y-0">
          <DetailRow label="Country" value={person?.country || "—"} />
          <DetailRow
            label="KYC"
            value={formatKeyLabel(person?.kycStatus || "unknown")}
          />
        </div>
        {profilePath ? (
          <Link
            to={profilePath}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-day-border px-4 py-2 text-sm font-semibold text-day-primary transition hover:bg-day-panel/60 dark:border-night-border dark:text-night-primary dark:hover:bg-night-panel/60"
          >
            View profile
            <ArrowRight className="h-4 w-4" strokeWidth={2.1} />
          </Link>
        ) : null}
      </div>
    </div>
  </div>
);

const PropertyPreview = ({ property, propertyPath }) => {
  const image = getPrimaryPropertyImage(property);
  const imageUrl = getPropertyImageUrl(image);

  return (
    <aside className="shell-surface overflow-hidden">
      <div className="relative h-52 bg-day-panel dark:bg-night-panel">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={getPropertyHeadline(property)}
            className="h-full w-full object-cover"
            style={getPropertyImageStyle(image)}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-day-primary/35 dark:text-night-primary/35">
            <Building2 className="h-12 w-12" strokeWidth={1.8} />
          </div>
        )}

        <div className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-primary backdrop-blur dark:bg-night-surface/85 dark:text-night-primary">
          {formatKeyLabel(property?.propertyType || "property")}
        </div>
      </div>

      <div className="px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
          Associated asset
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
          {getPropertyHeadline(property)}
        </h2>
        <div className="mt-3 flex items-start gap-2 text-sm leading-6 text-day-muted dark:text-night-muted">
          <MapPin className="mt-1 h-4 w-4 shrink-0" strokeWidth={2} />
          <span>{getPropertyLocation(property)}</span>
        </div>

        <div className="mt-5 space-y-0">
          <DetailRow
            label="Requested investment"
            value={
              property?.requestedInvestment
                ? formatAmount(property.requestedInvestment)
                : "—"
            }
          />
          <DetailRow
            label="Listed rent"
            value={property?.rentOffered ? formatAmount(property.rentOffered) : "—"}
          />
          <DetailRow
            label="City / Country"
            value={[property?.city, property?.country].filter(Boolean).join(", ") || "—"}
          />
        </div>

        {propertyPath ? (
          <Link
            to={propertyPath}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-day-border px-4 py-2 text-sm font-semibold text-day-primary transition hover:bg-day-panel/60 dark:border-night-border dark:text-night-primary dark:hover:bg-night-panel/60"
          >
            Open property page
            <ArrowRight className="h-4 w-4" strokeWidth={2.1} />
          </Link>
        ) : null}
      </div>
    </aside>
  );
};

const WorkflowStep = ({ title, meta, active = false, completed = false, isLast = false }) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div
        className={`grid h-10 w-10 place-items-center rounded-2xl border ${
          completed || active
            ? "border-day-primary bg-day-primary text-white dark:border-night-primary dark:bg-night-primary dark:text-night-background"
            : "border-day-border bg-day-surface text-day-muted dark:border-night-border dark:bg-night-surface dark:text-night-muted"
        }`}
      >
        {completed || active ? (
          <BadgeCheck className="h-4 w-4" strokeWidth={2.1} />
        ) : (
          <Clock3 className="h-4 w-4" strokeWidth={2.1} />
        )}
      </div>
      {!isLast ? (
        <div className="mt-2 h-full w-px bg-day-border/70 dark:bg-night-border/70" />
      ) : null}
    </div>

    <div className="pb-6">
      <h3 className="text-sm font-semibold text-day-text dark:text-night-text">
        {title}
      </h3>
      {meta ? (
        <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
          {meta}
        </p>
      ) : null}
    </div>
  </div>
);

const DocumentRow = ({ document, docTypeLabel, onDownload, t }) => {
  const documentId = getDocumentId(document);
  const isReceipt = ["payment_receipt", "rental_receipt"].includes(document.type);
  const fileName =
    document.name || document.fileName || `${docTypeLabel(document.type)}.pdf`;

  return (
    <div className="shell-subtle-surface flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-day-surface text-day-primary dark:bg-night-surface dark:text-night-primary">
          {isReceipt ? (
            <ReceiptText className="h-5 w-5" strokeWidth={2.1} />
          ) : (
            <FileText className="h-5 w-5" strokeWidth={2.1} />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-day-text dark:text-night-text">
            {docTypeLabel(document.type)}
          </p>
          <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
            {t("admin.investments.uploaded", "Uploaded")}:{" "}
            {formatDateTime(document.uploadedAt)}
          </p>
          {document.reviewStatus ? (
            <span className="mt-2 inline-flex rounded-full bg-day-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:bg-night-surface dark:text-night-muted">
              {formatKeyLabel(document.reviewStatus)}
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        disabled={!documentId}
        onClick={() => onDownload(documentId, fileName)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
      >
        <FileDown className="h-4 w-4" strokeWidth={2.1} />
        {t("common.download", "Download")}
      </button>
    </div>
  );
};

const PaymentRow = ({ payment, index }) => (
  <div className="shell-subtle-surface flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="text-sm font-semibold text-day-text dark:text-night-text">
        {payment.month ||
          (payment.dueDate ? formatDate(payment.dueDate) : `Payment ${index + 1}`)}
      </p>
      <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
        Paid date: {payment.paidAt ? formatDateTime(payment.paidAt) : "—"}
      </p>
    </div>

    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
      <span className="text-sm font-semibold text-day-text dark:text-night-text">
        {formatAmount(payment.amount)}
      </span>
      <span
        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getPaymentStatusClass(
          payment.status,
        )}`}
      >
        {formatKeyLabel(payment.status)}
      </span>
    </div>
  </div>
);

const AdminInvestmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const feedback = useAppFeedback();
  const loading = useSelector(selectInvestmentLoading);
  const investment = useSelector(selectCurrentInvestment);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("overview");
  const [auxLoading, setAuxLoading] = useState(false);
  const [auxError, setAuxError] = useState("");

  const loadInvestment = useCallback(async () => {
    if (!id) return;

    setAuxLoading(true);
    setAuxError("");
    dispatch(fetchInvestmentById(id));

    try {
      const [docsResult, statsResult] = await Promise.allSettled([
        bridge.investments.getInvestmentDocuments(id),
        bridge.investments.getInvestmentStatistics(id),
      ]);

      if (docsResult.status === "fulfilled") {
        setDocuments(docsResult.value?.data ?? []);
      } else {
        setDocuments([]);
        setAuxError("Documents could not be loaded.");
      }

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value?.data ?? null);
      } else {
        setStats(null);
        setAuxError((current) =>
          current
            ? `${current} Statistics could not be loaded.`
            : "Statistics could not be loaded.",
        );
      }
    } finally {
      setAuxLoading(false);
    }
  }, [dispatch, id]);

  useEffect(() => {
    loadInvestment();
  }, [loadInvestment]);

  const download = async (fileId, fileName = "investment-document") => {
    try {
      const response = await bridge.investments.downloadDocument(id, fileId);
      const blob =
        response?.data instanceof Blob
          ? response.data
          : response instanceof Blob
            ? response
            : new Blob([response?.data || response]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      feedback.error(
        t("investor.documentDownloadFailed", "Document download failed."),
      );
    }
  };

  const showPaymentsTab = (investment?.rentalPayments?.length || 0) > 0;
  const availableTabs = showPaymentsTab
    ? ["overview", "property", "payments", "documents"]
    : ["overview", "property", "documents"];

  useEffect(() => {
    if (!showPaymentsTab && tab === "payments") {
      setTab("overview");
    }
  }, [showPaymentsTab, tab]);

  const docTypeLabel = (type) => t(`documents.types.${type}`, formatKeyLabel(type));

  const statsPayments = stats?.statistics?.payments || {};
  const statsRates = stats?.statistics?.rates || {};
  const rentalPayments = investment?.rentalPayments || EMPTY_RENTAL_PAYMENTS;
  const paymentStats = useMemo(() => {
    const paid = rentalPayments.filter((payment) => payment.status === "paid");
    const pending = rentalPayments.filter((payment) => payment.status === "pending");
    const delayed = rentalPayments.filter((payment) => payment.status === "delayed");

    return {
      paidCount: statsPayments.paid ?? paid.length,
      pendingCount: statsPayments.pending ?? pending.length,
      delayedCount: statsPayments.delayed ?? delayed.length,
      totalCount: statsPayments.total ?? rentalPayments.length,
      paidAmount: paid.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    };
  }, [rentalPayments, statsPayments.delayed, statsPayments.paid, statsPayments.pending, statsPayments.total]);

  if (loading && !investment) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-4 sm:p-6 xl:p-8">
        <div className="shell-surface px-8 py-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-day-primary dark:text-night-primary" />
          <p className="mt-4 text-sm text-day-muted dark:text-night-muted">
            {t("common.loading", "Loading")}...
          </p>
        </div>
      </div>
    );
  }

  if (!investment) {
    return (
      <div className="space-y-6 p-4 sm:p-6 xl:p-8">
        <Link
          to="/admin/investments"
          className="inline-flex items-center gap-2 text-sm font-semibold text-day-primary hover:underline dark:text-night-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("admin.investments.to_list", "Back to investments")}
        </Link>

        <div className="shell-surface px-6 py-8">
          <h1 className="text-2xl font-semibold text-day-text dark:text-night-text">
            {t("admin.investments.not_found", "Investment not found")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-day-muted dark:text-night-muted">
            This investment could not be loaded or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const investmentId = getInvestmentId(investment);
  const propertyId = getPropertyId(investment.property);
  const investorProfilePath = getUserId(investment.investor)
    ? getUserProfilePath(getUserId(investment.investor))
    : null;
  const ownerProfilePath = getUserId(investment.propertyOwner)
    ? getUserProfilePath(getUserId(investment.propertyOwner))
    : null;
  const propertyPath = getInvestmentPropertyPath("admin", propertyId);
  const offerTerms = investment.offerTerms || {};
  const principalPayment = investment.principalPayment || {};
  const principalPaymentStatus = principalPayment.status || "not_started";
  const contractWorkflow = investment.contractWorkflow || {};
  const processEntries = Object.entries(investment.processTracking || {});
  const currentProcessKey =
    processEntries.find(([, value]) => value?.active)?.[0] ||
    processEntries.find(([, value]) => value?.completed === false)?.[0] ||
    null;
  const currentProcessLabel = currentProcessKey
    ? PROCESS_LABELS[currentProcessKey] || formatKeyLabel(currentProcessKey)
    : formatKeyLabel(investment.status);
  const yieldTarget = formatPercent(
    offerTerms.annualYieldPercent || investment.property?.annualYieldPercent,
  );
  const agreedMonthlyRent =
    offerTerms.desiredMonthlyRent || investment.property?.rentOffered || 0;
  const expectedIncome = getExpectedIncome(investment);
  const collectedIncome = getCollectedIncome(investment);
  const paymentProgress = getPaymentProgress(investment);

  return (
    <div className="space-y-6 p-4 sm:p-6 xl:p-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="shell-surface px-6 py-7 sm:px-8">
          <button
            type="button"
            onClick={() => navigate("/admin/investments")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-day-primary hover:underline dark:text-night-primary"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.1} />
            {t("admin.investments.to_list", "Back to investments")}
          </button>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:border-night-border/70 dark:bg-night-surface dark:text-night-muted">
              {investmentId ? `ID ${investmentId}` : "Investment case"}
            </span>
            <StatusBadge status={investment.status} t={t} />
            {investment.status === "title_deed_pending" ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                Waiting for participant approvals
              </span>
            ) : null}
          </div>

          <div className="mt-6">
            <p className="text-sm text-day-muted dark:text-night-muted">
              Admin investment detail
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
              {formatAmount(investment.amountInvested)}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-day-muted dark:text-night-muted">
              Inspect capital movement, contract readiness, property ownership,
              rental performance, and supporting documents from one admin case
              file.
            </p>
            <div className="mt-4 flex items-start gap-2 text-sm text-day-muted dark:text-night-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{getPropertyHeadline(investment.property)}</span>
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Ownership share"
              value={
                offerTerms.ownershipPercent
                  ? `${offerTerms.ownershipPercent}%`
                  : "—"
              }
              icon={ShieldCheck}
            />
            <MetricCard
              label="Principal payment"
              value={formatKeyLabel(principalPaymentStatus)}
              icon={Banknote}
              accentClass={
                principalPaymentStatus === "confirmed"
                  ? "text-emerald-600 dark:text-emerald-300"
                  : ""
              }
            />
            <MetricCard
              label="Contract signed"
              value={
                contractWorkflow.fullySignedAt
                  ? formatDate(contractWorkflow.fullySignedAt)
                  : "Pending"
              }
              icon={FileCheck2}
            />
            <MetricCard
              label="Current stage"
              value={currentProcessLabel}
              icon={Clock3}
            />
          </div>
        </div>

        <PropertyPreview property={investment.property} propertyPath={propertyPath} />
      </section>

      {auxError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {auxError}
        </div>
      ) : null}

      <section className="shell-surface flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-2">
          {availableTabs.map((tabKey) => (
            <TabButton
              key={tabKey}
              active={tab === tabKey}
              onClick={() => setTab(tabKey)}
            >
              {TAB_LABELS[tabKey] || formatKeyLabel(tabKey)}
            </TabButton>
          ))}
        </nav>

        <button
          type="button"
          onClick={loadInvestment}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
        >
          {loading || auxLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
          ) : (
            <RefreshCw className="h-4 w-4" strokeWidth={2.2} />
          )}
          Refresh
        </button>
      </section>

      {tab === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Investment amount"
              value={formatAmount(investment.amountInvested)}
              icon={Banknote}
              accentClass="text-emerald-600 dark:text-emerald-300"
            />
            <MetricCard
              label="Monthly rent"
              value={agreedMonthlyRent ? formatAmount(agreedMonthlyRent) : "—"}
              icon={HandCoins}
            />
            <MetricCard
              label="Expected total return"
              value={expectedIncome > 0 ? formatAmount(expectedIncome) : "—"}
              icon={BadgeCheck}
            />
            <MetricCard
              label="Income collected"
              value={collectedIncome > 0 ? formatAmount(collectedIncome) : "—"}
              icon={ReceiptText}
              hint={
                paymentProgress > 0
                  ? `${paymentProgress}% of scheduled rental flow complete.`
                  : "Rental collection has not started yet."
              }
              accentClass="text-emerald-600 dark:text-emerald-300"
            />
          </div>

          <SectionCard
            eyebrow="Participants"
            title="Investor and property owner"
            description="Both sides of the investment remain linked from the admin case file."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <PersonCard
                label="Investor"
                person={investment.investor}
                profilePath={investorProfilePath}
              />
              <PersonCard
                label="Property owner"
                person={investment.propertyOwner}
                profilePath={ownerProfilePath}
              />
            </div>
          </SectionCard>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              eyebrow="Commercial terms"
              title="Listing versus agreed position"
              description="Compare requested property terms with the accepted investment position."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="shell-subtle-surface px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
                    Listing terms
                  </p>
                  <div className="mt-4 space-y-0">
                    <DetailRow
                      label="Requested investment"
                      value={
                        investment.property?.requestedInvestment
                          ? formatAmount(investment.property.requestedInvestment)
                          : "—"
                      }
                    />
                    <DetailRow
                      label="Listed rent"
                      value={
                        investment.property?.rentOffered
                          ? formatAmount(investment.property.rentOffered)
                          : "—"
                      }
                    />
                    <DetailRow
                      label="Property type"
                      value={formatKeyLabel(investment.property?.propertyType || "property")}
                    />
                  </div>
                </div>

                <div className="shell-subtle-surface px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
                    Agreed terms
                  </p>
                  <div className="mt-4 space-y-0">
                    <DetailRow
                      label="Amount invested"
                      value={formatAmount(investment.amountInvested)}
                    />
                    <DetailRow
                      label="Monthly rent"
                      value={agreedMonthlyRent ? formatAmount(agreedMonthlyRent) : "—"}
                    />
                    <DetailRow label="Annual yield" value={yieldTarget} />
                    <DetailRow
                      label="Ownership share"
                      value={
                        offerTerms.ownershipPercent
                          ? `${offerTerms.ownershipPercent}%`
                          : "—"
                      }
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Operations"
              title="Payment and case metadata"
              description="Administrative timing, currency, and principal payment state."
            >
              <div className="space-y-0">
                <DetailRow label="Created" value={formatDateTime(investment.createdAt)} />
                <DetailRow label="Updated" value={formatDateTime(investment.updatedAt)} />
                <DetailRow label="Currency" value={APP_CURRENCY} />
                <DetailRow
                  label="Principal payment"
                  value={formatKeyLabel(principalPaymentStatus)}
                  valueClassName={
                    principalPaymentStatus === "confirmed"
                      ? "text-emerald-600 dark:text-emerald-300"
                      : ""
                  }
                />
                <DetailRow
                  label="Contracts fully signed"
                  value={
                    contractWorkflow.fullySignedAt
                      ? formatDateTime(contractWorkflow.fullySignedAt)
                      : "Pending"
                  }
                />
              </div>

              <div className="mt-4">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getPrincipalStatusClass(
                    principalPaymentStatus,
                  )}`}
                >
                  {formatKeyLabel(principalPaymentStatus)}
                </span>
              </div>
            </SectionCard>
          </div>

          <SectionCard
            eyebrow="Statistics"
            title="Payment statistics"
            description="Loaded from the investment statistics endpoint when available."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label={t("admin.investments.total_payments", "Total payments")}
                value={String(paymentStats.totalCount ?? "—")}
                icon={ReceiptText}
              />
              <MetricCard
                label={t("admin.investments.paid_payments", "Paid payments")}
                value={String(paymentStats.paidCount ?? "—")}
                icon={BadgeCheck}
                accentClass="text-emerald-600 dark:text-emerald-300"
              />
              <MetricCard
                label={t("admin.investments.pending_payments", "Pending payments")}
                value={String(paymentStats.pendingCount ?? "—")}
                icon={Clock3}
              />
              <MetricCard
                label={t("admin.investments.delayed_payments", "Delayed payments")}
                value={String(paymentStats.delayedCount ?? "—")}
                icon={HandCoins}
                accentClass={
                  Number(paymentStats.delayedCount || 0) > 0
                    ? "text-rose-700 dark:text-rose-300"
                    : ""
                }
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <DetailRow
                label={t("admin.investments.payment_rate", "Payment rate")}
                value={`${statsRates.paymentRate ?? 0}%`}
              />
              <DetailRow
                label={t("admin.investments.on_time_rate", "On-time rate")}
                value={`${statsRates.onTimeRate ?? 0}%`}
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Workflow"
            title="Process tracking"
            description="Operational gates remain visible for audit context."
          >
            {processEntries.length > 0 ? (
              <div>
                {processEntries.map(([key, value], index) => (
                  <WorkflowStep
                    key={key}
                    title={PROCESS_LABELS[key] || formatKeyLabel(key)}
                    meta={
                      value?.date || value?.startDate
                        ? `${value.completed ? "Completed" : value.active ? "Active" : "Scheduled"} on ${formatDate(
                            value.date || value.startDate,
                          )}`
                        : value?.completed
                          ? "Completed"
                          : value?.active
                            ? "Currently active"
                            : "Waiting for this stage"
                    }
                    active={!!value?.active}
                    completed={!!value?.completed}
                    isLast={index === processEntries.length - 1}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-day-border/70 bg-day-panel/55 px-4 py-4 text-sm text-day-muted dark:border-night-border/70 dark:bg-night-panel/55 dark:text-night-muted">
                Process tracking has not been initialized for this investment.
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}

      {tab === "property" && investment.property ? (
        <SectionCard
          eyebrow="Property"
          title="Associated property record"
          description="Review official address, public map reference, owner profile, and property summary."
        >
          <InvestmentPropertyPanel
            property={investment.property}
            owner={investment.propertyOwner || investment.property?.owner}
            propertyPath={propertyPath}
            t={t}
          />
        </SectionCard>
      ) : null}

      {tab === "payments" && showPaymentsTab ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Collected income"
              value={formatAmount(
                collectedIncome > 0 ? collectedIncome : paymentStats.paidAmount,
              )}
              icon={ReceiptText}
              accentClass="text-emerald-600 dark:text-emerald-300"
            />
            <MetricCard
              label="Paid cycles"
              value={String(paymentStats.paidCount || 0)}
              icon={BadgeCheck}
            />
            <MetricCard
              label="Pending cycles"
              value={String(paymentStats.pendingCount || 0)}
              icon={Clock3}
            />
            <MetricCard
              label="Delayed cycles"
              value={String(paymentStats.delayedCount || 0)}
              icon={HandCoins}
              accentClass={
                Number(paymentStats.delayedCount || 0) > 0
                  ? "text-rose-700 dark:text-rose-300"
                  : ""
              }
            />
          </div>

          <SectionCard
            eyebrow="Rental ledger"
            title={t("investor.rentalPayments", "Rental payments")}
            description="Each rental cycle remains visible here with amount, payment state, and settlement date."
          >
            <div className="space-y-3">
              {rentalPayments.map((payment, index) => (
                <PaymentRow
                  key={`${payment._id || payment.id || payment.month || "payment"}-${index}`}
                  payment={payment}
                  index={index}
                />
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === "documents" ? (
        <SectionCard
          eyebrow="Documents"
          title={t("investments.documents", "Documents")}
          description="Contracts, receipts, title deed files, and supporting investment documents remain downloadable for admin audit."
          action={
            auxLoading ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-day-border bg-day-surface px-3 py-2 text-sm text-day-muted dark:border-night-border dark:bg-night-surface dark:text-night-muted">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
                Loading
              </span>
            ) : null
          }
        >
          {documents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-day-border bg-day-panel/55 px-6 py-10 text-center text-sm text-day-muted dark:border-night-border dark:bg-night-panel/55 dark:text-night-muted">
              {t("common.file", "File")}: {t("errors.not_found", "Not found")}
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document, index) => (
                <DocumentRow
                  key={getDocumentId(document) || `document-${index}`}
                  document={document}
                  docTypeLabel={docTypeLabel}
                  onDownload={download}
                  t={t}
                />
              ))}
            </div>
          )}
        </SectionCard>
      ) : null}
    </div>
  );
};

export default AdminInvestmentDetail;
