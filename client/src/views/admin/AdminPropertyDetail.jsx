// src/pages/AdminPropertyDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Home,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  Loader2,
  Square,
  TrendingUp,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  ShieldCheck,
  Info,
  User,
} from "lucide-react";
import bridge from "../../controllers/bridge";

const AdminPropertyDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { propertyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [property, setProperty] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagInput, setFlagInput] = useState("");
  const [flags, setFlags] = useState([]);

  useEffect(() => {
    fetchProperty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const fetchProperty = async () => {
    setLoading(true);
    try {
      // Admin görünümü: sadece ID ile getir
      const res = await bridge.properties.getMyPropertyById(propertyId);
      if (res?.success && res.data) {
        setProperty(res.data);
      } else {
        navigate("/admin/dashboard");
      }
    } catch (e) {
      console.error("Error fetching property details:", e);
      navigate("/admin/dashboard");
    } finally {
      setLoading(false);
    }
  };
  // NEW: add flag chip locally
  const addFlagLocal = () => {
    const v = flagInput.trim();
    if (!v) return;
    setFlags((prev) => Array.from(new Set([...prev, v])));
    setFlagInput("");
  };

  // NEW: remove flag chip locally
  const removeFlagLocal = (value) => {
    setFlags((prev) => prev.filter((f) => f !== value));
  };

  // NEW: send flags to backend
  const handleAddFlags = async () => {
    if (flags.length === 0) {
      alert(t("admin.property.flag_validation_required"));
      return;
    }
    setProcessing(true);
    try {
      const res = await bridge.properties.flagProperty(
        property.id,
        flags,
        "add"
      );
      if (res?.success) {
        alert(t("admin.property.flag_success"));
        setShowFlagModal(false);
        setFlags([]);
        // opsiyonel: property'yi tazele
        fetchProperty();
      } else {
        alert(t("admin.property.flag_error"));
      }
    } catch (e) {
      console.error(e);
      alert(t("admin.property.flag_error"));
    } finally {
      setProcessing(false);
    }
  };
  const formatCurrency = (amount, currency = "USD", locale = "en-US") => {
    if (amount === undefined || amount === null) return "-";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${amount} ${currency || ""}`.trim();
    }
  };

  const statusPill = (status) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "draft":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const images = Array.isArray(property?.images) ? property.images : [];
  const docs = Array.isArray(property?.documents) ? property.documents : [];

  const normImage = (img) =>
    typeof img === "string"
      ? { url: img }
      : { url: img?.url || img?.path || "" };

  const normDoc = (d) => {
    if (typeof d === "string")
      return { url: d, type: guessType(d), verified: d.verified ?? undefined };
    return {
      url: d?.url || d?.path || "",
      type: d?.type || guessType(d?.url || d?.path || ""),
      verified: d?.verified,
      name: d?.fileName || d?.name,
    };
  };

  const guessType = (url = "") => {
    const ext = url.split(".").pop()?.toLowerCase();
    return ext || "file";
  };

  const nextImage = () =>
    setCurrentImageIndex((p) => (images.length ? (p + 1) % images.length : 0));
  const prevImage = () =>
    setCurrentImageIndex((p) =>
      images.length ? (p - 1 + images.length) % images.length : 0
    );

  const canDecide = property?.status === "draft";

  const handleApprove = async () => {
    // Not girmek istiyorsa modalı açalım (eski confirm yerine modal kullanacağız)
    setShowApproveModal(true);
  };
  const submitApprove = async () => {
    setProcessing(true);
    try {
      // reviewNotes = approveNote (opsiyonel)
      const res = await bridge.properties.updateStatus(
        property.id,
        "published",
        approveNote?.trim() || null
      );
      if (res?.success) {
        alert(t("admin.property.approve_success"));
        navigate("/admin/dashboard");
      } else {
        alert(t("admin.property.approve_error"));
      }
    } catch (e) {
      console.error(e);
      alert(t("admin.property.approve_error"));
    } finally {
      setProcessing(false);
      setShowApproveModal(false);
      setApproveNote("");
    }
  };
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert(t("admin.property.reject_reason_required"));
      return;
    }
    setProcessing(true);
    try {
      const res = await bridge.properties.updateStatus(
        property.id,
        "rejected",
        rejectReason
      );
      if (res?.success) {
        alert(t("admin.property.reject_success"));
        navigate("/admin/dashboard");
      } else {
        alert(t("admin.property.reject_error"));
      }
    } catch (e) {
      console.error(e);
      alert(t("admin.property.reject_error"));
    } finally {
      setProcessing(false);
      setShowRejectModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-day-dashboard dark:bg-night-dashboard flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-day-accent dark:border-night-accent" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-day-dashboard dark:bg-night-dashboard flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <p className="text-day-text dark:text-night-text">
            {t("admin.property.not_found")}
          </p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold">{t("admin.property.review")}</h1>
            <p className="mt-2 text-day-text/70 dark:text-night-text/70">
              {property.fullAddress}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${statusPill(
                property.status
              )}`}
            >
              <Clock className="inline h-4 w-4 mr-1" />
              {t(`properties.status.${property.status}`)}
            </span>
            <span className="px-3 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />
              {t("properties.trust_score")}: {property.trustScore ?? "-"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Images + Basic & Financial */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          <div className="bg-day-surface dark:bg-night-surface rounded-lg border border-day-border dark:border-night-border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <ImageIcon className="h-5 w-5 mr-2 text-day-accent dark:text-night-accent" />
              {t("properties.images")}
            </h2>

            {images.length ? (
              <div>
                <div
                  className="relative group cursor-pointer mb-4"
                  onClick={() => setShowImageModal(true)}
                >
                  <img
                    src={normImage(images[currentImageIndex]).url}
                    alt={`Image ${currentImageIndex + 1}`}
                    className="w-full h-96 object-cover rounded-lg"
                  />

                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          prevImage();
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          nextImage();
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  )}

                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <Eye className="h-8 w-8 text-white" />
                  </div>
                </div>

                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {images.map((im, idx) => (
                      <img
                        key={idx}
                        src={normImage(im).url}
                        alt={`Thumbnail ${idx + 1}`}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-20 h-20 object-cover rounded cursor-pointer transition-all ${
                          idx === currentImageIndex
                            ? "ring-2 ring-day-accent dark:ring-night-accent"
                            : "opacity-70 hover:opacity-100"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 text-day-text/30 dark:text-night-text/30" />
                <p className="text-day-text/60 dark:text-night-text/60">
                  {t("properties.no_images")}
                </p>
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="bg-day-surface dark:bg-night-surface rounded-lg border border-day-border dark:border-night-border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Home className="h-5 w-5 mr-2 text-day-accent dark:text-night-accent" />
              {t("properties.basic_info")}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label={t("properties.property_type")}
                value={property.propertyType}
              />
              <Field
                label={t("properties.size")}
                value={`${property.size} m²`}
                icon={<Square className="h-3 w-3" />}
              />
              <Field label={t("properties.rooms")} value={property.rooms} />
              <div className="col-span-2">
                <p className="text-sm text-day-text/60 dark:text-night-text/60 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {t("properties.location")}
                </p>
                <p className="font-medium">{property.fullAddress}</p>
                <p className="text-sm text-day-text/70 dark:text-night-text/70">
                  {property.city}, {property.country}
                </p>
              </div>
              {property.locationPin &&
                Object.keys(property.locationPin).length > 0 && (
                  <div className="col-span-2 flex items-center gap-2 text-sm text-day-text/70 dark:text-night-text/70">
                    <Info className="h-4 w-4" />
                    <span>{t("properties.location_pin_available")}</span>
                  </div>
                )}
            </div>
          </div>

          {/* Financial */}
          <div className="bg-day-surface dark:bg-night-surface rounded-lg border border-day-border dark:border-night-border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-day-accent dark:text-night-accent" />
              {t("properties.financial")}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label={t("properties.estimated_value")}
                value={formatCurrency(
                  property.estimatedValue,
                  property.currency
                )}
              />
              <Field
                label={t("properties.requested_investment")}
                value={formatCurrency(
                  property.requestedInvestment,
                  property.currency
                )}
              />
              <Field
                label={t("properties.rent_offered")}
                value={formatCurrency(property.rentOffered, property.currency)}
              />
              <Field
                label={t("properties.annual_yield")}
                value={`${property.annualYieldPercent}%`}
              />
              <Field
                label={t("properties.currency")}
                value={property.currency}
              />
              <Field
                label={t("properties.contract_period_months")}
                value={property.contractPeriodMonths}
              />
            </div>
          </div>

          {/* Documents */}
          <div className="bg-day-surface dark:bg-night-surface rounded-lg border border-day-border dark:border-night-border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-day-accent dark:text-night-accent" />
              {t("properties.documents")}
            </h2>
            {docs.length ? (
              <div className="space-y-3">
                {docs.map((d, i) => {
                  const doc = normDoc(d);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 border border-day-border dark:border-night-border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-day-text/50 dark:text-night-text/50" />
                        <div>
                          <p className="font-medium text-sm">
                            {doc.name || doc.type?.toUpperCase()}
                          </p>
                          {typeof doc.verified === "boolean" && (
                            <p className="text-xs text-day-text/60 dark:text-night-text/60">
                              {doc.verified
                                ? t("common.verified")
                                : t("common.unverified")}
                            </p>
                          )}
                        </div>
                      </div>
                      {doc.url && (
                        <a
                          href={doc.url}
                          download
                          className="p-2 hover:bg-day-border/20 dark:hover:bg-night-border/20 rounded-lg transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-day-text/60 dark:text-night-text/60">
                {t("properties.no_documents")}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Owner + Metadata + Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Owner */}
          <div className="bg-day-surface dark:bg-night-surface rounded-lg border border-day-border dark:border-night-border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-day-accent dark:text-night-accent" />
              {t("properties.owner")}
            </h2>
            {property.owner ? (
              <div className="space-y-2">
                <p className="font-medium">{property.owner.fullName}</p>
                <p className="text-sm text-day-text/70 dark:text-night-text/70">
                  {property.owner.email}
                </p>
                {property.owner.phone && (
                  <p className="text-sm text-day-text/70 dark:text-night-text/70">
                    {property.owner.phone}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Field
                    small
                    label={t("common.country")}
                    value={property.owner.country}
                  />
                  <Field
                    small
                    label={t("properties.trust_score")}
                    value={property.owner.trustScore}
                  />
                  <Field
                    small
                    label={t("properties.total_properties")}
                    value={property.owner.totalProperties}
                  />
                  <Field
                    small
                    label={t("properties.completed_contracts")}
                    value={property.owner.completedContracts}
                  />
                  <Field
                    small
                    label={t("properties.ongoing_contracts")}
                    value={property.owner.ongoingContracts}
                  />
                  <Field
                    small
                    label={t("properties.verification_status")}
                    value={property.owner.verificationStatus}
                  />
                </div>
              </div>
            ) : (
              <div className="text-day-text/60 dark:text-night-text/60">
                {t("properties.no_owner_info")}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-day-surface dark:bg-night-surface rounded-lg border border-day-border dark:border-night-border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Info className="h-5 w-5 mr-2 text-day-accent dark:text-night-accent" />
              {t("properties.metadata")}
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t("properties.id")}</span>
                <span className="font-mono">{property.id}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("common.created")}</span>
                <span>{new Date(property.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("common.updated")}</span>
                <span>{new Date(property.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("properties.total_views")}</span>
                <span>{property.metadata?.totalViews ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("properties.total_favorites")}</span>
                <span>{property.metadata?.totalFavorites ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("properties.total_offers")}</span>
                <span>{property.metadata?.totalOffers ?? 0}</span>
              </div>
              {(property.metadata?.flaggedIssues?.length ?? 0) > 0 ? (
                <div className="pt-2">
                  <p className="text-red-500 font-medium mb-1">
                    {t("properties.flagged_issues")}
                  </p>
                  <ul className="list-disc pl-5 text-red-400">
                    {property.metadata.flaggedIssues.map((it, idx) => (
                      <li key={idx}>{String(it)}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="pt-2 text-day-text/60 dark:text-night-text/60">
                  {t("properties.no_flagged_issues")}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => handleApprove()}
              disabled={!canDecide || processing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {processing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
              {t("admin.property.approve")}
            </button>
            <button
              onClick={() => setShowFlagModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
            >
              {/* küçük bir bayrak ikonu istersen: */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6v16m0-12a4 4 0 004-4h8l-2 4 2 4H8a4 4 0 01-4-4z"
                />
              </svg>
              {t("admin.property.flag")}
            </button>

            <button
              onClick={() => setShowRejectModal(true)}
              disabled={!canDecide || processing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              <XCircle className="h-5 w-5" />
              {t("admin.property.reject")}
            </button>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-day-surface dark:bg-night-surface rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">
              {t("admin.property.reject_reason")}
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-day-border dark:border-night-border rounded-lg bg-day-background dark:bg-night-background resize-none"
              placeholder={t("admin.property.reject_reason_placeholder")}
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
                  t("admin.property.confirm_reject")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {showImageModal && images.length > 0 && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img
              src={normImage(images[currentImageIndex]).url}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-day-surface dark:bg-night-surface rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-xl font-semibold mb-4">
              {t("admin.property.flag_title")}
            </h3>

            <div className="flex gap-2 mb-3">
              <input
                value={flagInput}
                onChange={(e) => setFlagInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-day-border dark:border-night-border rounded-lg bg-day-background dark:bg-night-background"
                placeholder={t("admin.property.flag_placeholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addFlagLocal();
                }}
              />
              <button
                onClick={addFlagLocal}
                className="px-4 py-2 border border-day-border dark:border-night-border rounded-lg hover:bg-day-border/20 dark:hover:bg-night-border/20 transition-colors"
              >
                {t("admin.property.flag_add")}
              </button>
            </div>

            {/* chips */}
            {flags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {flags.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                  >
                    {f}
                    <button
                      className="hover:opacity-70"
                      onClick={() => removeFlagLocal(f)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowFlagModal(false)}
                className="flex-1 px-4 py-2 border border-day-border dark:border-night-border rounded-lg hover:bg-day-border/20 dark:hover:bg-night-border/20 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleAddFlags}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {processing
                  ? t("common.loading")
                  : t("admin.property.flag_submit")}
              </button>
            </div>
          </div>
        </div>
      )}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-day-surface dark:bg-night-surface rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">
              {t("admin.property.approve_with_note_title")}
            </h3>
            <p className="text-sm text-day-text/70 dark:text-night-text/70 mb-3">
              {t("admin.property.approve_with_note_hint")}
            </p>
            <textarea
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              className="w-full h-28 px-3 py-2 border border-day-border dark:border-night-border rounded-lg bg-day-background dark:bg-night-background resize-none"
              placeholder={t("admin.property.approve_note_placeholder")}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setApproveNote("");
                }}
                className="flex-1 px-4 py-2 border border-day-border dark:border-night-border rounded-lg hover:bg-day-border/20 dark:hover:bg-night-border/20 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={submitApprove}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {processing ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  t("admin.property.confirm_approval")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value, icon, small = false }) => (
  <div className={small ? "space-y-0.5" : ""}>
    <p
      className={`text-sm text-day-text/60 dark:text-night-text/60 ${
        icon ? "flex items-center gap-1" : ""
      }`}
    >
      {icon}
      {label}
    </p>
    <p className="font-medium">{value ?? "-"}</p>
  </div>
);

export default AdminPropertyDetail;
