import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FileText,
  HandCoins,
  Loader2,
  MapPin,
  ReceiptText,
  ShieldCheck,
  UploadCloud,
  UserRound,
} from "lucide-react";

import InvestmentController from "../../controllers/investmentController";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import DocumentsList from "../../components/property/detail/DocumentsList";
import InvestmentPropertyPanel from "../../components/investments/InvestmentPropertyPanel";
import { getPropertyImageStyle, getPropertyImageUrl } from "../../utils/propertyImages";
import { getInvestmentPropertyPath, getUserId, getUserProfilePath } from "../../utils/profileRoutes";
import { APP_CURRENCY } from "../../utils/currency";
import { useAppFeedback } from "../../utils/hooks/useAppFeedback";

const STATUS_STYLES = {
  offer_sent:
    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200",
  rejected:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
  contract_signed:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  title_deed_pending:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200",
  active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  completed:
    "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
  refunded:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-200",
  defaulted:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
};

const PAYMENT_STATUS_STYLES = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  delayed:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
};

const PRINCIPAL_PAYMENT_STATUS_STYLES = {
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

const PROCESS_LABELS = {
  offerSent: "Offer Received",
  contractSigning: "Contract Signing",
  principalPayment: "Principal Payment",
  titleDeedRegistration: "Title Deed Registration",
  rentalPeriod: "Rental Period",
  completion: "Completion",
};

const PAYMENT_STATUS_LABELS = {
  not_started: "Not started",
  instructions_ready: "Instructions ready",
  receipt_uploaded: "Receipt uploaded",
  confirmed: "Confirmed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const TAB_LABELS = {
  overview: "Overview",
  property: "Property",
  payments: "Payments",
  documents: "Documents",
};

const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20";

const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 focus:outline-none focus:ring-4 focus:ring-day-primary/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60 dark:focus:ring-night-primary/10";

const DANGER_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50";

const NOTICE_STYLES = {
  slate:
    "border-day-border/70 bg-day-panel/55 text-day-text/80 dark:border-night-border/70 dark:bg-night-panel/55 dark:text-night-text/80",
  blue:
    "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/50 dark:bg-sky-900/20 dark:text-sky-100",
  amber:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100",
  rose:
    "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-100",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100",
  sky:
    "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/50 dark:bg-sky-900/20 dark:text-sky-100",
};

const REVIEW_STATUS_STYLES = {
  pending_review:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  changes_requested:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
};

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

const formatPercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "—";

  return `${parsed % 1 === 0 ? parsed.toFixed(0) : parsed.toFixed(2)}%`;
};

const formatKeyLabel = (value = "") =>
  String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";

const formatPropertyType = (value = "") => formatKeyLabel(value) || "Property";

const getStatusClass = (status) =>
  STATUS_STYLES[status] ||
  "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200";

const getPaymentStatusClass = (status) =>
  PAYMENT_STATUS_STYLES[status] ||
  "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200";

const getPrincipalPaymentStatusClass = (status) =>
  PRINCIPAL_PAYMENT_STATUS_STYLES[status] ||
  PRINCIPAL_PAYMENT_STATUS_STYLES.not_started;

const getExpectedIncome = (investment) =>
  Number(
    investment?.calculations?.totalExpectedIncome ||
      investment?.expectedTotalIncome ||
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

const getPropertyHeadline = (property) =>
  property?.title ||
  [property?.city, property?.country].filter(Boolean).join(", ") ||
  "Associated property";

const getPropertyLocation = (property) =>
  property?.fullAddress ||
  property?.mapSearchAddress ||
  [property?.city, property?.country].filter(Boolean).join(", ") ||
  "Address not yet available";

const getReviewLabel = (status) => {
  switch (status) {
    case "pending_review":
      return "Pending review";
    case "approved":
      return "Approved";
    case "changes_requested":
      return "Re-upload requested";
    default:
      return "No review required";
  }
};

const SectionCard = ({
  eyebrow = "",
  title,
  description = "",
  action = null,
  className = "",
  children,
}) => (
  <section className={`shell-surface px-5 py-5 sm:px-6 ${className}`.trim()}>
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

const Notice = ({ tone = "slate", children, className = "" }) => (
  <div
    className={`rounded-3xl border px-4 py-4 text-sm leading-6 ${NOTICE_STYLES[tone] || NOTICE_STYLES.slate} ${className}`.trim()}
  >
    {children}
  </div>
);

const UploadField = ({
  label,
  hint = "",
  accept,
  disabled = false,
  onChange,
  dataTestId,
}) => (
  <label className="block">
    <span className="mb-2 block text-sm font-semibold text-day-text dark:text-night-text">
      {label}
    </span>
    <input
      data-testid={dataTestId}
      type="file"
      accept={accept}
      onChange={onChange}
      disabled={disabled}
      className="block w-full rounded-2xl border border-day-border bg-day-surface px-3 py-2 text-sm text-day-text transition file:mr-4 file:rounded-full file:border-0 file:bg-day-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-day-primary-dark disabled:cursor-not-allowed disabled:opacity-60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:file:bg-night-primary dark:file:text-night-background dark:hover:file:bg-night-primary-dark"
    />
    {hint ? (
      <span className="mt-2 block text-xs text-day-muted dark:text-night-muted">
        {hint}
      </span>
    ) : null}
  </label>
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

const PropertyPreview = ({ property, propertyPath }) => {
  const image = property?.thumbnail;

  return (
    <aside className="shell-surface overflow-hidden">
      <div className="relative h-52 bg-day-panel dark:bg-night-panel">
        {image ? (
          <img
            src={getPropertyImageUrl(image)}
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
          {formatPropertyType(property?.propertyType)}
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

        <div className="mt-5 space-y-3">
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
            value={
              property?.rentOffered ? formatAmount(property.rentOffered) : "—"
            }
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

export const InvestmentDetailPage = ({ viewerRole = "investor" }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isOwnerView = viewerRole === "owner";
  const feedback = useAppFeedback();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [investment, setInvestment] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [reviewingFileId, setReviewingFileId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});
  const [confirmAction, setConfirmAction] = useState(null);

  const loadInvestmentDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await InvestmentController.getInvestmentById(id);

      if (response?.success) {
        setInvestment(response.data);
      } else {
        setInvestment(null);
        setError("Investment could not be loaded.");
      }
    } catch (loadError) {
      console.error("Investment detail load error:", loadError);
      setInvestment(null);
      setError(loadError.message || "Investment could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadDocuments = useCallback(async () => {
    try {
      const response = await InvestmentController.getInvestmentDocuments(id);

      if (response?.success) {
        setDocuments(response.data || []);
      } else {
        setDocuments([]);
      }
    } catch (loadError) {
      console.error("Investment documents load error:", loadError);
      setDocuments([]);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    loadInvestmentDetails();
    loadDocuments();
  }, [id, loadDocuments, loadInvestmentDetails]);

  useEffect(() => {
    const availableMethods = investment?.paymentOptions || [];
    if (availableMethods.length === 0) return;

    const currentMethod = investment?.principalPayment?.method;
    const fallbackMethod = currentMethod || availableMethods[0]?.key || "";
    const hasSelectedMethod = availableMethods.some(
      (method) => method.key === selectedPaymentMethod,
    );

    if (!hasSelectedMethod) {
      setSelectedPaymentMethod(fallbackMethod);
    }
  }, [investment, selectedPaymentMethod]);

  const handleDocumentUpload = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append("file", file);

      let response;
      if (type === "contract") {
        response = await InvestmentController.uploadContract(id, formData);
      } else if (type === "payment_receipt") {
        response = await InvestmentController.uploadPaymentReceipt(id, formData);
      } else if (type === "title_deed") {
        response = await InvestmentController.uploadTitleDeed(id, formData);
      } else {
        formData.append("documentType", type);
        response = await InvestmentController.uploadAdditionalDocument(
          id,
          formData,
        );
      }

      if (response?.success) {
        await loadInvestmentDetails();
        await loadDocuments();
        feedback.success(t("investor.documentUploadedSuccessfully"));
      }
    } catch (uploadError) {
      console.error("Investment document upload error:", uploadError);
      feedback.error(uploadError.message || t("investor.documentUploadFailed"));
    } finally {
      setUploadingDoc(false);
      event.target.value = "";
    }
  };

  const handleDownloadDocument = async (fileId, fileName) => {
    try {
      const response = await InvestmentController.downloadDocument(id, fileId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("Investment document download error:", downloadError);
      feedback.error(t("investor.documentDownloadFailed"));
    }
  };

  const handleAcceptOffer = async () => {
    try {
      setActionLoading("accept");
      const response = await InvestmentController.acceptOffer(id);

      if (response?.success) {
        await loadInvestmentDetails();
        feedback.success("Offer accepted successfully.");
      }
    } catch (actionError) {
      console.error("Offer accept error:", actionError);
      feedback.error(actionError.message || "Failed to accept offer.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectOffer = async () => {
    try {
      setActionLoading("reject");
      const response = await InvestmentController.rejectOffer(
        id,
        rejectReason || "Rejected by owner",
      );

      if (response?.success) {
        setShowRejectModal(false);
        setRejectReason("");
        feedback.success("Offer rejected successfully.");
        navigate("/owner/offers");
      }
    } catch (actionError) {
      console.error("Offer reject error:", actionError);
      feedback.error(actionError.message || "Failed to reject offer.");
    } finally {
      setActionLoading(null);
    }
  };

  const submitRepresentativeRequest = async () => {
    try {
      setConfirmAction(null);
      const response =
        await InvestmentController.requestLocalRepresentative(id);

      if (response?.success) {
        await loadInvestmentDetails();
        feedback.success(t("investor.representativeRequestedSuccessfully"));
      }
    } catch (requestError) {
      console.error("Representative request error:", requestError);
      feedback.error(
        requestError.message || t("investor.representativeRequestFailed"),
      );
    }
  };

  const handlePreparePrincipalPayment = async () => {
    try {
      setActionLoading("prepare_payment");
      const response = await InvestmentController.preparePrincipalPayment(id, {
        method: selectedPaymentMethod,
      });

      if (response?.success) {
        await loadInvestmentDetails();
        feedback.success("Payment instructions are ready.");
      }
    } catch (actionError) {
      console.error("Payment preparation error:", actionError);
      feedback.error(
        actionError.message || "Failed to prepare payment instructions.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const submitPrincipalPaymentConfirmation = async () => {
    try {
      setConfirmAction(null);
      setActionLoading("confirm_payment");
      const response = await InvestmentController.confirmPrincipalPayment(id);

      if (response?.success) {
        await loadInvestmentDetails();
        feedback.success("Principal payment confirmed successfully.");
      }
    } catch (actionError) {
      console.error("Payment confirmation error:", actionError);
      feedback.error(
        actionError.message || "Failed to confirm principal payment.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleReviewDocument = async (fileId, action) => {
    const note = String(reviewNotes[fileId] || "").trim();

    if (action === "request_changes" && !note) {
      feedback.warning(
        "Please explain what should be corrected before re-upload.",
      );
      return;
    }

    try {
      setReviewingFileId(fileId);
      const response = await InvestmentController.reviewDocument(id, fileId, {
        action,
        notes: note,
      });

      if (response?.success) {
        await loadInvestmentDetails();
        await loadDocuments();
        setReviewNotes((current) => ({
          ...current,
          [fileId]: "",
        }));
        feedback.success(
          action === "approve"
            ? "Document approved successfully."
            : "Re-upload requested successfully.",
        );
      }
    } catch (reviewError) {
      console.error("Document review error:", reviewError);
      feedback.error(reviewError.message || "Failed to update document review.");
    } finally {
      setReviewingFileId(null);
    }
  };

  const backPath = isOwnerView
    ? "/owner/offers"
    : ["offer_sent", "rejected"].includes(investment?.status)
      ? "/investor/offers"
      : "/investor/investments";

  const documentsByType = useMemo(() => {
    const mapped = new Map();
    documents.forEach((item) => {
      if (item?.type && !mapped.has(item.type)) {
        mapped.set(item.type, item);
      }
    });
    return mapped;
  }, [documents]);

  const viewerContractDocument = documentsByType.get(
    isOwnerView ? "contract_owner_signed" : "contract_investor_signed",
  );
  const paymentReceiptDocument = documentsByType.get("payment_receipt");
  const titleDeedDocument = documentsByType.get("title_deed");

  const viewerContractNeedsReupload =
    viewerContractDocument?.reviewStatus === "changes_requested";
  const paymentReceiptNeedsReupload =
    paymentReceiptDocument?.reviewStatus === "changes_requested";
  const titleDeedNeedsReupload =
    titleDeedDocument?.reviewStatus === "changes_requested";
  const isOfferStage = ["offer_sent", "rejected"].includes(investment?.status);

  const reviewableDocuments = useMemo(
    () =>
      documents
        .filter((item) => item.canReview)
        .slice()
        .sort((left, right) => {
          const leftPriority = left.reviewStatus === "pending_review" ? 0 : 1;
          const rightPriority = right.reviewStatus === "pending_review" ? 0 : 1;

          if (leftPriority !== rightPriority) {
            return leftPriority - rightPriority;
          }

          return new Date(right.uploadedAt || 0) - new Date(left.uploadedAt || 0);
        }),
    [documents],
  );

  const hasRentalPayments = (investment?.rentalPayments?.length || 0) > 0;
  const showPaymentsTab = hasRentalPayments;
  const availableTabs = showPaymentsTab
    ? ["overview", "property", "payments", "documents"]
    : ["overview", "property", "documents"];

  useEffect(() => {
    if (!showPaymentsTab && activeTab === "payments") {
      setActiveTab("overview");
    }
  }, [activeTab, showPaymentsTab]);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-4 sm:p-6 xl:p-8">
        <div className="shell-surface px-8 py-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-day-primary dark:text-night-primary" />
          <p className="mt-4 text-sm text-day-muted dark:text-night-muted">
            {t("investor.loading")}...
          </p>
        </div>
      </div>
    );
  }

  if (!investment) {
    return (
      <div className="space-y-6 p-4 sm:p-6 xl:p-8">
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-day-primary hover:underline dark:text-night-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("investor.backToList", "Back to list")}
        </button>

        <div className="shell-surface px-6 py-8">
          <h1 className="text-2xl font-semibold text-day-text dark:text-night-text">
            {t("investor.investmentNotFound", "Investment not found")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-day-muted dark:text-night-muted">
            {error ||
              "This investment could not be loaded or is no longer available to your account."}
          </p>
        </div>
      </div>
    );
  }

  const counterparty = isOwnerView ? investment.investor : investment.propertyOwner;
  const counterpartyTitle = isOwnerView
    ? t("investments.investor_info") || "Investor Information"
    : "Property Owner";
  const counterpartyProfileLabel = isOwnerView
    ? "View investor profile"
    : "View profile";
  const pageTitle =
    (isOwnerView && investment.status === "offer_sent") ||
    (!isOwnerView && ["offer_sent", "rejected"].includes(investment.status))
      ? "Offer Detail"
      : t("investor.investmentDetails", "Investment Detail");

  const contractWorkflow = investment.contractWorkflow || {};
  const offerTerms = investment.offerTerms || {};
  const agreedMonthlyRent =
    offerTerms.desiredMonthlyRent || investment.property?.rentOffered || 0;
  const principalPayment = investment.principalPayment || {};
  const paymentInstructions = principalPayment.instructions || null;
  const paymentOptions = investment.paymentOptions || [];
  const viewerSignatureKey = isOwnerView ? "ownerSigned" : "investorSigned";
  const otherSignatureKey = isOwnerView ? "investorSigned" : "ownerSigned";
  const viewerHasSignedContract = !!contractWorkflow[viewerSignatureKey]?.fileId;
  const otherPartyHasSignedContract = !!contractWorkflow[otherSignatureKey]?.fileId;
  const contractFullySigned = !!contractWorkflow.fullySignedAt;
  const principalPaymentStatus = principalPayment.status || "not_started";
  const canUploadContract =
    investment.status === "contract_signed" &&
    (!viewerHasSignedContract || viewerContractNeedsReupload);
  const canPreparePayment =
    !isOwnerView &&
    investment.status === "contract_signed" &&
    contractFullySigned &&
    principalPaymentStatus !== "confirmed";
  const canUploadPaymentReceipt =
    !isOwnerView &&
    investment.status === "contract_signed" &&
    contractFullySigned &&
    principalPaymentStatus !== "confirmed";
  const canConfirmPayment =
    isOwnerView &&
    investment.status === "contract_signed" &&
    contractFullySigned &&
    principalPaymentStatus !== "confirmed" &&
    !paymentReceiptNeedsReupload &&
    paymentReceiptDocument?.reviewStatus === "approved" &&
    !paymentReceiptDocument?.canReview &&
    (paymentInstructions || investment.paymentReceipt?.fileId);
  const canUploadTitleDeed =
    isOwnerView &&
    investment.status === "contract_signed" &&
    principalPaymentStatus === "confirmed" &&
    (!investment.titleDeedDocument?.fileId || titleDeedNeedsReupload);
  const representativeRequestPending =
    investment.representativeRequest?.isPending || false;
  const canRequestRepresentative =
    !investment.localRepresentative &&
    !representativeRequestPending &&
    ["contract_signed", "title_deed_pending", "active"].includes(
      investment.status,
    );
  const propertyPath = getInvestmentPropertyPath(
    isOwnerView ? "owner" : "investor",
    getUserId(investment.property),
  );
  const paymentReceiptWaitingMessage = isOwnerView
    ? "Investor receipt is waiting for your verification below."
    : "Receipt uploaded. Waiting for property owner verification.";

  const statusLabel = formatKeyLabel(investment.status);
  const processEntries = Object.entries(investment.processTracking || {});
  const currentProcessKey =
    processEntries.find(([, value]) => value?.active)?.[0] ||
    processEntries.find(([, value]) => value?.completed === false)?.[0] ||
    null;
  const currentProcessLabel = currentProcessKey
    ? PROCESS_LABELS[currentProcessKey] || formatKeyLabel(currentProcessKey)
    : statusLabel;
  const yieldTarget =
    formatPercent(
      offerTerms.annualYieldPercent || investment.property?.annualYieldPercent,
    ) || "—";
  const totalExpectedIncome = getExpectedIncome(investment);
  const totalCollectedIncome = getCollectedIncome(investment);
  const paymentProgress = getPaymentProgress(investment);
  const pendingReviewCount = reviewableDocuments.filter(
    (document) => document.reviewStatus === "pending_review",
  ).length;
  const approvedDocumentCount = documents.filter(
    (document) => document.reviewStatus === "approved",
  ).length;
  const changesRequestedCount = documents.filter(
    (document) => document.reviewStatus === "changes_requested",
  ).length;
  const hasAnyAction =
    (isOwnerView && investment.status === "offer_sent") ||
    canUploadContract ||
    canPreparePayment ||
    canUploadPaymentReceipt ||
    canConfirmPayment ||
    canUploadTitleDeed ||
    canRequestRepresentative ||
    reviewableDocuments.length > 0;
  const rentalPaidCount = investment.rentalPayments?.filter(
    (payment) => payment.status === "paid",
  ).length;
  const rentalPendingCount = investment.rentalPayments?.filter(
    (payment) => payment.status === "pending",
  ).length;
  const rentalDelayedCount = investment.rentalPayments?.filter(
    (payment) => payment.status === "delayed",
  ).length;
  const isRepresentativeRequestConfirmOpen =
    confirmAction === "request_representative";
  const isPrincipalPaymentConfirmOpen = confirmAction === "confirm_payment";

  return (
    <div className="space-y-6 p-4 sm:p-6 xl:p-8">
      {isRepresentativeRequestConfirmOpen ? (
        <ConfirmationModal
          title="Request local representative"
          message="Create a local execution support request for this investment. Once submitted, the request will appear in the representative queue for the relevant region."
          confirmLabel="Send request"
          onConfirm={submitRepresentativeRequest}
          onClose={() => setConfirmAction(null)}
          tone="primary"
        />
      ) : null}

      {isPrincipalPaymentConfirmOpen ? (
        <ConfirmationModal
          title="Confirm principal payment"
          message="Use this once you have verified that the principal payment has been received correctly. This will move the workflow to the next stage."
          confirmLabel="Confirm payment"
          onConfirm={submitPrincipalPaymentConfirmation}
          onClose={() => setConfirmAction(null)}
          processing={actionLoading === "confirm_payment"}
          tone="success"
        />
      ) : null}

      {showRejectModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="shell-surface w-full max-w-lg px-6 py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
              Offer decision
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
              Reject this offer
            </h2>
            <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
              Add a short explanation so the investor sees why this opportunity
              cannot move forward.
            </p>

            <textarea
              rows={4}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Reason for rejection (optional)..."
              className="shell-input mt-5 min-h-[120px]"
            />

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className={SECONDARY_BUTTON_CLASS}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading === "reject"}
                onClick={handleRejectOffer}
                className={DANGER_BUTTON_CLASS}
              >
                {actionLoading === "reject" ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="shell-surface px-6 py-7 sm:px-8">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-day-primary hover:underline dark:text-night-primary"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.1} />
            {t("investor.back", "Back")}
          </button>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:border-night-border/70 dark:bg-night-surface dark:text-night-muted">
              {investment.id ? `ID ${investment.id}` : "Investment case"}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getStatusClass(
                investment.status,
              )}`}
            >
              {statusLabel}
            </span>
            <span className="rounded-full border border-day-border/70 bg-day-panel/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-primary dark:border-night-border/70 dark:bg-night-panel/70 dark:text-night-primary">
              {isOwnerView ? "Owner workflow" : "Investor portfolio"}
            </span>
          </div>

          <div className="mt-6">
            <p className="text-sm text-day-muted dark:text-night-muted">
              {pageTitle}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
              {formatAmount(investment.amountInvested)}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-day-muted dark:text-night-muted">
              {isOwnerView
                ? "Review the commercial terms, signed package, payment confirmation, and title deed readiness without losing the broader lifecycle context."
                : "Track the full lifecycle of this position, from negotiated terms to contract, payment, title deed, and rental income collection."}
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
              label="Execution date"
              value={formatDate(investment.createdAt)}
              icon={CalendarClock}
            />
            <MetricCard
              label="Yield target"
              value={yieldTarget}
              icon={CircleDollarSign}
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

      <section className="shell-surface px-3 py-3">
        <nav className="flex flex-wrap gap-2">
          {availableTabs.map((tab) => (
            <TabButton
              key={tab}
              active={activeTab === tab}
              data-testid={`investment-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab] || formatKeyLabel(tab)}
            </TabButton>
          ))}
        </nav>
      </section>

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Investment amount"
              value={formatAmount(investment.amountInvested)}
              icon={CircleDollarSign}
            />
            <MetricCard
              label="Negotiated monthly rent"
              value={agreedMonthlyRent ? formatAmount(agreedMonthlyRent) : "—"}
              icon={HandCoins}
              accentClass="text-emerald-600 dark:text-emerald-300"
            />
            <MetricCard
              label="Expected total return"
              value={totalExpectedIncome > 0 ? formatAmount(totalExpectedIncome) : "—"}
              icon={BadgeCheck}
            />
            <MetricCard
              label="Income collected"
              value={totalCollectedIncome > 0 ? formatAmount(totalCollectedIncome) : "—"}
              icon={ReceiptText}
              hint={
                paymentProgress > 0
                  ? `${paymentProgress}% of the scheduled rental period is complete.`
                  : "Rental collection has not started yet."
              }
              accentClass="text-emerald-600 dark:text-emerald-300"
            />
          </div>

          <SectionCard
            eyebrow="Commercial terms"
            title="Listing versus negotiated position"
            description="Compare what the property originally asked for with the final investment terms now attached to this case."
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
                    value={formatPropertyType(investment.property?.propertyType)}
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
                  <DetailRow
                    label="Annual yield"
                    value={yieldTarget}
                  />
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

            {offerTerms.message ? (
              <Notice tone="slate" className="mt-4">
                <span className="font-semibold">Offer note:</span> {offerTerms.message}
              </Notice>
            ) : null}

            {investment.status === "rejected" &&
            investment.offerDecision?.rejectionReason ? (
              <Notice tone="rose" className="mt-4">
                <span className="font-semibold">Rejection note:</span>{" "}
                {investment.offerDecision.rejectionReason}
              </Notice>
            ) : null}
          </SectionCard>

          <div className="grid gap-6 xl:grid-cols-2">
            {counterparty ? (
              <SectionCard
                eyebrow="Counterparty"
                title={counterpartyTitle}
                description="The primary relationship on the other side of this investment lifecycle."
              >
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
                    <UserRound className="h-5 w-5" strokeWidth={2.1} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold text-day-text dark:text-night-text">
                      {counterparty.fullName || counterparty.email || "—"}
                    </p>
                    <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
                      {counterparty.country || counterparty.region || "Region pending"}
                    </p>
                    {counterparty.email ? (
                      <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
                        {counterparty.email}
                      </p>
                    ) : null}
                    {isOwnerView &&
                    typeof counterparty.activeInvestmentCount === "number" ? (
                      <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
                        Active investments: {counterparty.activeInvestmentCount}
                      </p>
                    ) : null}
                  </div>
                </div>

                {getUserId(counterparty) ? (
                  <Link
                    to={getUserProfilePath(getUserId(counterparty))}
                    className="mt-5 inline-flex items-center gap-2 rounded-full border border-day-border px-4 py-2 text-sm font-semibold text-day-primary transition hover:bg-day-panel/60 dark:border-night-border dark:text-night-primary dark:hover:bg-night-panel/60"
                  >
                    {counterpartyProfileLabel}
                    <ArrowRight className="h-4 w-4" strokeWidth={2.1} />
                  </Link>
                ) : null}
              </SectionCard>
            ) : null}

            <SectionCard
              eyebrow="Operations"
              title="Local execution and document state"
              description="Track who is supporting the case locally and how many review items are still active."
            >
              <div className="space-y-0">
                <DetailRow
                  label="Local representative"
                  value={
                    investment.localRepresentative?.fullName ||
                    (representativeRequestPending
                      ? "Request pending"
                      : "Not assigned")
                  }
                />
                <DetailRow
                  label="Requested region"
                  value={investment.representativeRequest?.region || "—"}
                />
                <DetailRow
                  label="Pending review items"
                  value={String(pendingReviewCount)}
                  valueClassName={
                    pendingReviewCount > 0
                      ? "text-amber-700 dark:text-amber-200"
                      : ""
                  }
                />
                <DetailRow
                  label="Approved documents"
                  value={String(approvedDocumentCount)}
                />
              </div>

              {representativeRequestPending ? (
                <Notice tone="sky" className="mt-4">
                  A local representative request is pending for{" "}
                  {investment.representativeRequest?.region || "this region"}.
                </Notice>
              ) : null}
            </SectionCard>
          </div>

          <SectionCard
            eyebrow="Workflow"
            title="Process tracking"
            description="Each operational gate remains visible so you can tell what has completed and what still blocks the next milestone."
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
              <Notice tone="slate">
                No explicit process tracking milestones are available yet for
                this investment.
              </Notice>
            )}
          </SectionCard>

          {!isOfferStage ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <SectionCard
                eyebrow="Contract package"
                title="Signature status"
                description="Both parties must complete their signed contract uploads before the payment workflow can fully open."
              >
                <div className="space-y-3">
                  {[
                    {
                      key: "investorSigned",
                      label: "Investor signed contract",
                    },
                    {
                      key: "ownerSigned",
                      label: "Property owner signed contract",
                    },
                  ].map((item) => {
                    const entry = contractWorkflow[item.key];
                    const isCompleted = !!entry?.fileId;

                    return (
                      <div
                        key={item.key}
                        className="shell-subtle-surface flex items-center justify-between gap-4 px-4 py-4"
                      >
                        <div>
                          <p className="text-sm font-semibold text-day-text dark:text-night-text">
                            {item.label}
                          </p>
                          <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
                            {entry?.uploadedAt
                              ? formatDateTime(entry.uploadedAt)
                              : "Waiting for upload"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200"
                          }`}
                        >
                          {isCompleted ? "Completed" : "Pending"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {contractFullySigned ? (
                  <Notice tone="emerald" className="mt-4">
                    The contract package is fully signed as of{" "}
                    {formatDateTime(contractWorkflow.fullySignedAt)}.
                  </Notice>
                ) : null}
              </SectionCard>

              <SectionCard
                eyebrow="Principal payment"
                title="Funding instructions"
                description="Provider, method, and transfer details remain visible here as the payment package advances."
                action={
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getPrincipalPaymentStatusClass(
                      principalPaymentStatus,
                    )}`}
                  >
                    {PAYMENT_STATUS_LABELS[principalPaymentStatus] ||
                      formatKeyLabel(principalPaymentStatus)}
                  </span>
                }
              >
                <div className="space-y-0">
                  <DetailRow
                    label="Provider"
                    value={
                      principalPayment.providerLabel ||
                      investment.paymentProvider?.name ||
                      "Manual flow"
                    }
                  />
                  <DetailRow
                    label="Method"
                    value={
                      principalPayment.method
                        ? formatKeyLabel(principalPayment.method)
                        : "Not selected"
                    }
                  />
                  <DetailRow
                    label="Amount"
                    value={formatAmount(
                      principalPayment.amount || investment.amountInvested,
                      principalPayment.currency || APP_CURRENCY,
                    )}
                  />
                  <DetailRow
                    label="Reference"
                    value={principalPayment.referenceCode || "Will be generated"}
                  />
                  <DetailRow
                    label="Receipt review"
                    value={
                      paymentReceiptDocument?.reviewStatus
                        ? getReviewLabel(paymentReceiptDocument.reviewStatus)
                        : investment.paymentReceipt?.fileId
                          ? "Uploaded"
                          : "Not uploaded"
                    }
                  />
                </div>

                {paymentInstructions ? (
                  <div className="mt-4 rounded-3xl border border-sky-200 bg-sky-50 px-4 py-4 dark:border-sky-900/50 dark:bg-sky-900/20">
                    <p className="text-sm leading-6 text-sky-900 dark:text-sky-100">
                      {paymentInstructions.summary}
                    </p>

                    <div className="mt-4 space-y-0">
                      <DetailRow
                        label="Recipient"
                        value={paymentInstructions.recipientName || "—"}
                      />
                      <DetailRow
                        label="Bank"
                        value={paymentInstructions.bankName || "—"}
                      />
                      <DetailRow
                        label="IBAN"
                        value={paymentInstructions.iban || "—"}
                      />
                      <DetailRow
                        label="Transfer note"
                        value={paymentInstructions.transferNote || "—"}
                      />
                    </div>

                    {paymentInstructions.steps?.length > 0 ? (
                      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm leading-6 text-sky-900 dark:text-sky-100">
                        {paymentInstructions.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    ) : null}
                  </div>
                ) : null}
              </SectionCard>
            </div>
          ) : null}

          {investment.calculations && hasRentalPayments ? (
            <SectionCard
              eyebrow="Income calculations"
              title="Rental period performance"
              description="This section keeps the financial roll-up visible without having to leave the transaction detail."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Total paid"
                  value={formatAmount(investment.calculations.totalPaidAmount)}
                  icon={ReceiptText}
                  accentClass="text-emerald-600 dark:text-emerald-300"
                />
                <MetricCard
                  label="Remaining payments"
                  value={String(investment.calculations.remainingPayments || 0)}
                  icon={Clock3}
                />
                <MetricCard
                  label="Payment progress"
                  value={`${investment.calculations.paymentProgress || 0}%`}
                  icon={BadgeCheck}
                />
                <MetricCard
                  label="Contract end date"
                  value={formatDate(investment.calculations.contractEndDate)}
                  icon={CalendarClock}
                />
              </div>
            </SectionCard>
          ) : null}

          <SectionCard
            eyebrow="Operational actions"
            title="What you can do next"
            description="Available controls change as the investment moves from offer handling into contract, payment, title deed, and rental operations."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {isOwnerView && investment.status === "offer_sent" ? (
                <div className="md:col-span-2 shell-subtle-surface px-4 py-4">
                  <p className="text-sm font-semibold text-day-text dark:text-night-text">
                    Owner decision required
                  </p>
                  <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                    Review the negotiated offer terms above, then accept or reject
                    the request from here.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={actionLoading === "accept"}
                      onClick={handleAcceptOffer}
                      className={PRIMARY_BUTTON_CLASS}
                    >
                      {actionLoading === "accept"
                        ? "Accepting..."
                        : "Accept Offer"}
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading === "reject"}
                      onClick={() => setShowRejectModal(true)}
                      className={DANGER_BUTTON_CLASS}
                    >
                      Reject Offer
                    </button>
                  </div>
                </div>
              ) : null}

              {canUploadContract ? (
                <div className="shell-subtle-surface px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-day-surface text-day-primary dark:bg-night-surface dark:text-night-primary">
                      <FileCheck2 className="h-5 w-5" strokeWidth={2.1} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-day-text dark:text-night-text">
                        {isOwnerView
                          ? "Upload owner-signed contract"
                          : t("investor.uploadContract", "Upload signed contract")}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                        Upload the latest signed PDF so the contract package can
                        move toward approval.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <UploadField
                      label="Signed contract file"
                      accept=".pdf"
                      disabled={uploadingDoc}
                      onChange={(event) => handleDocumentUpload(event, "contract")}
                    />
                  </div>
                </div>
              ) : null}

              {viewerContractNeedsReupload ? (
                <Notice tone="rose" className="md:col-span-2">
                  The current signed contract needs to be uploaded again.
                  {viewerContractDocument?.reviewNotes
                    ? ` Note from reviewer: ${viewerContractDocument.reviewNotes}`
                    : ""}
                </Notice>
              ) : null}

              {investment.status === "contract_signed" &&
              viewerHasSignedContract &&
              !viewerContractNeedsReupload &&
              !otherPartyHasSignedContract ? (
                <Notice tone="amber" className="md:col-span-2">
                  You uploaded your signed contract. The workflow is now waiting
                  for the other party to upload theirs before the payment step can
                  fully open.
                </Notice>
              ) : null}

              {investment.status === "contract_signed" &&
              viewerHasSignedContract &&
              otherPartyHasSignedContract &&
              !contractFullySigned ? (
                <Notice tone="blue" className="md:col-span-2">
                  Signed contracts are on file. The workflow is waiting for the
                  required approvals before the payment step becomes active.
                </Notice>
              ) : null}

              {canPreparePayment ? (
                <div className="shell-subtle-surface px-4 py-4">
                  <p className="text-sm font-semibold text-day-text dark:text-night-text">
                    Prepare principal payment instructions
                  </p>
                  <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                    Select the transfer method that best matches how you will pay
                    for this position.
                  </p>
                  <select
                    value={selectedPaymentMethod}
                    onChange={(event) => setSelectedPaymentMethod(event.target.value)}
                    className="shell-input mt-4"
                  >
                    {paymentOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={actionLoading === "prepare_payment"}
                    onClick={handlePreparePrincipalPayment}
                    className={`mt-4 ${PRIMARY_BUTTON_CLASS}`}
                  >
                    {actionLoading === "prepare_payment"
                      ? "Preparing..."
                      : paymentInstructions
                        ? "Refresh Instructions"
                        : "Get Instructions"}
                  </button>
                </div>
              ) : null}

              {canUploadPaymentReceipt ? (
                <div className="shell-subtle-surface px-4 py-4">
                  <p className="text-sm font-semibold text-day-text dark:text-night-text">
                    {t("investor.uploadPaymentReceipt", "Upload payment receipt")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                    Upload the proof of transfer after you follow the payment
                    instructions.
                  </p>
                  <div className="mt-4">
                    <UploadField
                      label="Receipt or transfer proof"
                      accept=".pdf,.jpg,.jpeg,.png"
                      disabled={uploadingDoc}
                      onChange={(event) =>
                        handleDocumentUpload(event, "payment_receipt")
                      }
                    />
                  </div>
                  {investment.paymentReceipt?.fileId ? (
                    <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">
                      {paymentReceiptWaitingMessage}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {paymentReceiptNeedsReupload && !isOwnerView ? (
                <Notice tone="rose" className="md:col-span-2">
                  The uploaded payment receipt needs a corrected version.
                  {paymentReceiptDocument?.reviewNotes
                    ? ` Note from reviewer: ${paymentReceiptDocument.reviewNotes}`
                    : ""}
                </Notice>
              ) : null}

              {paymentReceiptNeedsReupload && isOwnerView ? (
                <Notice tone="rose" className="md:col-span-2">
                  The investor must upload a corrected payment receipt before you
                  can confirm the principal payment.
                  {paymentReceiptDocument?.reviewNotes
                    ? ` Note from reviewer: ${paymentReceiptDocument.reviewNotes}`
                    : ""}
                </Notice>
              ) : null}

              {reviewableDocuments.length > 0 ? (
                <div className="md:col-span-2 shell-subtle-surface px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-day-text dark:text-night-text">
                        Approval queue
                      </p>
                      <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                        Review uploaded documents, approve them, or explain what
                        needs to change before re-upload.
                      </p>
                    </div>
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:bg-sky-900/30 dark:text-sky-200">
                      {reviewableDocuments.length} pending
                    </span>
                  </div>

                  <div
                    data-testid="investment-review-queue"
                    className="mt-4 space-y-4"
                  >
                    {reviewableDocuments.map((document) => {
                      const isReviewing = reviewingFileId === document.fileId;

                      return (
                        <div
                          key={document.fileId}
                          data-testid="investment-review-card"
                          className="rounded-3xl border border-day-border/70 bg-day-surface px-4 py-4 dark:border-night-border/70 dark:bg-night-surface"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-day-text dark:text-night-text">
                                  {document.name}
                                </p>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${REVIEW_STATUS_STYLES[document.reviewStatus] || REVIEW_STATUS_STYLES.pending_review}`}
                                >
                                  {getReviewLabel(document.reviewStatus)}
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-day-muted dark:text-night-muted">
                                {formatKeyLabel(document.type)} uploaded{" "}
                                {document.uploadedAt
                                  ? formatDate(document.uploadedAt)
                                  : "—"}
                              </p>
                              {document.reviewNotes ? (
                                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                                  Latest note: {document.reviewNotes}
                                </p>
                              ) : null}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadDocument(document.fileId, document.name)
                              }
                              className={SECONDARY_BUTTON_CLASS}
                            >
                              <FileText className="h-4 w-4" strokeWidth={2.1} />
                              Download
                            </button>
                          </div>

                          <textarea
                            data-testid={`investment-review-note-${document.fileId}`}
                            value={reviewNotes[document.fileId] || ""}
                            onChange={(event) =>
                              setReviewNotes((current) => ({
                                ...current,
                                [document.fileId]: event.target.value,
                              }))
                            }
                            placeholder="Optional approval note or required re-upload details..."
                            className="shell-input mt-4 min-h-[104px]"
                          />

                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              data-testid={`investment-review-approve-${document.fileId}`}
                              onClick={() =>
                                handleReviewDocument(document.fileId, "approve")
                              }
                              disabled={isReviewing}
                              className={PRIMARY_BUTTON_CLASS}
                            >
                              {isReviewing
                                ? "Saving..."
                                : isOwnerView &&
                                    document.type === "payment_receipt"
                                  ? "Verify Receipt"
                                  : "Approve Document"}
                            </button>
                            <button
                              type="button"
                              data-testid={`investment-review-request-${document.fileId}`}
                              onClick={() =>
                                handleReviewDocument(
                                  document.fileId,
                                  "request_changes",
                                )
                              }
                              disabled={isReviewing}
                              className={DANGER_BUTTON_CLASS}
                            >
                              {isOwnerView &&
                              document.type === "payment_receipt"
                                ? "Request New Receipt"
                                : "Request Re-upload"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {canConfirmPayment ? (
                <div className="shell-subtle-surface px-4 py-4">
                  <p className="text-sm font-semibold text-day-text dark:text-night-text">
                    Confirm principal payment
                  </p>
                  <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                    Payment proof is approved. Confirm the investor transfer once
                    your manual checks are complete.
                  </p>
                  <button
                    type="button"
                    disabled={actionLoading === "confirm_payment"}
                    onClick={() => setConfirmAction("confirm_payment")}
                    className={`mt-4 ${PRIMARY_BUTTON_CLASS}`}
                  >
                    {actionLoading === "confirm_payment"
                      ? "Confirming..."
                      : "Confirm Principal Payment"}
                  </button>
                </div>
              ) : null}

              {canUploadTitleDeed ? (
                <div className="shell-subtle-surface px-4 py-4">
                  <p className="text-sm font-semibold text-day-text dark:text-night-text">
                    Upload title deed package
                  </p>
                  <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                    Submit the title deed file so the case can move into the next
                    approval step.
                  </p>
                  <div className="mt-4">
                    <UploadField
                      label="Title deed document"
                      accept=".pdf,.jpg,.jpeg,.png"
                      disabled={uploadingDoc}
                      onChange={(event) => handleDocumentUpload(event, "title_deed")}
                    />
                  </div>
                </div>
              ) : null}

              {titleDeedNeedsReupload && isOwnerView ? (
                <Notice tone="rose" className="md:col-span-2">
                  The uploaded title deed needs a corrected version before the
                  rental period can start.
                  {titleDeedDocument?.reviewNotes
                    ? ` Note from reviewer: ${titleDeedDocument.reviewNotes}`
                    : ""}
                </Notice>
              ) : null}

              {isOwnerView && investment.status === "title_deed_pending" ? (
                <Notice tone="blue" className="md:col-span-2">
                  Title deed document uploaded. The case is waiting for the
                  remaining participant approvals before the rental period starts.
                </Notice>
              ) : null}

              {canRequestRepresentative ? (
                <div className="shell-subtle-surface px-4 py-4">
                  <p className="text-sm font-semibold text-day-text dark:text-night-text">
                    Local representative support
                  </p>
                  <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                    Request local execution support once the investment reaches a
                    stage that benefits from regional follow-up.
                  </p>
                  <button
                    type="button"
                    onClick={() => setConfirmAction("request_representative")}
                    className={`mt-4 ${SECONDARY_BUTTON_CLASS}`}
                  >
                    <UploadCloud className="h-4 w-4" strokeWidth={2.1} />
                    {t(
                      "investor.requestLocalRepresentative",
                      "Request local representative",
                    )}
                  </button>
                </div>
              ) : null}

              {!hasAnyAction ? (
                <Notice tone="slate" className="md:col-span-2">
                  No manual action is currently required from your side. Keep the
                  overview, payments, and document tabs as your reference surfaces
                  while the workflow advances.
                </Notice>
              ) : null}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "property" && investment.property ? (
        <InvestmentPropertyPanel
          property={investment.property}
          owner={investment.propertyOwner || investment.property.owner}
          propertyPath={propertyPath}
          t={t}
        />
      ) : null}

      {activeTab === "payments" && showPaymentsTab ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Collected income"
              value={formatAmount(totalCollectedIncome)}
              icon={ReceiptText}
              accentClass="text-emerald-600 dark:text-emerald-300"
            />
            <MetricCard
              label="Paid cycles"
              value={String(rentalPaidCount || 0)}
              icon={BadgeCheck}
            />
            <MetricCard
              label="Pending cycles"
              value={String(rentalPendingCount || 0)}
              icon={Clock3}
            />
            <MetricCard
              label="Delayed cycles"
              value={String(rentalDelayedCount || 0)}
              icon={HandCoins}
              accentClass={
                rentalDelayedCount > 0
                  ? "text-rose-700 dark:text-rose-300"
                  : ""
              }
            />
          </div>

          <SectionCard
            eyebrow="Rental ledger"
            title={t("investor.rentalPayments", "Rental payments")}
            description="Each rental cycle remains visible here with the amount, payment state, and settlement date."
          >
            {investment.rentalPayments?.length ? (
              <div className="space-y-3">
                {investment.rentalPayments.map((payment, index) => (
                  <div
                    key={`${payment.month || "payment"}-${index}`}
                    className="shell-subtle-surface flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-day-text dark:text-night-text">
                        {payment.month || `Payment ${index + 1}`}
                      </p>
                      <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
                        Paid date: {payment.paidAt ? formatDate(payment.paidAt) : "—"}
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
                ))}
              </div>
            ) : (
              <Notice tone="slate">
                {t("investor.noPaymentsYet", "No rental payments yet")}
              </Notice>
            )}
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "documents" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Documents on file"
              value={String(documents.length)}
              icon={FileText}
            />
            <MetricCard
              label="Pending review"
              value={String(pendingReviewCount)}
              icon={Clock3}
              accentClass={
                pendingReviewCount > 0
                  ? "text-amber-700 dark:text-amber-200"
                  : ""
              }
            />
            <MetricCard
              label="Changes requested"
              value={String(changesRequestedCount)}
              icon={UploadCloud}
              accentClass={
                changesRequestedCount > 0
                  ? "text-rose-700 dark:text-rose-300"
                  : ""
              }
            />
          </div>

          {documents.length > 0 ? (
            <DocumentsList
              documents={documents}
              t={t}
              onDownload={handleDownloadDocument}
            />
          ) : (
            <SectionCard
              eyebrow="Data room"
              title="No uploaded files yet"
              description="Contracts, payment proofs, and supporting material will appear here as the workflow matures."
            >
              <Notice tone="slate">
                There are currently no uploaded documents attached to this
                investment.
              </Notice>
            </SectionCard>
          )}

          <SectionCard
            eyebrow="Upload"
            title={t(
              "investor.uploadAdditionalDocument",
              "Upload additional document",
            )}
            description="Use this area for extra supporting files that do not belong to the main contract, receipt, or title deed steps."
          >
            <UploadField
              dataTestId="investment-upload-additional-document"
              label="Additional file"
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={uploadingDoc}
              onChange={(event) => handleDocumentUpload(event, "other")}
            />
            {uploadingDoc ? (
              <p className="mt-3 text-sm text-day-muted dark:text-night-muted">
                {t("investor.uploading", "Uploading")}...
              </p>
            ) : null}
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
};

const InvestorInvestmentDetail = () => (
  <InvestmentDetailPage viewerRole="investor" />
);

export default InvestorInvestmentDetail;
