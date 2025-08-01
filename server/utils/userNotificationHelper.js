// server/utils/userNotificationHelper.js

const Notification = require("../models/Notification");

class UserNotificationHelper {
  // Kullanıcının son 7 günlük bildirim özetini getir
  static async getNotificationSummary(userId) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const notifications = await Notification.find({
      recipient: userId,
      createdAt: { $gte: sevenDaysAgo },
    });

    const summary = {
      total: notifications.length,
      unread: notifications.filter((n) => !n.isRead).length,
      byPriority: {
        urgent: notifications.filter((n) => n.priority === "urgent").length,
        high: notifications.filter((n) => n.priority === "high").length,
        medium: notifications.filter((n) => n.priority === "medium").length,
        low: notifications.filter((n) => n.priority === "low").length,
      },
      byType: {},
    };

    // Type'a göre gruplama
    notifications.forEach((notification) => {
      if (!summary.byType[notification.type]) {
        summary.byType[notification.type] = 0;
      }
      summary.byType[notification.type]++;
    });

    return summary;
  }

  // Kullanıcı için önemli bildirimleri getir (urgent + high priority)
  static async getImportantNotifications(userId, limit = 10) {
    return await Notification.find({
      recipient: userId,
      priority: { $in: ["urgent", "high"] },
      isRead: false,
    })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  // Belirli bir entity ile ilgili tüm bildirimleri getir
  static async getEntityNotifications(entityType, entityId) {
    return await Notification.find({
      "relatedEntity.entityType": entityType,
      "relatedEntity.entityId": entityId,
    }).sort({ createdAt: -1 });
  }

  // Kullanıcının okunmamış bildirim sayısını badge için getir
  static async getUnreadBadgeCount(userId) {
    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    // 99+ gösterimi için
    return count > 99 ? "99+" : count.toString();
  }

  // Notification preferences check (ileride kullanılabilir)
  static async shouldSendNotification(userId, notificationType) {
    // İleride kullanıcı tercihlerine göre bildirim gönderip göndermeme kontrolü
    // Şimdilik her zaman true dönüyor
    return true;
  }
}

module.exports = UserNotificationHelper;
