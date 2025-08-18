// server/models/Membership.js

const mongoose = require("mongoose");

const MembershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MembershipPlan",
      required: true,
    },
    planName: {
      type: String, // Cache için plan ismi
      required: true,
    },
    status: {
      type: String,
      enum: ["inactive", "active", "expired", "cancelled", "suspended"],
      default: "inactive",
      required: true,
    },
    // Fiyatlandırma
    pricing: {
      amount: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: "EUR",
        required: true,
      },
      interval: {
        type: String,
        enum: ["monthly", "yearly"],
        default: "monthly",
      },
    },
    // Abonelik Detayları
    subscription: {
      currentPeriodStart: Date,
      currentPeriodEnd: Date,
      cancelAtPeriodEnd: {
        type: Boolean,
        default: false,
      },
      cancelledAt: Date,
      cancelReason: String,
      trialEnd: Date,
      trialUsed: {
        type: Boolean,
        default: false,
      },
    },
    // Tarihler
    activatedAt: Date,
    expiresAt: Date,
    renewalDate: Date,
    lastPaymentDate: Date,
    nextBillingDate: Date,

    // Özellikler ve Limitler
    features: {
      // Yatırım limitleri
      maxActiveInvestments: {
        type: Number,
        default: 1, // Basic: 1, Pro: 5, Enterprise: -1 (unlimited)
      },
      // Komisyon oranları (%)
      platformCommissionDiscount: {
        type: Number,
        default: 0, // Basic: 0, Pro: 1, Enterprise: 3
      },
      rentalCommissionDiscount: {
        type: Number,
        default: 0,
      },
      // Destek seviyesi
      supportLevel: {
        type: String,
        enum: ["basic", "priority", "dedicated"],
        default: "basic",
      },
      // Ek hizmetler
      includedServices: [String], // ["visa_consultancy", "legal_support", etc.]
      serviceDiscountRate: {
        type: Number,
        default: 0, // Pro: 10%, Enterprise: 100%
      },
      // Diğer özellikler
      hasAnalyticsAccess: {
        type: Boolean,
        default: false,
      },
      hasApiAccess: {
        type: Boolean,
        default: false,
      },
      hasCustomReports: {
        type: Boolean,
        default: false,
      },
      hasPriorityListings: {
        type: Boolean,
        default: false,
      },
    },
    // Ödeme Geçmişi
    payments: [
      {
        paymentId: String,
        amount: Number,
        currency: String,
        status: {
          type: String,
          enum: ["pending", "succeeded", "failed", "refunded", "cancelled"],
          default: "pending",
        },
        method: {
          type: String,
          enum: ["card", "bank_transfer", "ideal", "sepa", "crypto"],
        },
        type: {
          type: String,
          enum: ["subscription", "upgrade", "renewal", "one_time"],
        },
        description: String,
        invoiceId: String,
        receiptUrl: String,
        failureReason: String,
        refundReason: String,
        processedAt: Date,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Kullanım İstatistikleri
    usage: {
      currentActiveInvestments: {
        type: Number,
        default: 0,
      },
      totalInvestmentsMade: {
        type: Number,
        default: 0,
      },
      servicesUsed: [
        {
          serviceId: String,
          serviceName: String,
          usedAt: Date,
          discountApplied: Number,
        },
      ],
      lastActivityAt: Date,
    },
    // Promosyonlar
    promotions: {
      activePromoCode: String,
      promoDiscountRate: Number,
      promoExpiresAt: Date,
      referralCode: String,
      referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      referralCount: {
        type: Number,
        default: 0,
      },
    },
    // Bildirim Tercihleri
    notifications: {
      emailReminders: {
        type: Boolean,
        default: true,
      },
      renewalReminder: {
        type: Boolean,
        default: true,
      },
      paymentFailureAlert: {
        type: Boolean,
        default: true,
      },
      planChangeAlert: {
        type: Boolean,
        default: true,
      },
      lastReminderSentAt: Date,
    },
    // Metadata
    metadata: {
      source: String, // "web", "mobile", "admin"
      campaign: String,
      utmSource: String,
      utmMedium: String,
      utmCampaign: String,
      adminNotes: String,
      specialConditions: String,
    },
    // Yönetici işlemleri
    adminOverride: {
      isOverridden: {
        type: Boolean,
        default: false,
      },
      overriddenBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      overriddenAt: Date,
      overrideReason: String,
      overrideExpiresAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
MembershipSchema.index({ user: 1 });
MembershipSchema.index({ status: 1 });
MembershipSchema.index({ plan: 1 });

MembershipSchema.index({ expiresAt: 1 });
MembershipSchema.index({ "usage.currentActiveInvestments": 1 });

// Virtual: Aktif mi?
MembershipSchema.virtual("isActive").get(function () {
  return this.status === "active" && this.expiresAt > new Date();
});

// Virtual: Yenilenecek mi?
MembershipSchema.virtual("willRenew").get(function () {
  return this.status === "active" && !this.subscription.cancelAtPeriodEnd;
});

// Methods
MembershipSchema.methods.canMakeInvestment = function () {
  if (this.features.investments?.maxActiveInvestments === -1) return true; // Unlimited
  return (
    this.usage.currentActiveInvestments <
    (this.features.investments?.maxActiveInvestments || 1)
  );
};

MembershipSchema.methods.getRemainingInvestments = function () {
  const maxInvestments = this.features.investments?.maxActiveInvestments;
  if (maxInvestments === -1) return "Unlimited";
  return Math.max(
    0,
    (maxInvestments || 1) - this.usage.currentActiveInvestments
  );
};

MembershipSchema.methods.getDiscountedCommission = function (
  baseCommission,
  type = "platform"
) {
  const discountField =
    type === "rental"
      ? "rentalCommissionDiscount"
      : "platformCommissionDiscount";
  const discount = this.features.commissions?.[discountField] || 0;
  return baseCommission * (1 - discount / 100);
};

// Static Methods - Artık MembershipPlan modelinden alınacak
MembershipSchema.statics.getPlanById = async function (planId) {
  const MembershipPlan = require("./MembershipPlan");
  return await MembershipPlan.findById(planId);
};

MembershipSchema.statics.getPlanByName = async function (planName) {
  const MembershipPlan = require("./MembershipPlan");
  return await MembershipPlan.findOne({
    name: planName.toLowerCase(),
    isActive: true,
  });
};

module.exports = mongoose.model("Membership", MembershipSchema);
