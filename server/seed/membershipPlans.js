// server/seed/membershipPlans.js

const MembershipPlan = require("../models/MembershipPlan");
const mongoose = require("mongoose");
require("dotenv").config();
const membershipPlans = [
  {
    // BASIC PLAN
    name: "basic",
    displayName: "Basic",
    description: "Perfect for getting started with real estate investments",
    tier: 1,
    order: 1,
    isActive: true,
    isVisible: true,
    isDefault: true,
    isHighlighted: false,

    pricing: {
      monthly: {
        amount: 0,
        currency: "EUR",
      },
      yearly: {
        amount: 0,
        currency: "EUR",
        discountPercentage: 0,
      },
      trial: {
        enabled: false,
        days: 0,
        requiresCard: false,
      },
    },

    features: {
      investments: {
        maxActiveInvestments: 1,
        maxMonthlyInvestments: 1,
        minInvestmentAmount: 10000,
        maxInvestmentAmount: 100000,
        allowBulkInvestments: false,
      },
      properties: {
        maxActiveProperties: 0,
        canListProperties: false,
        priorityListing: false,
        featuredListingDays: 0,
      },
      commissions: {
        platformCommissionDiscount: 0,
        rentalCommissionDiscount: 0,
        referralBonusMultiplier: 1,
      },
      support: {
        level: "email",
        responseTime: "48h",
        hasPhoneSupport: false,
        hasDedicatedManager: false,
        hasLiveChat: false,
      },
      services: {
        includedServices: [],
        serviceDiscounts: {
          visa_consultancy: 0,
          legal_support: 0,
          tax_advisory: 0,
          property_management: 0,
        },
      },
      analytics: {
        hasBasicAnalytics: true,
        hasAdvancedAnalytics: false,
        hasMarketReports: false,
        hasCustomReports: false,
        dataExportFormats: [],
      },
      api: {
        hasAccess: false,
        rateLimit: 0,
        webhooksEnabled: false,
      },
      referral: {
        canEarnCommission: true,
        commissionRate: 5,
        maxReferrals: 10,
        bonusThresholds: [],
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        whatsappNotifications: false,
      },
      security: {
        twoFactorAuth: true,
        ipWhitelisting: false,
        sessionManagement: false,
        auditLogs: false,
      },
    },

    restrictions: {
      minAge: 18,
      allowedCountries: [],
      blockedCountries: [],
      requiredKycLevel: "basic",
      maxUsersCount: -1,
    },

    metadata: {
      color: "#6B7280",
      icon: "user",
      badge: "",
    },
  },

  {
    // PRO PLAN
    name: "pro",
    displayName: "Pro",
    description:
      "For serious investors who want more opportunities and benefits",
    tier: 2,
    order: 2,
    isActive: true,
    isVisible: true,
    isDefault: false,
    isHighlighted: true,
    isFeatured: true,

    pricing: {
      monthly: {
        amount: 19,
        currency: "EUR",
        originalAmount: 19,
      },
      yearly: {
        amount: 182.4, // 19 * 12 * 0.8 (20% discount)
        currency: "EUR",
        discountPercentage: 20,
        originalAmount: 228,
      },
      trial: {
        enabled: true,
        days: 7,
        requiresCard: true,
      },
    },

    features: {
      investments: {
        maxActiveInvestments: 5,
        maxMonthlyInvestments: 3,
        minInvestmentAmount: 5000,
        maxInvestmentAmount: 500000,
        allowBulkInvestments: false,
      },
      properties: {
        maxActiveProperties: 3,
        canListProperties: true,
        priorityListing: true,
        featuredListingDays: 7,
      },
      commissions: {
        platformCommissionDiscount: 1, // 1% discount
        rentalCommissionDiscount: 0.5, // 0.5% discount
        referralBonusMultiplier: 1.2,
      },
      support: {
        level: "priority",
        responseTime: "24h",
        hasPhoneSupport: false,
        hasDedicatedManager: false,
        hasLiveChat: true,
      },
      services: {
        includedServices: [],
        serviceDiscounts: {
          visa_consultancy: 10,
          legal_support: 5,
          tax_advisory: 5,
          property_management: 10,
        },
      },
      analytics: {
        hasBasicAnalytics: true,
        hasAdvancedAnalytics: true,
        hasMarketReports: false,
        hasCustomReports: false,
        dataExportFormats: ["csv"],
      },
      api: {
        hasAccess: false,
        rateLimit: 0,
        webhooksEnabled: false,
      },
      referral: {
        canEarnCommission: true,
        commissionRate: 7,
        maxReferrals: 50,
        bonusThresholds: [
          { count: 10, bonus: 50 },
          { count: 25, bonus: 150 },
        ],
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        whatsappNotifications: false,
      },
      security: {
        twoFactorAuth: true,
        ipWhitelisting: false,
        sessionManagement: true,
        auditLogs: false,
      },
    },

    restrictions: {
      minAge: 18,
      allowedCountries: [],
      blockedCountries: [],
      requiredKycLevel: "advanced",
      maxUsersCount: -1,
    },

    metadata: {
      color: "#3B82F6",
      icon: "star",
      badge: "Most Popular",
    },
  },

  {
    // ENTERPRISE PLAN
    name: "enterprise",
    displayName: "Enterprise",
    description:
      "Unlimited possibilities for professional investors and institutions",
    tier: 3,
    order: 3,
    isActive: true,
    isVisible: true,
    isDefault: false,
    isHighlighted: false,

    pricing: {
      monthly: {
        amount: 99,
        currency: "EUR",
        originalAmount: 99,
      },
      yearly: {
        amount: 950.4, // 99 * 12 * 0.8 (20% discount)
        currency: "EUR",
        discountPercentage: 20,
        originalAmount: 1188,
      },
      trial: {
        enabled: true,
        days: 14,
        requiresCard: true,
      },
    },

    features: {
      investments: {
        maxActiveInvestments: -1, // Unlimited
        maxMonthlyInvestments: -1,
        minInvestmentAmount: 1000,
        maxInvestmentAmount: -1,
        allowBulkInvestments: true,
      },
      properties: {
        maxActiveProperties: -1,
        canListProperties: true,
        priorityListing: true,
        featuredListingDays: 30,
      },
      commissions: {
        platformCommissionDiscount: 3, // 3% discount
        rentalCommissionDiscount: 2, // 2% discount
        referralBonusMultiplier: 1.5,
      },
      support: {
        level: "dedicated",
        responseTime: "2h",
        hasPhoneSupport: true,
        hasDedicatedManager: true,
        hasLiveChat: true,
      },
      services: {
        includedServices: ["visa_consultancy", "legal_support"],
        serviceDiscounts: {
          visa_consultancy: 100, // Free
          legal_support: 50,
          tax_advisory: 25,
          property_management: 25,
        },
      },
      analytics: {
        hasBasicAnalytics: true,
        hasAdvancedAnalytics: true,
        hasMarketReports: true,
        hasCustomReports: true,
        dataExportFormats: ["csv", "excel", "pdf"],
      },
      api: {
        hasAccess: true,
        rateLimit: 10000, // per month
        webhooksEnabled: true,
      },
      referral: {
        canEarnCommission: true,
        commissionRate: 10,
        maxReferrals: -1,
        bonusThresholds: [
          { count: 10, bonus: 100 },
          { count: 25, bonus: 300 },
          { count: 50, bonus: 750 },
          { count: 100, bonus: 2000 },
        ],
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        whatsappNotifications: true,
      },
      security: {
        twoFactorAuth: true,
        ipWhitelisting: true,
        sessionManagement: true,
        auditLogs: true,
      },
    },

    restrictions: {
      minAge: 18,
      allowedCountries: [],
      blockedCountries: [],
      requiredKycLevel: "full",
      maxUsersCount: -1,
    },

    metadata: {
      color: "#10B981",
      icon: "crown",
      badge: "Best Value",
    },
  },
];

// Seed function
async function seedMembershipPlans() {
  try {
    console.log("🌱 Seeding Membership Plans...");

    // Clear existing plans
    await MembershipPlan.deleteMany({});
    console.log("✅ Cleared existing plans");

    // Insert new plans
    for (const plan of membershipPlans) {
      const newPlan = await MembershipPlan.create(plan);
      console.log(`✅ Created ${newPlan.displayName} plan`);
    }

    console.log("🎉 Membership Plans seeded successfully!");

    // Verify
    const count = await MembershipPlan.countDocuments();
    console.log(`📊 Total plans in database: ${count}`);

    return true;
  } catch (error) {
    console.error("❌ Error seeding membership plans:", error);
    throw error;
  }
}

// Export for use in main seed file or standalone
module.exports = {
  membershipPlans,
  seedMembershipPlans,
};

// Run if executed directly
if (require.main === module) {
  mongoose
    .connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/pledged_platform"
    )
    .then(() => {
      console.log("📦 Connected to MongoDB");
      return seedMembershipPlans();
    })
    .then(() => {
      console.log("✨ Seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}
