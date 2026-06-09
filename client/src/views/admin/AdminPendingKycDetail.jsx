// client/src/views/admin/AdminPendingKycDetail.jsx
import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Download,
  Eye,
  Fingerprint,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import bridge from "../../controllers/bridge";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import { useAppFeedback } from "../../utils/hooks/useAppFeedback";

const DOCUMENT_CONFIG = [
  {
    key: "idFront",
    titleKey: "admin.kyc.id_front",
    fallback: "ID front",
    required: true,
  },
  {
    key: "idBack",
    titleKey: "admin.kyc.id_back",
    fallback: "ID back",
    required: true,
  },
  {
    key: "addressProof",
    titleKey: "admin.kyc.address_proof",
    fallback: "Address proof",
    required: true,
  },
  {
    key: "selfie",
    titleKey: "admin.kyc.selfie",
    fallback: "Selfie",
    required: false,
  },
];

const STATUS_STYLES = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200",
  approved:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200",
  rejected:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200",
};

const normalizeStatus = (status) => String(status || "Pending").toLowerCase();

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

const getDocumentType = (value) => {
  const cleanValue = String(value || "")
    .split("?")[0]
    .split("#")[0];

  return cleanValue.split(".").pop()?.toLowerCase() || "unknown";
};

const AdminPendingKycDetail = () => {
  const { t } = useTranslation();
  const { userId } = useParams();
  const navigate = useNavigate();
  const feedback = useAppFeedback();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const fetchUserDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bridge.auth.getPendingKycUserById(userId);
      if (res?.success) {
        setUser(res.data);
      } else {
        navigate("/admin/dashboard");
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      navigate("/admin/dashboard");
    } finally {
      setLoading(false);
    }
  }, [navigate, userId]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const res = await bridge.auth.approveKyc(userId);
      if (res?.success) {
        feedback.success(t("admin.kyc.approve_success"));
        setShowApproveModal(false);
        navigate("/admin/dashboard");
      } else {
        feedback.error(t("admin.kyc.approve_error"));
      }
    } catch (error) {
      console.error("Error approving KYC:", error);
      feedback.error(t("admin.kyc.approve_error"));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      feedback.warning(t("admin.kyc.reject_reason_required"));
      return;
    }

    setProcessing(true);
    try {
      const res = await bridge.auth.rejectKyc(userId, { reason: rejectReason });
      if (res?.success) {
        feedback.success(t("admin.kyc.reject_success"));
        navigate("/admin/dashboard");
      } else {
        feedback.error(t("admin.kyc.reject_error"));
      }
    } catch (error) {
      console.error("Error rejecting KYC:", error);
      feedback.error(t("admin.kyc.reject_error"));
    } finally {
      setProcessing(false);
      setShowRejectModal(false);
    }
  };

  const formatDocument = (doc) => {
    if (!doc) return null;
    if (typeof doc === "string") {
      return { url: doc, type: getDocumentType(doc) };
    }
    const url = doc.url || doc.path || doc;
    return {
      url,
      type: doc.type || getDocumentType(url),
    };
  };

  if (loading && !user) {
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

  if (!user) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-4 sm:p-6 xl:p-8">
        <div className="shell-surface max-w-lg px-8 py-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-4 text-2xl font-semibold text-day-text dark:text-night-text">
            {t("admin.kyc.user_not_found", "User not found")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
            This KYC request may have already been reviewed or is no longer
            available.
          </p>
          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-night-primary dark:text-night-background"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.1} />
            {t("common.back", "Back")}
          </button>
        </div>
      </div>
    );
  }

  const phoneValue = user.phone || user.phoneNumber || null;
  const statusKey = normalizeStatus(user.kycStatus);
  const isPending = statusKey === "pending";
  const documentItems = DOCUMENT_CONFIG.map((item) => ({
    ...item,
    document: formatDocument(user.kycDocuments?.[item.key]),
    title: t(item.titleKey, item.fallback),
  }));
  const availableDocuments = documentItems.filter((item) => item.document);
  const missingRequiredDocuments = documentItems.filter(
    (item) => item.required && !item.document,
  );
  const submittedDate =
    user.kycSubmittedAt || user.submittedAt || user.createdAt || user.updatedAt;
  const displayName = user.fullName || user.email || "Pending user";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6 p-4 sm:p-6 xl:p-8">
      {showApproveModal ? (
        <ConfirmationModal
          title={t("admin.kyc.confirm_approve", "Approve this KYC request?")}
          message="Approve this submission only if identity, address, and applicant evidence are consistent across the file."
          confirmLabel={t("admin.kyc.approve", "Approve")}
          onConfirm={handleApprove}
          onClose={() => setShowApproveModal(false)}
          processing={processing}
          tone="success"
        />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_380px]">
        <div className="shell-surface overflow-hidden">
          <div className="relative px-6 py-7 sm:px-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-day-primary/10 via-day-panel to-day-accent/10 dark:from-night-primary/10 dark:via-night-panel/40 dark:to-night-accent/10" />
            <div className="relative">
              <button
                type="button"
                onClick={() => navigate("/admin/dashboard")}
                className="inline-flex items-center gap-2 text-sm font-semibold text-day-primary transition hover:underline dark:text-night-primary"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2.1} />
                {t("common.back", "Back")}
              </button>

              <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:border-night-border/70 dark:bg-night-surface dark:text-night-muted">
                      KYC case
                    </span>
                    <StatusPill statusKey={statusKey} label={user.kycStatus} t={t} />
                  </div>

                  <h1 className="mt-5 text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
                    {t("admin.kyc.user_verification", "User verification")}
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-day-muted dark:text-night-muted">
                    {t(
                      "admin.kyc.review_documents",
                      "Review identity, address, and profile evidence before approving this account.",
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchUserDetails}
                  disabled={loading || processing}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/70 disabled:cursor-not-allowed disabled:opacity-60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/70"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    strokeWidth={2.1}
                  />
                  Refresh
                </button>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                <MetricCard
                  icon={FileText}
                  label="Documents"
                  value={`${availableDocuments.length}/${DOCUMENT_CONFIG.length}`}
                  hint={
                    missingRequiredDocuments.length
                      ? `${missingRequiredDocuments.length} required item missing.`
                      : "Required documents are present."
                  }
                  accentClass={
                    missingRequiredDocuments.length
                      ? "text-amber-700 dark:text-amber-200"
                      : "text-emerald-700 dark:text-emerald-200"
                  }
                />
                <MetricCard
                  icon={Mail}
                  label="Email"
                  value={user.emailVerified ? "Verified" : "Unverified"}
                  hint={user.email || "No email on file"}
                  accentClass={
                    user.emailVerified
                      ? "text-emerald-700 dark:text-emerald-200"
                      : "text-amber-700 dark:text-amber-200"
                  }
                />
                <MetricCard
                  icon={Clock}
                  label="Submitted"
                  value={formatDate(submittedDate)}
                  hint="Based on the latest available KYC timestamp."
                />
              </div>
            </div>
          </div>
        </div>

        <aside className="shell-surface px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-day-primary text-xl font-semibold text-white shadow-accent dark:bg-night-primary dark:text-night-background">
              {initials || "U"}
              {user.emailVerified ? (
                <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-4 border-day-surface bg-emerald-500 text-white dark:border-night-surface">
                  <CheckCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
                Applicant
              </p>
              <h2 className="mt-1 truncate text-xl font-semibold text-day-text dark:text-night-text">
                {displayName}
              </h2>
              <p className="mt-1 truncate text-sm text-day-muted dark:text-night-muted">
                {user.email || "No email"}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <InfoRow
              icon={User}
              label={t("common.full_name", "Full name")}
              value={user.fullName}
            />
            <InfoRow
              icon={Mail}
              label={t("common.email", "Email")}
              value={user.email}
            />
            {phoneValue ? (
              <InfoRow
                icon={Phone}
                label={t("common.phone", "Phone")}
                value={phoneValue}
              />
            ) : null}
            {user.country ? (
              <InfoRow
                icon={MapPin}
                label={t("common.country", "Country")}
                value={user.country}
              />
            ) : null}
          </div>

          <div className="mt-6 rounded-3xl border border-day-border/70 bg-day-panel/70 p-4 dark:border-night-border/70 dark:bg-night-panel/70">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-day-surface text-day-primary dark:bg-night-surface dark:text-night-primary">
                {isPending ? (
                  <AlertTriangle className="h-5 w-5" strokeWidth={2.1} />
                ) : (
                  <ShieldCheck className="h-5 w-5" strokeWidth={2.1} />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-day-text dark:text-night-text">
                  {isPending ? "Decision required" : "Decision completed"}
                </p>
                <p className="mt-1 text-sm leading-6 text-day-muted dark:text-night-muted">
                  {isPending
                    ? "Approve only when identity, address, and applicant profile evidence line up."
                    : "This request is no longer pending, so review actions are locked."}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => setShowApproveModal(true)}
              disabled={processing || !isPending}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-day-secondary/40 disabled:text-white/70 dark:disabled:bg-night-secondary/30"
            >
              {processing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
              {t("admin.kyc.approve")}
            </button>

            <button
              type="button"
              onClick={() => setShowRejectModal(true)}
              disabled={processing || !isPending}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-day-border disabled:bg-day-panel disabled:text-day-muted dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200 dark:hover:bg-red-400/15 dark:disabled:border-night-border dark:disabled:bg-night-panel dark:disabled:text-night-muted"
            >
              <XCircle className="h-5 w-5" />
              {t("admin.kyc.reject", "Reject")}
            </button>
          </div>
        </aside>
      </section>

      {missingRequiredDocuments.length ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.1} />
            <p>
              Missing required evidence:{" "}
              <span className="font-semibold">
                {missingRequiredDocuments.map((item) => item.title).join(", ")}
              </span>
            </p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="shell-surface px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 border-b border-day-border/70 pb-5 dark:border-night-border/70 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
                Evidence
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-day-text dark:text-night-text">
                {t("admin.kyc.documents", "Documents")}
              </h2>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-2xl border border-day-border bg-day-panel px-3 py-2 text-sm font-semibold text-day-text dark:border-night-border dark:bg-night-panel dark:text-night-text">
              <Fingerprint className="h-4 w-4 text-day-primary dark:text-night-primary" />
              {availableDocuments.length} file
              {availableDocuments.length === 1 ? "" : "s"}
            </span>
          </div>

          {availableDocuments.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {documentItems.map((item) => (
                <DocumentCard
                  key={item.key}
                  title={item.title}
                  document={item.document}
                  required={item.required}
                  onPreview={setImagePreview}
                />
              ))}
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-day-panel text-day-muted dark:bg-night-panel dark:text-night-muted">
                <FileText className="h-8 w-8" strokeWidth={2.1} />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-day-text dark:text-night-text">
                {t("admin.kyc.no_documents", "No documents")}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-day-muted dark:text-night-muted">
                The applicant has not uploaded KYC evidence yet.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="shell-surface px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
                <BadgeCheck className="h-5 w-5" strokeWidth={2.1} />
              </div>
              <div>
                <p className="text-sm font-semibold text-day-text dark:text-night-text">
                  Review checklist
                </p>
                <p className="text-sm text-day-muted dark:text-night-muted">
                  Quick operator scan
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <ChecklistRow
                complete={!!user.fullName}
                label="Applicant name is present"
              />
              <ChecklistRow
                complete={!!user.email}
                label="Email address is present"
              />
              <ChecklistRow
                complete={!!user.emailVerified}
                label="Email is verified"
              />
              <ChecklistRow
                complete={missingRequiredDocuments.length === 0}
                label="Required documents uploaded"
              />
            </div>
          </div>

          {user.bio && (
            <div className="shell-surface px-5 py-5 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
                Applicant note
              </p>
              <h3 className="mt-2 text-xl font-semibold text-day-text dark:text-night-text">
                {t("admin.kyc.bio", "Bio")}
              </h3>
              <p className="mt-3 text-sm leading-6 text-day-muted dark:text-night-muted">
                {user.bio}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-night-background/70 p-4 backdrop-blur-sm">
          <div className="shell-surface w-full max-w-lg px-6 py-6 shadow-shell">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-200">
                <XCircle className="h-5 w-5" strokeWidth={2.1} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-day-text dark:text-night-text">
                  {t("admin.kyc.reject_reason", "Reject reason")}
                </h3>
                <p className="mt-1 text-sm leading-6 text-day-muted dark:text-night-muted">
                  Leave a clear reason so the applicant knows what needs to be
                  corrected.
                </p>
              </div>
            </div>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-5 h-36 w-full resize-none rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm text-day-text outline-none transition placeholder:text-day-muted/70 focus:border-day-primary focus:ring-4 focus:ring-day-primary/10 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:placeholder:text-night-muted/70 dark:focus:border-night-primary dark:focus:ring-night-primary/10"
              placeholder={t(
                "admin.kyc.reject_reason_placeholder",
                "Explain what is missing or incorrect...",
              )}
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="inline-flex items-center justify-center rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-day-secondary/40 disabled:text-white/70 dark:disabled:bg-night-secondary/30"
              >
                {processing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  t("admin.kyc.confirm_reject", "Confirm reject")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setImagePreview(null)}
        >
          <div className="relative max-h-[90vh] max-w-5xl">
            <img
              src={imagePreview}
              alt="Document Preview"
              className="max-h-[90vh] max-w-full rounded-3xl object-contain shadow-shell"
            />
            <button
              type="button"
              onClick={() => setImagePreview(null)}
              className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-2xl bg-black/60 text-white transition hover:bg-black/80"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusPill = ({ statusKey, label, t }) => (
  <span
    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[statusKey] || STATUS_STYLES.pending}`}
  >
    <Clock className="h-3.5 w-3.5" strokeWidth={2.1} />
    {t(`admin.kyc.status.${statusKey}`, label || "Pending")}
  </span>
);

const MetricCard = ({ icon, label, value, hint, accentClass = "" }) => (
  <div className="rounded-3xl border border-day-border/70 bg-day-surface/80 px-4 py-4 dark:border-night-border/70 dark:bg-night-surface/80">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
          {label}
        </p>
        <p
          className={`mt-3 truncate text-2xl font-semibold text-day-text dark:text-night-text ${accentClass}`.trim()}
        >
          {value}
        </p>
        {hint ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-day-muted dark:text-night-muted">
            {hint}
          </p>
        ) : null}
      </div>
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
        {React.createElement(icon, {
          className: "h-5 w-5",
          strokeWidth: 2.1,
        })}
      </div>
    </div>
  </div>
);

const InfoRow = ({ icon, label, value }) => (
  <div className="rounded-2xl border border-day-border/70 bg-day-panel/60 px-4 py-3 dark:border-night-border/70 dark:bg-night-panel/60">
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-day-muted dark:text-night-muted">
      {React.createElement(icon, {
        className: "h-4 w-4",
        strokeWidth: 2.1,
      })}
      {label}
    </p>
    <p className="mt-2 break-words text-sm font-semibold text-day-text dark:text-night-text">
      {value || "-"}
    </p>
  </div>
);

const ChecklistRow = ({ complete, label }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-day-border/70 bg-day-panel/60 px-4 py-3 dark:border-night-border/70 dark:bg-night-panel/60">
    <span
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
        complete
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200"
          : "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200"
      }`}
    >
      {complete ? (
        <CheckCircle className="h-4 w-4" strokeWidth={2.3} />
      ) : (
        <AlertTriangle className="h-4 w-4" strokeWidth={2.3} />
      )}
    </span>
    <span className="text-sm font-medium text-day-text dark:text-night-text">
      {label}
    </span>
  </div>
);

// Document Card Component
const DocumentCard = ({ title, document, required, onPreview }) => {
  const { t } = useTranslation();

  if (!document) {
    return (
      <div className="rounded-3xl border border-dashed border-day-border bg-day-panel/50 px-4 py-4 dark:border-night-border dark:bg-night-panel/50">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-day-text dark:text-night-text">
              {title}
            </h4>
            <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
              {required ? "Required document missing" : "Optional document missing"}
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
            Missing
          </span>
        </div>
      </div>
    );
  }

  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(document.type);

  return (
    <div className="group overflow-hidden rounded-3xl border border-day-border/80 bg-day-surface transition hover:-translate-y-0.5 hover:shadow-panel dark:border-night-border/80 dark:bg-night-surface">
      <div className="flex items-center justify-between gap-3 border-b border-day-border/70 px-4 py-3 dark:border-night-border/70">
        <div>
          <h4 className="font-semibold text-day-text dark:text-night-text">
            {title}
          </h4>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-day-muted dark:text-night-muted">
            {document.type?.toUpperCase() || "FILE"}
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
          Uploaded
        </span>
      </div>

      {isImage ? (
        <button
          type="button"
          className="relative block w-full cursor-zoom-in overflow-hidden bg-day-panel text-left dark:bg-night-panel"
          onClick={() => onPreview(document.url)}
        >
          <img
            src={document.url}
            alt={title}
            className="h-64 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
            <Eye className="h-8 w-8 text-white" />
          </div>
        </button>
      ) : (
        <div className="flex h-64 items-center justify-center bg-day-panel p-5 dark:bg-night-panel">
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-day-muted dark:text-night-muted" />
            <p className="mt-3 text-sm text-day-muted dark:text-night-muted">
              {document.type.toUpperCase()} {t("common.file", "file")}
            </p>
            <a
              href={document.url}
              download
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-day-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-night-primary dark:text-night-background"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="h-4 w-4" />
              {t("common.download", "Download")}
            </a>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <a
          href={document.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-day-primary hover:underline dark:text-night-primary"
        >
          <Eye className="h-4 w-4" strokeWidth={2.1} />
          Open original
        </a>
        <a
          href={document.url}
          download
          className="inline-flex items-center gap-2 text-sm font-semibold text-day-muted transition hover:text-day-text dark:text-night-muted dark:hover:text-night-text"
        >
          <Download className="h-4 w-4" strokeWidth={2.1} />
          Download
        </a>
      </div>
    </div>
  );
};

export default AdminPendingKycDetail;
