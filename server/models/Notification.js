// server/models/Notification.js

const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientRole: {
      type: String,
      enum: ["investor", "property_owner", "local_representative", "admin"],
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        // Investment notifications
        "new_investment_offer",
        "offer_accepted",
        "offer_rejected",
        "contract_uploaded",
        "title_deed_registered",
        "rent_payment_received",
        "rent_payment_delayed",
        "investment_refunded",
        "property_transferred",
        "upcoming_rent_payment",
        "contract_ending_soon",

        // Property notifications
        "property_approved",
        "property_rejected",
        "property_featured",

        // User notifications
        "kyc_approved",
        "kyc_rejected",
        "membership_upgraded",
        "membership_expiring",

        // System notifications
        "system_maintenance",
        "new_feature",
        "general_announcement",
      ],
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedEntity: {
      entityType: {
        type: String,
        enum: ["investment", "property", "user", "payment", "document"],
      },
      entityId: mongoose.Schema.Types.ObjectId,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    // Email/SMS gönderim durumu
    delivery: {
      email: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
      sms: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
      push: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
    },
    // Aksiyonlar
    actions: [
      {
        label: String,
        url: String,
        type: {
          type: String,
          enum: ["primary", "secondary", "danger"],
          default: "primary",
        },
      },
    ],
    // Meta bilgiler
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    expiresAt: Date,
  },
  {
    timestamps: true,
    indexes: [
      { recipient: 1, isRead: 1 },
      { recipient: 1, createdAt: -1 },
      { recipientRole: 1, type: 1 },
      { expiresAt: 1 },
    ],
  }
);

// Read metodları
NotificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static metodlar
NotificationSchema.statics.getUnreadCount = async function (userId) {
  return await this.countDocuments({ recipient: userId, isRead: false });
};

NotificationSchema.statics.markAllAsRead = async function (userId) {
  return await this.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// TTL index - 90 gün sonra eski bildirimleri sil
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model("Notification", NotificationSchema);
