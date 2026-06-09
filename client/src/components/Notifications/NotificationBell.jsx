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
        className="shell-icon-button relative"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 inline-flex min-w-[20px] translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full bg-day-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-white dark:bg-night-primary dark:text-night-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 flex max-h-[600px] w-96 flex-col overflow-hidden rounded-[28px] border border-day-border/80 bg-day-surface shadow-panel dark:border-night-border/80 dark:bg-night-surface">
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-day-border/70 px-4 py-4 dark:border-night-border/70">
            <h3 className="text-base font-semibold text-day-text dark:text-night-text">
              {t("notifications.title")}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm font-medium text-day-primary transition-colors hover:opacity-80 dark:text-night-primary"
              >
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-day-primary dark:border-night-primary"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-day-muted dark:text-night-muted">
                <Bell className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p>{t("notifications.noNotifications")}</p>
              </div>
            ) : (
              <div className="divide-y divide-day-border/60 dark:divide-night-border/60">
                {notifications.map((n) => (
                  <div
                    key={n._id || n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`cursor-pointer px-4 py-3 transition-colors hover:bg-day-panel/65 dark:hover:bg-night-panel/75 ${
                      !n.isRead ? "bg-day-panel/55 dark:bg-night-panel/60" : ""
                    } ${getPriorityColor(n.priority)}`}
                  >
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(n.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-day-text dark:text-night-text">
                          {n.title}
                        </p>
                        <p className="line-clamp-2 text-sm text-day-muted dark:text-night-muted">
                          {n.message}
                        </p>
                        <p className="mt-1 text-xs text-day-muted/80 dark:text-night-muted/80">
                          {formatTime(n.createdAt)}
                        </p>
                      </div>
                      {!n.isRead && (
                        <div className="flex-shrink-0">
                          <div className="h-2 w-2 rounded-full bg-day-primary dark:bg-night-primary"></div>
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
            <div className="flex-shrink-0 border-t border-day-border/70 px-4 py-3 dark:border-night-border/70">
              <button
                onClick={() => {
                  navigate("/admin/notifications");
                  setIsOpen(false);
                }}
                className="w-full text-center text-sm font-medium text-day-primary transition-colors hover:opacity-80 dark:text-night-primary"
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
