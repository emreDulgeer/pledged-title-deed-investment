// server/repositories/notificationRepository.js

const Notification = require("../models/Notification");
const BaseRepository = require("./baseRepository");

class NotificationRepository extends BaseRepository {
  constructor() {
    super(Notification);
  }

  // Kullanıcının bildirimlerini getir
  async findByRecipient(recipientId, options = {}) {
    const query = { recipient: recipientId };

    if (options.unreadOnly) {
      query.isRead = false;
    }

    if (options.type) {
      query.type = options.type;
    }

    return await this.model
      .find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50);
  }

  // Okunmamış bildirim sayısı
  async getUnreadCount(recipientId) {
    return await this.model.countDocuments({
      recipient: recipientId,
      isRead: false,
    });
  }

  // Bildirimi okundu olarak işaretle
  async markAsRead(notificationId, recipientId) {
    return await this.model.findOneAndUpdate(
      { _id: notificationId, recipient: recipientId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
  }

  // Tüm bildirimleri okundu olarak işaretle
  async markAllAsRead(recipientId) {
    return await this.model.updateMany(
      { recipient: recipientId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  // Toplu bildirim oluştur
  async createBulkNotifications(notifications) {
    return await this.model.insertMany(notifications);
  }

  // Role göre bildirim gönder
  async notifyByRole(role, notificationData) {
    const User = require("../models/User");
    const users = await User.find({ role });

    const notifications = users.map((user) => ({
      recipient: user._id,
      recipientRole: role,
      ...notificationData,
    }));

    return await this.createBulkNotifications(notifications);
  }

  // Belirli bir entity ile ilgili bildirimleri getir
  async findByRelatedEntity(entityType, entityId) {
    return await this.model
      .find({
        "relatedEntity.entityType": entityType,
        "relatedEntity.entityId": entityId,
      })
      .sort({ createdAt: -1 });
  }

  // Email gönderilmemiş bildirimleri getir
  async findUnsentEmailNotifications() {
    return await this.model
      .find({
        "delivery.email.sent": false,
        priority: { $in: ["high", "urgent"] },
      })
      .populate("recipient");
  }

  // SMS gönderilmemiş bildirimleri getir
  async findUnsentSmsNotifications() {
    return await this.model
      .find({
        "delivery.sms.sent": false,
        priority: "urgent",
      })
      .populate("recipient");
  }

  // Bildirim gönderim durumunu güncelle
  async updateDeliveryStatus(notificationId, channel, status, error = null) {
    const update = {
      [`delivery.${channel}.sent`]: status,
      [`delivery.${channel}.sentAt`]: status ? new Date() : null,
    };

    if (error) {
      update[`delivery.${channel}.error`] = error;
    }

    return await this.model.findByIdAndUpdate(notificationId, update, {
      new: true,
    });
  }

  // İstatistikler
  async getNotificationStats(recipientId) {
    const stats = await this.model.aggregate([
      { $match: { recipient: recipientId } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          unreadCount: {
            $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] },
          },
        },
      },
    ]);

    return stats;
  }

  // Eski bildirimleri temizle (manuel temizlik için)
  async cleanOldNotifications(days = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await this.model.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true,
    });
  }
}

module.exports = NotificationRepository;
