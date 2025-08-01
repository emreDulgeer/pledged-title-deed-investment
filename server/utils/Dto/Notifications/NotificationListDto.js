// server/utils/dto/Notifications/NotificationListDto.js

class NotificationListDto {
  constructor(notification) {
    this.id = notification._id;
    this.type = notification.type;
    this.title = notification.title;
    this.message = notification.message;
    this.priority = notification.priority;
    this.isRead = notification.isRead;
    this.createdAt = notification.createdAt;

    // Time ago hesaplama
    this.timeAgo = this.calculateTimeAgo(notification.createdAt);

    // İlk action (varsa)
    if (notification.actions && notification.actions.length > 0) {
      this.primaryAction = {
        label: notification.actions[0].label,
        url: notification.actions[0].url,
      };
    }

    // Type'a göre icon belirle (frontend için)
    this.icon = this.getIconByType(notification.type);

    // Priority'ye göre renk belirle (frontend için)
    this.color = this.getColorByPriority(notification.priority);
  }

  calculateTimeAgo(date) {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now - notificationDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return notificationDate.toLocaleDateString();
  }

  getIconByType(type) {
    const iconMap = {
      new_investment_offer: "offer",
      offer_accepted: "check-circle",
      offer_rejected: "x-circle",
      contract_uploaded: "file-text",
      title_deed_registered: "shield-check",
      rent_payment_received: "dollar-sign",
      rent_payment_delayed: "alert-triangle",
      investment_refunded: "refresh-cw",
      property_transferred: "home",
      upcoming_rent_payment: "clock",
      contract_ending_soon: "calendar",
    };

    return iconMap[type] || "bell";
  }

  getColorByPriority(priority) {
    const colorMap = {
      low: "gray",
      medium: "blue",
      high: "orange",
      urgent: "red",
    };

    return colorMap[priority] || "blue";
  }
}

module.exports = NotificationListDto;
