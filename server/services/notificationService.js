// server/services/notificationService.js

const NotificationRepository = require("../repositories/notificationRepository");
const {
  toNotificationDto,
  toNotificationListDto,
} = require("../utils/dto/Notifications");

class NotificationService {
  constructor() {
    this.notificationRepository = new NotificationRepository();
  }

  // Bildirim oluştur
  async createNotification(recipientId, recipientRole, notificationData) {
    const notification = await this.notificationRepository.create({
      recipient: recipientId,
      recipientRole,
      type: notificationData.type,
      title:
        notificationData.title || this.generateTitle(notificationData.type),
      message: notificationData.message,
      relatedEntity: notificationData.relatedEntity,
      priority:
        notificationData.priority ||
        this.getPriorityByType(notificationData.type),
      actions: notificationData.actions,
      metadata: notificationData.metadata,
      expiresAt: notificationData.expiresAt,
    });

    // Yüksek öncelikli bildirimler için email/SMS tetikle
    if (
      notification.priority === "urgent" ||
      notification.priority === "high"
    ) {
      // Email/SMS service'leri entegre edildiğinde burada çağrılacak
      // await this.sendEmailNotification(notification);
      // await this.sendSmsNotification(notification);
    }

    return toNotificationDto(notification);
  }

  // Investment bildirimleri
  async notifyNewInvestmentOffer(propertyOwnerId, investmentData) {
    return await this.createNotification(propertyOwnerId, "property_owner", {
      type: "new_investment_offer",
      message: `You have received a new investment offer of ${investmentData.amount} ${investmentData.currency} for your property in ${investmentData.propertyCity}`,
      relatedEntity: {
        entityType: "investment",
        entityId: investmentData.investmentId,
      },
      actions: [
        {
          label: "View Offer",
          url: `/investments/${investmentData.investmentId}`,
          type: "primary",
        },
      ],
      metadata: {
        investorName: investmentData.investorName,
        amount: investmentData.amount,
        currency: investmentData.currency,
      },
    });
  }

  async notifyOfferAccepted(investorId, investmentData) {
    return await this.createNotification(investorId, "investor", {
      type: "offer_accepted",
      message: `Your investment offer for the property in ${investmentData.propertyCity} has been accepted. Please proceed with contract signing.`,
      relatedEntity: {
        entityType: "investment",
        entityId: investmentData.investmentId,
      },
      actions: [
        {
          label: "Sign Contract",
          url: `/investments/${investmentData.investmentId}/contract`,
          type: "primary",
        },
      ],
    });
  }

  async notifyOfferRejected(investorId, investmentData) {
    return await this.createNotification(investorId, "investor", {
      type: "offer_rejected",
      message: `Your investment offer for the property in ${investmentData.propertyCity} has been rejected.`,
      relatedEntity: {
        entityType: "investment",
        entityId: investmentData.investmentId,
      },
      priority: "low",
    });
  }

  async notifyContractUploaded(recipientId, recipientRole, investmentData) {
    const isInvestor = recipientRole === "investor";
    return await this.createNotification(recipientId, recipientRole, {
      type: "contract_uploaded",
      message: `The ${
        isInvestor ? "property owner" : "investor"
      } has uploaded the signed contract for the property in ${
        investmentData.propertyCity
      }. Please review and sign.`,
      relatedEntity: {
        entityType: "investment",
        entityId: investmentData.investmentId,
      },
      actions: [
        {
          label: "Review Contract",
          url: `/investments/${investmentData.investmentId}/contract`,
          type: "primary",
        },
      ],
    });
  }

  async notifyTitleDeedRegistered(investorId, investmentData) {
    return await this.createNotification(investorId, "investor", {
      type: "title_deed_registered",
      message: `Title deed has been registered for your investment in ${investmentData.propertyCity}. Your investment is now active.`,
      relatedEntity: {
        entityType: "investment",
        entityId: investmentData.investmentId,
      },
      priority: "high",
    });
  }

  async notifyRentPaymentReceived(investorId, paymentData) {
    return await this.createNotification(investorId, "investor", {
      type: "rent_payment_received",
      message: `Your rent payment of ${paymentData.amount} ${paymentData.currency} for ${paymentData.month} has been received.`,
      relatedEntity: {
        entityType: "payment",
        entityId: paymentData.investmentId,
      },
      metadata: {
        amount: paymentData.amount,
        currency: paymentData.currency,
        month: paymentData.month,
      },
    });
  }

  async notifyRentPaymentDelayed(recipientId, recipientRole, paymentData) {
    const isOwner = recipientRole === "property_owner";
    return await this.createNotification(recipientId, recipientRole, {
      type: "rent_payment_delayed",
      message: isOwner
        ? `Rent payment for ${paymentData.month} is overdue. Please make the payment immediately.`
        : `Your rent payment for ${paymentData.month} from property in ${paymentData.propertyCity} is delayed.`,
      relatedEntity: {
        entityType: "investment",
        entityId: paymentData.investmentId,
      },
      priority: "high",
      actions: isOwner
        ? [
            {
              label: "Make Payment",
              url: `/investments/${paymentData.investmentId}/payment`,
              type: "danger",
            },
          ]
        : [],
    });
  }

  async notifyInvestmentRefunded(investorId, refundData) {
    return await this.createNotification(investorId, "investor", {
      type: "investment_refunded",
      message: `Your investment of ${refundData.amount} ${refundData.currency} has been refunded. The contract has been completed.`,
      relatedEntity: {
        entityType: "investment",
        entityId: refundData.investmentId,
      },
      priority: "high",
    });
  }

  async notifyPropertyTransferred(recipientId, recipientRole, transferData) {
    const isInvestor = recipientRole === "investor";
    return await this.createNotification(recipientId, recipientRole, {
      type: "property_transferred",
      message: isInvestor
        ? `The property in ${transferData.propertyCity} has been transferred to you. Congratulations on your new property!`
        : `Your property in ${transferData.propertyCity} has been transferred to the investor as per the contract terms.`,
      relatedEntity: {
        entityType: "property",
        entityId: transferData.propertyId,
      },
      priority: "urgent",
    });
  }

  async notifyUpcomingRentPayment(recipientId, recipientRole, paymentData) {
    const isOwner = recipientRole === "property_owner";
    return await this.createNotification(recipientId, recipientRole, {
      type: "upcoming_rent_payment",
      message: isOwner
        ? `Rent payment of ${paymentData.amount} ${paymentData.currency} is due for ${paymentData.month}`
        : `You will receive ${paymentData.amount} ${paymentData.currency} rent payment for ${paymentData.month}`,
      relatedEntity: {
        entityType: "investment",
        entityId: paymentData.investmentId,
      },
      priority: "medium",
    });
  }

  async notifyContractEndingSoon(recipientId, recipientRole, contractData) {
    const isOwner = recipientRole === "property_owner";
    return await this.createNotification(recipientId, recipientRole, {
      type: "contract_ending_soon",
      message: isOwner
        ? `Your investment contract will end in ${contractData.daysRemaining} days. Please prepare for refund or property transfer.`
        : `Your investment contract for property in ${contractData.propertyCity} will end in ${contractData.daysRemaining} days.`,
      relatedEntity: {
        entityType: "investment",
        entityId: contractData.investmentId,
      },
      priority: "high",
      actions: [
        {
          label: "View Details",
          url: `/investments/${contractData.investmentId}`,
          type: "primary",
        },
      ],
    });
  }

  // Kullanıcının bildirimlerini getir
  async getUserNotifications(userId, options = {}) {
    const notifications = await this.notificationRepository.findByRecipient(
      userId,
      options
    );
    return notifications.map((n) => toNotificationListDto(n));
  }

  // Bildirimi okundu olarak işaretle
  async markAsRead(notificationId, userId) {
    const notification = await this.notificationRepository.markAsRead(
      notificationId,
      userId
    );
    if (!notification) {
      throw new Error("Notification not found or unauthorized");
    }
    return toNotificationDto(notification);
  }

  // Tüm bildirimleri okundu olarak işaretle
  async markAllAsRead(userId) {
    await this.notificationRepository.markAllAsRead(userId);
    return { message: "All notifications marked as read" };
  }

  // Okunmamış bildirim sayısı
  async getUnreadCount(userId) {
    const count = await this.notificationRepository.getUnreadCount(userId);
    return { unreadCount: count };
  }

  // Bildirim başlığı oluştur
  generateTitle(type) {
    const titles = {
      new_investment_offer: "New Investment Offer",
      offer_accepted: "Offer Accepted",
      offer_rejected: "Offer Rejected",
      contract_uploaded: "Contract Ready",
      title_deed_registered: "Investment Active",
      rent_payment_received: "Payment Received",
      rent_payment_delayed: "Payment Overdue",
      investment_refunded: "Investment Refunded",
      property_transferred: "Property Transferred",
      upcoming_rent_payment: "Payment Reminder",
      contract_ending_soon: "Contract Ending Soon",
    };
    return titles[type] || "Notification";
  }

  // Bildirim tipine göre öncelik belirle
  getPriorityByType(type) {
    const priorities = {
      new_investment_offer: "high",
      offer_accepted: "high",
      offer_rejected: "low",
      contract_uploaded: "medium",
      title_deed_registered: "high",
      rent_payment_received: "medium",
      rent_payment_delayed: "urgent",
      investment_refunded: "high",
      property_transferred: "urgent",
      upcoming_rent_payment: "medium",
      contract_ending_soon: "high",
    };
    return priorities[type] || "medium";
  }

  // Toplu bildirim gönder (Admin için)
  async sendBulkNotification(filters, notificationData) {
    const User = require("../models/User");
    const query = {};

    if (filters.role) query.role = filters.role;
    if (filters.country) query.country = filters.country;
    if (filters.membershipPlan) query.membershipPlan = filters.membershipPlan;

    const users = await User.find(query);

    const notifications = users.map((user) => ({
      recipient: user._id,
      recipientRole: user.role,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      priority: notificationData.priority || "medium",
      actions: notificationData.actions,
      metadata: notificationData.metadata,
    }));

    await this.notificationRepository.createBulkNotifications(notifications);

    return {
      message: `Bulk notification sent to ${users.length} users`,
      recipientCount: users.length,
    };
  }
}

module.exports = NotificationService;
