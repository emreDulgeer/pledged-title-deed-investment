import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Home,
  Image as ImageIcon,
  Info,
  Loader2,
  MapPin,
  Ruler,
  ShieldCheck,
  Square,
  TrendingUp,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import bridge from "../../controllers/bridge";
import DocumentPreviewModal from "../../components/common/DocumentPreviewModal";
import {
  DocumentsList,
  LocationMap,
  OwnerCard,
} from "../../components/property/detail";
import { resolveFileUrl } from "../../components/property/detail/_utils";
import {
  getPropertyImageStyle,
} from "../../utils/propertyImages";
import { APP_CURRENCY } from "../../utils/currency";
import { getUserId, getUserProfilePath } from "../../utils/profileRoutes";
import OfficialDataCheckModal from "../../components/property/modals/OfficialDataCheckModal";
import { useAppFeedback } from "../../utils/hooks/useAppFeedback";

const getEntryFileId = (entry) => {
  if (!entry) return "";

  if (typeof entry === "string") {
    return "";
  }

  const rawId =
    entry.id ||
    entry._id ||
    entry.fileId?._id ||
    entry.fileId?.id ||
    entry.fileId;

  return rawId ? String(rawId) : "";
};

const getPreviewUrl = (entry) => {
  const fileId = getEntryFileId(entry);
  return fileId ? resolveFileUrl(`/api/v1/files/preview/${fileId}`) : "";
};

const prettifyDocType = (type = "") =>
  String(type)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatCurrency = (amount, locale = "en-US") => {
  if (amount === undefined || amount === null || amount === "") return "—";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: APP_CURRENCY,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return `${amount} ${APP_CURRENCY}`.trim();
  }
};

const formatPercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "—";

  return `${parsed % 1 === 0 ? parsed.toFixed(0) : parsed.toFixed(2)}%`;
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

const formatPropertyType = (value = "") =>
  String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Property";

const formatStatus = (value = "") =>
  String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Draft";

const getPropertyIdentity = (property, fallback = "") =>
  property?.id || property?._id || fallback;

const getPropertyLocation = (property) =>
  property?.fullAddress ||
  property?.mapSearchAddress ||
  [property?.city, property?.country].filter(Boolean).join(", ") ||
  "Address not provided";

const getStatusTone = (status) => {
  switch (status) {
    case "published":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200";
    case "rejected":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200";
    case "pending_review":
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200";
    case "draft":
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200";
  }
};

const normalizeOwner = (owner) => {
  if (!owner) return null;

  const verificationStatus = owner.verificationStatus || owner.kycStatus || "Pending";
  const normalizedVerification =
    verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1);

  return {
    ...owner,
    fullName:
      owner.fullName ||
      [owner.firstName, owner.lastName].filter(Boolean).join(" ") ||
      owner.email ||
      "Property owner",
    phone: owner.phone || owner.phoneNumber || null,
    verificationStatus: normalizedVerification,
  };
};

const MetricCard = ({ label, value, icon: Icon, accentClass = "" }) => (
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
      </div>

      {Icon ? (
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-surface text-day-primary dark:bg-night-surface dark:text-night-primary">
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </div>
      ) : null}
    </div>
  </div>
);

const DataRow = ({ label, value, valueClassName = "" }) => (
  <div className="flex items-start justify-between gap-4 border-b border-day-border/70 py-3 last:border-b-0 last:pb-0 first:pt-0 dark:border-night-border/70">
    <span className="text-sm text-day-muted dark:text-night-muted">{label}</span>
    <span
      className={`text-right text-sm font-medium text-day-text dark:text-night-text ${valueClassName}`.trim()}
    >
      {value}
    </span>
  </div>
);

const ReviewStep = ({ title, copy, complete = false, current = false }) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div
        className={`grid h-10 w-10 place-items-center rounded-2xl border ${
          complete
            ? "border-white/20 bg-white/14 text-white"
            : current
              ? "border-white/25 bg-white text-day-primary"
              : "border-white/12 bg-white/6 text-white/70"
        }`}
      >
        {complete ? (
          <BadgeCheck className="h-4 w-4" strokeWidth={2.3} />
        ) : current ? (
          <Clock3 className="h-4 w-4" strokeWidth={2.2} />
        ) : (
          "•"
        )}
      </div>
      <div className="mt-2 h-full w-px bg-white/10" />
    </div>

    <div className="pb-6">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/72">{copy}</p>
    </div>
  </div>
);

const GalleryThumb = ({ image, index, active, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(index)}
    className={`relative overflow-hidden rounded-[22px] border transition ${
      active
        ? "border-day-primary ring-4 ring-day-primary/10 dark:border-night-primary dark:ring-night-primary/15"
        : "border-day-border/70 dark:border-night-border/70"
    }`}
  >
    {image?.url ? (
      <img
        src={image.url}
        alt={`Property gallery ${index + 1}`}
        className="h-28 w-full object-cover"
        style={getPropertyImageStyle(image)}
      />
    ) : (
      <div className="grid h-28 place-items-center bg-day-panel text-day-primary/40 dark:bg-night-panel dark:text-night-primary/40">
        <Building2 className="h-8 w-8" strokeWidth={1.9} />
      </div>
    )}
  </button>
);

const ModalShell = ({ title, copy, children }) => (
  <div className="shell-surface w-full max-w-lg px-6 py-6">
    <h3 className="text-2xl font-semibold text-day-text dark:text-night-text">
      {title}
    </h3>
    {copy ? (
      <p className="mt-3 text-sm leading-6 text-day-muted dark:text-night-muted">
        {copy}
      </p>
    ) : null}
    <div className="mt-5">{children}</div>
  </div>
);

const LoadingState = () => (
  <div className="space-y-6 p-4 sm:p-6 xl:p-8">
    <div className="h-7 w-44 animate-pulse rounded-full bg-day-panel/60 dark:bg-night-panel/60" />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.42fr)_360px]">
      <div className="space-y-6">
        <div className="shell-surface overflow-hidden p-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="h-[420px] animate-pulse rounded-[24px] bg-day-panel/60 dark:bg-night-panel/60" />
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[132px] animate-pulse rounded-[22px] bg-day-panel/60 dark:bg-night-panel/60"
                />
              ))}
            </div>
          </div>

          <div className="mt-3 grid gap-3 border-t border-day-border/70 px-3 pt-6 dark:border-night-border/70 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-3xl bg-day-panel/60 dark:bg-night-panel/60"
              />
            ))}
          </div>
        </div>

        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="shell-surface h-72 animate-pulse bg-day-panel/60 dark:bg-night-panel/60"
          />
        ))}
      </div>

      <div className="space-y-6">
        <div className="shell-surface h-[560px] animate-pulse bg-day-panel/60 dark:bg-night-panel/60" />
        <div className="shell-surface h-72 animate-pulse bg-day-panel/60 dark:bg-night-panel/60" />
      </div>
    </div>
  </div>
);

const EmptyState = ({ t, onBack }) => (
  <div className="space-y-6 p-4 sm:p-6 xl:p-8">
    <div className="shell-surface px-6 py-14 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-day-panel text-rose-500 dark:bg-night-panel dark:text-rose-300">
        <AlertCircle className="h-7 w-7" strokeWidth={2.2} />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-day-text dark:text-night-text">
        {t("admin.property.not_found", "Property not found")}
      </h2>
      <p className="mt-3 text-sm leading-6 text-day-muted dark:text-night-muted">
        The requested asset could not be loaded. Return to the property queue and
        select another submission.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
      >
        Back to queue
      </button>
    </div>
  </div>
);

const AdminPropertyDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { propertyId: propertyIdParam, id } = useParams();
  const propertyId = propertyIdParam || id;
  const feedback = useAppFeedback();

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
  const [showOfficialDataModal, setShowOfficialDataModal] = useState(false);
  const [officialDataLoading, setOfficialDataLoading] = useState(false);
  const [officialDataError, setOfficialDataError] = useState("");
  const [officialDataResult, setOfficialDataResult] = useState(null);
  const [previewDocument, setPreviewDocument] = useState(null);

  const listTab = property?.status === "draft" ? "draft" : "other";
  const propertiesListPath = `/admin/properties?tab=${listTab}`;

  useEffect(() => {
    fetchProperty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const fetchProperty = async () => {
    setLoading(true);

    try {
      const [propertyResult, filesResult] = await Promise.allSettled([
        bridge.properties.getMyPropertyById(propertyId),
        bridge.properties.getFiles(propertyId),
      ]);

      const propertyRes =
        propertyResult.status === "fulfilled" ? propertyResult.value : null;
      const filesRes = filesResult.status === "fulfilled" ? filesResult.value : null;

      if (propertyRes?.success && propertyRes.data) {
        setProperty({
          ...propertyRes.data,
          images:
            filesRes?.success && Array.isArray(filesRes.data?.images)
              ? filesRes.data.images
              : propertyRes.data.images,
          documents:
            filesRes?.success && Array.isArray(filesRes.data?.documents)
              ? filesRes.data.documents
              : propertyRes.data.documents,
        });
      } else {
        navigate("/admin/properties");
      }
    } catch (error) {
      console.error("Error fetching property details:", error);
      navigate("/admin/properties");
    } finally {
      setLoading(false);
    }
  };

  const addFlagLocal = () => {
    const value = flagInput.trim();
    if (!value) return;

    setFlags((current) => Array.from(new Set([...current, value])));
    setFlagInput("");
  };

  const removeFlagLocal = (value) => {
    setFlags((current) => current.filter((flag) => flag !== value));
  };

  const handleAddFlags = async () => {
    if (flags.length === 0) {
      feedback.warning(t("admin.property.flag_validation_required"));
      return;
    }

    setProcessing(true);
    try {
      const result = await bridge.properties.flagProperty(
        property.id,
        flags,
        "add",
      );

      if (result?.success) {
        feedback.success(t("admin.property.flag_success"));
        setShowFlagModal(false);
        setFlags([]);
        fetchProperty();
      } else {
        feedback.error(t("admin.property.flag_error"));
      }
    } catch (error) {
      console.error(error);
      feedback.error(t("admin.property.flag_error"));
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadDocument = async (fileId, filename) => {
    if (!fileId) return;

    try {
      const downloadUrl = bridge.files.getDownloadUrl(fileId);
      if (!downloadUrl) {
        throw new Error("Download URL could not be created");
      }

      bridge.files.triggerBrowserDownload(downloadUrl, filename || "document");
    } catch (error) {
      console.error("Property document download error:", error);
      feedback.error(t("common.error"));
    }
  };

  const handlePreviewDocument = (previewUrl, document) => {
    if (!previewUrl) return;
    setPreviewDocument({
      url: previewUrl,
      title: document?.name || document?.fileName || "Document preview",
    });
  };

  const handleApprove = async () => {
    setShowApproveModal(true);
  };

  const submitApprove = async () => {
    setProcessing(true);

    try {
      const result = await bridge.properties.updateStatus(
        property.id,
        "published",
        approveNote?.trim() || null,
      );

      if (result?.success) {
        feedback.success(t("admin.property.approve_success"));
        navigate("/admin/properties?tab=draft");
      } else {
        feedback.error(t("admin.property.approve_error"));
      }
    } catch (error) {
      console.error(error);
      feedback.error(t("admin.property.approve_error"));
    } finally {
      setProcessing(false);
      setShowApproveModal(false);
      setApproveNote("");
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      feedback.warning(t("admin.property.reject_reason_required"));
      return;
    }

    setProcessing(true);
    try {
      const result = await bridge.properties.updateStatus(
        property.id,
        "rejected",
        rejectReason,
      );

      if (result?.success) {
        feedback.success(t("admin.property.reject_success"));
        navigate("/admin/properties?tab=draft");
      } else {
        feedback.error(t("admin.property.reject_error"));
      }
    } catch (error) {
      console.error(error);
      feedback.error(t("admin.property.reject_error"));
    } finally {
      setProcessing(false);
      setShowRejectModal(false);
    }
  };

  const handleOfficialDataCheck = async () => {
    setShowOfficialDataModal(true);
    setOfficialDataLoading(true);
    setOfficialDataError("");
    setOfficialDataResult(null);

    try {
      const response = await bridge.properties.checkOfficialData(property.id);

      if (response?.success) {
        setOfficialDataResult(response.data);
      } else {
        setOfficialDataError(t("admin.property.official_data_error"));
      }
    } catch (error) {
      setOfficialDataError(
        error.message || t("admin.property.official_data_error"),
      );
    } finally {
      setOfficialDataLoading(false);
    }
  };

  const canDecide = property?.status === "draft";
  const ownerSummary = normalizeOwner(property?.owner);

  const galleryImages = useMemo(
    () =>
      (Array.isArray(property?.images) ? property.images : []).map((image) =>
        typeof image === "string"
          ? { url: resolveFileUrl(image), presentation: null }
          : {
              id: getEntryFileId(image),
              url:
                resolveFileUrl(image?.url || image?.path || "") ||
                getPreviewUrl(image),
              presentation: image?.presentation || null,
            },
      ),
    [property?.images],
  );

  const normalizedDocuments = useMemo(
    () =>
      (Array.isArray(property?.documents) ? property.documents : []).map((document) => {
        if (typeof document === "string") {
          return {
            fileId: "",
            previewUrl: resolveFileUrl(document),
            type: "file",
            verified: undefined,
            reviewStatus: undefined,
            reviewNotes: "",
            name: "",
          };
        }

        const name =
          document?.fileName ||
          document?.name ||
          document?.originalName ||
          document?.fileId?.originalName ||
          document?.fileId?.filename ||
          prettifyDocType(document?.type) ||
          "Document";

        return {
          fileId: getEntryFileId(document),
          previewUrl:
            resolveFileUrl(document?.url || document?.path || "") ||
            getPreviewUrl(document),
          type: document?.type || "file",
          verified: document?.verified,
          reviewStatus: document?.reviewStatus,
          reviewNotes: document?.reviewNotes,
          name,
        };
      }),
    [property?.documents],
  );

  const metadataIssues = property?.metadata?.flaggedIssues || [];
  const officialCityCountry = [property?.city, property?.country]
    .filter(Boolean)
    .join(", ");
  const titleDeedAddress = property?.fullAddress || "—";
  const mapReferenceAddress = property?.mapSearchAddress || "";
  const showMapReferenceAddress =
    Boolean(mapReferenceAddress) && mapReferenceAddress !== property?.fullAddress;

  const workflowSteps = useMemo(() => {
    const officialCheckComplete =
      Boolean(officialDataResult) || property?.status === "published";
    const finalDecisionComplete =
      property?.status === "published" || property?.status === "rejected";

    return [
      {
        title: "Submission package received",
        copy:
          normalizedDocuments.length > 0
            ? `${normalizedDocuments.length} document${normalizedDocuments.length === 1 ? "" : "s"} and ${galleryImages.length} gallery asset${galleryImages.length === 1 ? "" : "s"} are available for review.`
            : "The asset has been created, but supporting files are still limited.",
        complete: true,
        current: false,
      },
      {
        title: "Official data cross-check",
        copy: officialCheckComplete
          ? "Cross-check results are available for the current submission."
          : "Run the official data check before recording a final marketplace decision.",
        complete: officialCheckComplete,
        current: !officialCheckComplete && canDecide,
      },
      {
        title: "Marketplace decision",
        copy: property?.status === "published"
          ? "The asset has been approved and can move into investor visibility."
          : property?.status === "rejected"
            ? "The submission has been rejected and routed back for revision."
            : "Approve or reject the listing once document and metadata review is complete.",
        complete: finalDecisionComplete,
        current: !finalDecisionComplete,
      },
    ];
  }, [
    canDecide,
    galleryImages.length,
    normalizedDocuments.length,
    officialDataResult,
    property?.status,
  ]);

  const completedWorkflowCount = workflowSteps.filter((step) => step.complete).length;
  const workflowProgress = Math.round(
    (completedWorkflowCount / Math.max(workflowSteps.length, 1)) * 100,
  );

  if (loading) {
    return <LoadingState />;
  }

  if (!property) {
    return (
      <EmptyState
        t={t}
        onBack={() => navigate("/admin/properties")}
      />
    );
  }

  const currentImage = galleryImages[currentImageIndex] || null;
  const propertyIdentity = getPropertyIdentity(property, propertyId);

  return (
    <div className="space-y-6 p-4 sm:p-6 xl:p-8">
      <div>
        <button
          type="button"
          onClick={() => navigate(propertiesListPath)}
          className="inline-flex items-center gap-2 text-sm font-medium text-day-muted transition hover:text-day-text dark:text-night-muted dark:hover:text-night-text"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
          Back to queue
        </button>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-day-muted dark:text-night-muted">
          <span>Marketplace</span>
          <span>/</span>
          <span>Property vetting</span>
          <span>/</span>
          <span className="text-day-primary dark:text-night-primary">
            {propertyIdentity.slice(-8) || propertyIdentity}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <h1 className="text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
              {property.title || t("admin.property.review", "Property review")}
            </h1>
            <p className="mt-3 text-base leading-7 text-day-muted dark:text-night-muted">
              {getPropertyLocation(property)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusTone(
                property.status,
              )}`}
            >
              {formatStatus(property.status)}
            </span>
            <span className="rounded-full bg-day-panel px-4 py-2 text-sm font-semibold text-day-primary dark:bg-night-panel dark:text-night-primary">
              Trust score {property.trustScore ?? "—"}
            </span>
            <span className="rounded-full bg-day-primary px-4 py-2 text-sm font-semibold text-white dark:bg-night-primary dark:text-night-background">
              Est. {formatCurrency(property.estimatedValue)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.42fr)_360px]">
        <div className="space-y-6">
          <section className="shell-surface overflow-hidden p-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <button
                type="button"
                onClick={() => currentImage && setShowImageModal(true)}
                className="group relative h-[420px] overflow-hidden rounded-[24px] bg-day-panel text-left dark:bg-night-panel"
              >
                {currentImage?.url ? (
                  <img
                    src={currentImage.url}
                    alt={property.title || "Property image"}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                    style={getPropertyImageStyle(currentImage)}
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-day-primary/35 dark:text-night-primary/35">
                    <ImageIcon className="h-14 w-14" strokeWidth={1.8} />
                  </div>
                )}

                <div className="absolute left-5 top-5 rounded-full bg-day-background/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-text backdrop-blur dark:bg-night-background/90 dark:text-night-text">
                  Primary view
                </div>
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" />
                <div className="absolute bottom-5 right-5 grid h-11 w-11 place-items-center rounded-2xl bg-white/14 text-white backdrop-blur">
                  <Eye className="h-4 w-4" strokeWidth={2.2} />
                </div>
              </button>

              <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
                {galleryImages.length > 0 ? (
                  galleryImages.slice(0, 3).map((image, index) => (
                    <GalleryThumb
                      key={`${image.id || image.url || index}-${index}`}
                      image={image}
                      index={index}
                      active={index === currentImageIndex}
                      onSelect={setCurrentImageIndex}
                    />
                  ))
                ) : (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="grid h-28 place-items-center rounded-[22px] border border-day-border/70 bg-day-panel text-day-primary/30 dark:border-night-border/70 dark:bg-night-panel dark:text-night-primary/30"
                    >
                      <Building2 className="h-8 w-8" strokeWidth={1.8} />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-3 grid gap-3 border-t border-day-border/70 px-3 pt-6 dark:border-night-border/70 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Estimated value"
                value={formatCurrency(property.estimatedValue)}
                icon={Wallet}
              />
              <MetricCard
                label="Requested capital"
                value={formatCurrency(property.requestedInvestment)}
                icon={TrendingUp}
              />
              <MetricCard
                label="Monthly rent"
                value={formatCurrency(property.rentOffered)}
                icon={Home}
              />
              <MetricCard
                label="Target yield"
                value={formatPercent(property.annualYieldPercent)}
                icon={ShieldCheck}
                accentClass="text-emerald-600 dark:text-emerald-300"
              />
            </div>
          </section>

          <section className="shell-surface px-6 py-6 sm:px-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
              Institutional metadata
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
              Core property facts
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                label="Property type"
                value={formatPropertyType(property.propertyType)}
                icon={Home}
              />
              <MetricCard
                label="Size"
                value={property.size ? `${property.size} m²` : "—"}
                icon={Ruler}
              />
              <MetricCard
                label="Rooms"
                value={property.rooms ?? "—"}
                icon={Square}
              />
              <MetricCard
                label="Currency"
                value={property.currency || APP_CURRENCY}
                icon={Wallet}
              />
              <MetricCard
                label="Contract term"
                value={
                  property.contractPeriodMonths
                    ? `${property.contractPeriodMonths} months`
                    : "—"
                }
                icon={CalendarClock}
              />
              <MetricCard
                label="Status"
                value={formatStatus(property.status)}
                icon={ShieldCheck}
              />
            </div>

            <div className="mt-6 shell-subtle-surface px-5 py-5">
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-day-primary dark:text-night-primary" />
                <div className="w-full">
                  <p className="text-sm font-semibold text-day-text dark:text-night-text">
                    Address record
                  </p>

                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
                        Title deed address
                      </p>
                      <p className="mt-2 text-sm leading-6 text-day-text dark:text-night-text">
                        {titleDeedAddress}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
                        City / Country
                      </p>
                      <p className="mt-2 text-sm leading-6 text-day-text dark:text-night-text">
                        {officialCityCountry || "—"}
                      </p>
                    </div>

                    {showMapReferenceAddress ? (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
                          Map search address
                        </p>
                        <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                          {mapReferenceAddress}
                        </p>
                      </div>
                    ) : null}

                    {property.locationPin &&
                    Object.keys(property.locationPin).length > 0 ? (
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-primary dark:text-night-primary">
                        Geographic pin attached
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="shell-surface px-6 py-6 sm:px-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
              Financial case
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
              Underwriting snapshot
            </h2>

            <div className="mt-6">
              <DataRow
                label={t("properties.estimated_value", "Estimated value")}
                value={formatCurrency(property.estimatedValue)}
              />
              <DataRow
                label={t("properties.requested_investment", "Requested investment")}
                value={formatCurrency(property.requestedInvestment)}
              />
              <DataRow
                label={t("properties.rent_offered", "Rent offered")}
                value={formatCurrency(property.rentOffered)}
              />
              <DataRow
                label={t("properties.annual_yield", "Annual yield")}
                value={formatPercent(property.annualYieldPercent)}
                valueClassName="text-emerald-600 dark:text-emerald-300"
              />
              <DataRow
                label={t("properties.contract_period_months", "Contract period")}
                value={
                  property.contractPeriodMonths
                    ? `${property.contractPeriodMonths} months`
                    : "—"
                }
              />
              <DataRow
                label={t("properties.trust_score", "Trust score")}
                value={
                  property.trustScore != null
                    ? `${property.trustScore}/100`
                    : "—"
                }
              />
            </div>
          </section>

          {normalizedDocuments.length > 0 ? (
            <DocumentsList
              documents={normalizedDocuments}
              onDownload={handleDownloadDocument}
              onPreview={handlePreviewDocument}
              t={t}
            />
          ) : (
            <section className="shell-surface px-6 py-6 sm:px-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                Data room
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
                Documents
              </h2>
              <div className="mt-6 shell-subtle-surface px-5 py-5 text-sm leading-6 text-day-muted dark:text-night-muted">
                No supporting documents have been attached to this submission yet.
              </div>
            </section>
          )}

          <LocationMap property={property} t={t} />
        </div>

        <aside className="space-y-6 xl:sticky xl:top-28 self-start">
          <section className="relative overflow-hidden rounded-[32px] bg-day-primary px-6 py-7 text-white shadow-accent dark:border dark:border-night-border/70 dark:bg-[#0f2a22] sm:px-7">
            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:18px_18px]" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/72">
                Approval workflow
              </p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-white">
                    Review flow
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-white/72">
                    {workflowProgress}% complete · {completedWorkflowCount} of{" "}
                    {workflowSteps.length} steps cleared.
                  </p>
                </div>
                <div className="rounded-full border border-white/12 bg-white/10 px-3 py-2 text-sm font-semibold text-white">
                  {canDecide ? "Awaiting decision" : formatStatus(property.status)}
                </div>
              </div>

              <div className="mt-6">
                {workflowSteps.map((step, index) => (
                  <ReviewStep
                    key={index}
                    title={step.title}
                    copy={step.copy}
                    complete={step.complete}
                    current={step.current}
                  />
                ))}
              </div>

              <div className="space-y-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={handleOfficialDataCheck}
                  disabled={!canDecide || processing || officialDataLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/16 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {officialDataLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
                  ) : (
                    <ShieldCheck className="h-4 w-4" strokeWidth={2.2} />
                  )}
                  {t("admin.property.check_official_data", "Check official data")}
                </button>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={!canDecide || processing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-day-primary transition hover:bg-white/92 disabled:cursor-not-allowed disabled:opacity-40 dark:text-night-background"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
                  ) : (
                    <CheckCircle className="h-4 w-4" strokeWidth={2.2} />
                  )}
                  {t("admin.property.approve", "Approve")}
                </button>

                <button
                  type="button"
                  onClick={() => setShowFlagModal(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/16 bg-white/6 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <Info className="h-4 w-4" strokeWidth={2.2} />
                  {t("admin.property.flag", "Flag for review")}
                </button>

                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  disabled={!canDecide || processing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/16 bg-white/6 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <XCircle className="h-4 w-4" strokeWidth={2.2} />
                  {t("admin.property.reject", "Reject")}
                </button>
              </div>
            </div>
          </section>

          <section className="shell-surface px-6 py-6 sm:px-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
              Review telemetry
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
              Submission health
            </h2>

            <div className="mt-6">
              <DataRow label={t("properties.id", "Property ID")} value={propertyIdentity} />
              <DataRow
                label={t("common.created", "Created")}
                value={formatDate(property.createdAt)}
              />
              <DataRow
                label={t("common.updated", "Updated")}
                value={formatDate(property.updatedAt)}
              />
              <DataRow
                label={t("properties.total_views", "Total views")}
                value={property.metadata?.totalViews ?? 0}
              />
              <DataRow
                label={t("properties.total_favorites", "Total favorites")}
                value={property.metadata?.totalFavorites ?? 0}
              />
              <DataRow
                label={t("properties.total_offers", "Total offers")}
                value={property.metadata?.totalOffers ?? 0}
              />
            </div>

            <div className="mt-6 shell-subtle-surface px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
                Flagged issues
              </p>
              {metadataIssues.length > 0 ? (
                <ul className="mt-4 space-y-3 text-sm leading-6 text-rose-600 dark:text-rose-300">
                  {metadataIssues.map((issue, index) => (
                    <li key={`${issue}-${index}`} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-current" />
                      <span>{String(issue)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm leading-6 text-day-muted dark:text-night-muted">
                  No flagged issues have been recorded on this asset yet.
                </p>
              )}
            </div>
          </section>

          <OwnerCard
            owner={ownerSummary || {}}
            profilePath={
              ownerSummary && getUserId(ownerSummary)
                ? getUserProfilePath(getUserId(ownerSummary))
                : null
            }
            t={t}
          />

          <section className="shell-surface px-6 py-6 sm:px-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
              Owner context
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
              Portfolio footprint
            </h2>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="Trust score"
                value={
                  ownerSummary?.trustScore != null
                    ? `${ownerSummary.trustScore}/100`
                    : "—"
                }
                icon={ShieldCheck}
              />
              <MetricCard
                label="Country"
                value={ownerSummary?.country || "—"}
                icon={MapPin}
              />
              <MetricCard
                label="Total properties"
                value={ownerSummary?.totalProperties ?? "—"}
                icon={Building2}
              />
              <MetricCard
                label="Completed contracts"
                value={ownerSummary?.completedContracts ?? "—"}
                icon={BadgeCheck}
              />
              <MetricCard
                label="Ongoing contracts"
                value={ownerSummary?.ongoingContracts ?? "—"}
                icon={CalendarClock}
              />
              <MetricCard
                label="Verification"
                value={ownerSummary?.verificationStatus || "Pending"}
                icon={ShieldCheck}
              />
            </div>
          </section>
        </aside>
      </div>

      {showRejectModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <ModalShell
            title={t("admin.property.reject_reason", "Reject submission")}
            copy="Leave a concise reason so the owner and operations team know what must be corrected before the asset returns to the queue."
          >
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              className="shell-input min-h-[140px] resize-none"
              placeholder={t(
                "admin.property.reject_reason_placeholder",
                "Add the review reason",
              )}
            />
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="inline-flex items-center justify-center rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
                ) : (
                  t("admin.property.confirm_reject", "Confirm rejection")
                )}
              </button>
            </div>
          </ModalShell>
        </div>
      ) : null}

      {showImageModal && currentImage?.url ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-6xl">
            <img
              src={currentImage.url}
              alt={property.title || "Property preview"}
              className="max-h-[90vh] max-w-full rounded-[28px] object-contain"
              style={getPropertyImageStyle(currentImage)}
            />
            <button
              type="button"
              onClick={() => setShowImageModal(false)}
              className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-black/40 text-white transition hover:bg-black/55"
            >
              <X className="h-4 w-4" strokeWidth={2.2} />
            </button>
            {galleryImages.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setCurrentImageIndex((current) =>
                      current === 0 ? galleryImages.length - 1 : current - 1,
                    );
                  }}
                  className="absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-black/40 text-white transition hover:bg-black/55"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setCurrentImageIndex((current) =>
                      current === galleryImages.length - 1 ? 0 : current + 1,
                    );
                  }}
                  className="absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-black/40 text-white transition hover:bg-black/55"
                >
                  <ChevronRight className="h-5 w-5" strokeWidth={2.2} />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {previewDocument?.url ? (
        <DocumentPreviewModal
          title={previewDocument.title}
          url={previewDocument.url}
          onClose={() => setPreviewDocument(null)}
        />
      ) : null}

      {showFlagModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <ModalShell
            title={t("admin.property.flag_title", "Flag asset")}
            copy="Record internal issues so the submission can be sent back with precise follow-up instructions."
          >
            <div className="flex gap-2">
              <input
                value={flagInput}
                onChange={(event) => setFlagInput(event.target.value)}
                className="shell-input"
                placeholder={t(
                  "admin.property.flag_placeholder",
                  "Add a flagged issue",
                )}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addFlagLocal();
                  }
                }}
              />
              <button
                type="button"
                onClick={addFlagLocal}
                className="inline-flex items-center justify-center rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
              >
                {t("admin.property.flag_add", "Add")}
              </button>
            </div>

            {flags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {flags.map((flag) => (
                  <span
                    key={flag}
                    className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                  >
                    {flag}
                    <button
                      type="button"
                      onClick={() => removeFlagLocal(flag)}
                      className="transition hover:opacity-70"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowFlagModal(false)}
                className="inline-flex items-center justify-center rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                onClick={handleAddFlags}
                disabled={processing}
                className="inline-flex items-center justify-center rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {processing
                  ? t("common.loading", "Loading")
                  : t("admin.property.flag_submit", "Submit flags")}
              </button>
            </div>
          </ModalShell>
        </div>
      ) : null}

      {showApproveModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <ModalShell
            title={t(
              "admin.property.approve_with_note_title",
              "Approve with review note",
            )}
            copy={t(
              "admin.property.approve_with_note_hint",
              "Add optional internal context before the asset moves into the investor-facing marketplace.",
            )}
          >
            <textarea
              value={approveNote}
              onChange={(event) => setApproveNote(event.target.value)}
              className="shell-input min-h-[120px] resize-none"
              placeholder={t(
                "admin.property.approve_note_placeholder",
                "Optional review note",
              )}
            />
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowApproveModal(false);
                  setApproveNote("");
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                onClick={submitApprove}
                disabled={processing}
                className="inline-flex items-center justify-center rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark disabled:cursor-not-allowed disabled:opacity-40 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
                ) : (
                  t("admin.property.confirm_approval", "Confirm approval")
                )}
              </button>
            </div>
          </ModalShell>
        </div>
      ) : null}

      <OfficialDataCheckModal
        open={showOfficialDataModal}
        onClose={() => {
          setShowOfficialDataModal(false);
          setOfficialDataLoading(false);
          setOfficialDataError("");
          setOfficialDataResult(null);
        }}
        loading={officialDataLoading}
        error={officialDataError}
        data={officialDataResult}
        t={t}
      />
    </div>
  );
};

export default AdminPropertyDetail;
