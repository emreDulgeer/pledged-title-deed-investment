// src/views/investor/InvestorInvestmentsList.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InvestmentController from "../../controllers/investmentController";
import { useTranslation } from "react-i18next";

const InvestorInvestmentsList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });
  const [filters, setFilters] = useState({
    status: "",
    sortBy: "-createdAt",
    page: 1,
    limit: 10,
  });

  useEffect(() => {
    loadInvestments();
  }, [filters]);

  const loadInvestments = async () => {
    try {
      setLoading(true);
      const response = await InvestmentController.getMyInvestments(filters);

      if (response.success) {
        setInvestments(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      }
    } catch (error) {
      console.error("Yatırım listesi yükleme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Filtre değişince sayfa 1'e dön
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
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

  const getProgressPercentage = (investment) => {
    if (!investment.rentalPaymentsSummary) return 0;
    const { totalPayments, paidPayments } = investment.rentalPaymentsSummary;
    return totalPayments > 0
      ? Math.round((paidPayments / totalPayments) * 100)
      : 0;
  };

  if (loading && investments.length === 0) {
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("investor.myInvestments")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t("investor.totalInvestments")}: {pagination.totalItems}
          </p>
        </div>
        <button
          onClick={() => navigate("/properties")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + {t("investor.newInvestment")}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("investor.status")}
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">{t("investor.allStatuses")}</option>
              <option value="offer_sent">{t("investor.offer_sent")}</option>
              <option value="contract_signed">
                {t("investor.contract_signed")}
              </option>
              <option value="title_deed_pending">
                {t("investor.title_deed_pending")}
              </option>
              <option value="active">{t("investor.active")}</option>
              <option value="completed">{t("investor.completed")}</option>
              <option value="defaulted">{t("investor.defaulted")}</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("investor.sortBy")}
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="-createdAt">{t("investor.newestFirst")}</option>
              <option value="createdAt">{t("investor.oldestFirst")}</option>
              <option value="-amountInvested">{t("investor.highestAmount")}</option>
              <option value="amountInvested">{t("investor.lowestAmount")}</option>
            </select>
          </div>

          {/* Items Per Page */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("investor.itemsPerPage")}
            </label>
            <select
              value={filters.limit}
              onChange={(e) =>
                handleFilterChange("limit", parseInt(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Investments List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {investments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t("investor.noInvestmentsFound")}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t("investor.startInvestingToSeeResults")}
            </p>
            <button
              onClick={() => navigate("/properties")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t("investor.browseProperties")}
            </button>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("investor.property")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("investor.investmentAmount")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("investor.status")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("investor.rentalProgress")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("investor.totalEarned")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {investments.map((investment) => (
                    <tr
                      key={investment.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {investment.property?.thumbnail && (
                            <img
                              src={investment.property.thumbnail}
                              alt={investment.property.city}
                              className="w-16 h-16 rounded-lg object-cover mr-4"
                            />
                          )}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {investment.property?.city},{" "}
                              {investment.property?.country}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {investment.property?.propertyType}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {investment.amountInvested.toLocaleString()}{" "}
                          {investment.currency}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(investment.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(investment.status)}`}
                        >
                          {t(`investor.${investment.status}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {investment.rentalPaymentsSummary && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {investment.rentalPaymentsSummary.paidPayments}/
                                {investment.rentalPaymentsSummary.totalPayments}
                              </span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {getProgressPercentage(investment)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${getProgressPercentage(investment)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          {investment.rentalPaymentsSummary?.totalPaidAmount?.toLocaleString() ||
                            0}{" "}
                          ₺
                        </p>
                        {investment.expectedTotalIncome && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            / {investment.expectedTotalIncome.toLocaleString()}{" "}
                            ₺
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            navigate(`/investor/investments/${investment.id}`)
                          }
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        >
                          {t("investor.viewDetails")} →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {investments.map((investment) => (
                <div
                  key={investment.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() =>
                    navigate(`/investor/investments/${investment.id}`)
                  }
                >
                  <div className="flex items-start space-x-3 mb-3">
                    {investment.property?.thumbnail && (
                      <img
                        src={investment.property.thumbnail}
                        alt={investment.property.city}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {investment.property?.city},{" "}
                        {investment.property?.country}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {investment.property?.propertyType}
                      </p>
                      <span
                        className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(investment.status)}`}
                      >
                        {t(`investor.${investment.status}`)}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        {t("investor.invested")}
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {investment.amountInvested.toLocaleString()}{" "}
                        {investment.currency}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        {t("investor.earned")}
                      </p>
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        {investment.rentalPaymentsSummary?.totalPaidAmount?.toLocaleString() ||
                          0}{" "}
                        ₺
                      </p>
                    </div>
                  </div>
                  {investment.rentalPaymentsSummary && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {t("investor.progress")}
                        </span>
                        <span className="text-xs font-medium text-gray-900 dark:text-white">
                          {investment.rentalPaymentsSummary.paidPayments}/
                          {investment.rentalPaymentsSummary.totalPayments}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${getProgressPercentage(investment)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {t("investor.showing")}{" "}
                    <span className="font-medium">
                      {(pagination.currentPage - 1) * pagination.itemsPerPage +
                        1}
                    </span>{" "}
                    -
                    <span className="font-medium">
                      {" "}
                      {Math.min(
                        pagination.currentPage * pagination.itemsPerPage,
                        pagination.totalItems,
                      )}
                    </span>{" "}
                    {t("investor.of")}
                    <span className="font-medium">
                      {" "}
                      {pagination.totalItems}
                    </span>{" "}
                    {t("investor.results")}
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() =>
                        handlePageChange(pagination.currentPage - 1)
                      }
                      disabled={!pagination.hasPrev}
                      className={`px-3 py-1 rounded ${
                        pagination.hasPrev
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {t("investor.previous")}
                    </button>
                    <span className="px-3 py-1 text-gray-700 dark:text-gray-300">
                      {pagination.currentPage} / {pagination.totalPages}
                    </span>
                    <button
                      onClick={() =>
                        handlePageChange(pagination.currentPage + 1)
                      }
                      disabled={!pagination.hasNext}
                      className={`px-3 py-1 rounded ${
                        pagination.hasNext
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {t("investor.next")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InvestorInvestmentsList;
