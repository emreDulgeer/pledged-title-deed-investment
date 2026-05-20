import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import InvestmentController from "../../controllers/investmentController";
import { useTranslation } from "react-i18next";
import DocumentsList from "../../components/property/detail/DocumentsList";
import InvestmentPropertyPanel from "../../components/investments/InvestmentPropertyPanel";
import { getUserId, getUserProfilePath } from "../../utils/profileRoutes";
import { getInvestmentPropertyPath } from "../../utils/profileRoutes";
import { APP_CURRENCY, APP_CURRENCY_SYMBOL } from "../../utils/currency";

const getStatusColor = (status) => {
  const colors = {
    offer_sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    contract_signed:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    title_deed_pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    completed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    refunded:
      "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    defaulted: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

const getPaymentStatusColor = (status) => {
  const colors = {
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    delayed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

const getPrincipalPaymentStatusColor = (status) => {
  const colors = {
    not_started:
      "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
    instructions_ready:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    receipt_uploaded:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    confirmed:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
  };
  return colors[status] || colors.not_started;
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

export const InvestmentDetailPage = ({ viewerRole = "investor" }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isOwnerView = viewerRole === "owner";

  const [loading, setLoading] = useState(true);
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

  const loadInvestmentDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await InvestmentController.getInvestmentById(id);

      if (response.success) {
        setInvestment(response.data);
      }
    } catch (error) {
      console.error("Yatırım detayı yükleme hatası:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadDocuments = useCallback(async () => {
    try {
      const response = await InvestmentController.getInvestmentDocuments(id);

      if (response.success) {
        setDocuments(response.data);
      }
    } catch (error) {
      console.error("Dökümanlar yükleme hatası:", error);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadInvestmentDetails();
      loadDocuments();
    }
  }, [id, loadDocuments, loadInvestmentDetails]);

  useEffect(() => {
    const availableMethods = investment?.paymentOptions || [];
    if (availableMethods.length === 0) {
      return;
    }

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
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append("file", file);

      let response;
      if (type === "contract") {
        response = await InvestmentController.uploadContract(id, formData);
      } else if (type === "payment_receipt") {
        response = await InvestmentController.uploadPaymentReceipt(
          id,
          formData,
        );
      } else if (type === "title_deed") {
        response = await InvestmentController.uploadTitleDeed(id, formData);
      } else {
        formData.append("documentType", type);
        response = await InvestmentController.uploadAdditionalDocument(
          id,
          formData,
        );
      }

      if (response.success) {
        await loadInvestmentDetails();
        await loadDocuments();
        alert(t("investor.documentUploadedSuccessfully"));
      }
    } catch (error) {
      console.error("Döküman yükleme hatası:", error);
      alert(error.message || t("investor.documentUploadFailed"));
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDownloadDocument = async (fileId, fileName) => {
    try {
      const response = await InvestmentController.downloadDocument(id, fileId);

      // Blob'u indirilebilir hale getir
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Döküman indirme hatası:", error);
      alert(t("investor.documentDownloadFailed"));
    }
  };

  const handleAcceptOffer = async () => {
    try {
      setActionLoading("accept");
      const response = await InvestmentController.acceptOffer(id);

      if (response.success) {
        await loadInvestmentDetails();
        alert("Offer accepted successfully");
      }
    } catch (error) {
      console.error("Offer accept error:", error);
      alert(error.message || "Failed to accept offer");
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

      if (response.success) {
        setShowRejectModal(false);
        setRejectReason("");
        alert("Offer rejected successfully");
        navigate("/owner/offers");
      }
    } catch (error) {
      console.error("Offer reject error:", error);
      alert(error.message || "Failed to reject offer");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestRepresentative = async () => {
    if (!confirm(t("investor.confirmRequestRepresentative"))) return;

    try {
      const response =
        await InvestmentController.requestLocalRepresentative(id);

      if (response.success) {
        await loadInvestmentDetails();
        alert(t("investor.representativeRequestedSuccessfully"));
      }
    } catch (error) {
      console.error("Temsilci talep hatası:", error);
      alert(error.message || t("investor.representativeRequestFailed"));
    }
  };

  const handlePreparePrincipalPayment = async () => {
    try {
      setActionLoading("prepare_payment");
      const response = await InvestmentController.preparePrincipalPayment(id, {
        method: selectedPaymentMethod,
      });

      if (response.success) {
        await loadInvestmentDetails();
        alert("Payment instructions are ready");
      }
    } catch (error) {
      console.error("Payment preparation error:", error);
      alert(error.message || "Failed to prepare payment instructions");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmPrincipalPayment = async () => {
    if (!confirm("Confirm that you received the principal payment?")) return;

    try {
      setActionLoading("confirm_payment");
      const response = await InvestmentController.confirmPrincipalPayment(id);

      if (response.success) {
        await loadInvestmentDetails();
        alert("Principal payment confirmed successfully");
      }
    } catch (error) {
      console.error("Payment confirmation error:", error);
      alert(error.message || "Failed to confirm principal payment");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReviewDocument = async (fileId, action) => {
    const note = String(reviewNotes[fileId] || "").trim();

    if (action === "request_changes" && !note) {
      alert("Please explain what should be corrected before re-upload.");
      return;
    }

    try {
      setReviewingFileId(fileId);
      const response = await InvestmentController.reviewDocument(id, fileId, {
        action,
        notes: note,
      });

      if (response.success) {
        await loadInvestmentDetails();
        await loadDocuments();
        setReviewNotes((current) => ({
          ...current,
          [fileId]: "",
        }));
        alert(
          action === "approve"
            ? "Document approved successfully."
            : "Re-upload requested successfully.",
        );
      }
    } catch (error) {
      console.error("Document review error:", error);
      alert(error.message || "Failed to update document review.");
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
  const isOfferStage = ["offer_sent", "rejected"].includes(
    investment?.status,
  );
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {t("investor.loading")}...
          </p>
        </div>
      </div>
    );
  }

  if (!investment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 text-xl">
            {t("investor.investmentNotFound")}
          </p>
          <button
            onClick={() => navigate(backPath)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t("investor.backToList")}
          </button>
        </div>
      </div>
    );
  }

  const counterparty = isOwnerView
    ? investment.investor
    : investment.propertyOwner;
  const counterpartyTitle = isOwnerView
    ? t("investments.investor_info") || "Investor Information"
    : "Property Owner";
  const counterpartyProfileLabel = isOwnerView
    ? "View investor profile"
    : "View profile";
  const title =
    (isOwnerView && investment.status === "offer_sent") ||
    (!isOwnerView && ["offer_sent", "rejected"].includes(investment.status))
      ? "Offer Details"
      : t("investor.investmentDetails");
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

  return (
    <div className="p-6 space-y-6">
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Reject Offer
            </h3>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Reason for rejection (optional)..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400/40"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading === "reject"}
                onClick={handleRejectOffer}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "reject" ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(backPath)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            ← {t("investor.back")}
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {investment.property?.city}, {investment.property?.country}
            </p>
          </div>
        </div>
        <span
          className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(investment.status)}`}
        >
          {t(`investor.${investment.status}`)}
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {t(`investor.${tab}`)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Investment Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t("investor.investmentSummary")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {t("investor.investmentAmount")}
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {investment.amountInvested?.toLocaleString()}{" "}
                    {APP_CURRENCY}
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Negotiated Monthly Rent
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {agreedMonthlyRent?.toLocaleString()}{" "}
                    {APP_CURRENCY_SYMBOL}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {t("investor.totalExpectedReturn")}
                  </p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {investment.calculations?.totalExpectedIncome?.toLocaleString()}{" "}
                    {APP_CURRENCY_SYMBOL}
                  </p>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Ownership Share
                  </p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {offerTerms.ownershipPercent
                      ? `${offerTerms.ownershipPercent}%`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                    Listing Terms
                  </p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    {investment.property?.requestedInvestment?.toLocaleString()}{" "}
                    {APP_CURRENCY} investment ·{" "}
                    {investment.property?.rentOffered?.toLocaleString()}{" "}
                    {APP_CURRENCY} rent
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                    Offer Terms
                  </p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    {investment.amountInvested?.toLocaleString()} {APP_CURRENCY}{" "}
                    investment · {agreedMonthlyRent?.toLocaleString()}{" "}
                    {APP_CURRENCY} rent ·{" "}
                    {offerTerms.annualYieldPercent
                      ? `${offerTerms.annualYieldPercent}% yield`
                      : "Yield n/a"}
                  </p>
                </div>
              </div>

              {offerTerms.message && (
                <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                    Offer Note
                  </p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    {offerTerms.message}
                  </p>
                </div>
              )}

              {investment.status === "rejected" &&
                investment.offerDecision?.rejectionReason && (
                  <div className="mt-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {investment.offerDecision.rejectionReason}
                    </p>
                  </div>
                )}
            </div>

            {counterparty && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {counterpartyTitle}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {counterparty.fullName || counterparty.email || "-"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {counterparty.country || counterparty.region || "-"}
                    </p>
                    {counterparty.email && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {counterparty.email}
                      </p>
                    )}
                    {isOwnerView &&
                      typeof counterparty.activeInvestmentCount === "number" && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Active investments: {counterparty.activeInvestmentCount}
                        </p>
                      )}
                  </div>
                  {getUserId(counterparty) && (
                    <Link
                      to={getUserProfilePath(getUserId(counterparty))}
                      className="inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      {counterpartyProfileLabel}
                    </Link>
                  )}
                </div>
              </div>
            )}

            {!isOfferStage && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Contract Status
                </h2>
                <div className="space-y-4">
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
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.label}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {entry?.uploadedAt
                              ? new Date(entry.uploadedAt).toLocaleString()
                              : "Waiting for upload"}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry?.fileId
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {entry?.fileId ? "Completed" : "Pending"}
                        </span>
                      </div>
                    );
                  })}

                  {contractFullySigned && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Fully signed on{" "}
                      {new Date(contractWorkflow.fullySignedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Principal Payment
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getPrincipalPaymentStatusColor(principalPaymentStatus)}`}
                  >
                    {PAYMENT_STATUS_LABELS[principalPaymentStatus] ||
                      principalPaymentStatus}
                  </span>
                </div>

                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">
                      Provider
                    </dt>
                    <dd className="text-gray-900 dark:text-white">
                      {principalPayment.providerLabel ||
                        investment.paymentProvider?.name ||
                        "Manual flow"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">
                      Method
                    </dt>
                    <dd className="text-gray-900 dark:text-white">
                      {principalPayment.method
                        ? principalPayment.method.replace(/_/g, " ")
                        : "Not selected"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">
                      Amount
                    </dt>
                    <dd className="text-gray-900 dark:text-white">
                      {(principalPayment.amount || investment.amountInvested)?.toLocaleString()}{" "}
                      {principalPayment.currency || APP_CURRENCY}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">
                      Reference
                    </dt>
                    <dd className="text-gray-900 dark:text-white">
                      {principalPayment.referenceCode || "Will be generated"}
                    </dd>
                  </div>
                </dl>

                {paymentInstructions && (
                  <div className="mt-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-3">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      {paymentInstructions.summary}
                    </p>
                    <dl className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-blue-700 dark:text-blue-300">
                          Recipient
                        </dt>
                        <dd className="text-blue-950 dark:text-blue-100">
                          {paymentInstructions.recipientName || "-"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-blue-700 dark:text-blue-300">
                          Bank
                        </dt>
                        <dd className="text-blue-950 dark:text-blue-100">
                          {paymentInstructions.bankName || "-"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-blue-700 dark:text-blue-300">
                          IBAN
                        </dt>
                        <dd className="text-blue-950 dark:text-blue-100 break-all">
                          {paymentInstructions.iban || "-"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-blue-700 dark:text-blue-300">
                          Transfer Note
                        </dt>
                        <dd className="text-blue-950 dark:text-blue-100">
                          {paymentInstructions.transferNote || "-"}
                        </dd>
                      </div>
                    </dl>

                    {paymentInstructions.steps?.length > 0 && (
                      <ol className="list-decimal list-inside text-sm text-blue-900 dark:text-blue-100 space-y-1">
                        {paymentInstructions.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>
              </div>
            )}

            {/* Progress Tracking */}
            {investment.processTracking && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t("investor.processTracking")}
                </h2>
                <div className="space-y-4">
                  {Object.entries(investment.processTracking).map(
                    ([key, value]) => (
                      <div key={key} className="flex items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            value.completed || value.active
                              ? "bg-green-500"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          {value.completed || value.active ? "✓" : "○"}
                        </div>
                        <div className="ml-4 flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {PROCESS_LABELS[key] || key}
                          </p>
                          {(value.date || value.startDate) && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(
                                value.date || value.startDate,
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Calculations */}
            {investment.calculations && hasRentalPayments && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t("investor.calculations")}
                </h2>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-b dark:border-gray-700 pb-4">
                    <dt className="text-sm text-gray-600 dark:text-gray-400">
                      {t("investor.totalPaid")}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                      {investment.calculations.totalPaidAmount?.toLocaleString()}{" "}
                      {APP_CURRENCY_SYMBOL}
                    </dd>
                  </div>
                  <div className="border-b dark:border-gray-700 pb-4">
                    <dt className="text-sm text-gray-600 dark:text-gray-400">
                      {t("investor.remainingPayments")}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                      {investment.calculations.remainingPayments}
                    </dd>
                  </div>
                  <div className="border-b dark:border-gray-700 pb-4">
                    <dt className="text-sm text-gray-600 dark:text-gray-400">
                      {t("investor.paymentProgress")}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                      {investment.calculations.paymentProgress}%
                    </dd>
                  </div>
                  <div className="border-b dark:border-gray-700 pb-4">
                    <dt className="text-sm text-gray-600 dark:text-gray-400">
                      {t("investor.contractEndDate")}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                      {investment.calculations.contractEndDate
                        ? new Date(
                            investment.calculations.contractEndDate,
                          ).toLocaleDateString()
                        : "-"}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t("common.actions")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isOwnerView && investment.status === "offer_sent" && (
                  <div className="md:col-span-2 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={actionLoading === "accept"}
                      onClick={handleAcceptOffer}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === "accept"
                        ? "Accepting..."
                        : "Accept Offer"}
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading === "reject"}
                      onClick={() => setShowRejectModal(true)}
                      className="px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
                    >
                      Reject Offer
                    </button>
                  </div>
                )}

                {canUploadContract && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {isOwnerView
                        ? "Upload owner-signed contract"
                        : t("investor.uploadContract")}
                    </label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleDocumentUpload(e, "contract")}
                      disabled={uploadingDoc}
                      className="block w-full text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                )}

                {viewerContractNeedsReupload && (
                  <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4 md:col-span-2">
                    <p className="text-sm text-rose-900 dark:text-rose-100">
                      The current signed contract needs to be uploaded again.
                      {viewerContractDocument?.reviewNotes
                        ? ` Note from reviewer: ${viewerContractDocument.reviewNotes}`
                        : ""}
                    </p>
                  </div>
                )}

                {investment.status === "contract_signed" &&
                  viewerHasSignedContract &&
                  !viewerContractNeedsReupload &&
                  !otherPartyHasSignedContract && (
                    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 md:col-span-2">
                      <p className="text-sm text-amber-900 dark:text-amber-100">
                        You uploaded your signed contract. Waiting for the other
                        party to upload theirs before the payment step opens.
                      </p>
                    </div>
                  )}

                {investment.status === "contract_signed" &&
                  viewerHasSignedContract &&
                  otherPartyHasSignedContract &&
                  !contractFullySigned && (
                    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 md:col-span-2">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        Signed contracts were uploaded. Waiting for the required
                        approvals before the payment step opens.
                      </p>
                    </div>
                  )}

                {canPreparePayment && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Prepare principal payment instructions
                    </label>
                    <select
                      value={selectedPaymentMethod}
                      onChange={(event) =>
                        setSelectedPaymentMethod(event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
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
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === "prepare_payment"
                        ? "Preparing..."
                        : paymentInstructions
                          ? "Refresh Instructions"
                          : "Get Instructions"}
                    </button>
                  </div>
                )}

                {canUploadPaymentReceipt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t("investor.uploadPaymentReceipt")}
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocumentUpload(e, "payment_receipt")}
                      disabled={uploadingDoc}
                      className="block w-full text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700"
                    />
                    {investment.paymentReceipt?.fileId && (
                      <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                        {paymentReceiptWaitingMessage}
                      </p>
                    )}
                  </div>
                )}

                {paymentReceiptNeedsReupload && !isOwnerView && (
                  <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4 md:col-span-2">
                    <p className="text-sm text-rose-900 dark:text-rose-100">
                      The uploaded payment receipt needs a corrected version.
                      {paymentReceiptDocument?.reviewNotes
                        ? ` Note from reviewer: ${paymentReceiptDocument.reviewNotes}`
                        : ""}
                    </p>
                  </div>
                )}

                {paymentReceiptNeedsReupload && isOwnerView && (
                  <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4 md:col-span-2">
                    <p className="text-sm text-rose-900 dark:text-rose-100">
                      The investor must upload a corrected payment receipt before
                      you can confirm the principal payment.
                      {paymentReceiptDocument?.reviewNotes
                        ? ` Note from reviewer: ${paymentReceiptDocument.reviewNotes}`
                        : ""}
                    </p>
                  </div>
                )}

                {reviewableDocuments.length > 0 && (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/20 p-4 md:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Approval Queue
                        </h3>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          Review the uploaded documents, then approve them or ask
                          for a corrected re-upload.
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                        {reviewableDocuments.length} pending
                      </span>
                    </div>

                    <div className="mt-4 space-y-4">
                      {reviewableDocuments.map((document) => {
                        const isReviewing = reviewingFileId === document.fileId;
                        return (
                          <div
                            key={document.fileId}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-4"
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {document.name}
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  {document.type.replaceAll("_", " ")} uploaded{" "}
                                  {document.uploadedAt
                                    ? new Date(document.uploadedAt).toLocaleDateString()
                                    : "-"}
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
                                  handleDownloadDocument(
                                    document.fileId,
                                    document.name,
                                  )
                                }
                                className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                Download
                              </button>
                            </div>

                            <textarea
                              value={reviewNotes[document.fileId] || ""}
                              onChange={(event) =>
                                setReviewNotes((current) => ({
                                  ...current,
                                  [document.fileId]: event.target.value,
                                }))
                              }
                              placeholder="Optional approval note or required re-upload details..."
                              className="mt-3 min-h-[88px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                            />

                            <div className="mt-3 flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  handleReviewDocument(document.fileId, "approve")
                                }
                                disabled={isReviewing}
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
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
                                onClick={() =>
                                  handleReviewDocument(
                                    document.fileId,
                                    "request_changes",
                                  )
                                }
                                disabled={isReviewing}
                                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
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
                )}

                {canConfirmPayment && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Investor payment is ready for manual confirmation.
                    </p>
                    <button
                      type="button"
                      disabled={actionLoading === "confirm_payment"}
                      onClick={handleConfirmPrincipalPayment}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === "confirm_payment"
                        ? "Confirming..."
                        : "Confirm Principal Payment"}
                    </button>
                  </div>
                )}

                {canUploadTitleDeed && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Upload Title Deed
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocumentUpload(e, "title_deed")}
                      disabled={uploadingDoc}
                      className="block w-full text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                )}

                {titleDeedNeedsReupload && isOwnerView && (
                  <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4 md:col-span-2">
                    <p className="text-sm text-rose-900 dark:text-rose-100">
                      The uploaded title deed needs a corrected version before
                      the rental period can start.
                      {titleDeedDocument?.reviewNotes
                        ? ` Note from reviewer: ${titleDeedDocument.reviewNotes}`
                        : ""}
                    </p>
                  </div>
                )}

                {isOwnerView && investment.status === "title_deed_pending" && (
                  <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 md:col-span-2">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      Title deed document uploaded. Waiting for the remaining
                      participant approvals before the rental period starts.
                    </p>
                  </div>
                )}

                {representativeRequestPending && (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-100 md:col-span-2">
                    Local representative request is pending for{" "}
                    {investment.representativeRequest?.region || "this region"}.
                  </div>
                )}

                {canRequestRepresentative && (
                  <button
                    onClick={handleRequestRepresentative}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t("investor.requestLocalRepresentative")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Property Tab */}
        {activeTab === "property" && investment.property && (
          <InvestmentPropertyPanel
            property={investment.property}
            owner={investment.propertyOwner || investment.property.owner}
            propertyPath={propertyPath}
            t={t}
          />
        )}

        {/* Payments Tab */}
        {activeTab === "payments" && showPaymentsTab && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t("investor.rentalPayments")}
              </h2>
            </div>
            {investment.rentalPayments &&
            investment.rentalPayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t("investor.month")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t("investor.amount")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t("investor.status")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t("investor.paidDate")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {investment.rentalPayments.map((payment, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">
                          {payment.month}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                          {payment.amount?.toLocaleString()}{" "}
                          {APP_CURRENCY_SYMBOL}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}
                          >
                            {t(`investor.${payment.status}`)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">
                          {payment.paidAt
                            ? new Date(payment.paidAt).toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                {t("investor.noPaymentsYet")}
              </div>
            )}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div className="space-y-4">
            <DocumentsList
              documents={documents}
              t={t}
              onDownload={handleDownloadDocument}
            />

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t("investor.uploadAdditionalDocument")}
              </h3>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleDocumentUpload(e, "other")}
                disabled={uploadingDoc}
                className="block w-full text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700"
              />
              {uploadingDoc && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t("investor.uploading")}...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const InvestorInvestmentDetail = () => (
  <InvestmentDetailPage viewerRole="investor" />
);

export default InvestorInvestmentDetail;
