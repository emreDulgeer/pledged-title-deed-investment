// src/views/property/PropertyDetail.jsx
import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { AlertCircle, Loader2 } from "lucide-react";
import bridge from "../../controllers/bridge";
import DocumentPreviewModal from "../../components/common/DocumentPreviewModal";
import { getUserId, getUserProfilePath } from "../../utils/profileRoutes";
import { useAppFeedback } from "../../utils/hooks/useAppFeedback";

// parçalanmış komponentler
import {
  HeaderBar,
  ActionButtons,
  ImageGallery,
  PropertySummary,
  LocationMap,
  FinancialInfo,
  AdminNotes,
  FlaggedIssues,
  DocumentsList,
  OwnerCard,
  StatsCard,
  PortfolioStats,
  ImageModal,
  ApproveModal,
  RejectModal,
  DeleteModal,
  FlagModal,
} from "../../components/property/detail";
import { resolveFileUrl } from "../../components/property/detail/_utils";

const PropertyDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const feedback = useAppFeedback();

  // Redux user
  const currentUser = useSelector((state) => state.auth.user);
  const isAdmin = currentUser?.role === "admin";

  // State
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState(null);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Modals
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);

  // Flags
  const [rejectReason, setRejectReason] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [newFlag, setNewFlag] = useState("");
  const [flags, setFlags] = useState([]);

  // fetch
  const fetchPropertyDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bridge.properties.getMyPropertyById(id);
      if (res?.success && res.data) {
        setProperty(res.data);
        setFlags(res.data.metadata?.flaggedIssues || []);
      } else {
        throw new Error(t("admin.property.fetch_error"));
      }
    } catch (err) {
      console.error(err);
      setError(err.message || t("admin.property.fetch_error"));
      if (err.statusCode === 401 || err.statusCode === 403) {
        navigate(isAdmin ? "/admin/dashboard" : "/owner/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin, navigate, t]);

  useEffect(() => {
    fetchPropertyDetails();
  }, [fetchPropertyDetails]);

  // permissions
  const isPropertyOwner = property?.owner?.id === currentUser?.id;
  const canEdit = isAdmin || isPropertyOwner;

  // actions
  const handleApprove = async () => {
    setProcessing(true);
    try {
      const res = await bridge.properties.updateStatus(
        property.id,
        "published",
        approveNote || null
      );
      if (res?.success) {
        feedback.success(t("admin.property.approve_success"));
        await fetchPropertyDetails();
        setShowApproveModal(false);
        setApproveNote("");
      }
    } catch {
      feedback.error(t("admin.property.approve_error"));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      feedback.warning(t("admin.property.reject_reason_required"));
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
        feedback.success(t("admin.property.reject_success"));
        await fetchPropertyDetails();
        setShowRejectModal(false);
        setRejectReason("");
      }
    } catch {
      feedback.error(t("admin.property.reject_error"));
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    setProcessing(true);
    try {
      const res = await bridge.properties.delete(property.id);
      if (res?.success) {
        feedback.success(t("admin.property.delete_success"));
        navigate(isAdmin ? "/admin/dashboard" : "/owner/dashboard");
      }
    } catch {
      feedback.error(t("admin.property.delete_error"));
    } finally {
      setProcessing(false);
    }
  };

  const saveFlagsToBackend = async () => {
    if (flags.length === 0) {
      feedback.warning(t("admin.property.flag_validation_required"));
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
        feedback.success(t("admin.property.flag_success"));
        await fetchPropertyDetails();
        setShowFlagModal(false);
      }
    } catch {
      feedback.error(t("admin.property.flag_error"));
    } finally {
      setProcessing(false);
    }
  };

  const getDocumentFileId = (document) => {
    if (!document) return "";

    const rawId =
      document.fileId?._id ||
      document.fileId?.id ||
      document.fileId ||
      document.id ||
      document._id;

    return rawId ? String(rawId) : "";
  };

  const handleDownloadDocument = (fileId, fileName) => {
    if (!fileId) {
      return;
    }

    try {
      const downloadUrl = bridge.files.getDownloadUrl(fileId);

      if (!downloadUrl) {
        throw new Error("Download URL could not be created");
      }

      bridge.files.triggerBrowserDownload(downloadUrl, fileName);
    } catch (downloadError) {
      console.error("Property document download error:", downloadError);
      feedback.error(t("common.error"));
    }
  };

  const handlePreviewDocument = (previewUrl, fileName = "Document preview") => {
    if (!previewUrl) {
      return;
    }

    setPreviewDocument({
      url: previewUrl,
      title: fileName,
    });
  };

  // UI states
  if (loading)
    return (
      <div className="grid min-h-[60vh] place-items-center bg-day-background p-4 dark:bg-night-background">
        <div className="shell-surface px-8 py-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-day-primary dark:text-night-primary" />
          <p className="mt-4 text-sm text-day-muted dark:text-night-muted">
            {t("common.loading")}
          </p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="grid min-h-[60vh] place-items-center bg-day-background p-4 dark:bg-night-background">
        <div className="shell-surface w-full max-w-xl px-8 py-8">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-200">
              <AlertCircle className="h-6 w-6" strokeWidth={2.1} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-day-text dark:text-night-text">
                {t("common.error")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                {error}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-day-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-night-primary dark:text-night-background"
          >
            {t("common.back")}
          </button>
        </div>
      </div>
    );

  if (!property)
    return (
      <div className="grid min-h-[60vh] place-items-center bg-day-background p-4 dark:bg-night-background">
        <div className="shell-surface w-full max-w-xl px-8 py-8">
          <h2 className="text-2xl font-semibold text-day-text dark:text-night-text">
            {t("admin.property.not_found")}
          </h2>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-day-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-night-primary dark:text-night-background"
          >
            {t("common.back")}
          </button>
        </div>
      </div>
    );

  const images = property.images || [];
  const ownerProfilePath = getUserProfilePath(getUserId(property.owner));

  return (
    <div className="min-h-screen bg-day-background dark:bg-night-background">
      <HeaderBar title={t("properties.property_details")} onBack={() => navigate(-1)} />
      <div className="mx-auto grid max-w-shell grid-cols-1 gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1.4fr)_360px] xl:px-8">
        {/* Left */}
        <div className="space-y-6">
          <ImageGallery
            images={images}
            status={property.status}
            onOpenModal={() => setShowImageModal(true)}
            currentIndex={currentImageIndex}
            setCurrentIndex={setCurrentImageIndex}
            t={t}
          />

          <PropertySummary property={property} t={t} />
          <LocationMap property={property} t={t} />
          <FinancialInfo property={property} t={t} />

          {canEdit && property.metadata?.reviewNotes && (
            <AdminNotes notes={property.metadata.reviewNotes} t={t} />
          )}

          {canEdit && property.metadata?.flaggedIssues?.length > 0 && (
            <FlaggedIssues issues={property.metadata.flaggedIssues} t={t} />
          )}

          {property.documents?.length > 0 && (
            <DocumentsList
              documents={(property.documents || []).map((document) => ({
                ...document,
                fileId: getDocumentFileId(document),
                name:
                  document.fileName ||
                  document.name ||
                  document.originalName ||
                  document.fileId?.originalName,
                previewUrl:
                  bridge.files.getPreviewUrl(getDocumentFileId(document)) ||
                  resolveFileUrl(document.url || document.path || ""),
              }))}
              onDownload={handleDownloadDocument}
              onPreview={(previewUrl, document) =>
                handlePreviewDocument(
                  previewUrl,
                  document?.name || document?.fileName || "Document preview",
                )
              }
              t={t}
            />
          )}
        </div>

        {/* Right */}
        <div className="space-y-6">
          <ActionButtons
            canEdit={canEdit}
            isAdmin={isAdmin}
            isOwner={isPropertyOwner}
            propertyId={property.id}
            status={property.status}
            onEdit={() => navigate(`/owner/properties/edit/${property.id}`)}
            onOpenApprove={() => setShowApproveModal(true)}
            onOpenReject={() => setShowRejectModal(true)}
            onOpenFlag={() => setShowFlagModal(true)}
            onOpenDelete={() => setShowDeleteModal(true)}
            t={t}
          />
          <OwnerCard owner={property.owner} profilePath={ownerProfilePath} t={t} />
          <StatsCard
            metadata={property.metadata}
            createdAt={property.createdAt}
            updatedAt={property.updatedAt}
            t={t}
          />
          <PortfolioStats owner={property.owner} t={t} />
        </div>
      </div>

      {/* Modals */}
      {showImageModal && (
        <ImageModal
          images={images}
          currentIndex={currentImageIndex}
          setCurrentIndex={setCurrentImageIndex}
          onClose={() => setShowImageModal(false)}
        />
      )}

      {previewDocument?.url ? (
        <DocumentPreviewModal
          title={previewDocument.title}
          url={previewDocument.url}
          onClose={() => setPreviewDocument(null)}
        />
      ) : null}

      {showApproveModal && (
        <ApproveModal
          note={approveNote}
          setNote={setApproveNote}
          onConfirm={handleApprove}
          onClose={() => {
            setShowApproveModal(false);
            setApproveNote("");
          }}
          processing={processing}
          t={t}
        />
      )}

      {showRejectModal && (
        <RejectModal
          reason={rejectReason}
          setReason={setRejectReason}
          onConfirm={handleReject}
          onClose={() => {
            setShowRejectModal(false);
            setRejectReason("");
          }}
          processing={processing}
          t={t}
        />
      )}

      {showDeleteModal && (
        <DeleteModal
          onConfirm={handleDelete}
          onClose={() => setShowDeleteModal(false)}
          processing={processing}
          t={t}
        />
      )}

      {showFlagModal && (
        <FlagModal
          flags={flags}
          setFlags={setFlags}
          newFlag={newFlag}
          setNewFlag={setNewFlag}
          onSave={saveFlagsToBackend}
          onClose={() => {
            setShowFlagModal(false);
            setNewFlag("");
            setFlags(property.metadata?.flaggedIssues || []);
          }}
          processing={processing}
          t={t}
        />
      )}
    </div>
  );
};

export default PropertyDetail;
