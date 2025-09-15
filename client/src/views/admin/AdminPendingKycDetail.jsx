// src/pages/AdminPendingKycDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
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
  Loader2,
} from "lucide-react";
import bridge from "../../controllers/bridge";

const AdminPendingKycDetail = () => {
  const { t } = useTranslation();
  const { userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchUserDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchUserDetails = async () => {
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
  };

  const handleApprove = async () => {
    if (!window.confirm(t("admin.kyc.confirm_approve"))) return;

    setProcessing(true);
    try {
      const res = await bridge.auth.approveKyc(userId);
      if (res?.success) {
        alert(t("admin.kyc.approve_success"));
        navigate("/admin/dashboard");
      } else {
        alert(t("admin.kyc.approve_error"));
      }
    } catch (error) {
      console.error("Error approving KYC:", error);
      alert(t("admin.kyc.approve_error"));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert(t("admin.kyc.reject_reason_required"));
      return;
    }

    setProcessing(true);
    try {
      const res = await bridge.auth.rejectKyc(userId, { reason: rejectReason });
      if (res?.success) {
        alert(t("admin.kyc.reject_success"));
        navigate("/admin/dashboard");
      } else {
        alert(t("admin.kyc.reject_error"));
      }
    } catch (error) {
      console.error("Error rejecting KYC:", error);
      alert(t("admin.kyc.reject_error"));
    } finally {
      setProcessing(false);
      setShowRejectModal(false);
    }
  };

  const formatDocument = (doc) => {
    if (!doc) return null;
    if (typeof doc === "string") {
      return { url: doc, type: doc.split(".").pop().toLowerCase() };
    }
    return {
      url: doc.url || doc.path || doc,
      type: doc.type || doc.url?.split(".").pop().toLowerCase() || "unknown",
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-day-dashboard dark:bg-night-dashboard flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-day-accent dark:border-night-accent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-day-dashboard dark:bg-night-dashboard flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <p className="text-day-text dark:text-night-text">
            {t("admin.kyc.user_not_found")}
          </p>
        </div>
      </div>
    );
  }

  const phoneValue = user.phone || user.phoneNumber || null;

  return (
    <div className="min-h-screen bg-day-dashboard dark:bg-night-dashboard text-day-text dark:text-night-text p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/admin/dashboard")}
          className="flex items-center gap-2 text-day-text/70 dark:text-night-text/70 hover:text-day-text dark:hover:text-night-text transition-colors mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          {t("common.back")}
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {t("admin.kyc.user_verification")}
            </h1>
            <p className="mt-2 text-day-text/70 dark:text-night-text/70">
              {t("admin.kyc.review_documents")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                user.kycStatus === "Pending"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                  : user.kycStatus === "Approved"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
              }`}
            >
              <Clock className="inline h-4 w-4 mr-1" />
              {t(
                `admin.kyc.status.${user.kycStatus?.toLowerCase() || "pending"}`
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Minimal User Info */}
        <div className="lg:col-span-1">
          <div className="bg-day-surface dark:bg-night-surface rounded-lg border border-day-border dark:border-night-border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-day-accent dark:text-night-accent" />
              {t("admin.kyc.user_information")}
            </h2>

            <div className="space-y-4">
              {/* Avatar + email verified badge */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-day-accent to-day-secondary dark:from-night-accent dark:to-night-secondary flex items-center justify-center">
                    <span className="text-xl font-bold text-white">
                      {user.fullName?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                  {user.emailVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              </div>

              <InfoRow
                icon={<User className="h-4 w-4" />}
                label={t("common.full_name")}
                value={user.fullName}
              />
              <InfoRow
                icon={<Mail className="h-4 w-4" />}
                label={t("common.email")}
                value={user.email}
              />
              {phoneValue && (
                <InfoRow
                  icon={<Phone className="h-4 w-4" />}
                  label={t("common.phone")}
                  value={phoneValue}
                />
              )}
              {user.country && (
                <InfoRow
                  icon={<MapPin className="h-4 w-4" />}
                  label={t("common.country")}
                  value={user.country}
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 space-y-3">
            <button
              onClick={handleApprove}
              disabled={processing || user.kycStatus !== "Pending"}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {processing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
              {t("admin.kyc.approve")}
            </button>

            <button
              onClick={() => setShowRejectModal(true)}
              disabled={processing || user.kycStatus !== "Pending"}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              <XCircle className="h-5 w-5" />
              {t("admin.kyc.reject")}
            </button>
          </div>
        </div>

        {/* Documents */}
        <div className="lg:col-span-2">
          <div className="bg-day-surface dark:bg-night-surface rounded-lg border border-day-border dark:border-night-border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-day-accent dark:text-night-accent" />
              {t("admin.kyc.documents")}
            </h2>

            {user.kycDocuments && Object.keys(user.kycDocuments).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {user.kycDocuments.idFront && (
                  <DocumentCard
                    title={t("admin.kyc.id_front")}
                    document={formatDocument(user.kycDocuments.idFront)}
                    onPreview={setImagePreview}
                  />
                )}

                {user.kycDocuments.idBack && (
                  <DocumentCard
                    title={t("admin.kyc.id_back")}
                    document={formatDocument(user.kycDocuments.idBack)}
                    onPreview={setImagePreview}
                  />
                )}

                {user.kycDocuments.addressProof && (
                  <DocumentCard
                    title={t("admin.kyc.address_proof")}
                    document={formatDocument(user.kycDocuments.addressProof)}
                    onPreview={setImagePreview}
                  />
                )}

                {user.kycDocuments.selfie && (
                  <DocumentCard
                    title={t("admin.kyc.selfie")}
                    document={formatDocument(user.kycDocuments.selfie)}
                    onPreview={setImagePreview}
                  />
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-day-text/30 dark:text-night-text/30" />
                <p className="text-day-text/60 dark:text-night-text/60">
                  {t("admin.kyc.no_documents")}
                </p>
              </div>
            )}
          </div>

          {user.bio && (
            <div className="mt-6 bg-day-surface dark:bg-night-surface rounded-lg border border-day-border dark:border-night-border p-6">
              <h3 className="text-lg font-semibold mb-3">
                {t("admin.kyc.bio")}
              </h3>
              <p className="text-day-text/80 dark:text-night-text/80">
                {user.bio}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-day-surface dark:bg-night-surface rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">
              {t("admin.kyc.reject_reason")}
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-day-border dark:border-night-border rounded-lg bg-day-background dark:bg-night-background resize-none"
              placeholder={t("admin.kyc.reject_reason_placeholder")}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 border border-day-border dark:border-night-border rounded-lg hover:bg-day-border/20 dark:hover:bg-night-border/20 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {processing ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  t("admin.kyc.confirm_reject")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {imagePreview && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setImagePreview(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={imagePreview}
              alt="Document Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <div>
    <p className="text-sm text-day-text/60 dark:text-night-text/60 flex items-center gap-1">
      {icon}
      {label}
    </p>
    <p className="font-medium break-words">{value || "-"}</p>
  </div>
);

// Document Card Component
const DocumentCard = ({ title, document, onPreview }) => {
  const { t } = useTranslation();
  if (!document) return null;

  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(document.type);

  return (
    <div className="border border-day-border dark:border-night-border rounded-lg p-4">
      <h4 className="font-medium mb-3">{title}</h4>

      {isImage ? (
        <div
          className="relative group cursor-pointer"
          onClick={() => onPreview(document.url)}
        >
          <img
            src={document.url}
            alt={title}
            className="w-full h-48 object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <Eye className="h-8 w-8 text-white" />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 bg-day-background dark:bg-night-background rounded-lg">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto mb-2 text-day-text/50 dark:text-night-text/50" />
            <p className="text-sm text-day-text/60 dark:text-night-text/60 mb-3">
              {document.type.toUpperCase()} {t("common.file")}
            </p>
            <a
              href={document.url}
              download
              className="inline-flex items-center gap-2 px-4 py-2 bg-day-accent dark:bg-night-accent text-white rounded-lg hover:opacity-90 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="h-4 w-4" />
              {t("common.download")}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPendingKycDetail;
