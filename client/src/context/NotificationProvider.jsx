// src/contexts/NotificationProvider.jsx
import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { selectUser, selectIsAuthenticated } from "../store/slices/authSlice";
import bridge from "../controllers/bridge";
import notificationSocket from "../services/notificationSocket";
import NotificationContext from "./notificationContext";

function NotificationProvider({ children }) {
  // Redux auth
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    type: null,
    isRead: null,
    priority: null,
  });

  // --- WebSocket handlers ---
  const handleNewNotification = useCallback((data) => {
    setNotifications((prev) => [data.notification, ...prev]);
    if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(data.notification.title, {
          body: data.notification.message,
          icon: "/logo.png",
          tag: data.notification._id || data.notification.id,
        });
      } catch (error) {
        console.error("Error displaying notification:", error);
      }
    }
  }, []);

  const handleNotificationRead = useCallback((data) => {
    setNotifications((prev) =>
      prev.map((n) =>
        (n._id || n.id) === data.notificationId
          ? { ...n, isRead: true, readAt: new Date() }
          : n
      )
    );
    if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
  }, []);

  const handleAllNotificationsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
    );
    setUnreadCount(0);
  }, []);

  const handleNotificationDeleted = useCallback((data) => {
    setNotifications((prev) =>
      prev.filter((n) => (n._id || n.id) !== data.notificationId)
    );
    if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
  }, []);

  // --- API: list ---
  const fetchNotifications = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = { page, limit: pagination.limit, ...filters };
        const res = await bridge.notifications.getMyNotifications(params);
        // normalize: controller unwrap yapıyorsa res.success vardır
        if (res?.success) {
          if (page === 1) setNotifications(res.data || []);
          else setNotifications((prev) => [...prev, ...(res.data || [])]);
          if (res.pagination) setPagination(res.pagination);
        } else {
          // fallback: bazı yerlerde direkt payload dönmüş olabilir
          const data = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
            ? res
            : [];
          if (page === 1) setNotifications(data);
          else setNotifications((prev) => [...prev, ...data]);
        }
      } catch (err) {
        setError(err?.message || "Bildirimler yüklenirken hata oluştu");
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit]
  );

  // --- API: unread count ---
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await bridge.notifications.getUnreadCount();
      if (res?.success) {
        setUnreadCount(res.data?.unreadCount ?? 0);
      } else if (typeof res?.unreadCount === "number") {
        setUnreadCount(res.unreadCount);
      }
    } catch (e) {
      console.error("Fetch unread count error:", e);
    }
  }, []);

  // --- API: mark read ---
  const markAsRead = useCallback(async (id) => {
    const res = await bridge.notifications.markAsRead(id);
    if (res?.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          (n._id || n.id) === id
            ? { ...n, isRead: true, readAt: new Date() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    return res;
  }, []);

  // --- API: mark all read ---
  const markAllAsRead = useCallback(async () => {
    const res = await bridge.notifications.markAllAsRead();
    if (res?.success) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
      );
      setUnreadCount(0);
    }
    return res;
  }, []);

  // --- API: delete one ---
  const deleteNotification = useCallback(
    async (id) => {
      const res = await bridge.notifications.deleteNotification(id);
      if (res?.success) {
        const removed = notifications.find((n) => (n._id || n.id) === id);
        setNotifications((prev) => prev.filter((n) => (n._id || n.id) !== id));
        if (removed && !removed.isRead)
          setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      return res;
    },
    [notifications]
  );

  // --- API: delete many ---
  const deleteMultipleNotifications = useCallback(
    async (ids) => {
      const res = await bridge.notifications.deleteMultipleNotifications(ids);
      if (res?.success) {
        setNotifications((prev) =>
          prev.filter((n) => !ids.includes(n._id || n.id))
        );
        const unreadDeleted = notifications.filter(
          (n) => ids.includes(n._id || n.id) && !n.isRead
        ).length;
        if (unreadDeleted > 0) {
          setUnreadCount((prev) => Math.max(0, prev - unreadDeleted));
        }
      }
      return res;
    },
    [notifications]
  );

  const applyFilters = useCallback((next) => {
    setFilters(next);
    setPagination((p) => ({ ...p, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ type: null, isRead: null, priority: null });
    setPagination((p) => ({ ...p, page: 1 }));
  }, []);

  const loadMore = useCallback(() => {
    if (pagination.page < pagination.pages && !loading) {
      fetchNotifications(pagination.page + 1);
    }
  }, [pagination, loading, fetchNotifications]);

  const requestNotificationPermission = useCallback(async () => {
    if ("Notification" in window && Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      return perm === "granted";
    }
    return false;
  }, []);

  // --- Lifecycle: socket + initial fetch ---
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const uid = user._id || user.id;
    if (!uid) return;

    notificationSocket.connect(uid);
    notificationSocket.onNotification(handleNewNotification);
    notificationSocket.onNotificationRead(handleNotificationRead);
    notificationSocket.onAllNotificationsRead(handleAllNotificationsRead);
    notificationSocket.onNotificationDeleted(handleNotificationDeleted);

    fetchNotifications(1);
    fetchUnreadCount();
    requestNotificationPermission();

    return () => {
      notificationSocket.removeListener(
        "new_notification",
        handleNewNotification
      );
      notificationSocket.removeListener(
        "notification_read",
        handleNotificationRead
      );
      notificationSocket.removeListener(
        "all_notifications_read",
        handleAllNotificationsRead
      );
      notificationSocket.removeListener(
        "notification_deleted",
        handleNotificationDeleted
      );
      notificationSocket.disconnect();
    };
  }, [
    isAuthenticated,
    user,
    handleNewNotification,
    handleNotificationRead,
    handleAllNotificationsRead,
    handleNotificationDeleted,
    fetchNotifications,
    fetchUnreadCount,
    requestNotificationPermission,
  ]);

  // Filters değişince yeniden yükle
  useEffect(() => {
    if (isAuthenticated) fetchNotifications(1);
  }, [filters, isAuthenticated, fetchNotifications]);

  const value = {
    // State
    notifications,
    unreadCount,
    loading,
    error,
    pagination,
    filters,

    // Actions
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteMultipleNotifications,
    applyFilters,
    clearFilters,
    loadMore,
    requestNotificationPermission,

    // Admin passthrough
    sendBulkNotification: bridge.notifications.sendBulkNotification,
    sendNotificationToUser: bridge.notifications.sendNotificationToUser,
    getNotificationStats: bridge.notifications.getNotificationStats,
    cleanupOldNotifications: bridge.notifications.cleanupOldNotifications,

    // Helpers
    hasMore: pagination.page < pagination.pages,
    isEmpty: notifications.length === 0,
    hasUnread: unreadCount > 0,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default NotificationProvider;
