// InvestorDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InvestmentController from "../../controllers/investmentController";
import PropertyController from "../../controllers/propertyController";
import { useTranslation } from "react-i18next";
import StatsCard from "../../components/common/SimpleStatsCard";
import {
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";

const InvestorDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInvestments: 0,
    activeInvestments: 0,
    totalInvested: 0,
    monthlyIncome: 0,
    totalEarnings: 0,
  });
  const [recentInvestments, setRecentInvestments] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Yatırımları getir
      const investmentsRes = await InvestmentController.getMyInvestments({
        page: 1,
        limit: 5,
        sort: "-createdAt",
      });

      if (investmentsRes.success) {
        setRecentInvestments(investmentsRes.data);

        // İstatistikleri hesapla
        calculateStats(investmentsRes.data);
      }

      // Yaklaşan ödemeleri getir
      const paymentsRes = await InvestmentController.getInvestorRentalPayments({
        page: 1,
        limit: 5,
        status: "pending",
        sort: "month",
      });

      if (paymentsRes.success) {
        setUpcomingPayments(paymentsRes.data);
      }
    } catch (error) {
      console.error("Dashboard veri yükleme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (investments) => {
    const active = investments.filter((inv) => inv.status === "active");
    const totalInvested = investments.reduce(
      (sum, inv) => sum + inv.amountInvested,
      0,
    );
    const totalEarnings = investments.reduce((sum, inv) => {
      const paid = inv.rentalPaymentsSummary?.paid || 0;
      return sum + paid;
    }, 0);

    setStats({
      totalInvestments: investments.length,
      activeInvestments: active.length,
      totalInvested,
      monthlyIncome: active.reduce(
        (sum, inv) => sum + (inv.property?.rentOffered || 0),
        0,
      ),
      totalEarnings,
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      offer_sent: "bg-blue-100 text-blue-800",
      contract_signed: "bg-orange-100 text-orange-800",
      title_deed_pending: "bg-yellow-100 text-yellow-800",
      active: "bg-green-100 text-green-800",
      completed: "bg-gray-100 text-gray-800",
      defaulted: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t("investor.loading")}...</p>
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
            {t("investor.investorDashboard")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t("investor.welcomeBack")}, {t("investor.manageYourInvestments")}
          </p>
        </div>
        <button
          onClick={() => navigate("/properties")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t("investor.browseProperties")}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          t={t}
          title={t("investor.totalInvestments")}
          value={stats.totalInvestments}
          icon="📊"
          color="blue"
        />
        <StatsCard
          t={t}
          title={t("investor.activeInvestments")}
          value={stats.activeInvestments}
          icon="✅"
          color="green"
        />
        <StatsCard
          t={t}
          title={t("investor.totalInvested")}
          value={`${stats.totalInvested.toLocaleString()} ₺`}
          icon="💰"
          color="purple"
        />
        <StatsCard
          t={t}
          title={t("investor.monthlyIncome")}
          value={`${stats.monthlyIncome.toLocaleString()} ₺`}
          icon="📈"
          color="emerald"
        />
        <StatsCard
          t={t}
          title={t("investor.totalEarnings")}
          value={`${stats.totalEarnings.toLocaleString()} ₺`}
          icon="💎"
          color="amber"
        />
      </div>

      {/* Recent Investments */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("investor.recentInvestments")}
          </h2>
          <button
            onClick={() => navigate("/investor/investments")}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {t("investor.viewAll")} →
          </button>
        </div>

        {recentInvestments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {t("investor.noInvestmentsYet")}
            </p>
            <button
              onClick={() => navigate("/properties")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t("investor.startInvesting")}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t("investor.property")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t("investor.amount")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t("investor.status")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t("investor.monthlyRent")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentInvestments.map((investment) => (
                  <tr
                    key={investment.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        {investment.property?.thumbnail && (
                          <img
                            src={getPropertyImageUrl(investment.property.thumbnail)}
                            alt={investment.property.city}
                            className="w-12 h-12 rounded-lg object-cover mr-3"
                            style={getPropertyImageStyle(
                              investment.property.thumbnail,
                            )}
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
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {investment.amountInvested.toLocaleString()}{" "}
                        {investment.currency}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(investment.status)}`}
                      >
                        {t(`investor.${investment.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-gray-900 dark:text-white">
                        {investment.property?.rentOffered?.toLocaleString() ||
                          0}{" "}
                        ₺
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() =>
                          navigate(`/investor/investments/${investment.id}`)
                        }
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        {t("investor.viewDetails")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upcoming Payments */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("investor.upcomingPayments")}
          </h2>
          <button
            onClick={() => navigate("/investor/rental-payments")}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {t("investor.viewAll")} →
          </button>
        </div>

        {upcomingPayments.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            {t("investor.noUpcomingPayments")}
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingPayments.map((payment, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {payment.property?.city}, {payment.property?.country}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {payment.month}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {payment.amount?.toLocaleString()} ₺
                  </p>
                  <span className="text-xs text-yellow-600">
                    {t("investor.pending")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestorDashboard;
