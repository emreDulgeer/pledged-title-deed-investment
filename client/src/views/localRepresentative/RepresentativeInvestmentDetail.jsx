import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, Loader2, UploadCloud } from "lucide-react";

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

const RepresentativeInvestmentDetail = () => {
  const { id } = useParams();
  const user = useSelector(selectUser);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [investment, setInvestment] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [extraDocumentType, setExtraDocumentType] = useState("notary_document");

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

  const handleFileUpload = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      let response;
      if (type === "title_deed") {
        response = await InvestmentController.uploadTitleDeed(id, formData);
      } else {
        formData.append("documentType", extraDocumentType);
        response = await InvestmentController.uploadAdditionalDocument(id, formData);
      }

      if (response?.success) {
        await loadData();
        window.alert("Document uploaded successfully.");
      }
    } catch (error) {
      console.error("Representative document upload error:", error);
      window.alert(error.message || "Failed to upload document.");
    } finally {
      setUploading(false);
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
    } catch (error) {
      console.error("Representative document download error:", error);
    }
  };

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

  const canClaimRequest =
    investment.representativeRequest?.isPending &&
    !investment.localRepresentative;
  const canUploadTitleDeed =
    isAssignedRepresentative && investment.status === "contract_signed";
  const propertyPath = isAssignedRepresentative
    ? getInvestmentPropertyPath("local_representative", getUserId(investment.property))
    : null;
  const processEntries = Object.entries(investment.processTracking || {});

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
          <h1 className="mt-3 text-2xl font-bold text-day-text dark:text-night-text">
            {investment.property?.city}, {investment.property?.country}
          </h1>
          <p className="mt-2 text-sm text-day-text/60 dark:text-night-text/60">
            {investment.property?.fullAddress || "Address not provided"}
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
              "Claim This Request"
            )}
          </button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5">
          <p className="text-sm text-day-text/60 dark:text-night-text/60">
            Investment Amount
          </p>
          <p className="mt-2 text-2xl font-bold text-day-text dark:text-night-text">
            {investment.amountInvested?.toLocaleString()} {APP_CURRENCY}
          </p>
        </div>
        <div className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5">
          <p className="text-sm text-day-text/60 dark:text-night-text/60">
            Case Status
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-500">
            {investment.status}
          </p>
        </div>
        <div className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5">
          <p className="text-sm text-day-text/60 dark:text-night-text/60">
            Request Region
          </p>
          <p className="mt-2 text-2xl font-bold text-sky-500">
            {investment.representativeRequest?.region || "-"}
          </p>
        </div>
        <div className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5">
          <p className="text-sm text-day-text/60 dark:text-night-text/60">
            Requested On
          </p>
          <p className="mt-2 text-2xl font-bold text-day-text dark:text-night-text">
            {formatDate(investment.representativeRequest?.requestDate)}
          </p>
        </div>
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
            Representative Request
          </h2>
          <div className="mt-3 space-y-2 text-sm text-day-text dark:text-night-text">
            <p>
              Status:{" "}
              <span className="font-medium">
                {investment.representativeRequest?.status || "-"}
              </span>
            </p>
            <p>
              Requested by role:{" "}
              <span className="font-medium capitalize">
                {String(
                  investment.representativeRequest?.requestedByRole || "-",
                ).replace("_", " ")}
              </span>
            </p>
            <p>
              Claimed at:{" "}
              <span className="font-medium">
                {formatDate(investment.representativeRequest?.claimedAt)}
              </span>
            </p>
          </div>
        </section>
      </div>

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
          Documents and Actions
        </h2>

        {isAssignedRepresentative && (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-day-border dark:border-night-border p-4">
              <p className="text-sm font-medium text-day-text dark:text-night-text">
                Upload Title Deed
              </p>
              <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
                Use this after contract signing and payment confirmation.
              </p>
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">
                <UploadCloud className="h-4 w-4" />
                {uploading ? "Uploading..." : "Select file"}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => handleFileUpload(event, "title_deed")}
                  className="hidden"
                  disabled={uploading || !canUploadTitleDeed}
                />
              </label>
              {!canUploadTitleDeed && (
                <p className="mt-3 text-xs text-amber-600 dark:text-amber-300">
                  Title deed upload becomes available once the case is claimed and
                  remains in the contract stage.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-day-border dark:border-night-border p-4">
              <p className="text-sm font-medium text-day-text dark:text-night-text">
                Upload Supporting Document
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <select
                  value={extraDocumentType}
                  onChange={(event) => setExtraDocumentType(event.target.value)}
                  className="rounded-xl border border-day-border dark:border-night-border bg-transparent px-4 py-3 text-sm text-day-text dark:text-night-text"
                >
                  <option value="notary_document">Notary Document</option>
                  <option value="power_of_attorney">Power of Attorney</option>
                  <option value="tax_receipt">Tax Receipt</option>
                  <option value="other">Other</option>
                </select>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-day-border px-4 py-2 text-sm font-medium text-day-text hover:bg-day-border/10 dark:border-night-border dark:text-night-text dark:hover:bg-night-border/10">
                  <UploadCloud className="h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload document"}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) => handleFileUpload(event, "additional")}
                    className="hidden"
                    disabled={uploading || !isAssignedRepresentative}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <DocumentsList
            documents={documents}
            onDownload={handleDownloadDocument}
          />
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
    </div>
  );
};

export default RepresentativeInvestmentDetail;
