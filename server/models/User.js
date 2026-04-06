// server/models/User.js - GÜNCELLENMIŞ VERSİYON

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
        "banned", // YENİ - ban durumu için
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
        reason: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ============ YENİ ALANLAR - BAN & REPORT İSTATİSTİKLERİ ============

    // Ban bilgileri (sadece istatistik)
    isBanned: {
      type: Boolean,
      default: false,
      index: true,
    },
    currentBan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ban",
    },
    totalBanCount: {
      type: Number,
      default: 0,
    },

    // Report bilgileri (sadece sayaçlar)
    reportedCount: {
      type: Number,
      default: 0,
    },
    reportsMadeCount: {
      type: Number,
      default: 0,
    },

    // Trust Score (ban ve report'lara göre değişir)
    trustScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },

    // Uyarı sistemi
    warnings: [
      {
        reason: String,
        givenBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        givenAt: {
          type: Date,
          default: Date.now,
        },
        severity: {
          type: String,
          enum: ["low", "medium", "high"],
        },
      },
    ],
    warningCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes
UserSchema.index({ role: 1 });
UserSchema.index({ accountStatus: 1 });
UserSchema.index({ membershipStatus: 1 });
UserSchema.index({ kycStatus: 1 });
UserSchema.index({ isBanned: 1 });
UserSchema.index({ trustScore: 1 });

// Method: Trust score güncelle
UserSchema.methods.updateTrustScore = async function () {
  let score = 100;

  // Her ban için -20 puan
  score -= this.totalBanCount * 20;

  // Her rapor için -5 puan
  score -= this.reportedCount * 5;

  // Her uyarı için -10 puan
  score -= this.warningCount * 10;

  // KYC onaylanmışsa +10 puan
  if (this.kycStatus === "Approved") {
    score += 10;
  }

  // Email verify +5 puan
  if (this.emailVerified) {
    score += 5;
  }

  // Minimum 0, maksimum 100
  this.trustScore = Math.max(0, Math.min(100, score));

  return await this.save();
};

module.exports = mongoose.model("User", UserSchema);
