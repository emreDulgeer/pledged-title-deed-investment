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
    },
    displayName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    tier: {
      type: Number, // 1,2,3,... sınırsız
      required: true,
      min: 1, // 0 ve eksi olmasın
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

    // Fiyatlandırma
    pricing: {
      monthly: {
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        currency: {
          type: String,
          default: "EUR",
        },
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
          default: 0, // Yıllık ödemede indirim %
        },
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
          default: 0,
        },
        requiresCard: {
          type: Boolean,
          default: true,
        },
      },
    },

    // Özellikler ve Limitler (Admin tarafından özelleştirilebilir)
    features: {
      // Yatırım Limitleri
      investments: {
        maxActiveInvestments: {
          type: Number,
          default: 1,
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
      },
      properties: {
        // aktif sayılan durumlar: pending_review, published, in_contract, active
        maxActiveListings: { type: Number, default: 1, min: -1 }, // -1 = sınırsız
        maxPublishedProperties: { type: Number, default: 1, min: -1 },
        maxConcurrentContracts: { type: Number, default: 1, min: -1 },
      },
      // Komisyon İndirimleri (%)
      commissions: {
        platformCommissionDiscount: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        rentalCommissionDiscount: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        transferCommissionDiscount: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
      },

      // Destek Seviyeleri
      support: {
        level: {
          type: String,
          enum: ["basic", "priority", "dedicated", "vip"],
          default: "basic",
        },
        responseTimeHours: {
          type: Number,
          default: 48,
        },
        hasPhoneSupport: {
          type: Boolean,
          default: false,
        },
        hasLiveChat: {
          type: Boolean,
          default: false,
        },
        hasDedicatedManager: {
          type: Boolean,
          default: false,
        },
      },

      // Platform Özellikleri
      platform: {
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
        hasAdvancedFilters: {
          type: Boolean,
          default: false,
        },
        hasBulkOperations: {
          type: Boolean,
          default: false,
        },
        hasExportFeature: {
          type: Boolean,
          default: false,
        },
        canCreateAlerts: {
          type: Boolean,
          default: false,
        },
        maxAlertsCount: {
          type: Number,
          default: 0,
        },
      },

      // Servis İndirimleri ve Dahil Olanlar
      services: {
        includedServices: [
          {
            type: String,
            enum: [
              "visa_consultancy",
              "legal_support",
              "appraisal",
              "insurance",
              "notary",
              "translation",
              "tax_consultancy",
              "property_management",
            ],
          },
        ],
        serviceDiscountRate: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        freeServiceCredits: {
          type: Number,
          default: 0, // Aylık ücretsiz servis hakkı
        },
      },

      // Ek Özellikler
      extras: {
        referralBonusRate: {
          type: Number,
          default: 0, // Referans komisyon oranı %
        },
        cashbackRate: {
          type: Number,
          default: 0, // Cashback oranı %
        },
        priorityProcessing: {
          type: Boolean,
          default: false,
        },
        exclusiveDeals: {
          type: Boolean,
          default: false,
        },
        earlyAccess: {
          type: Boolean,
          default: false,
        },
      },

      // Özel Alanlar (Admin tarafından tanımlanabilir)
      customFeatures: [
        {
          key: {
            type: String,
            required: true,
          },
          value: mongoose.Schema.Types.Mixed,
          description: String,
        },
      ],
    },

    // Kısıtlamalar
    restrictions: {
      minAge: {
        type: Number,
        default: 18,
      },
      requiredKycLevel: {
        type: String,
        enum: ["none", "basic", "advanced", "full"],
        default: "none",
      },
      allowedCountries: [String], // Boş = tüm ülkeler
      blockedCountries: [String],
      requiredReferral: {
        type: Boolean,
        default: false,
      },
      maxUsersCount: {
        type: Number,
        default: -1, // -1 = sınırsız
      },
    },

    // Promosyonlar
    promotions: {
      hasPromotion: {
        type: Boolean,
        default: false,
      },
      promotionType: {
        type: String,
        enum: ["percentage", "fixed", "trial_extension"],
      },
      promotionValue: Number,
      promotionCode: String,
      promotionStartDate: Date,
      promotionEndDate: Date,
      promotionMaxUses: {
        type: Number,
        default: -1,
      },
      promotionUsedCount: {
        type: Number,
        default: 0,
      },
    },

    // İstatistikler
    statistics: {
      totalUsers: {
        type: Number,
        default: 0,
      },
      activeUsers: {
        type: Number,
        default: 0,
      },
      monthlyRevenue: {
        type: Number,
        default: 0,
      },
      totalRevenue: {
        type: Number,
        default: 0,
      },
      averageLifetime: {
        type: Number,
        default: 0, // Ortalama kullanım süresi (gün)
      },
      churnRate: {
        type: Number,
        default: 0, // %
      },
    },

    // Metadata
    metadata: {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      version: {
        type: Number,
        default: 1,
      },
      changeLog: [
        {
          date: {
            type: Date,
            default: Date.now,
          },
          changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          changes: String,
        },
      ],
      internalNotes: String,
      tags: [String],
    },

    // Otomatik Kurallar
    automations: {
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
MembershipPlanSchema.index({ name: 1 });
MembershipPlanSchema.index({ order: 1 });
MembershipPlanSchema.index({ isActive: 1, isVisible: 1 });

// Virtual: Toplam özellik sayısı
MembershipPlanSchema.virtual("totalFeatures").get(function () {
  let count = 0;

  // Tüm boolean özellikleri say
  const checkObject = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === "boolean" && obj[key]) count++;
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

  // Promosyon kontrolü
  if (
    promoCode &&
    this.promotions.hasPromotion &&
    this.promotions.promotionCode === promoCode
  ) {
    if (new Date() <= this.promotions.promotionEndDate) {
      if (this.promotions.promotionType === "percentage") {
        price = price * (1 - this.promotions.promotionValue / 100);
      } else if (this.promotions.promotionType === "fixed") {
        price = Math.max(0, price - this.promotions.promotionValue);
      }
    }
  }

  // Yıllık indirim
  if (interval === "yearly" && this.pricing.yearly.discountPercentage > 0) {
    const monthlyTotal = this.pricing.monthly.amount * 12;
    const discount =
      monthlyTotal * (this.pricing.yearly.discountPercentage / 100);
    price = monthlyTotal - discount;
  }

  return price;
};

// Static Methods
MembershipPlanSchema.statics.createDefaultPlans = async function () {
  const defaultPlans = [
    {
      name: "basic",
      displayName: "Basic",
      description: "Yeni başlayanlar için ideal",
      order: 1,
      tier: 1,
      isDefault: true,
      pricing: {
        monthly: { amount: 0 },
        yearly: { amount: 0 },
      },
      features: {
        investments: { maxActiveInvestments: 1 },
        owners: { maxActiveProperties: 1, maxActiveContracts: 1 },
        support: { level: "basic", responseTimeHours: 48 },
      },
    },
    {
      name: "pro",
      displayName: "Professional",
      description: "Aktif yatırımcılar için",
      order: 2,
      isHighlighted: true,
      pricing: {
        monthly: { amount: 19 },
        yearly: { amount: 190, discountPercentage: 16.67 },
      },
      features: {
        investments: { maxActiveInvestments: 5 },
        owners: { maxActiveProperties: 5, maxActiveContracts: 5 },
        commissions: { platformCommissionDiscount: 1 },
        support: { level: "priority", responseTimeHours: 24 },
        platform: { hasAnalyticsAccess: true },
      },
    },
    {
      name: "enterprise",
      displayName: "Enterprise",
      description: "Kurumsal yatırımcılar için",
      order: 3,
      pricing: {
        monthly: { amount: 99 },
        yearly: { amount: 990, discountPercentage: 16.67 },
      },
      features: {
        investments: { maxActiveInvestments: -1 },
        owners: { maxActiveProperties: -1, maxActiveContracts: -1 },
        commissions: { platformCommissionDiscount: 3 },
        support: {
          level: "dedicated",
          responseTimeHours: 4,
          hasPhoneSupport: true,
          hasDedicatedManager: true,
        },
        platform: {
          hasAnalyticsAccess: true,
          hasApiAccess: true,
          hasCustomReports: true,
        },
        services: {
          includedServices: ["visa_consultancy", "legal_support"],
          serviceDiscountRate: 100,
        },
      },
    },
  ];

  for (const planData of defaultPlans) {
    await this.findOneAndUpdate({ name: planData.name }, planData, {
      upsert: true,
      new: true,
    });
  }
};

// Plan karşılaştırma
MembershipPlanSchema.statics.comparePlans = function (plan1, plan2) {
  const getValue = (plan, path) => {
    const keys = path.split(".");
    let value = plan;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  };

  const comparison = {
    pricing: {
      monthly: {
        plan1: plan1.pricing.monthly.amount,
        plan2: plan2.pricing.monthly.amount,
        difference: plan2.pricing.monthly.amount - plan1.pricing.monthly.amount,
      },
    },
    features: {},
  };

  // Özellikleri karşılaştır
  const compareFeatures = (obj1, obj2, path = "") => {
    for (const key in obj2) {
      const fullPath = path ? `${path}.${key}` : key;

      if (typeof obj2[key] === "object" && !Array.isArray(obj2[key])) {
        compareFeatures(obj1?.[key] || {}, obj2[key], fullPath);
      } else {
        comparison.features[fullPath] = {
          plan1: obj1?.[key],
          plan2: obj2[key],
          upgraded:
            obj2[key] > obj1?.[key] ||
            (obj2[key] === true && obj1?.[key] === false),
        };
      }
    }
  };

  compareFeatures(plan1.features, plan2.features);

  return comparison;
};

module.exports = mongoose.model("MembershipPlan", MembershipPlanSchema);
