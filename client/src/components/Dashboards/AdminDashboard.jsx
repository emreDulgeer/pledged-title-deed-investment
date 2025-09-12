// src/components/Dashboards/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { User, Home, AlertCircle, RefreshCw, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import bridge from "../../controllers/bridge";

const AdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingProperties, setPendingProperties] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingProperties, setLoadingProperties] = useState(true);

  // Fetch pending KYC users
  const fetchPendingUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await bridge.auth.getPendingKycUsers();
      if (res?.success) setPendingUsers(res.data?.users ?? res.data ?? []);
    } catch (e) {
      console.error("Error fetching pending users:", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch pending properties
  const fetchPendingProperties = async () => {
    setLoadingProperties(true);
    try {
      const res = await bridge.properties.adminGetAll({
        status: "draft",
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      if (res?.success) setPendingProperties(res.data ?? []);
    } catch (e) {
      console.error("Error fetching pending properties:", e);
    } finally {
      setLoadingProperties(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
    fetchPendingProperties();
  }, []);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

  return (
    <div className="p-6 min-h-screen bg-day-dashboard dark:bg-night-dashboard text-day-text dark:text-night-text">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("navigation.admin_panel")}</h1>
        <p className="mt-2">{t("dashboard.quick_stats")}</p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* KYC Pending */}
        <div className="rounded-lg shadow p-6 bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-day-secondary-light dark:bg-night-secondary-light opacity-100">
              <User
                className="h-6 w-6 text-day-secondary dark:text-night-secondary text-opacity-100"
                strokeWidth={2.25}
              />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium">
                {t("dashboard.kyc_pending")}
              </p>
              <p className="text-2xl font-semibold">{pendingUsers.length}</p>
            </div>
          </div>
        </div>

        {/* Properties Pending */}
        <div className="rounded-lg shadow p-6 bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-day-accent-light dark:bg-night-accent-light opacity-100">
              <Home
                className="h-6 w-6 text-day-accent dark:text-night-accent text-opacity-100"
                strokeWidth={2.25}
              />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium">
                {t("dashboard.properties_pending")}
              </p>
              <p className="text-2xl font-semibold">
                {pendingProperties.length}
              </p>
            </div>
          </div>
        </div>

        {/* Total Pending */}
        <div className="rounded-lg shadow p-6 bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-day-primary-light dark:bg-night-primary-light opacity-100">
              <AlertCircle
                className="h-6 w-6 text-day-primary dark:text-night-primary text-opacity-100"
                strokeWidth={2.25}
              />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium">
                {t("dashboard.total_pending")}
              </p>
              <p className="text-2xl font-semibold">
                {pendingUsers.length + pendingProperties.length}
              </p>
            </div>
          </div>
        </div>

        {/* Refresh */}
        <div className="rounded-lg shadow p-6 bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-lg bg-day-secondary-light dark:bg-night-secondary-light opacity-100">
              <RefreshCw
                className="h-6 w-6 text-day-secondary dark:text-night-secondary text-opacity-100"
                strokeWidth={2.25}
              />
            </div>
            <button
              onClick={() => {
                fetchPendingUsers();
                fetchPendingProperties();
              }}
              className="ml-4 text-sm font-medium text-day-primary hover:opacity-80 dark:text-night-primary"
            >
              {t("dashboard.refresh")}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Two Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending KYC Users */}
        <div className="rounded-lg shadow bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border">
          <div className="p-6 border-b border-day-border dark:border-night-border">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center">
                <User
                  className="h-5 w-5 mr-2 text-day-primary dark:text-night-primary"
                  strokeWidth={2.25}
                />
                {t("dashboard.users_pending_kyc")}
              </h2>
              <span className="bg-day-secondary-light text-day-secondary dark:bg-night-secondary-light dark:text-night-secondary px-3 py-1 rounded-full text-sm font-medium">
                {pendingUsers.length} {t("dashboard.users_count_suffix")}
              </span>
            </div>
          </div>

          <div className="p-6">
            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-day-secondary dark:border-night-secondary"></div>
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="text-center py-8">
                {t("dashboard.no_users_pending")}
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {pendingUsers.map((user) => (
                  <div
                    key={user._id}
                    className="border border-day-border dark:border-night-border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{user.fullName}</h3>
                        <p className="text-sm">{user.email}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span>{user.country}</span>
                          <span>•</span>
                          <span>{formatDate(user.createdAt)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          navigate(`/auth/admin/pending-kyc/${user._id}`)
                        }
                        className="p-2 rounded-lg transition-colors hover:bg-day-border/40 dark:hover:bg-night-border/40"
                        title={t("common.view")}
                      >
                        <Eye className="h-4 w-4" strokeWidth={2.25} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Properties */}
        <div className="rounded-lg shadow bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border">
          <div className="p-6 border-b border-day-border dark:border-night-border">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center">
                <Home
                  className="h-5 w-5 mr-2 text-day-accent dark:text-night-accent"
                  strokeWidth={2.25}
                />
                {t("dashboard.properties_pending")}
              </h2>
              <span className="bg-day-accent-light text-day-accent dark:bg-night-accent-light dark:text-night-accent px-3 py-1 rounded-full text-sm font-medium">
                {pendingProperties.length}{" "}
                {t("dashboard.properties_count_suffix")}
              </span>
            </div>
          </div>

          <div className="p-6">
            {loadingProperties ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-day-accent dark:border-night-accent"></div>
              </div>
            ) : pendingProperties.length === 0 ? (
              <div className="text-center py-8">
                {t("dashboard.no_properties_pending")}
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {pendingProperties.map((property) => (
                  <div
                    key={property._id}
                    className="border border-day-border dark:border-night-border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">
                          {property.title || property.fullAddress}
                        </h3>
                        <p className="text-sm">
                          {property.city}, {property.country}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span>{property.propertyType}</span>
                          <span>•</span>
                          <span>{formatDate(property.createdAt)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          navigate(`/properties/my/properties/${property._id}`)
                        }
                        className="p-2 rounded-lg transition-colors hover:bg-day-border/40 dark:hover:bg-night-border/40"
                        title={t("common.view")}
                      >
                        <Eye className="h-4 w-4" strokeWidth={2.25} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
