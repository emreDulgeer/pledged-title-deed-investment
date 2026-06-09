import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileText,
  Handshake,
  Home,
  Landmark,
  Loader2,
  MapPin,
  ReceiptText,
  ShieldCheck,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import InvestmentController from "../../controllers/investmentController";
import InvestmentPropertyPanel from "../../components/investments/InvestmentPropertyPanel";
import DocumentsList from "../../components/property/detail/DocumentsList";
import { selectUser } from "../../store/slices/authSlice";
import { APP_CURRENCY } from "../../utils/currency";
import { useAppFeedback } from "../../utils/hooks/useAppFeedback";
import {
  getInvestmentPropertyPath,
  getUserId,
  getUserProfilePath,
} from "../../utils/profileRoutes";

const PROCESS_LABELS = {
  offerSent: "Offer Stage",
  contractSigning: "Contract Signing",
  principalPayment: "Principal Payment",
  titleDeedRegistration: "Title Deed Registration",
  rentalPeriod: "Rental Period",
  completion: "Completion",
};

const STATUS_STYLES = {
  offer_sent:
    "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-300/15 dark:text-sky-200 dark:ring-sky-300/25",
  contract_signed:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-300/15 dark:text-amber-200 dark:ring-amber-300/25",
  title_deed_pending:
    "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-300/15 dark:text-violet-200 dark:ring-violet-300/25",
  active:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-300/15 dark:text-emerald-200 dark:ring-emerald-300/25",
  completed:
    "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-300/15 dark:text-slate-200 dark:ring-slate-300/25",
  refunded:
    "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-300/15 dark:text-cyan-200 dark:ring-cyan-300/25",
  rejected:
    "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-300/15 dark:text-rose-200 dark:ring-rose-300/25",
};

const REVIEW_STATUS_STYLES = {
  not_requested:
    "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-300/15 dark:text-slate-200 dark:ring-slate-300/25",
  pending_review:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-300/15 dark:text-amber-200 dark:ring-amber-300/25",
  approved:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-300/15 dark:text-emerald-200 dark:ring-emerald-300/25",
  changes_requested:
    "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-300/15 dark:text-rose-200 dark:ring-rose-300/25",
};

const ACTION_COPY = {
  review_offer: {
    title: "Offer still needs an owner decision",
    description:
      "This request is early in the lifecycle. You would be stepping in before the contract phase is fully active.",
  },
  upload_contract: {
    title: "Signed contract package is still incomplete",
    description:
      "At least one party still needs to upload its signed contract before the case can move forward.",
  },
  review_contract: {
    title: "Contract approval is the current gate",
    description:
      "The investment cannot progress until the pending signed-contract review is approved.",
  },
  prepare_payment: {
    title: "Principal payment is the next commercial milestone",
    description:
      "The investor still needs payment preparation or confirmation before title deed work can start.",
  },
  review_payment_receipt: {
    title: "Payment proof review is blocking the next step",
    description:
      "The payment receipt must be reviewed before title deed registration can proceed.",
  },
  upload_title_deed: {
    title: "Owner title deed submission is the current blocker",
    description:
      "The property owner still needs to upload the title deed package before your local review can begin.",
  },
  approve_title_deed: {
    title: "Title deed review controls activation",
    description:
      "Once the uploaded title deed package is verified and approved, the investment can move into the rental period.",
  },
  manage_rental_period: {
    title: "Rental period is active",
    description:
      "The case is live. Your role is to monitor local follow-up and keep document exceptions resolved.",
  },
};

const ACTOR_LABELS = {
  investor: "Investor",
  property_owner: "Property owner",
  local_representative: "Local representative",
  admin: "Admin",
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const formatKeyLabel = (value) =>
  value
    ? String(value)
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "-";

const formatMoney = (value, currency = APP_CURRENCY) =>
  Number.isFinite(Number(value))
    ? `${Number(value).toLocaleString()} ${currency}`
    : "-";

const getStatusClass = (status) =>
  STATUS_STYLES[status] ||
  "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-300/15 dark:text-slate-200 dark:ring-slate-300/25";

const getNextActionMeta = (action) =>
  ACTION_COPY[action?.key] || {
    title: action?.key ? formatKeyLabel(action.key) : "No pending workflow gate",
    description:
      "This case currently has no clearly defined blocking action in the workflow.",
  };

const getActorLabel = (actor) => ACTOR_LABELS[actor] || formatKeyLabel(actor);

const getPropertyId = (property) =>
  property?.id || property?._id || property?.propertyId || null;

const getLocationLabel = (investment) => {
  const property = investment?.property;
  const cityCountry = [property?.city, property?.country]
    .filter(Boolean)
    .join(", ");

  return cityCountry || property?.fullAddress || "Property location pending";
};

const getPersonName = (person, fallback = "Unknown") =>
  person?.fullName ||
  [person?.firstName, person?.lastName].filter(Boolean).join(" ") ||
  person?.email ||
  fallback;

const getInitials = (person, fallback = "NA") => {
  const name = getPersonName(person, fallback);
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
};

const formatReviewLabel = (status) => {
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

const SectionHeader = ({ action = null, eyebrow, icon, title, subtitle }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
        {React.createElement(icon, { className: "h-3.5 w-3.5" })}
        {eyebrow}
      </div>
      <h2 className="mt-2 text-xl font-semibold text-day-text dark:text-night-text">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-1 max-w-3xl text-sm leading-6 text-day-muted dark:text-night-muted">
          {subtitle}
        </p>
      ) : null}
    </div>
    {action}
  </div>
);

const MetricCard = ({ icon, label, value, hint = null, tone = "" }) => (
  <div className="shell-subtle-surface px-4 py-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
          {label}
        </p>
        <p
          className={`mt-3 text-2xl font-semibold text-day-text dark:text-night-text ${tone}`.trim()}
        >
          {value}
        </p>
      </div>
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-muted dark:bg-night-panel dark:text-night-muted">
        {React.createElement(icon, { className: "h-5 w-5" })}
      </div>
    </div>
    {hint ? (
      <p className="mt-2 text-xs leading-5 text-day-muted dark:text-night-muted">
        {hint}
      </p>
    ) : null}
  </div>
);

const InfoTile = ({ icon, label, value, helper = null }) => (
  <div className="rounded-2xl border border-day-border/70 bg-day-panel/70 px-4 py-4 dark:border-night-border/70 dark:bg-night-panel/70">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
      {React.createElement(icon, { className: "h-3.5 w-3.5" })}
      {label}
    </div>
    <p className="mt-2 text-sm font-semibold capitalize text-day-text dark:text-night-text">
      {value}
    </p>
    {helper ? (
      <p className="mt-1 text-xs leading-5 text-day-muted dark:text-night-muted">
        {helper}
      </p>
    ) : null}
  </div>
);

const PersonCard = ({ icon, label, person }) => {
  const userId = getUserId(person);

  return (
    <section className="shell-surface px-5 py-5">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-3xl bg-sky-300 text-sm font-bold text-slate-950">
          {getInitials(person, label)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
            {React.createElement(icon, { className: "h-3.5 w-3.5" })}
            {label}
          </div>
          <p className="mt-2 truncate text-base font-semibold text-day-text dark:text-night-text">
            {getPersonName(person, "-")}
          </p>
          <p className="mt-1 truncate text-sm text-day-muted dark:text-night-muted">
            {person?.email || "-"}
          </p>
          <Link
            to={getUserProfilePath(userId)}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-day-primary hover:underline dark:text-night-primary"
          >
            Open profile
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

const ProcessCard = ({ entryKey, value }) => (
  <div className="shell-subtle-surface px-4 py-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-day-text dark:text-night-text">
          {PROCESS_LABELS[entryKey] || formatKeyLabel(entryKey)}
        </p>
        <p className="mt-2 text-xs text-day-muted dark:text-night-muted">
          Date {formatDate(value?.date || value?.startDate)}
        </p>
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
          value?.active
            ? "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-300/15 dark:text-sky-200 dark:ring-sky-300/25"
            : value?.completed
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-300/15 dark:text-emerald-200 dark:ring-emerald-300/25"
              : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-300/15 dark:text-slate-200 dark:ring-slate-300/25"
        }`}
      >
        {value?.active ? "Active" : value?.completed ? "Completed" : "Pending"}
      </span>
    </div>
  </div>
);

const ReviewDocumentCard = ({
  document,
  isReviewing,
  onDownload,
  onReview,
  reviewNote,
  setReviewNote,
}) => (
  <article className="shell-subtle-surface px-4 py-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-day-text dark:text-night-text">
          {document.name}
        </p>
        <p className="mt-1 text-xs text-day-muted dark:text-night-muted">
          {formatKeyLabel(document.type)} · uploaded {formatDate(document.uploadedAt)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDownload(document.fileId, document.name)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-3 py-2 text-xs font-semibold text-day-text transition hover:border-day-primary/40 hover:text-day-primary dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:border-night-primary/50 dark:hover:text-night-primary"
      >
        <Download className="h-4 w-4" />
        Download
      </button>
    </div>

    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
          REVIEW_STATUS_STYLES[document.reviewStatus] ||
          REVIEW_STATUS_STYLES.not_requested
        }`}
      >
        {formatReviewLabel(document.reviewStatus)}
      </span>
      {document.verified ? (
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-300/15 dark:text-emerald-200 dark:ring-emerald-300/25">
          Workflow verified
        </span>
      ) : null}
    </div>

    {document.reviewNotes ? (
      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
        Latest note: {document.reviewNotes}
      </div>
    ) : null}

    <textarea
      value={reviewNote}
      onChange={(event) => setReviewNote(document.fileId, event.target.value)}
      placeholder="Optional approval note or required re-upload details..."
      className="mt-3 shell-input min-h-[96px] resize-none"
    />

    <div className="mt-3 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => onReview(document.fileId, "approve")}
        disabled={isReviewing || document.reviewStatus === "approved"}
        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CheckCircle2 className="h-4 w-4" />
        {document.type === "title_deed"
          ? "Approve and start rental period"
          : "Approve document"}
      </button>
      <button
        type="button"
        onClick={() => onReview(document.fileId, "request_changes")}
        disabled={isReviewing}
        className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <XCircle className="h-4 w-4" />
        Request re-upload
      </button>
    </div>
  </article>
);

const RentalSchedule = ({ payments = [] }) => (
  <section className="shell-surface px-5 py-6 sm:px-6">
    <SectionHeader
      eyebrow="Rental"
      icon={ReceiptText}
      title="Rental Schedule"
      subtitle="Rental payment milestones become visible once the investment enters the rental period."
    />

    {payments.length ? (
      <div className="mt-5 space-y-3">
        {payments.map((payment, index) => (
          <div
            key={`${payment.month}-${index}`}
            className="shell-subtle-surface flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-day-text dark:text-night-text">
                {payment.month}
              </p>
              <p className="mt-1 text-xs text-day-muted dark:text-night-muted">
                Paid at {formatDate(payment.paidAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-day-panel px-3 py-1.5 text-xs font-semibold text-day-muted dark:bg-night-panel dark:text-night-muted">
                {formatMoney(payment.amount, APP_CURRENCY)}
              </span>
              <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold capitalize text-sky-700 ring-1 ring-sky-200 dark:bg-sky-300/15 dark:text-sky-200 dark:ring-sky-300/25">
                {formatKeyLabel(payment.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="mt-5 shell-subtle-surface px-5 py-8 text-sm text-day-muted dark:text-night-muted">
        Rental schedule is not available yet.
      </div>
    )}
  </section>
);

const RepresentativeInvestmentDetail = () => {
  const { id } = useParams();
  const user = useSelector(selectUser);
  const feedback = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [investment, setInvestment] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [reviewingFileId, setReviewingFileId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});

  const isAssignedRepresentative = useMemo(
    () =>
      String(investment?.localRepresentative?.id || "") ===
      String(user?.id || user?._id || ""),
    [investment, user],
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const investmentResponse = await InvestmentController.getInvestmentById(id);
      const investmentData = investmentResponse?.data || null;
      setInvestment(investmentData);

      try {
        const documentsResponse = await InvestmentController.getInvestmentDocuments(
          id,
        );
        setDocuments(documentsResponse?.data || []);
      } catch (documentError) {
        console.warn("Representative documents unavailable yet:", documentError);
        setDocuments([]);
      }
    } catch (error) {
      console.error("Representative investment detail error:", error);
      setInvestment(null);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClaim = async () => {
    try {
      setClaiming(true);
      const response = await InvestmentController.claimRepresentativeRequest(id);
      if (response?.success) {
        await loadData();
        feedback.success("Representative request claimed successfully.");
      }
    } catch (error) {
      console.error("Claim request error:", error);
      feedback.error(error.message || "Failed to claim representative request.");
    } finally {
      setClaiming(false);
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
    } catch (error) {
      console.error("Representative document download error:", error);
      feedback.error("Failed to download document.");
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
        await loadData();
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
    } catch (error) {
      console.error("Representative review error:", error);
      feedback.error(error.message || "Failed to update document review.");
    } finally {
      setReviewingFileId(null);
    }
  };

  const setReviewNote = (fileId, value) => {
    setReviewNotes((current) => ({
      ...current,
      [fileId]: value,
    }));
  };

  const canClaimRequest =
    !!investment?.representativeRequest?.isPending &&
    !investment?.localRepresentative;

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

  const pendingReviewCount = useMemo(
    () =>
      reviewableDocuments.filter(
        (item) => item.reviewStatus === "pending_review",
      ).length,
    [reviewableDocuments],
  );

  if (loading) {
    return (
      <div className="shell-surface grid min-h-[360px] place-items-center">
        <div className="flex items-center gap-2 text-day-muted dark:text-night-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading case details...
        </div>
      </div>
    );
  }

  if (!investment) {
    return (
      <div className="shell-surface px-6 py-8">
        <Link
          to="/rep/cases"
          className="inline-flex items-center gap-2 text-sm font-semibold text-day-primary hover:underline dark:text-night-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to cases
        </Link>
        <p className="mt-4 text-sm text-day-muted dark:text-night-muted">
          Investment not found or you are no longer allowed to access it.
        </p>
      </div>
    );
  }

  const detailMode = isAssignedRepresentative ? "workflow" : "evaluation";
  const propertyPath =
    isAssignedRepresentative && investment?.property
      ? getInvestmentPropertyPath(
          "local_representative",
          getPropertyId(investment.property),
        )
      : null;
  const processEntries = Object.entries(investment?.processTracking || {});
  const nextActionMeta = getNextActionMeta(investment?.nextRequiredAction);
  const statusLabel = formatKeyLabel(investment?.status);
  const requestedByRoleLabel = formatKeyLabel(
    investment?.representativeRequest?.requestedByRole,
  );
  const nextActionActorLabel = getActorLabel(
    investment?.nextRequiredAction?.actor,
  );
  const monthlyRentLabel = formatMoney(
    investment?.offerTerms?.desiredMonthlyRent || investment?.property?.rentOffered,
    APP_CURRENCY,
  );
  const contractMonthsLabel = investment?.property?.contractPeriodMonths
    ? `${investment.property.contractPeriodMonths} months`
    : "-";
  const processTrackingSummary =
    processEntries.find(([, value]) => value?.active)?.[0] ||
    processEntries.find(([, value]) => value?.completed === false)?.[0] ||
    null;
  const currentProcessLabel = processTrackingSummary
    ? PROCESS_LABELS[processTrackingSummary] || formatKeyLabel(processTrackingSummary)
    : "No active stage";
  const documentSubmissionLabel =
    pendingReviewCount > 0
      ? "Ready for your review"
      : investment?.titleDeedDocument?.fileId
        ? "Title deed on file"
        : investment?.nextRequiredAction?.key === "upload_title_deed"
          ? "Waiting on owner upload"
          : investment?.nextRequiredAction?.key === "upload_contract"
            ? "Waiting on signed contracts"
            : documents.length > 0
              ? "Packages on file"
              : "No package submitted";
  const backPath = isAssignedRepresentative ? "/rep/cases" : "/rep/request-pool";
  const backLabel = isAssignedRepresentative ? "Back to cases" : "Back to pool";
  const heroTone =
    detailMode === "workflow"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-300/10 dark:text-emerald-200 dark:ring-emerald-300/20"
      : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-300/10 dark:text-amber-200 dark:ring-amber-300/20";

  const summaryCards =
    detailMode === "workflow"
      ? [
          {
            label: "Case Status",
            value: statusLabel,
            icon: BadgeCheck,
            tone: "text-emerald-600 dark:text-emerald-300",
            hint: "This is the stage you are actively helping move forward.",
          },
          {
            label: "Next Gate",
            value: nextActionMeta.title,
            icon: ClipboardCheck,
            hint: nextActionMeta.description,
          },
          {
            label: "Decision Owner",
            value: nextActionActorLabel,
            icon: UserRound,
            hint:
              pendingReviewCount > 0
                ? `${pendingReviewCount} pending review item(s) are visible below.`
                : "No review item is currently blocking this case from your side.",
          },
          {
            label: "Pending Reviews",
            value: String(pendingReviewCount),
            icon: FileCheck2,
            tone:
              pendingReviewCount > 0
                ? "text-amber-600 dark:text-amber-300"
                : "text-day-text dark:text-night-text",
            hint:
              pendingReviewCount > 0
                ? "Use the review area below to approve or request re-uploads."
                : "You step in when a new submission needs local review.",
          },
        ]
      : [
          {
            label: "Amount",
            value: formatMoney(investment?.amountInvested, APP_CURRENCY),
            icon: Banknote,
            tone: "text-sky-600 dark:text-sky-300",
            hint: "Headline ticket size for this request.",
          },
          {
            label: "Current Stage",
            value: statusLabel,
            icon: BadgeCheck,
            hint: `${currentProcessLabel} is the phase you would be stepping into.`,
          },
          {
            label: "Request Region",
            value: investment?.representativeRequest?.region || "-",
            icon: MapPin,
            hint: "Claim only if this fits your local operating capacity.",
          },
          {
            label: "Expected Focus",
            value: nextActionMeta.title,
            icon: ClipboardCheck,
            hint: nextActionMeta.description,
          },
        ];

  return (
    <div className="space-y-6">
      <section className="shell-surface relative overflow-hidden px-6 py-7 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.04),transparent)] dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.82),rgba(8,15,27,0.24))]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Link
              to={backPath}
              className="inline-flex items-center gap-2 text-sm font-semibold text-day-primary hover:underline dark:text-night-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>

            <div
              className={`mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] ring-1 ${heroTone}`}
            >
              <ShieldCheck className="h-4 w-4" />
              {detailMode === "workflow"
                ? "Assigned case workflow"
                : "Request pool review"}
            </div>
            <h1 className="mt-5 text-3xl font-semibold text-day-text dark:text-night-text sm:text-4xl">
              {getLocationLabel(investment)}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-day-muted dark:text-night-muted">
              {detailMode === "workflow"
                ? "You own this case operationally. Review submissions, monitor workflow gates, and keep the next step moving."
                : "Review the investment and property context first, then decide whether you want to claim and manage this case."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {canClaimRequest ? (
              <button
                type="button"
                onClick={handleClaim}
                disabled={claiming}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {claiming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <BadgeCheck className="h-4 w-4" />
                    Claim and Start Managing
                  </>
                )}
              </button>
            ) : null}
            <span
              className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold capitalize ring-1 ${getStatusClass(
                investment.status,
              )}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <PersonCard
          icon={UserRound}
          label="Investor"
          person={investment.investor}
        />
        <PersonCard
          icon={Users}
          label="Property Owner"
          person={investment.propertyOwner}
        />
        <section className="shell-surface px-5 py-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
            <Handshake className="h-3.5 w-3.5" />
            {detailMode === "workflow"
              ? "Workflow responsibility"
              : "Claim decision brief"}
          </div>
          <div className="mt-4 space-y-3 text-sm text-day-text dark:text-night-text">
            <p>
              {detailMode === "workflow" ? "Claimed at:" : "Requested on:"}{" "}
              <span className="font-semibold">
                {formatDate(
                  detailMode === "workflow"
                    ? investment.representativeRequest?.claimedAt
                    : investment.representativeRequest?.requestDate,
                )}
              </span>
            </p>
            <p>
              Requested by role:{" "}
              <span className="font-semibold capitalize">
                {requestedByRoleLabel}
              </span>
            </p>
            <p>
              {detailMode === "workflow" ? "Decision owner:" : "If you claim:"}{" "}
              <span className="font-semibold">
                {detailMode === "workflow"
                  ? nextActionActorLabel
                  : "you take over the local execution lane"}
              </span>
            </p>
            <p>
              Current gate:{" "}
              <span className="font-semibold">{nextActionMeta.title}</span>
            </p>
          </div>
        </section>
      </section>

      {detailMode === "evaluation" ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr),minmax(320px,0.85fr)]">
          <div className="shell-surface px-5 py-6 sm:px-6">
            <SectionHeader
              eyebrow="Evaluation"
              icon={ClipboardCheck}
              title="Should You Claim This Case?"
              subtitle="Use the investment and property context to decide whether this case fits your bandwidth and local expertise."
            />

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <InfoTile
                icon={Home}
                label="Property Type"
                value={formatKeyLabel(investment.property?.propertyType)}
              />
              <InfoTile
                icon={CalendarDays}
                label="Contract Horizon"
                value={contractMonthsLabel}
              />
              <InfoTile
                icon={ReceiptText}
                label="Target Monthly Rent"
                value={monthlyRentLabel}
              />
              <InfoTile
                icon={ClipboardCheck}
                label="Current Workflow Gate"
                value={nextActionMeta.title}
                helper={nextActionMeta.description}
              />
            </div>
          </div>

          <div className="shell-surface border-amber-200 bg-amber-50 px-5 py-6 dark:border-amber-900/40 dark:bg-amber-900/20 sm:px-6">
            <SectionHeader
              eyebrow="Outcome"
              icon={Handshake}
              title="Claim Outcome"
              subtitle="After claiming, this request leaves the pool and becomes your operational case."
            />
            <div className="mt-5 space-y-2 rounded-2xl border border-amber-200/80 bg-white/60 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-black/10 dark:text-amber-100">
              <p>Current stage: {statusLabel}</p>
              <p>Next gate: {nextActionMeta.title}</p>
              <p>Requested by: {requestedByRoleLabel}</p>
              <p>Documents currently visible: {documents.length}</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="shell-surface px-5 py-6 sm:px-6">
          <SectionHeader
            eyebrow="Control"
            icon={ClipboardCheck}
            title="Workflow Control Center"
            subtitle="Investor and owner submissions land here. Your reviews determine whether the investment advances to its next step."
            action={
              <div className="rounded-2xl border border-day-border bg-day-panel px-4 py-3 text-sm text-day-text dark:border-night-border dark:bg-night-panel dark:text-night-text">
                <p className="font-semibold">Active decision gate</p>
                <p className="mt-1 text-day-muted dark:text-night-muted">
                  {nextActionMeta.title}
                </p>
              </div>
            }
          />

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoTile
              icon={Banknote}
              label="Principal Payment"
              value={formatKeyLabel(investment?.principalPayment?.status)}
            />
            <InfoTile
              icon={FileText}
              label="Document Submission"
              value={documentSubmissionLabel}
            />
            <InfoTile
              icon={FileCheck2}
              label="Review Queue"
              value={
                pendingReviewCount > 0
                  ? `${pendingReviewCount} item(s) waiting`
                  : "Nothing pending"
              }
            />
            <InfoTile
              icon={Landmark}
              label="Local Focus"
              value={currentProcessLabel}
            />
          </div>
        </section>
      )}

      <InvestmentPropertyPanel
        property={investment.property}
        owner={investment.propertyOwner || investment.property?.owner}
        propertyPath={propertyPath}
        navigateLabel={isAssignedRepresentative ? "Open property page" : null}
      />

      {detailMode === "workflow" ? (
        <>
          <section className="shell-surface px-5 py-6 sm:px-6">
            <SectionHeader
              eyebrow="Timeline"
              icon={CalendarDays}
              title="Process Tracking"
              subtitle="Each stage shows whether it is active, completed, or still waiting for the next operational event."
            />
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {processEntries.length ? (
                processEntries.map(([key, value]) => (
                  <ProcessCard key={key} entryKey={key} value={value} />
                ))
              ) : (
                <div className="shell-subtle-surface px-5 py-8 text-sm text-day-muted dark:text-night-muted md:col-span-2 xl:col-span-3">
                  No process tracking entries are available yet.
                </div>
              )}
            </div>
          </section>

          <section className="shell-surface px-5 py-6 sm:px-6">
            <SectionHeader
              eyebrow="Documents"
              icon={FileText}
              title="Documents and Workflow Decisions"
              subtitle="Download each submitted file, verify it locally, then approve the package or request a corrected re-upload."
            />

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(320px,0.82fr),minmax(0,1.18fr)]">
              <div className="space-y-4">
                <InfoTile
                  icon={Users}
                  label="Submission Ownership"
                  value="Investor or owner uploads"
                  helper="Local representative stays read-only for uploads and steps in when submitted files need local verification."
                />
                <InfoTile
                  icon={ShieldCheck}
                  label="How You Advance The Case"
                  value="Approve or request re-upload"
                  helper="Your approval can unlock payment confirmation, title deed activation, or the next operational stage."
                />
                <InfoTile
                  icon={FileCheck2}
                  label="Review Queue"
                  value={`${pendingReviewCount} pending`}
                  helper="Pending items are sorted to the top of the review list."
                />
              </div>

              <div className="space-y-4">
                {reviewableDocuments.length === 0 ? (
                  <div className="shell-subtle-surface px-5 py-8 text-sm text-day-muted dark:text-night-muted">
                    No upload is currently waiting for your local review.
                  </div>
                ) : (
                  reviewableDocuments.map((item) => (
                    <ReviewDocumentCard
                      key={item.fileId}
                      document={item}
                      isReviewing={reviewingFileId === item.fileId}
                      onDownload={handleDownloadDocument}
                      onReview={handleReviewDocument}
                      reviewNote={reviewNotes[item.fileId] || ""}
                      setReviewNote={setReviewNote}
                    />
                  ))
                )}
              </div>

              <div className="xl:col-span-2">
                <DocumentsList
                  documents={documents}
                  onDownload={handleDownloadDocument}
                />
              </div>
            </div>
          </section>

          <RentalSchedule payments={investment.rentalPayments || []} />
        </>
      ) : (
        <section className="shell-surface px-5 py-6 sm:px-6">
          <SectionHeader
            eyebrow="Context"
            icon={FileText}
            title="Available Case Context"
            subtitle="This pool view stays read-only. Use it to understand the property, parties, and current investment stage before taking ownership."
          />

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <InfoTile
              icon={BadgeCheck}
              label="Request Status"
              value={formatKeyLabel(investment?.representativeRequest?.status)}
            />
            <InfoTile
              icon={ClipboardCheck}
              label="Active Process Stage"
              value={currentProcessLabel}
            />
            <InfoTile
              icon={FileText}
              label="Documents On File"
              value={documents.length}
            />
          </div>

          <div className="mt-6">
            {documents.length ? (
              <DocumentsList
                documents={documents}
                onDownload={handleDownloadDocument}
              />
            ) : (
              <div className="shell-subtle-surface px-5 py-8 text-sm text-day-muted dark:text-night-muted">
                No supporting file has been uploaded for this request yet.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default RepresentativeInvestmentDetail;
