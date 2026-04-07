// src/views/investor/InvestorInvestmentDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import InvestmentController from "../../controllers/investmentController";
import { useTranslation } from "react-i18next";
import PropertySummary from "../../components/property/detail/PropertySummary";
import DocumentsList from "../../components/property/detail/DocumentsList";

const InvestorInvestmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [investment, setInvestment] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    if (id) {
      loadInvestmentDetails();
      loadDocuments();
    }
  }, [id]);

  const loadInvestmentDetails = async () => {
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
  };

  const loadDocuments = async () => {
    try {
      const response = await InvestmentController.getInvestmentDocuments(id);

      if (response.success) {
        setDocuments(response.data);
      }
    } catch (error) {
      console.error("Dökümanlar yükleme hatası:", error);
    }
  };

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
      } else {
        formData.append("type", type);
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

  const getStatusColor = (status) => {
    const colors = {
      offer_sent:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      contract_signed:
        "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      title_deed_pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      active:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      completed:
        "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
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
            onClick={() => navigate("/investor/investments")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t("investor.backToList")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/investor/investments")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            ← {t("investor.back")}
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("investor.investmentDetails")}
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
          {["overview", "property", "payments", "documents"].map((tab) => (
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {t("investor.investmentAmount")}
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {investment.amountInvested?.toLocaleString()}{" "}
                    {investment.currency}
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {t("investor.monthlyRent")}
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {investment.property?.rentOffered?.toLocaleString()} ₺
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {t("investor.totalExpectedReturn")}
                  </p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {investment.calculations?.totalExpectedIncome?.toLocaleString()}{" "}
                    ₺
                  </p>
                </div>
              </div>
            </div>

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
                            value.completed
                              ? "bg-green-500"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          {value.completed ? "✓" : "○"}
                        </div>
                        <div className="ml-4 flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {t(`investor.${key}`)}
                          </p>
                          {value.date && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(value.date).toLocaleDateString()}
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
            {investment.calculations && (
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
                      ₺
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
                {!investment.contractFile &&
                  investment.status === "offer_sent" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t("investor.uploadContract")}
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleDocumentUpload(e, "contract")}
                        disabled={uploadingDoc}
                        className="block w-full text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700"
                      />
                    </div>
                  )}

                {!investment.paymentReceipt &&
                  ["contract_signed", "title_deed_pending", "active"].includes(
                    investment.status,
                  ) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t("investor.uploadPaymentReceipt")}
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          handleDocumentUpload(e, "payment_receipt")
                        }
                        disabled={uploadingDoc}
                        className="block w-full text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700"
                      />
                    </div>
                  )}

                {!investment.localRepresentative &&
                  investment.status === "active" && (
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
          <PropertySummary property={investment.property} t={t} />
        )}

        {/* Payments Tab */}
        {activeTab === "payments" && (
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
                          {payment.amount?.toLocaleString()} ₺
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
              onDownload={handleDownloadDocument}
            />

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t("investor.uploadAdditionalDocument")}
              </h3>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
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

export default InvestorInvestmentDetail;
