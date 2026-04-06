const notificationService = require("../services/notificationService");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

class NotificationController {
  /**
   * Kullanıcının bildirimlerini getir
   */
  getMyNotifications = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 20, type, isRead, priority } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      isRead: isRead === "true" ? true : isRead === "false" ? false : null,
      priority,
    };

    const result = await notificationService.getUserNotifications(
      userId,
      options
    );

    res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
    });
  });

  /**
   * Okunmamış bildirim sayısını getir
   */
  getUnreadCount = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const Notification = require("../models/Notification");
    const count = await Notification.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: { unreadCount: count },
    });
  });

  /**
   * Bildirimi okundu olarak işaretle
   */
  markAsRead = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const { notificationId } = req.params;

    const notification = await notificationService.markAsRead(
      notificationId,
      userId
    );

    if (!notification) {
      throw new AppError("Bildirim bulunamadı", 404);
    }

    res.status(200).json({
      success: true,
      message: "Bildirim okundu olarak işaretlendi",
      data: notification.toClient(),
    });
  });

  /**
   * Tüm bildirimleri okundu olarak işaretle
   */
  markAllAsRead = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const result = await notificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: "Tüm bildirimler okundu olarak işaretlendi",
      data: { modifiedCount: result.modifiedCount },
    });
  });

  /**
   * Bildirimi sil
   */
  deleteNotification = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const { notificationId } = req.params;

    await notificationService.deleteNotification(notificationId, userId);

    res.status(200).json({
      success: true,
      message: "Bildirim silindi",
    });
  });

  /**
   * Birden fazla bildirimi sil
   */
  deleteMultipleNotifications = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      throw new AppError("Geçerli bildirim ID'leri sağlanmalıdır", 400);
    }

    const Notification = require("../models/Notification");
    const result = await Notification.deleteMany({
      _id: { $in: notificationIds },
      recipient: userId,
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} bildirim silindi`,
      data: { deletedCount: result.deletedCount },
    });
  });

  /**
   * Admin: Toplu bildirim gönder
   */
  sendBulkNotification = catchAsync(async (req, res) => {
    // Admin kontrolü middleware'de yapılmalı
    if (req.user.role !== "admin") {
      throw new AppError("Bu işlem için yetkiniz yok", 403);
    }

    const {
      recipientFilter,
      title,
      message,
      type = "system_announcement",
      priority = "normal",
      channels = { inApp: true, email: false },
    } = req.body;

    if (!title || !message) {
      throw new AppError("Başlık ve mesaj zorunludur", 400);
    }

    const result = await notificationService.sendBulkNotification({
      recipientFilter,
      type,
      title,
      message,
      priority,
      channels,
    });

    res.status(200).json({
      success: true,
      message: `${result.totalSent} kullanıcıya bildirim gönderildi`,
      data: result,
    });
  });

  /**
   * Admin: Belirli bir kullanıcıya bildirim gönder
   */
  sendNotificationToUser = catchAsync(async (req, res) => {
    // Admin kontrolü middleware'de yapılmalı
    if (req.user.role !== "admin") {
      throw new AppError("Bu işlem için yetkiniz yok", 403);
    }

    const { userId } = req.params;
    const {
      type = "custom",
      title,
      message,
      priority = "normal",
      actions = [],
      channels = { inApp: true },
    } = req.body;

    if (!title || !message) {
      throw new AppError("Başlık ve mesaj zorunludur", 400);
    }

    const User = require("../models/User");
    const recipient = await User.findById(userId);

    if (!recipient) {
      throw new AppError("Kullanıcı bulunamadı", 404);
    }

    const notification = await notificationService.createNotification({
      recipientId: userId,
      recipientRole: recipient.role,
      type,
      title,
      message,
      priority,
      actions,
      channels,
      senderId: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Bildirim gönderildi",
      data: notification.toClient(),
    });
  });

  /**
   * Admin: Bildirim istatistiklerini getir
   */
  getNotificationStats = catchAsync(async (req, res) => {
    // Admin kontrolü middleware'de yapılmalı
    if (req.user.role !== "admin") {
      throw new AppError("Bu işlem için yetkiniz yok", 403);
    }

    const Notification = require("../models/Notification");

    const stats = await Notification.aggregate([
      {
        $facet: {
          byType: [
            { $group: { _id: "$type", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          byPriority: [
            { $group: { _id: "$priority", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          readStatus: [{ $group: { _id: "$isRead", count: { $sum: 1 } } }],
          last30Days: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          totalCount: [{ $count: "total" }],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        byType: stats[0].byType,
        byPriority: stats[0].byPriority,
        readStatus: stats[0].readStatus,
        last30Days: stats[0].last30Days,
        total: stats[0].totalCount[0]?.total || 0,
      },
    });
  });

  /**
   * Admin: Eski bildirimleri temizle
   */
  cleanupOldNotifications = catchAsync(async (req, res) => {
    // Admin kontrolü middleware'de yapılmalı
    if (req.user.role !== "admin") {
      throw new AppError("Bu işlem için yetkiniz yok", 403);
    }

    const { daysOld = 30 } = req.body;
    const result = await notificationService.cleanupOldNotifications(daysOld);

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} eski bildirim temizlendi`,
      data: { deletedCount: result.deletedCount },
    });
  });
}

module.exports = new NotificationController();
