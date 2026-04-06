// server/services/notificationService.js

const Notification = require("../models/Notification");
const User = require("../models/User");
const emailService = require("./emailService");
// const { io } = require("../socket"); // Socket.io instance - eğer yoksa yorum satırında bırakın

class NotificationService {
  /**
   * Bildirim oluştur - Düzeltilmiş parametre sırası
   * @param {String} recipientId - Alıcı user ID
   * @param {String} recipientRole - Alıcı rolü
   * @param {Object} notificationData - Bildirim verileri
   */
  async createNotification(recipientId, recipientRole, notificationData) {
    try {
      const {
        type,
        title,
        message,
        priority = "medium",
        relatedEntity = null,
        actions = [],
        channels = { inApp: true },
        expiresAt = null,
        senderId = null,
        metadata = {},
      } = notificationData;

      // Bildirimi oluştur
      const notification = new Notification({
        recipient: recipientId,
        recipientRole,
        type,
        title,
        message,
        relatedEntity,
        priority,
        actions,
        metadata: new Map(Object.entries(metadata)),
        expiresAt,
        // sender bilgisi varsa ekle
        ...(senderId && { sender: { type: "user", userId: senderId } }),
      });

      await notification.save();

      // Populate sender info if exists
      if (senderId) {
        await notification.populate("sender.userId", "fullName email");
      }

      // Kanallar üzerinden gönder
      if (channels.inApp) {
        await this.sendInAppNotification(notification);
      }

      if (channels.email) {
        await this.sendEmailNotification(notification);
      }

      if (channels.sms) {
        await this.sendSmsNotification(notification);
      }

      return notification;
    } catch (error) {
      console.error("Notification creation error:", error);
      throw error;
    }
  }

  /**
   * In-app bildirim gönder (WebSocket)
   */
  async sendInAppNotification(notification) {
    try {
      // Socket.io varsa kullan
      if (typeof io !== "undefined" && io) {
        io.to(`user_${notification.recipient}`).emit("new_notification", {
          notification: notification.toObject(),
          unreadCount: await Notification.getUnreadCount(
            notification.recipient
          ),
        });
      }
    } catch (error) {
      console.error("In-app notification error:", error);
    }
  }

  /**
   * Email bildirimi gönder
   */
  async sendEmailNotification(notification) {
    try {
      const user = await User.findById(notification.recipient);
      if (!user || !user.email) return;

      // Email gönderimi - emailService'inizin metoduna göre düzenleyin
      if (emailService && emailService.sendNotificationEmail) {
        await emailService.sendNotificationEmail(user.email, {
          userName: user.fullName,
          title: notification.title,
          message: notification.message,
          actions: notification.actions,
        });
      }

      // Email gönderim durumunu güncelle
      notification.delivery.email = {
        sent: true,
        sentAt: new Date(),
      };
      await notification.save();
    } catch (error) {
      console.error("Email notification error:", error);
      notification.delivery.email = {
        sent: false,
        error: error.message,
      };
      await notification.save();
    }
  }

  /**
   * SMS bildirimi gönder
   */
  async sendSmsNotification(notification) {
    // SMS provider entegrasyonu yapıldığında implement edilecek
    console.log("SMS notification not implemented yet");
  }

  /**
   * KYC bekleyen kullanıcı bildirimi - DÜZELTME
   */
  async notifyAdminsAboutPendingKYC(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");

      // Tüm adminleri bul
      const admins = await User.find({
        role: "admin",
        accountStatus: "active",
      });

      // Her admin için bildirim oluştur
      const notifications = await Promise.all(
        admins.map((admin) =>
          this.createNotification(admin._id, "admin", {
            type: "user_registration", // veya 'kyc_pending' - model'inizdeki enum'a göre
            title: "Yeni KYC Onayı Bekliyor",
            message: `${user.fullName} (${user.email}) kullanıcısının KYC doğrulaması onayınızı bekliyor.`,
            priority: "high",
            relatedEntity: {
              entityType: "user",
              entityId: userId,
            },
            metadata: {
              userEmail: user.email,
              userRole: user.role,
              registeredAt: user.createdAt,
            },
            actions: [
              {
                label: "KYC'yi İncele",
                url: `/admin/kyc/${userId}`,
                type: "primary",
              },
            ],
            channels: {
              inApp: true,
              email: true,
            },
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error("Admin KYC notification error:", error);
      throw error;
    }
  }

  /**
   * Property onay bekleyen bildirim - DÜZELTME
   */
  async notifyAdminsAboutPendingProperty(propertyId) {
    try {
      const Property = require("../models/Property");
      const property = await Property.findById(propertyId).populate(
        "owner",
        "fullName email"
      );

      if (!property) throw new Error("Property not found");

      // Tüm adminleri bul
      const admins = await User.find({
        role: "admin",
        accountStatus: "active",
      });

      // Her admin için bildirim oluştur
      const notifications = await Promise.all(
        admins.map((admin) =>
          this.createNotification(admin._id, "admin", {
            type: "property_approved", // veya 'property_pending' - model'inizdeki enum'a göre
            title: "Yeni Mülk Onayı Bekliyor",
            message: `${property.title} mülkü yayınlanmak için onayınızı bekliyor. Mülk sahibi: ${property.owner.fullName}`,
            priority: "medium",
            relatedEntity: {
              entityType: "property",
              entityId: propertyId,
            },
            metadata: {
              propertyTitle: property.title,
              propertyLocation: property.location?.city || "Bilinmiyor",
              ownerName: property.owner.fullName,
              ownerEmail: property.owner.email,
            },
            actions: [
              {
                label: "Mülkü İncele",
                url: `/admin/properties/${propertyId}`,
                type: "primary",
              },
            ],
            channels: {
              inApp: true,
              email: false, // İsteğe göre true yapabilirsiniz
            },
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error("Admin property notification error:", error);
      throw error;
    }
  }

  /**
   * Adminlere bildirim gönder - Genel metod
   */
  async notifyAdmins(notificationData) {
    try {
      const admins = await User.find({
        role: "admin",
        accountStatus: "active",
      });

      const notifications = await Promise.all(
        admins.map((admin) =>
          this.createNotification(admin._id, "admin", notificationData)
        )
      );

      return notifications;
    } catch (error) {
      console.error("Notify admins error:", error);
      throw error;
    }
  }

  /**
   * Toplu bildirim gönder
   */
  async sendBulkNotification(data) {
    try {
      const {
        recipientFilter = {},
        type = "general_announcement",
        title,
        message,
        priority = "medium",
        channels = { inApp: true },
      } = data;

      // Alıcıları filtrele
      const recipients = await User.find({
        ...recipientFilter,
        accountStatus: "active",
      });

      // Her alıcı için bildirim oluştur
      const notifications = await Promise.all(
        recipients.map((recipient) =>
          this.createNotification(recipient._id, recipient.role, {
            type,
            title,
            message,
            priority,
            channels,
          })
        )
      );

      return {
        success: true,
        totalSent: notifications.length,
        notifications,
      };
    } catch (error) {
      console.error("Bulk notification error:", error);
      throw error;
    }
  }

  /**
   * Kullanıcının bildirimlerini getir
   */
  async getUserNotifications(userId, options) {
    const {
      page = 1,
      limit = 20,
      type = null,
      isRead = null,
      priority = null,
    } = options;

    const query = { recipient: userId };

    if (type) query.type = type;
    if (isRead !== null) query.isRead = isRead;
    if (priority) query.priority = priority;

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments(query);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Bildirimi okundu olarak işaretle
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );

    // WebSocket ile güncellemeyi bildir
    if (typeof io !== "undefined" && io) {
      io.to(`user_${userId}`).emit("notification_read", {
        notificationId,
        unreadCount: await Notification.getUnreadCount(userId),
      });
    }

    return notification;
  }

  /**
   * Tüm bildirimleri okundu olarak işaretle
   */
  async markAllAsRead(userId) {
    const result = await Notification.markAllAsRead(userId);

    // WebSocket ile güncellemeyi bildir
    if (typeof io !== "undefined" && io) {
      io.to(`user_${userId}`).emit("all_notifications_read", {
        unreadCount: 0,
      });
    }

    return result;
  }

  /**
   * Bildirimi sil
   */
  async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId,
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    // WebSocket ile güncellemeyi bildir
    if (typeof io !== "undefined" && io) {
      io.to(`user_${userId}`).emit("notification_deleted", {
        notificationId,
        unreadCount: await Notification.getUnreadCount(userId),
      });
    }

    return notification;
  }

  /**
   * Eski bildirimleri temizle
   */
  async cleanupOldNotifications(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true,
    });

    return result;
  }
}

module.exports = new NotificationService();
