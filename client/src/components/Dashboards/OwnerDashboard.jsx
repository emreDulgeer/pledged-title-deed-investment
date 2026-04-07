// src/components/Dashboards/OwnerDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { selectUser } from "../../store/slices/authSlice";
import bridge from "../../controllers/bridge";

// ── Sabit yardımcılar ─────────────────────────────────────────────────────────

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  published:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  in_contract:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  sold: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  suspended: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  archived:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
};

const PAYMENT_STATUS_COLORS = {
  pending: "text-yellow-600 dark:text-yellow-400",
  paid: "text-green-600 dark:text-green-400",
  delayed: "text-red-600 dark:text-red-400",
};

const fmt = (num, currency = "") =>
  `${(num ?? 0).toLocaleString("en-US")}${currency ? " " + currency : ""}`;

const formatDate = (str) =>
  str
    ? new Date(str).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

// ── Alt bileşenler ────────────────────────────────────────────────────────────

/** Tek istatistik kartı */
const StatCard = ({ label, value, sub, iconBg, icon }) => (
  <div className="rounded-xl shadow-sm p-5 bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border flex items-center gap-4">
    <div className={`p-3 rounded-lg shrink-0 ${iconBg}`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-sm font-medium text-day-text/70 dark:text-night-text/70 truncate">
        {label}
      </p>
      <p className="text-2xl font-bold text-day-text dark:text-night-text leading-tight">
        {value}
      </p>
      {sub && (
        <p className="text-xs text-day-text/50 dark:text-night-text/50 mt-0.5">
          {sub}
        </p>
      )}
    </div>
  </div>
);

/** Skeleton satır */
const SkeletonRow = ({ cols = 4 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 rounded bg-day-border dark:bg-night-border" />
      </td>
    ))}
  </tr>
);

/** Boş tablo mesajı */
const EmptyRow = ({ cols, message }) => (
  <tr>
    <td
      colSpan={cols}
      className="px-4 py-10 text-center text-sm text-day-text/50 dark:text-night-text/50"
    >
      {message}
    </td>
  </tr>
);

// ── Ana bileşen ───────────────────────────────────────────────────────────────

const OwnerDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  // State
  const [stats, setStats] = useState(null);
  const [recentProperties, setRecentProperties] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingProps, setLoadingProps] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Veri çekme fonksiyonları
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await bridge.properties.getMyPropertiesStatistics();
      if (res?.success) setStats(res.data);
    } catch (e) {
      console.error("Owner stats error:", e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchRecentProperties = async () => {
    setLoadingProps(true);
    try {
      const res = await bridge.properties.getMyProperties({
        limit: 6,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      if (res?.success) setRecentProperties(res.data ?? []);
    } catch (e) {
      console.error("Owner properties error:", e);
    } finally {
      setLoadingProps(false);
    }
  };

  const fetchRecentPayments = async () => {
    setLoadingPayments(true);
    try {
      const res = await bridge.investments.getPropertyOwnerRentalPayments({
        limit: 5,
        sortBy: "month",
        sortOrder: "desc",
      });
      if (res?.success) setRecentPayments(res.data ?? []);
    } catch (e) {
      console.error("Owner rental payments error:", e);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleRefresh = () => {
    fetchStats();
    fetchRecentProperties();
    fetchRecentPayments();
  };

  useEffect(() => {
    fetchStats();
    fetchRecentProperties();
    fetchRecentPayments();
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 min-h-screen bg-day-dashboard dark:bg-night-dashboard text-day-text dark:text-night-text">
      {/* ── Create Property Banner (en üst, her zaman görünür) ── */}
      <div className="mb-6 flex items-center justify-between gap-4 px-5 py-4 rounded-xl bg-gradient-to-r from-day-primary to-day-secondary dark:from-night-primary dark:to-night-secondary shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/20">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
              <polyline
                points="9 22 9 12 15 12 15 22"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">
              {t("owner.list_property_cta") || "List a new property"}
            </p>
            <p className="text-white/70 text-xs">
              {t("owner.list_property_sub") ||
                "Reach thousands of international investors on EstateLink"}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/owner/properties/new")}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-day-primary dark:text-night-primary text-sm font-bold hover:bg-white/90 transition-opacity shadow"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {t("owner.add_property") || "Add Property"}
        </button>
      </div>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            {t("owner.dashboard") || "Property Owner Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
            {t("owner.welcome") || "Welcome back"},{" "}
            <span className="font-medium text-day-text dark:text-night-text">
              {user?.fullName || user?.email || ""}
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          {/* Yenile */}
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-day-border dark:border-night-border text-sm font-medium hover:bg-day-surface dark:hover:bg-night-surface transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {t("common.refresh") || "Refresh"}
          </button>

          {/* Mülk ekle - header içinde de kalsın (ikincil) */}
          <button
            onClick={() => navigate("/owner/properties/new")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-day-primary dark:bg-night-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t("owner.add_property") || "Add Property"}
          </button>
        </div>
      </div>

      {/* ── İstatistik Kartları ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={t("owner.total_properties") || "Total Properties"}
          value={loadingStats ? "—" : (stats?.totalProperties ?? 0)}
          sub={t("owner.all_time") || "All time"}
          iconBg="bg-day-primary-light/20 dark:bg-night-primary/20"
          icon={
            <svg
              className="w-6 h-6 text-day-primary dark:text-night-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.25}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          }
        />

        <StatCard
          label={t("owner.published_properties") || "Published"}
          value={loadingStats ? "—" : (stats?.publishedProperties ?? 0)}
          sub={t("owner.active_listings") || "Active listings"}
          iconBg="bg-green-100 dark:bg-green-900/20"
          icon={
            <svg
              className="w-6 h-6 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.25}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        <StatCard
          label={t("owner.in_contract") || "In Contract"}
          value={loadingStats ? "—" : (stats?.propertiesInContract ?? 0)}
          sub={t("owner.active_contracts") || "Active contracts"}
          iconBg="bg-day-secondary-light/20 dark:bg-night-secondary/20"
          icon={
            <svg
              className="w-6 h-6 text-day-secondary dark:text-night-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.25}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />

        <StatCard
          label={t("owner.total_value") || "Portfolio Value"}
          value={loadingStats ? "—" : fmt(stats?.totalValue)}
          sub={t("owner.estimated_value") || "Estimated total"}
          iconBg="bg-day-accent-light/20 dark:bg-night-accent/20"
          icon={
            <svg
              className="w-6 h-6 text-day-accent dark:text-night-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.25}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      </div>

      {/* ── İki kolon alt bölüm ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Son Mülklerim ── */}
        <div className="rounded-xl shadow-sm bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border overflow-hidden">
          {/* Başlık */}
          <div className="px-6 py-4 border-b border-day-border dark:border-night-border flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <svg
                className="w-5 h-5 text-day-primary dark:text-night-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.25}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              {t("owner.my_properties") || "My Properties"}
            </h2>
            <button
              onClick={() => navigate("/owner/properties")}
              className="text-sm font-medium text-day-primary dark:text-night-primary hover:opacity-75 transition-opacity"
            >
              {t("common.view_all") || "View All"} →
            </button>
          </div>

          {/* Tablo */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-day-background dark:bg-night-background text-day-text/60 dark:text-night-text/60">
                  <th className="px-4 py-3 text-left font-medium">
                    {t("owner.property") || "Property"}
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    {t("common.type") || "Type"}
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    {t("common.status") || "Status"}
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    {t("owner.value") || "Value"}
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    {t("common.actions") || "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-day-border dark:divide-night-border">
                {loadingProps ? (
                  <>
                    <SkeletonRow cols={5} />
                    <SkeletonRow cols={5} />
                    <SkeletonRow cols={5} />
                  </>
                ) : recentProperties.length === 0 ? (
                  <EmptyRow
                    cols={5}
                    message={
                      t("owner.no_properties") ||
                      "No properties found. Add your first one!"
                    }
                  />
                ) : (
                  recentProperties.map((prop) => (
                    <tr
                      key={prop._id || prop.id}
                      className="hover:bg-day-background/60 dark:hover:bg-night-background/40 transition-colors"
                    >
                      {/* Property */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-day-text dark:text-night-text truncate max-w-[160px]">
                          {prop.title ||
                            prop.fullAddress ||
                            `${prop.city}, ${prop.country}`}
                        </p>
                        <p className="text-xs text-day-text/50 dark:text-night-text/50">
                          {prop.city}, {prop.country}
                        </p>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 capitalize text-day-text/70 dark:text-night-text/70">
                        {prop.propertyType || "—"}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[prop.status] || STATUS_COLORS.draft}`}
                        >
                          {prop.status?.replace("_", " ") || "draft"}
                        </span>
                      </td>

                      {/* Value */}
                      <td className="px-4 py-3 font-medium text-day-text dark:text-night-text">
                        {prop.estimatedValue
                          ? fmt(prop.estimatedValue, prop.currency || "TRY")
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            navigate(`/owner/properties/${prop._id || prop.id}`)
                          }
                          className="text-day-primary dark:text-night-primary hover:opacity-75 text-xs font-medium transition-opacity"
                        >
                          {t("common.view") || "View"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Son Kira Ödemeleri ── */}
        <div className="rounded-xl shadow-sm bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border overflow-hidden">
          {/* Başlık */}
          <div className="px-6 py-4 border-b border-day-border dark:border-night-border flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <svg
                className="w-5 h-5 text-day-accent dark:text-night-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.25}
                  d="M9 14h6m-6-4h6M7 21l2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1-2-1-2 1v18z"
                />
              </svg>
              {t("owner.rental_payments") || "Rental Payments"}
            </h2>
            <button
              onClick={() => navigate("/owner/rental-payments")}
              className="text-sm font-medium text-day-primary dark:text-night-primary hover:opacity-75 transition-opacity"
            >
              {t("common.view_all") || "View All"} →
            </button>
          </div>

          {/* Liste */}
          <div className="divide-y divide-day-border dark:divide-night-border">
            {loadingPayments ? (
              // Skeleton kartlar
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="px-6 py-4 flex items-center justify-between animate-pulse"
                >
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-40 rounded bg-day-border dark:bg-night-border" />
                    <div className="h-3 w-24 rounded bg-day-border dark:bg-night-border" />
                  </div>
                  <div className="h-4 w-16 rounded bg-day-border dark:bg-night-border" />
                </div>
              ))
            ) : recentPayments.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-day-text/50 dark:text-night-text/50">
                {t("owner.no_payments") || "No rental payments yet."}
              </div>
            ) : (
              recentPayments.map((payment, idx) => (
                <div
                  key={payment._id || payment.id || idx}
                  className="px-6 py-4 flex items-center justify-between hover:bg-day-background/60 dark:hover:bg-night-background/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Durum noktası */}
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        payment.status === "paid"
                          ? "bg-green-500"
                          : payment.status === "delayed"
                            ? "bg-red-500"
                            : "bg-yellow-500"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-day-text dark:text-night-text">
                        {payment.property?.city
                          ? `${payment.property.city}, ${payment.property.country}`
                          : t("owner.payment") || "Payment"}
                      </p>
                      <p className="text-xs text-day-text/50 dark:text-night-text/50">
                        {payment.month || formatDate(payment.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-day-text dark:text-night-text">
                      {fmt(payment.amount)} {payment.currency || "TRY"}
                    </p>
                    <p
                      className={`text-xs font-medium capitalize ${PAYMENT_STATUS_COLORS[payment.status] || PAYMENT_STATUS_COLORS.pending}`}
                    >
                      {payment.status || "pending"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Hızlı Aksiyonlar ── */}
      <div className="mt-6 rounded-xl shadow-sm bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border p-6">
        <h2 className="text-lg font-semibold mb-4">
          {t("owner.quick_actions") || "Quick Actions"}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction
            label={t("owner.add_property") || "Add Property"}
            onClick={() => navigate("/owner/properties/new")}
            iconColor="text-day-primary dark:text-night-primary"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            }
          />

          <QuickAction
            label={t("owner.view_offers") || "View Offers"}
            onClick={() => navigate("/owner/investments")}
            iconColor="text-day-secondary dark:text-night-secondary"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
          />

          <QuickAction
            label={t("owner.rental_payments") || "Rental Payments"}
            onClick={() => navigate("/owner/rental-payments")}
            iconColor="text-day-accent dark:text-night-accent"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 14h6m-6-4h6M7 21l2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1-2-1-2 1v18z"
                />
              </svg>
            }
          />

          <QuickAction
            label={t("navigation.settings") || "Settings"}
            onClick={() => navigate("/owner/settings")}
            iconColor="text-gray-500 dark:text-gray-400"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
};

/** Hızlı aksiyon butonu */
const QuickAction = ({ label, onClick, icon, iconColor }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-day-border dark:border-night-border hover:bg-day-background dark:hover:bg-night-background transition-colors group"
  >
    <span className={`${iconColor} group-hover:scale-110 transition-transform`}>
      {icon}
    </span>
    <span className="text-xs font-medium text-center text-day-text dark:text-night-text">
      {label}
    </span>
  </button>
);

export default OwnerDashboard;
