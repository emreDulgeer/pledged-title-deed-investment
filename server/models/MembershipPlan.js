// server/models/MembershipPlan.js

const mongoose = require("mongoose");

const MembershipPlanSchema = new mongoose.Schema(
  {
    // Temel Bilgiler
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true, // basic, pro, enterprise
    },
    displayName: {
      type: String,
      required: true, // Basic, Pro, Enterprise
    },
    description: {
      type: String,
      required: true,
    },
    tier: {
      type: Number, // 1: Basic, 2: Pro, 3: Enterprise
      required: true,
      min: 1,
    },

    // Sıralama ve Görünürlük
    order: {
      type: Number,
      default: 0, // Sıralama için (düşük = önce gösterilir)
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVisible: {
      type: Boolean,
      default: true, // Frontend'de gösterilsin mi?
    },
    isDefault: {
      type: Boolean,
      default: false, // Yeni kullanıcılar için varsayılan plan
    },
    isHighlighted: {
      type: Boolean,
      default: false, // Önerilen/popüler plan olarak göster
    },
    isFeatured: {
      type: Boolean,
      default: false, // Ana sayfada öne çıkan plan
    },

    // Fiyatlandırma
    pricing: {
      monthly: {
        amount: {
          type: Number,
          required: true,
          min: 0, // Basic: 0, Pro: 19, Enterprise: 99
        },
        currency: {
          type: String,
          default: "EUR",
        },
        originalAmount: Number, // İndirimli fiyat göstermek için
      },
      yearly: {
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        currency: {
          type: String,
          default: "EUR",
        },
        discountPercentage: {
          type: Number,
          default: 20, // Yıllık ödemede indirim %
        },
        originalAmount: Number,
      },
      lifetime: {
        enabled: {
          type: Boolean,
          default: false,
        },
        amount: {
          type: Number,
          min: 0,
        },
        currency: {
          type: String,
          default: "EUR",
        },
      },
      trial: {
        enabled: {
          type: Boolean,
          default: false,
        },
        days: {
          type: Number,
          default: 7, // Pro için 7 gün deneme
        },
        requiresCard: {
          type: Boolean,
          default: true,
        },
      },
    },

    // Özellikler ve Limitler
    features: {
      // Yatırım Limitleri
      investments: {
        maxActiveInvestments: {
          type: Number,
          default: 1, // Basic: 1, Pro: 5, Enterprise: -1 (sınırsız)
          min: -1, // -1 = sınırsız
        },
        maxMonthlyInvestments: {
          type: Number,
          default: -1, // -1 = sınırsız
        },
        minInvestmentAmount: {
          type: Number,
          default: 0,
        },
        maxInvestmentAmount: {
          type: Number,
          default: -1, // -1 = sınırsız
        },
        allowBulkInvestments: {
          type: Boolean,
          default: false, // Enterprise için true
        },
      },

      // Mülk İşlemleri
      properties: {
        maxActiveProperties: {
          type: Number,
          default: -1, // Property Owner'lar için
        },
        canListProperties: {
          type: Boolean,
          default: false,
        },
        priorityListing: {
          type: Boolean,
          default: false, // Pro/Enterprise için öncelikli listeleme
        },
        featuredListingDays: {
          type: Number,
          default: 0, // Enterprise için 30 gün
        },
      },

      // Komisyon İndirimleri (PDF'de belirtilen)
      commissions: {
        platformCommissionDiscount: {
          type: Number,
          default: 0, // Basic: 0%, Pro: 1%, Enterprise: 3%
          min: 0,
          max: 100,
        },
        rentalCommissionDiscount: {
          type: Number,
          default: 0, // Basic: 0%, Pro: 0.5%, Enterprise: 2%
          min: 0,
          max: 100,
        },
        referralBonusMultiplier: {
          type: Number,
          default: 1, // Enterprise: 1.5x referans bonusu
        },
      },

      // Destek Seviyeleri (PDF'de belirtilen)
      support: {
        level: {
          type: String,
          enum: ["email", "priority", "dedicated", "vip"],
          default: "email", // Basic: email, Pro: priority, Enterprise: dedicated
        },
        responseTime: {
          type: String,
          default: "48h", // Basic: 48h, Pro: 24h, Enterprise: 2h
        },
        hasPhoneSupport: {
          type: Boolean,
          default: false, // Enterprise için true
        },
        hasDedicatedManager: {
          type: Boolean,
          default: false, // Enterprise için true
        },
        hasLiveChat: {
          type: Boolean,
          default: false, // Pro ve Enterprise için true
        },
      },

      // Özel Servisler (PDF'de belirtilen)
      services: {
        includedServices: [
          {
            type: String,
            enum: [
              "visa_consultancy",
              "legal_support",
              "tax_advisory",
              "property_management",
              "investment_advisory",
              "translation_services",
              "notary_services",
              "insurance_services",
            ],
          },
        ], // Enterprise: ["visa_consultancy", "legal_support"]

        serviceDiscounts: {
          visa_consultancy: {
            type: Number,
            default: 0, // Pro: 10%, Enterprise: 100%
          },
          legal_support: {
            type: Number,
            default: 0, // Pro: 5%, Enterprise: 50%
          },
          tax_advisory: {
            type: Number,
            default: 0,
          },
          property_management: {
            type: Number,
            default: 0,
          },
        },
      },

      // Analitik ve Raporlama (PDF'de belirtilen)
      analytics: {
        hasBasicAnalytics: {
          type: Boolean,
          default: true,
        },
        hasAdvancedAnalytics: {
          type: Boolean,
          default: false, // Pro ve Enterprise için true
        },
        hasMarketReports: {
          type: Boolean,
          default: false, // Enterprise için true
        },
        hasCustomReports: {
          type: Boolean,
          default: false, // Enterprise için true
        },
        dataExportFormats: [
          {
            type: String,
            enum: ["csv", "excel", "pdf"],
          },
        ], // Basic: [], Pro: ["csv"], Enterprise: ["csv", "excel", "pdf"]
      },

      // API Erişimi
      api: {
        hasAccess: {
          type: Boolean,
          default: false, // Enterprise için true
        },
        rateLimit: {
          type: Number,
          default: 0, // requests per hour
        },
        webhooksEnabled: {
          type: Boolean,
          default: false,
        },
      },

      // Referans Sistemi (PDF'de belirtilen)
      referral: {
        canEarnCommission: {
          type: Boolean,
          default: true,
        },
        commissionRate: {
          type: Number,
          default: 5, // Basic: 5%, Pro: 7%, Enterprise: 10%
        },
        maxReferrals: {
          type: Number,
          default: -1, // -1 = sınırsız
        },
        bonusThresholds: [
          {
            count: Number, // 10 referans
            bonus: Number, // €50 bonus
          },
        ],
      },

      // Bildirimler ve İletişim
      notifications: {
        emailNotifications: {
          type: Boolean,
          default: true,
        },
        smsNotifications: {
          type: Boolean,
          default: false, // Pro ve Enterprise için true
        },
        pushNotifications: {
          type: Boolean,
          default: true,
        },
        whatsappNotifications: {
          type: Boolean,
          default: false, // Enterprise için true
        },
      },

      // Güvenlik Özellikleri
      security: {
        twoFactorAuth: {
          type: Boolean,
          default: true,
        },
        ipWhitelisting: {
          type: Boolean,
          default: false, // Enterprise için true
        },
        sessionManagement: {
          type: Boolean,
          default: false, // Pro ve Enterprise için true
        },
        auditLogs: {
          type: Boolean,
          default: false, // Enterprise için true
        },
      },
    },

    // Kısıtlamalar
    restrictions: {
      minAge: {
        type: Number,
        default: 18,
      },
      allowedCountries: [String], // Boş = tüm ülkeler
      blockedCountries: [String],
      requiredKycLevel: {
        type: String,
        enum: ["none", "basic", "advanced", "full"],
        default: "none",
      },
      maxUsersCount: {
        type: Number,
        default: -1, // -1 = sınırsız
      },
    },

    // İstatistikler
    statistics: {
      activeUsers: {
        type: Number,
        default: 0,
      },
      totalRevenue: {
        type: Number,
        default: 0,
      },
      averageLifetime: {
        type: Number,
        default: 0, // days
      },
      churnRate: {
        type: Number,
        default: 0, // percentage
      },
      conversionRate: {
        type: Number,
        default: 0, // percentage
      },
    },

    // Promosyonlar
    promotions: {
      currentPromotion: {
        code: String,
        discountPercentage: Number,
        validUntil: Date,
        maxUses: Number,
        usedCount: {
          type: Number,
          default: 0,
        },
      },
    },

    // Metadata
    metadata: {
      color: String, // UI için renk kodu
      icon: String, // UI için ikon
      badge: String, // "Most Popular", "Best Value" vb.
      customFields: mongoose.Schema.Types.Mixed,
    },

    // Otomatik Yükseltme/Düşürme
    automation: {
      autoUpgrade: {
        enabled: {
          type: Boolean,
          default: false,
        },
        conditions: [
          {
            field: String, // örn: "totalInvestments"
            operator: String, // örn: ">"
            value: mongoose.Schema.Types.Mixed,
          },
        ],
        targetPlan: String,
      },
      autoDowngrade: {
        enabled: {
          type: Boolean,
          default: false,
        },
        inactivityDays: Number,
        targetPlan: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// MembershipPlanSchema.index({ name: 1 });
MembershipPlanSchema.index({ tier: 1 });
MembershipPlanSchema.index({ order: 1 });
MembershipPlanSchema.index({ isActive: 1, isVisible: 1 });

// Virtual: Toplam özellik sayısı
MembershipPlanSchema.virtual("totalFeatures").get(function () {
  let count = 0;

  const checkObject = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === "boolean" && obj[key]) count++;
      else if (typeof obj[key] === "number" && obj[key] > 0) count++;
      else if (Array.isArray(obj[key]) && obj[key].length > 0) count++;
      else if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
        checkObject(obj[key]);
      }
    }
  };

  checkObject(this.features);
  return count;
});

// Methods
MembershipPlanSchema.methods.isAvailableForUser = function (user) {
  // Ülke kontrolü
  if (this.restrictions.allowedCountries?.length > 0) {
    if (!this.restrictions.allowedCountries.includes(user.country)) {
      return false;
    }
  }

  if (this.restrictions.blockedCountries?.includes(user.country)) {
    return false;
  }

  // Yaş kontrolü
  if (user.age && user.age < this.restrictions.minAge) {
    return false;
  }

  // KYC kontrolü
  if (this.restrictions.requiredKycLevel !== "none") {
    // KYC seviyesi kontrolü yapılacak
    const kycLevels = ["none", "basic", "advanced", "full"];
    const requiredLevel = kycLevels.indexOf(this.restrictions.requiredKycLevel);
    const userLevel = kycLevels.indexOf(user.kycLevel || "none");

    if (userLevel < requiredLevel) {
      return false;
    }
  }

  // Maksimum kullanıcı kontrolü
  if (this.restrictions.maxUsersCount !== -1) {
    if (this.statistics.activeUsers >= this.restrictions.maxUsersCount) {
      return false;
    }
  }

  return true;
};

// Fiyat hesaplama
MembershipPlanSchema.methods.calculatePrice = function (
  interval,
  promoCode = null
) {
  let price =
    interval === "yearly"
      ? this.pricing.yearly.amount
      : this.pricing.monthly.amount;

  // Promosyon kodu kontrolü
  if (promoCode && this.promotions.currentPromotion) {
    if (
      this.promotions.currentPromotion.code === promoCode &&
      this.promotions.currentPromotion.validUntil > new Date() &&
      this.promotions.currentPromotion.usedCount <
        this.promotions.currentPromotion.maxUses
    ) {
      const discount =
        (price * this.promotions.currentPromotion.discountPercentage) / 100;
      price = price - discount;
    }
  }

  return {
    amount: price,
    currency:
      interval === "yearly"
        ? this.pricing.yearly.currency
        : this.pricing.monthly.currency,
    interval: interval,
    originalAmount:
      interval === "yearly"
        ? this.pricing.yearly.originalAmount
        : this.pricing.monthly.originalAmount,
  };
};

// Plan karşılaştırma
MembershipPlanSchema.methods.compareWith = function (otherPlan) {
  const comparison = {
    current: this.name,
    other: otherPlan.name,
    differences: [],
  };

  // Tier karşılaştırması
  if (this.tier < otherPlan.tier) {
    comparison.isUpgrade = true;
  } else if (this.tier > otherPlan.tier) {
    comparison.isDowngrade = true;
  } else {
    comparison.isSameTier = true;
  }

  // Özellik karşılaştırması
  const compareFeatures = (obj1, obj2, path = "") => {
    for (let key in obj2) {
      const fullPath = path ? `${path}.${key}` : key;

      if (typeof obj2[key] === "object" && !Array.isArray(obj2[key])) {
        compareFeatures(obj1[key] || {}, obj2[key], fullPath);
      } else {
        const val1 = obj1[key];
        const val2 = obj2[key];

        if (val1 !== val2) {
          comparison.differences.push({
            feature: fullPath,
            current: val1,
            new: val2,
            improved: val2 > val1 || (val2 === true && val1 === false),
          });
        }
      }
    }
  };

  compareFeatures(this.features, otherPlan.features);

  return comparison;
};

// Static Methods
MembershipPlanSchema.statics.getDefaultPlan = async function () {
  return await this.findOne({ isDefault: true, isActive: true });
};

MembershipPlanSchema.statics.getAvailablePlans = async function (user = null) {
  const query = { isActive: true, isVisible: true };
  const plans = await this.find(query).sort("order");

  if (user) {
    return plans.filter((plan) => plan.isAvailableForUser(user));
  }

  return plans;
};

MembershipPlanSchema.statics.getPlanByTier = async function (tier) {
  return await this.findOne({ tier: tier, isActive: true });
};

module.exports = mongoose.model("MembershipPlan", MembershipPlanSchema);
