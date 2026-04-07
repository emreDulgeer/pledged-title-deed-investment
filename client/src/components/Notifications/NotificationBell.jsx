// src/components/Notifications/NotificationBell.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, User, Building2, Coins } from "lucide-react";
import { useNotifications } from "../../utils/hooks/useNotifications";

const NotificationBell = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Dropdown dışına tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Açıldığında listeyi getir
  useEffect(() => {
    if (isOpen) fetchNotifications(1);
  }, [isOpen, fetchNotifications]);

  const handleBellClick = () => setIsOpen((p) => !p);

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await markAsRead(notification._id || notification.id);
      }
      const url = getNotificationUrl(notification);
      if (url) {
        navigate(url);
        setIsOpen(false);
      }
    } catch (err) {
      console.error("Notification click error:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (err) {
      console.error("Mark all as read error:", err);
    }
  };

  // Type'a göre hedef URL
  const getNotificationUrl = (notification) => {
    const type = notification?.type;
    const re =
      notification?.relatedEntity ||
      notification?.related ||
      notification?.data;
    const id =
      re?.entityId ?? re?.id ?? notification?.entityId ?? notification?._id;

    switch (type) {
      case "user_registration":
      case "kyc_pending":
        return id ? `/auth/admin/pending-kyc/${id}` : null;

      case "property_approved":
      case "property_rejected":
      case "property_pending":
        return id ? `/admin/properties/${id}` : null;

      case "investment_created":
        return id ? `/admin/investments/${id}` : null;

      case "account_activated":
        return id ? `/admin/users/${id}` : null;

      default:
        return null;
    }
  };

  // İkonlar
  const getNotificationIcon = (type) => {
    switch (type) {
      case "user_registration":
      case "kyc_pending":
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        );
      case "property_approved":
      case "property_pending":
        return (
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
        );
      case "property_rejected":
        return (
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
        );
      case "investment_created":
        return (
          <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
            <Coins className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
        );
    }
  };

  // Zaman formatı (relative)
  const formatTime = (date) => {
    const now = new Date();
    const d = new Date(date);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return t("notifications.time.justNow");
    if (diff < 3600)
      return `${Math.floor(diff / 60)} ${t("notifications.time.minutesAgo")}`;
    if (diff < 86400)
      return `${Math.floor(diff / 3600)} ${t("notifications.time.hoursAgo")}`;
    return `${Math.floor(diff / 86400)} ${t("notifications.time.daysAgo")}`;
  };

  // Öncelik rengi
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
      case "high":
        return "border-l-4 border-red-500";
      case "medium":
        return "border-l-4 border-yellow-500";
      case "low":
        return "border-l-4 border-blue-500";
      default:
        return "";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell */}
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[20px]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("notifications.title")}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
              >
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t("notifications.noNotifications")}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((n) => (
                  <div
                    key={n._id || n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      !n.isRead ? "bg-blue-50 dark:bg-blue-900/10" : ""
                    } ${getPriorityColor(n.priority)}`}
                  >
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(n.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {n.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {formatTime(n.createdAt)}
                        </p>
                      </div>
                      {!n.isRead && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={() => {
                  navigate("/admin/notifications");
                  setIsOpen(false);
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
              >
                {t("notifications.viewAll")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
