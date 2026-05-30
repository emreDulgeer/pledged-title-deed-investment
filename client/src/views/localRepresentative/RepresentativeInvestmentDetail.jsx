import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  XCircle,
} from "lucide-react";

import InvestmentController from "../../controllers/investmentController";
import InvestmentPropertyPanel from "../../components/investments/InvestmentPropertyPanel";
import DocumentsList from "../../components/property/detail/DocumentsList";
import { selectUser } from "../../store/slices/authSlice";
import { APP_CURRENCY } from "../../utils/currency";
import {
  getInvestmentPropertyPath,
  getUserId,
  getUserProfilePath,
} from "../../utils/profileRoutes";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

const PROCESS_LABELS = {
  offerSent: "Offer Stage",
  contractSigning: "Contract Signing",
  principalPayment: "Principal Payment",
  titleDeedRegistration: "Title Deed Registration",
  rentalPeriod: "Rental Period",
  completion: "Completion",
};

const STATUS_TONES = {
  offer_sent: "text-sky-500",
  contract_signed: "text-amber-500",
  title_deed_pending: "text-violet-500",
  active: "text-emerald-500",
  completed: "text-slate-500",
  refunded: "text-rose-500",
  rejected: "text-rose-500",
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

const getNextActionMeta = (action) =>
  ACTION_COPY[action?.key] || {
    title: action?.key ? formatKeyLabel(action.key) : "No pending workflow gate",
    description:
      "This case currently has no clearly defined blocking action in the workflow.",
  };

const getActorLabel = (actor) => ACTOR_LABELS[actor] || formatKeyLabel(actor);

const MetricCard = ({ label, value, hint = null, toneClass = "" }) => (
  <div className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5">
    <p className="text-sm text-day-text/60 dark:text-night-text/60">{label}</p>
    <p
      className={`mt-2 text-2xl font-bold text-day-text dark:text-night-text ${toneClass}`.trim()}
    >
      {value}
    </p>
    {hint ? (
      <p className="mt-2 text-xs leading-5 text-day-text/55 dark:text-night-text/55">
        {hint}
      </p>
    ) : null}
  </div>
);

const REVIEW_STATUS_STYLES = {
  not_requested:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  pending_review:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  changes_requested:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
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

const RepresentativeInvestmentDetail = () => {
  const { id } = useParams();
  const user = useSelector(selectUser);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [investment, setInvestment] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [reviewingFileId, setReviewingFileId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});

  const isAssignedRepresentative = useMemo(() => {
    return (
      String(investment?.localRepresentative?.id || "") ===
      String(user?.id || user?._id || "")
    );
  }, [investment, user]);

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
        window.alert("Representative request claimed successfully.");
      }
    } catch (error) {
      console.error("Claim request error:", error);
      window.alert(error.message || "Failed to claim representative request.");
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
    }
  };

  const handleReviewDocument = async (fileId, action) => {
    const note = String(reviewNotes[fileId] || "").trim();

    if (action === "request_changes" && !note) {
      window.alert("Please explain what should be corrected before re-upload.");
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
        window.alert(
          action === "approve"
            ? "Document approved successfully."
            : "Re-upload requested successfully.",
        );
      }
    } catch (error) {
      console.error("Representative review error:", error);
      window.alert(error.message || "Failed to update document review.");
    } finally {
      setReviewingFileId(null);
    }
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
  const detailMode = isAssignedRepresentative ? "workflow" : "evaluation";
  const propertyPath =
    isAssignedRepresentative && investment?.property
      ? getInvestmentPropertyPath(
          "local_representative",
          getUserId(investment.property),
        )
      : null;
  const processEntries = Object.entries(investment?.processTracking || {});
  const nextActionMeta = getNextActionMeta(investment?.nextRequiredAction);
  const statusLabel = formatKeyLabel(investment?.status);
  const statusTone = STATUS_TONES[investment?.status] || "";
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
  const reviewQueueHint =
    pendingReviewCount > 0
      ? "Use the action area below to approve or request re-uploads."
      : "You step in when a new investor or owner submission needs local review.";
  const summaryCards =
    detailMode === "workflow"
      ? [
          {
            label: "Case Status",
            value: statusLabel,
            toneClass: statusTone,
            hint: "This is the stage you are actively helping move forward.",
          },
          {
            label: "Next Workflow Gate",
            value: nextActionMeta.title,
            hint: nextActionMeta.description,
          },
          {
            label: "Decision Owner",
            value: nextActionActorLabel,
            hint:
              pendingReviewCount > 0
                ? `${pendingReviewCount} pending review item(s) are visible below.`
                : "No review item is currently blocking this case from your side.",
          },
          {
            label: "Pending Reviews",
            value: String(pendingReviewCount),
            hint: reviewQueueHint,
          },
        ]
      : [
          {
            label: "Investment Amount",
            value: formatMoney(investment?.amountInvested, APP_CURRENCY),
            hint: "Headline ticket size for this request.",
          },
          {
            label: "Current Stage",
            value: statusLabel,
            toneClass: statusTone,
            hint: `${currentProcessLabel} is the phase you would be stepping into.`,
          },
          {
            label: "Request Region",
            value: investment?.representativeRequest?.region || "-",
            hint: "Claim only if this fits your local operating capacity.",
          },
          {
            label: "Expected Local Focus",
            value: nextActionMeta.title,
            hint: nextActionMeta.description,
          },
        ];

  if (loading) {
    return (
      <div className="grid min-h-[320px] place-items-center rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface">
        <div className="flex items-center gap-2 text-day-text/70 dark:text-night-text/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading case details...
        </div>
      </div>
    );
  }

  if (!investment) {
    return (
      <div className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
        <Link
          to="/rep/cases"
          className="inline-flex items-center gap-2 text-sm font-medium text-sky-600 hover:underline dark:text-sky-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to cases
        </Link>
        <p className="mt-4 text-sm text-day-text/60 dark:text-night-text/60">
          Investment not found or you are no longer allowed to access it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            to={isAssignedRepresentative ? "/rep/cases" : "/rep/request-pool"}
            className="inline-flex items-center gap-2 text-sm font-medium text-sky-600 hover:underline dark:text-sky-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="mt-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                detailMode === "workflow"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
              }`}
            >
              {detailMode === "workflow"
                ? "Assigned Case Workflow"
                : "Request Pool Review"}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-day-text dark:text-night-text">
            {investment.property?.city}, {investment.property?.country}
          </h1>
          <p className="mt-2 text-sm text-day-text/60 dark:text-night-text/60">
            {detailMode === "workflow"
              ? "You already own this case operationally. Use the workflow controls below to unblock the next stage."
              : "Review the investment and property context first, then decide whether you want to claim and manage this case."}
          </p>
        </div>

        {canClaimRequest && (
          <button
            type="button"
            onClick={handleClaim}
            disabled={claiming}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {claiming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Claiming...
              </>
            ) : (
              "Claim and Start Managing"
            )}
          </button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            hint={card.hint}
            toneClass={card.toneClass}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
          <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
            Investor
          </h2>
          <p className="mt-3 text-sm font-medium text-day-text dark:text-night-text">
            {investment.investor?.fullName || "-"}
          </p>
          <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
            {investment.investor?.email || "-"}
          </p>
          <Link
            to={getUserProfilePath(getUserId(investment.investor))}
            className="mt-4 inline-flex text-sm font-medium text-sky-600 hover:underline dark:text-sky-300"
          >
            Open investor profile
          </Link>
        </section>

        <section className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
          <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
            Property Owner
          </h2>
          <p className="mt-3 text-sm font-medium text-day-text dark:text-night-text">
            {investment.propertyOwner?.fullName || "-"}
          </p>
          <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
            {investment.propertyOwner?.email || "-"}
          </p>
          <Link
            to={getUserProfilePath(getUserId(investment.propertyOwner))}
            className="mt-4 inline-flex text-sm font-medium text-sky-600 hover:underline dark:text-sky-300"
          >
            Open owner profile
          </Link>
        </section>

        <section className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
          <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
            {detailMode === "workflow"
              ? "Workflow Responsibility"
              : "Claim Decision Brief"}
          </h2>
          <div className="mt-3 space-y-2 text-sm text-day-text dark:text-night-text">
            <p>
              {detailMode === "workflow" ? "Claimed at:" : "Requested on:"}{" "}
              <span className="font-medium">
                {formatDate(
                  detailMode === "workflow"
                    ? investment.representativeRequest?.claimedAt
                    : investment.representativeRequest?.requestDate,
                )}
              </span>
            </p>
            <p>
              Requested by role:{" "}
              <span className="font-medium capitalize">
                {requestedByRoleLabel}
              </span>
            </p>
            <p>
              {detailMode === "workflow" ? "Decision owner:" : "If you claim:"}{" "}
              <span className="font-medium">
                {detailMode === "workflow"
                  ? nextActionActorLabel
                  : "you take over the local execution lane"}
              </span>
            </p>
            <p>
              {detailMode === "workflow"
                ? "Current gate:"
                : "Likely next gate after claim:"}{" "}
              <span className="font-medium">{nextActionMeta.title}</span>
            </p>
          </div>
        </section>
      </div>

      {detailMode === "evaluation" ? (
        <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
            <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
              Should You Claim This Case?
            </h2>
            <p className="mt-2 text-sm text-day-text/60 dark:text-night-text/60">
              This view stays focused on general investment and property context
              so you can decide whether the case fits your bandwidth and local
              expertise.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                  Property Type
                </p>
                <p className="mt-2 text-sm font-semibold text-day-text dark:text-night-text">
                  {formatKeyLabel(investment.property?.propertyType)}
                </p>
              </div>
              <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                  Contract Horizon
                </p>
                <p className="mt-2 text-sm font-semibold text-day-text dark:text-night-text">
                  {contractMonthsLabel}
                </p>
              </div>
              <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                  Target Monthly Rent
                </p>
                <p className="mt-2 text-sm font-semibold text-day-text dark:text-night-text">
                  {monthlyRentLabel}
                </p>
              </div>
              <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                  Current Workflow Gate
                </p>
                <p className="mt-2 text-sm font-semibold text-day-text dark:text-night-text">
                  {nextActionMeta.title}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-900/20">
            <h2 className="text-lg font-semibold text-amber-950 dark:text-amber-100">
              Claim Outcome
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-900/80 dark:text-amber-100/80">
              After claiming, this request leaves the pool and becomes your
              operational case. From that moment, you will use the workflow
              screen to review investor and owner uploads, then decide whether
              the investment can move to the next stage.
            </p>
            <div className="mt-5 rounded-xl border border-amber-200/80 bg-white/60 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-black/10 dark:text-amber-100">
              <p className="font-semibold">What you would take ownership of</p>
              <p className="mt-2">Current stage: {statusLabel}</p>
              <p className="mt-1">Next gate: {nextActionMeta.title}</p>
              <p className="mt-1">Requested by: {requestedByRoleLabel}</p>
              <p className="mt-1">Documents currently visible: {documents.length}</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
                Workflow Control Center
              </h2>
              <p className="mt-2 text-sm text-day-text/60 dark:text-night-text/60">
                This case is already yours. Investor and owner submissions land
                here, and your reviews determine whether the investment
                advances to its next step.
              </p>
            </div>
            <div className="rounded-xl border border-day-border dark:border-night-border px-4 py-3 text-sm text-day-text dark:text-night-text">
              <p className="font-semibold">Active decision gate</p>
              <p className="mt-1 text-day-text/65 dark:text-night-text/65">
                {nextActionMeta.title}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-day-border dark:border-night-border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                Principal Payment
              </p>
              <p className="mt-2 text-sm font-semibold text-day-text dark:text-night-text">
                {formatKeyLabel(investment?.principalPayment?.status)}
              </p>
            </div>
            <div className="rounded-xl border border-day-border dark:border-night-border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                Document Submission
              </p>
              <p className="mt-2 text-sm font-semibold text-day-text dark:text-night-text">
                {documentSubmissionLabel}
              </p>
            </div>
            <div className="rounded-xl border border-day-border dark:border-night-border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                Review Queue
              </p>
              <p className="mt-2 text-sm font-semibold text-day-text dark:text-night-text">
                {pendingReviewCount > 0
                  ? `${pendingReviewCount} item(s) waiting`
                  : "Nothing pending"}
              </p>
            </div>
            <div className="rounded-xl border border-day-border dark:border-night-border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                Local Focus
              </p>
              <p className="mt-2 text-sm font-semibold text-day-text dark:text-night-text">
                {currentProcessLabel}
              </p>
            </div>
          </div>
        </section>
      )}

      <InvestmentPropertyPanel
        property={investment.property}
        owner={investment.propertyOwner || investment.property?.owner}
        propertyPath={propertyPath}
        navigateLabel={
          isAssignedRepresentative
            ? "Open property page"
            : null
        }
      />

      {detailMode === "workflow" ? (
        <>
          <section className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
            <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
              Process Tracking
            </h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {processEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl border border-day-border dark:border-night-border p-4"
                >
                  <p className="text-sm font-medium text-day-text dark:text-night-text">
                    {PROCESS_LABELS[key] || key}
                  </p>
                  <p className="mt-2 text-sm text-day-text/60 dark:text-night-text/60">
                    Completed: {value?.completed ? "Yes" : "No"}
                  </p>
                  <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
                    Active: {value?.active ? "Yes" : "No"}
                  </p>
                  <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
                    Date: {formatDate(value?.date || value?.startDate)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
            <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
              Documents and Workflow Decisions
            </h2>

            <div className="mt-5 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                <p className="text-sm font-medium text-day-text dark:text-night-text">
                  Submission Ownership
                </p>
                <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
                  Contracts, title deed files, and supporting documents are
                  uploaded by the investor or property owner.
                </p>
                <p className="mt-3 text-xs leading-5 text-day-text/55 dark:text-night-text/55">
                  Local representative stays read-only for uploads and steps in
                  when submitted files need local verification.
                </p>
              </div>

              <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                <p className="text-sm font-medium text-day-text dark:text-night-text">
                  How You Advance The Case
                </p>
                <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
                  Download each uploaded file, verify it locally, then approve
                  it if the package is clean or request a corrected re-upload.
                </p>
                <p className="mt-3 text-xs leading-5 text-day-text/55 dark:text-night-text/55">
                  Your approval can unlock payment confirmation, title deed
                  activation, or the next operational stage.
                </p>
              </div>

              <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-day-text dark:text-night-text">
                      Review Queue
                    </p>
                    <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
                      Download investor and owner uploads, verify them locally,
                      then approve or ask for a corrected re-upload.
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-200">
                    {pendingReviewCount} pending
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  {reviewableDocuments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-day-border dark:border-night-border px-4 py-5 text-sm text-day-text/60 dark:text-night-text/60">
                      No upload is currently waiting for your local review.
                    </div>
                  ) : (
                    reviewableDocuments.map((document) => {
                      const isReviewing = reviewingFileId === document.fileId;
                      return (
                        <article
                          key={document.fileId}
                          className="rounded-xl border border-day-border dark:border-night-border p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-day-text dark:text-night-text">
                                {document.name}
                              </p>
                              <p className="mt-1 text-xs text-day-text/55 dark:text-night-text/55">
                                {document.type.replaceAll("_", " ")} · uploaded{" "}
                                {formatDate(document.uploadedAt)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadDocument(document.fileId, document.name)
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-day-border dark:border-night-border px-3 py-2 text-xs font-medium text-day-text hover:bg-day-border/10 dark:text-night-text dark:hover:bg-night-border/10"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${REVIEW_STATUS_STYLES[document.reviewStatus] || REVIEW_STATUS_STYLES.not_requested}`}
                            >
                              {formatReviewLabel(document.reviewStatus)}
                            </span>
                            {document.verified ? (
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                                Workflow verified
                              </span>
                            ) : null}
                          </div>

                          {document.reviewNotes ? (
                            <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
                              Latest note: {document.reviewNotes}
                            </div>
                          ) : null}

                          <textarea
                            value={reviewNotes[document.fileId] || ""}
                            onChange={(event) =>
                              setReviewNotes((current) => ({
                                ...current,
                                [document.fileId]: event.target.value,
                              }))
                            }
                            placeholder="Optional approval note or required re-upload details..."
                            className="mt-3 min-h-[88px] w-full rounded-xl border border-day-border dark:border-night-border bg-transparent px-4 py-3 text-sm text-day-text dark:text-night-text"
                          />

                          <div className="mt-3 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                handleReviewDocument(document.fileId, "approve")
                              }
                              disabled={isReviewing || document.reviewStatus === "approved"}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              {document.type === "title_deed"
                                ? "Approve and start rental period"
                                : "Approve document"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleReviewDocument(
                                  document.fileId,
                                  "request_changes",
                                )
                              }
                              disabled={isReviewing}
                              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                            >
                              <XCircle className="h-4 w-4" />
                              Request re-upload
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="xl:col-span-2">
                <DocumentsList
                  documents={documents}
                  onDownload={handleDownloadDocument}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
            <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
              Rental Schedule
            </h2>
            {investment.rentalPayments?.length ? (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-day-border/10 dark:bg-night-border/10">
                    <tr className="text-left text-xs uppercase tracking-wide text-day-text/55 dark:text-night-text/55">
                      <th className="px-4 py-3">Month</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Paid At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-day-border dark:divide-night-border">
                    {investment.rentalPayments.map((payment, index) => (
                      <tr key={`${payment.month}-${index}`}>
                        <td className="px-4 py-3 text-sm text-day-text dark:text-night-text">
                          {payment.month}
                        </td>
                        <td className="px-4 py-3 text-sm text-day-text dark:text-night-text">
                          {payment.amount?.toLocaleString()} {APP_CURRENCY}
                        </td>
                        <td className="px-4 py-3 text-sm text-day-text dark:text-night-text">
                          {payment.status}
                        </td>
                        <td className="px-4 py-3 text-sm text-day-text/60 dark:text-night-text/60">
                          {formatDate(payment.paidAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-day-text/60 dark:text-night-text/60">
                Rental schedule is not available yet.
              </p>
            )}
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
          <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
            Available Case Context
          </h2>
          <p className="mt-2 text-sm text-day-text/60 dark:text-night-text/60">
            This pool view stays read-only. Use it to understand the property,
            the parties, and the current investment stage before taking
            ownership.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-day-border dark:border-night-border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                Request Status
              </p>
              <p className="mt-2 text-sm font-semibold text-day-text dark:text-night-text">
                {formatKeyLabel(investment?.representativeRequest?.status)}
              </p>
            </div>
            <div className="rounded-xl border border-day-border dark:border-night-border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                Active Process Stage
              </p>
              <p className="mt-2 text-sm font-semibold text-day-text dark:text-night-text">
                {currentProcessLabel}
              </p>
            </div>
            <div className="rounded-xl border border-day-border dark:border-night-border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                Documents on File
              </p>
              <p className="mt-2 text-sm font-semibold text-day-text dark:text-night-text">
                {documents.length}
              </p>
            </div>
          </div>

          <div className="mt-6">
            {documents.length ? (
              <DocumentsList
                documents={documents}
                onDownload={handleDownloadDocument}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-day-border dark:border-night-border px-4 py-5 text-sm text-day-text/60 dark:text-night-text/60">
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
