// server/controllers/notificationController.js

const NotificationService = require("../services/notificationService");
const responseWrapper = require("../utils/responseWrapper");

class NotificationController {
  constructor() {
    this.notificationService = new NotificationService();
  }

  // Kullanıcının bildirimlerini getir
  getMyNotifications = async (req, res) => {
    try {
      const userId = req.user.id;
      const options = {
        unreadOnly: req.query.unreadOnly === "true",
        type: req.query.type,
        limit: parseInt(req.query.limit) || 50,
      };

      const notifications = await this.notificationService.getUserNotifications(
        userId,
        options
      );

      return responseWrapper.success(
        res,
        notifications,
        "Notifications fetched successfully"
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Okunmamış bildirim sayısını getir
  getUnreadCount = async (req, res) => {
    try {
      const userId = req.user.id;
      const count = await this.notificationService.getUnreadCount(userId);

      return responseWrapper.success(res, count);
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Bildirimi okundu olarak işaretle
  markAsRead = async (req, res) => {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;

      const notification = await this.notificationService.markAsRead(
        notificationId,
        userId
      );

      return responseWrapper.success(
        res,
        notification,
        "Notification marked as read"
      );
    } catch (error) {
      if (error.message.includes("not found")) {
        return responseWrapper.notFound(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Tüm bildirimleri okundu olarak işaretle
  markAllAsRead = async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await this.notificationService.markAllAsRead(userId);

      return responseWrapper.success(res, result, result.message);
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Admin: Toplu bildirim gönder
  sendBulkNotification = async (req, res) => {
    try {
      const { filters, notification } = req.body;

      if (!notification || !notification.message) {
        return responseWrapper.badRequest(
          res,
          "Notification message is required"
        );
      }

      const result = await this.notificationService.sendBulkNotification(
        filters || {},
        notification
      );

      return responseWrapper.success(res, result, result.message);
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Admin: Sistem bildirimi gönder
  sendSystemNotification = async (req, res) => {
    try {
      const { title, message, priority, type } = req.body;

      if (!title || !message) {
        return responseWrapper.badRequest(
          res,
          "Title and message are required"
        );
      }

      const result = await this.notificationService.sendBulkNotification(
        {}, // Tüm kullanıcılara
        {
          type: type || "general_announcement",
          title,
          message,
          priority: priority || "medium",
        }
      );

      return responseWrapper.success(res, result, result.message);
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };
}

module.exports = new NotificationController();
