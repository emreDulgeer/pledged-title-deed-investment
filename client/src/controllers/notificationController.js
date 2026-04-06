// src/controllers/notificationController.js

import apiClient from "../api/client";

// Helper: axios -> payload normalize
const unwrap = (p) => p.then((res) => res.data);

const notificationController = {
  /**
   * Kullanıcının bildirimlerini getir
   */
  getMyNotifications: async (params = {}) => {
    return await unwrap(
      apiClient.get("/notifications/my-notifications", { params })
    );
  },

  /**
   * Okunmamış bildirim sayısını getir
   */
  getUnreadCount: async () => {
    return await unwrap(apiClient.get("/notifications/unread-count"));
  },

  /**
   * Bildirimi okundu olarak işaretle
   */
  markAsRead: async (notificationId) => {
    return await unwrap(
      apiClient.patch(`/notifications/${notificationId}/read`)
    );
  },

  /**
   * Tüm bildirimleri okundu olarak işaretle
   */
  markAllAsRead: async () => {
    return await unwrap(apiClient.patch("/notifications/mark-all-read"));
  },

  /**
   * Bildirimi sil
   */
  deleteNotification: async (notificationId) => {
    return await unwrap(apiClient.delete(`/notifications/${notificationId}`));
  },

  /**
   * Birden fazla bildirimi sil
   */
  deleteMultipleNotifications: async (notificationIds) => {
    return await unwrap(
      apiClient.delete("/notifications/bulk/delete", {
        data: { notificationIds },
      })
    );
  },

  // ===== ADMIN İŞLEMLERİ =====

  /**
   * Admin: Toplu bildirim gönder
   */
  sendBulkNotification: async (data) => {
    return await unwrap(apiClient.post("/notifications/admin/bulk", data));
  },

  /**
   * Admin: Belirli bir kullanıcıya bildirim gönder
   */
  sendNotificationToUser: async (userId, data) => {
    return await unwrap(
      apiClient.post(`/notifications/admin/user/${userId}`, data)
    );
  },

  /**
   * Admin: Bildirim istatistiklerini getir
   */
  getNotificationStats: async () => {
    return await unwrap(apiClient.get("/notifications/admin/stats"));
  },

  /**
   * Admin: Eski bildirimleri temizle
   */
  cleanupOldNotifications: async (daysOld = 30) => {
    return await unwrap(
      apiClient.post("/notifications/admin/cleanup", { daysOld })
    );
  },
};

export default notificationController;
