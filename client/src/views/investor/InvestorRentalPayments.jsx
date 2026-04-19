// src/views/investor/InvestorRentalPayments.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InvestmentController from "../../controllers/investmentController";
import { useTranslation } from "react-i18next";
import {
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";

const InvestorRentalPayments = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });
  const [filters, setFilters] = useState({
    status: "",
    investmentId: "",
    sortBy: "-month",
    page: 1,
    limit: 20,
  });
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalPending: 0,
    totalDelayed: 0,
    thisMonth: 0,
  });

  useEffect(() => {
    loadPayments();
  }, [filters]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response =
        await InvestmentController.getInvestorRentalPayments(filters);

      if (response.success) {
        setPayments(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
        calculateStats(response.data);
      }
    } catch (error) {
      console.error("Kira ödemeleri yükleme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentsData) => {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const totalPaid = paymentsData
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalPending = paymentsData
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalDelayed = paymentsData
      .filter((p) => p.status === "delayed")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const thisMonth = paymentsData
      .filter((p) => p.month === currentMonth && p.status === "paid")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    setStats({
      totalPaid,
      totalPending,
      totalDelayed,
      thisMonth,
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
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
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      delayed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const groupPaymentsByInvestment = (paymentsData) => {
    const grouped = {};
    paymentsData.forEach((payment) => {
      const key = payment.investment?.id || "unknown";
      if (!grouped[key]) {
        grouped[key] = {
          investment: payment.investment,
          payments: [],
        };
      }
      grouped[key].payments.push(payment);
    });
    return Object.values(grouped);
  };

  if (loading && payments.length === 0) {
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

  const groupedPayments = groupPaymentsByInvestment(payments);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("investor.rentalPayments")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t("investor.trackYourRentalIncome")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("investor.totalPaid")}
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.totalPaid.toLocaleString()} ₺
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("investor.pending")}
              </p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.totalPending.toLocaleString()} ₺
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("investor.delayed")}
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.totalDelayed.toLocaleString()} ₺
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("investor.thisMonth")}
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.thisMonth.toLocaleString()} ₺
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <span className="text-2xl">📅</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <option value="pending">{t("investor.pending")}</option>
              <option value="paid">{t("investor.paid")}</option>
              <option value="delayed">{t("investor.delayed")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("investor.sortBy")}
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="-month">{t("investor.newestMonth")}</option>
              <option value="month">{t("investor.oldestMonth")}</option>
              <option value="-amount">{t("investor.highestAmount")}</option>
              <option value="amount">{t("investor.lowestAmount")}</option>
            </select>
          </div>

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
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="space-y-6">
        {groupedPayments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t("investor.noPaymentsFound")}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t("investor.paymentsWillAppearHere")}
            </p>
            <button
              onClick={() => navigate("/investor/investments")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t("investor.viewInvestments")}
            </button>
          </div>
        ) : (
          groupedPayments.map((group) => (
            <div
              key={group.investment?.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow"
            >
              {/* Investment Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {group.investment?.property?.thumbnail && (
                      <img
                        src={getPropertyImageUrl(group.investment.property.thumbnail)}
                        alt={group.investment.property.city}
                        className="w-12 h-12 rounded-lg object-cover"
                        style={getPropertyImageStyle(
                          group.investment.property.thumbnail,
                        )}
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {group.investment?.property?.city},{" "}
                        {group.investment?.property?.country}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {group.investment?.property?.propertyType}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      navigate(`/investor/investments/${group.investment?.id}`)
                    }
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium"
                  >
                    {t("investor.viewInvestment")} →
                  </button>
                </div>
              </div>

              {/* Payments Table */}
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t("investor.receipt")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {group.payments.map((payment, index) => (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-6 py-4 text-gray-900 dark:text-white">
                          {payment.month}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {payment.amount?.toLocaleString()} ₺
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}
                          >
                            {t(`investor.${payment.status}`)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">
                          {payment.paidAt
                            ? new Date(payment.paidAt).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4">
                          {payment.receipt ? (
                            <button
                              onClick={() =>
                                window.open(payment.receipt, "_blank")
                              }
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm"
                            >
                              {t("common.view")}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t("investor.showing")}{" "}
              <span className="font-medium">
                {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}
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
              <span className="font-medium"> {pagination.totalItems}</span>{" "}
              {t("investor.results")}
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrev}
                className={`px-3 py-1 rounded ${
                  pagination.hasPrev
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700"
                }`}
              >
                {t("investor.previous")}
              </button>
              <span className="px-3 py-1 text-gray-700 dark:text-gray-300">
                {pagination.currentPage} / {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNext}
                className={`px-3 py-1 rounded ${
                  pagination.hasNext
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700"
                }`}
              >
                {t("investor.next")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorRentalPayments;
