const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["investor", "property_owner", "local_representative", "admin"],
      required: true,
    },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    phoneNumber: String,
    country: String,
    region: String,
    riskScore: { type: Number, default: 50 },
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: Date,
    phoneVerified: { type: Boolean, default: false },
    phoneVerifiedAt: Date,
    accountStatus: {
      type: String,
      enum: [
        "pending_activation",
        "active",
        "suspended",
        "pending_deletion",
        "deleted",
      ],
      default: "pending_activation",
    },
    membershipStatus: {
      type: String,
      enum: ["inactive", "active", "expired", "cancelled"],
      default: "inactive",
    },
    membershipActivatedAt: Date,
    membershipExpiresAt: Date,
    lastLoginAt: Date,
    lastLoginIP: String,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    passwordChangedAt: Date,
    passwordResetRequired: { type: Boolean, default: false },

    // IP tracking
    registrationIP: String,
    trustedIPs: [String],

    // Consents
    consents: {
      terms: { type: Boolean, required: true },
      gdpr: { type: Boolean, required: true },
      marketing: { type: Boolean, default: false },
      timestamp: Date,
    },

    // Data deletion
    deletionRequestedAt: Date,
    scheduledDeletionDate: Date,

    kycStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    is2FAEnabled: { type: Boolean, default: false },
    paymentHistory: [
      {
        paymentId: String,
        amount: Number,
        currency: {
          type: String,
          default: "USD",
        },
        method: {
          type: String,
          enum: ["credit_card", "bank_transfer", "crypto", "paypal", "wise"],
        },
        plan: String,
        type: {
          type: String,
          enum: [
            "membership_activation",
            "membership_upgrade",
            "membership_renewal",
            "service_purchase",
          ],
        },
        status: {
          type: String,
          enum: ["pending", "completed", "failed", "refunded"],
          default: "completed",
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Trusted IPs
    trustedIPs: [
      {
        ip: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          default: "İsimsiz IP",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        lastUsedAt: Date,
      },
    ],

    // Session Management
    activeSessions: [
      {
        tokenId: String,
        deviceInfo: String,
        ip: String,
        location: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
        lastActivityAt: Date,
      },
    ],

    // Security Settings
    securitySettings: {
      loginNotifications: {
        type: Boolean,
        default: true,
      },
      unusualActivityAlerts: {
        type: Boolean,
        default: true,
      },
      requireIPVerification: {
        type: Boolean,
        default: false,
      },
      sessionTimeout: {
        type: Number,
        default: 30, // dakika
        min: 5,
        max: 1440,
      },
    },

    // Login History (son 100 giriş)
    loginHistory: [
      {
        ip: String,
        userAgent: String,
        location: String,
        success: Boolean,
        reason: String, // Başarısızsa neden
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);
UserSchema.index({ role: 1 });
UserSchema.index({ accountStatus: 1 });
UserSchema.index({ membershipStatus: 1 });
UserSchema.index({ kycStatus: 1 });
module.exports = mongoose.model("User", UserSchema);
