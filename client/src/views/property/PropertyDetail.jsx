// src/views/property/PropertyDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import bridge from "../../controllers/bridge";

// parçalanmış komponentler
import {
  HeaderBar,
  ActionButtons,
  ImageGallery,
  PropertySummary,
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

const PropertyDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

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

  // Flags
  const [rejectReason, setRejectReason] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [newFlag, setNewFlag] = useState("");
  const [flags, setFlags] = useState([]);

  // fetch
  useEffect(() => {
    fetchPropertyDetails();
  }, [id]);

  const fetchPropertyDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bridge.properties.getMyPropertyById(id);
      if (res?.success && res.data) {
        setProperty(res.data);
        setFlags(res.data.metadata?.flaggedIssues || []);
      } else {
        throw new Error(t("property.detail.fetch_error"));
      }
    } catch (err) {
      console.error(err);
      setError(err.message || t("property.detail.fetch_error"));
      if (err.statusCode === 401 || err.statusCode === 403) {
        navigate(isAdmin ? "/admin/dashboard" : "/owner/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

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
        alert(t("property.detail.approve_success"));
        await fetchPropertyDetails();
        setShowApproveModal(false);
        setApproveNote("");
      }
    } catch {
      alert(t("property.detail.approve_error"));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert(t("property.detail.reject_reason_required"));
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
        alert(t("property.detail.reject_success"));
        await fetchPropertyDetails();
        setShowRejectModal(false);
        setRejectReason("");
      }
    } catch {
      alert(t("property.detail.reject_error"));
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    setProcessing(true);
    try {
      const res = await bridge.properties.delete(property.id);
      if (res?.success) {
        alert(t("property.detail.delete_success"));
        navigate(isAdmin ? "/admin/dashboard" : "/owner/dashboard");
      }
    } catch {
      alert(t("property.detail.delete_error"));
    } finally {
      setProcessing(false);
    }
  };

  const saveFlagsToBackend = async () => {
    if (flags.length === 0) {
      alert(t("property.detail.flag_validation_required"));
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
        alert(t("property.detail.flag_success"));
        await fetchPropertyDetails();
        setShowFlagModal(false);
      }
    } catch {
      alert(t("property.detail.flag_error"));
    } finally {
      setProcessing(false);
    }
  };

  // UI states
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t("common.loading")}</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-md w-full">
          <h2 className="text-xl font-semibold">{t("common.error")}</h2>
          <p className="mt-2">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            {t("common.back")}
          </button>
        </div>
      </div>
    );

  if (!property)
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-md w-full">
          <h2 className="text-xl font-semibold">
            {t("property.detail.not_found")}
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            {t("common.back")}
          </button>
        </div>
      </div>
    );

  const images = property.images || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <HeaderBar
        title={t("properties.property_details")}
        onBack={() => navigate(-1)}
      />
      <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-6">
          <ImageGallery
            images={images}
            status={property.status}
            onOpenModal={() => setShowImageModal(true)}
            currentIndex={currentImageIndex}
            setCurrentIndex={setCurrentImageIndex}
            t={t}
          />

          <PropertySummary property={property} t={t} />
          <FinancialInfo property={property} t={t} />

          {canEdit && property.metadata?.reviewNotes && (
            <AdminNotes notes={property.metadata.reviewNotes} t={t} />
          )}

          {canEdit && property.metadata?.flaggedIssues?.length > 0 && (
            <FlaggedIssues issues={property.metadata.flaggedIssues} t={t} />
          )}

          {property.documents?.length > 0 && (
            <DocumentsList documents={property.documents} t={t} />
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
          <OwnerCard owner={property.owner} t={t} />
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
