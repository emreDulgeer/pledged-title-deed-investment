// server/utils/dto/Notifications/NotificationDto.js

class NotificationDto {
  constructor(notification) {
    this.id = notification._id;
    this.type = notification.type;
    this.title = notification.title;
    this.message = notification.message;
    this.priority = notification.priority;
    this.isRead = notification.isRead;
    this.readAt = notification.readAt;
    this.createdAt = notification.createdAt;

    // Related entity
    if (notification.relatedEntity) {
      this.relatedEntity = {
        type: notification.relatedEntity.entityType,
        id: notification.relatedEntity.entityId,
      };
    }

    // Actions
    if (notification.actions && notification.actions.length > 0) {
      this.actions = notification.actions.map((action) => ({
        label: action.label,
        url: action.url,
        type: action.type,
      }));
    }

    // Metadata (sadece gerekli alanlar)
    if (notification.metadata) {
      this.metadata = {};
      // Sadece güvenli metadata alanlarını ekle
      const safeFields = [
        "amount",
        "currency",
        "month",
        "propertyCity",
        "daysRemaining",
      ];
      for (const [key, value] of notification.metadata) {
        if (safeFields.includes(key)) {
          this.metadata[key] = value;
        }
      }
    }

    // Expiry
    if (notification.expiresAt) {
      this.expiresAt = notification.expiresAt;
    }
  }
}

module.exports = NotificationDto;
