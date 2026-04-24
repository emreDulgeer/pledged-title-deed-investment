const path = require("path");
const bcrypt = require("bcryptjs");
require("../models");

const User = require("../models/User");
const Investor = require("../models/Investor");
const PropertyOwner = require("../models/PropertyOwner");
const LocalRepresentative = require("../models/LocalRepresentative");
const Admin = require("../models/Admin");
const Property = require("../models/Property");
const Investment = require("../models/Investment");
const Notification = require("../models/Notification");
const MembershipPlan = require("../models/MembershipPlan");
const Membership = require("../models/Membership");
const RentalPayment = require("../models/RentalPayment");
const ActivityLog = require("../models/ActivityLog");
const {
  addDays,
  addMonths,
  buildInvestmentDownloadUrl,
  buildMembershipFeatures,
  buildPreviewUrl,
  connectToDatabase,
  createObjectId,
  createStorageProvider,
  disconnectDatabase,
  resetDatabaseAndStorage,
  startOfMonthOffset,
  uploadSeedAsset,
} = require("./seedSupport");

const now = new Date();
const daysAgo = (days) => addDays(now, -days);
const daysFromNow = (days) => addDays(now, days);
const monthsFromNow = (months) => addMonths(now, months);
const monthKey = (offset) => {
  const value = startOfMonthOffset(now, offset);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
};

const dummyDir = path.resolve(__dirname, "../../misc/Dummy Files");
const dummyFiles = {
  titleDeed: path.join(dummyDir, "TitleDeed_Dummy.pdf"),
  annotation: path.join(dummyDir, "Annotation_Dummy.pdf"),
  valuation: path.join(dummyDir, "ValuationReport_Dummy.pdf"),
  tax: path.join(dummyDir, "TaxDocument_Dummy.pdf"),
  floorPlan: path.join(dummyDir, "FloorPlan_Dummy.pdf"),
  other: path.join(dummyDir, "Other_Dummy.pdf"),
  genericPdf: path.join(dummyDir, "DummyPdf.pdf"),
  investmentContract: path.join(dummyDir, "InvestmentContract_Dummy.pdf"),
  investmentOther: path.join(dummyDir, "InvestmentOther_Dummy.pdf"),
  paymentReceipt: path.join(dummyDir, "PaymentReceipt_Dummy.pdf"),
  investmentTaxReceipt: path.join(dummyDir, "InvestmentTaxReceipt_Dummy.pdf"),
  investmentTitleDeed: path.join(
    dummyDir,
    "InvestmentTitleDeedDocument_Dummy.pdf"
  ),
  notaryDocument: path.join(dummyDir, "NotaryDocument_Dummy.pdf"),
  powerOfAttorney: path.join(dummyDir, "PowerOfAttorney_Dummy.pdf"),
  refundReceipt: path.join(dummyDir, "RefundReceipt_Dummy.pdf"),
  rentalReceipt: path.join(dummyDir, "RentalReceipt_Dummy.pdf"),
  transferDocument: path.join(dummyDir, "TransferDocument_Dummy.pdf"),
  imageWideA: path.join(dummyDir, "DallE1792x1024.webp"),
  imageWideB: path.join(dummyDir, "DallE1792x1024-2.webp"),
  imageLandscape: path.join(dummyDir, "DallE1600x1200.webp"),
  imageTablet: path.join(dummyDir, "DallE1024x768.webp"),
  imageBanner: path.join(dummyDir, "DallE1280x720.webp"),
  imagePhone: path.join(dummyDir, "DallE Phone.webp"),
  imageSquare: path.join(dummyDir, "DallE Kare.webp"),
};

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

function baseConsents(marketing = false) {
  return {
    terms: true,
    gdpr: true,
    marketing,
    timestamp: daysAgo(120),
  };
}

function baseTrustedIp(ip, name) {
  return [
    {
      ip,
      name,
      addedAt: daysAgo(60),
      lastUsedAt: daysAgo(1),
    },
  ];
}

function baseLoginHistory(ip, success = true) {
  return [
    {
      ip,
      userAgent: "Seeded Browser",
      location: "Istanbul",
      success,
      reason: success ? "seed-login" : "seed-failure",
      timestamp: daysAgo(1),
    },
  ];
}

function buildPropertyImageEntry(fileMetadata, options = {}) {
  const width = fileMetadata.metadata?.dimensions?.width;
  const height = fileMetadata.metadata?.dimensions?.height;

  return {
    fileId: fileMetadata._id,
    url: fileMetadata.url,
    isPrimary: !!options.isPrimary,
    presentation: {
      role: options.isPrimary ? "cover" : "gallery",
      focusX: options.focusX ?? 50,
      focusY: options.focusY ?? 50,
      cropPreset: options.cropPreset || "16:9",
    },
    quality: {
      width,
      height,
      aspectRatio:
        width && height ? Number((width / height).toFixed(3)) : undefined,
      sizeBytes: fileMetadata.size,
      warnings: options.warnings || [],
    },
    order: options.order ?? 0,
    uploadedAt: options.uploadedAt || daysAgo(1),
  };
}

function buildPropertyDocumentEntry(fileMetadata, options = {}) {
  return {
    type: options.type,
    fileId: fileMetadata._id,
    url: fileMetadata.url,
    fileName: fileMetadata.originalName,
    description: options.description,
    uploadedAt: options.uploadedAt || daysAgo(1),
    uploadedBy: options.uploadedBy,
    verifiedBy: options.verifiedBy,
    verifiedAt: options.verifiedAt,
  };
}

function buildInvestmentFileEntry(fileMetadata, options = {}) {
  return {
    fileId: fileMetadata._id,
    url: fileMetadata.url,
    uploadedAt: options.uploadedAt || daysAgo(1),
    uploadedBy: options.uploadedBy,
    verifiedBy: options.verifiedBy,
    verifiedAt: options.verifiedAt,
  };
}

function buildEmbeddedFileRef(fileMetadata) {
  return {
    fileId: fileMetadata._id,
    url: fileMetadata.url,
  };
}

async function finalizePropertyFile(fileMetadata) {
  fileMetadata.url = buildPreviewUrl(fileMetadata._id);
  await fileMetadata.save();
  return fileMetadata;
}

async function finalizeInvestmentFile(fileMetadata, investmentId) {
  fileMetadata.url = buildInvestmentDownloadUrl(investmentId, fileMetadata._id);
  await fileMetadata.save();
  return fileMetadata;
}

async function createPropertyImage(
  provider,
  { sourcePath, seedKey, propertyId, ownerId, order, isPrimary, focusX, focusY },
) {
  const fileMetadata = await uploadSeedAsset({
    provider,
    sourcePath,
    seedKey,
    uploadedBy: ownerId,
    relatedModel: "Property",
    relatedId: propertyId,
    documentType: "property_image",
    isPublic: true,
    tags: ["seed", "property", "image"],
  });

  await finalizePropertyFile(fileMetadata);

  return buildPropertyImageEntry(fileMetadata, {
    order,
    isPrimary,
    focusX,
    focusY,
    uploadedAt: daysAgo(20 - order),
  });
}

async function createPropertyDocument(
  provider,
  {
    sourcePath,
    seedKey,
    propertyId,
    uploadedBy,
    type,
    description,
    verifiedBy,
    verifiedAt,
    uploadedAt,
  },
) {
  const documentType =
    type === "title_deed" || type === "annotation" ? type : "other";

  const fileMetadata = await uploadSeedAsset({
    provider,
    sourcePath,
    seedKey,
    uploadedBy,
    relatedModel: "Property",
    relatedId: propertyId,
    documentType,
    isPublic: false,
    description,
    tags: ["seed", "property", "document", type],
    customData: {
      propertyDocumentType: type,
    },
  });

  await finalizePropertyFile(fileMetadata);

  return buildPropertyDocumentEntry(fileMetadata, {
    type,
    description,
    uploadedBy,
    uploadedAt,
    verifiedBy,
    verifiedAt,
  });
}

async function createInvestmentDocument(
  provider,
  {
    sourcePath,
    seedKey,
    investmentId,
    uploadedBy,
    documentType,
    description,
    uploadedAt,
    verifiedBy,
    verifiedAt,
  },
) {
  const normalizedDocumentType = [
    "contract",
    "title_deed",
    "payment_receipt",
    "rental_receipt",
    "notary_document",
    "power_of_attorney",
    "tax_receipt",
    "transfer_document",
    "refund_receipt",
  ].includes(documentType)
    ? documentType
    : "other";

  const fileMetadata = await uploadSeedAsset({
    provider,
    sourcePath,
    seedKey,
    uploadedBy,
    relatedModel: "Investment",
    relatedId: investmentId,
    documentType: normalizedDocumentType,
    isPublic: false,
    description,
    tags: ["seed", "investment", "document", documentType],
    customData: {
      investmentDocumentType: documentType,
    },
  });

  await finalizeInvestmentFile(fileMetadata, investmentId);

  return {
    fileMetadata,
    embedded: buildInvestmentFileEntry(fileMetadata, {
      uploadedAt,
      uploadedBy,
      verifiedBy,
      verifiedAt,
    }),
  };
}

async function createMembershipPlans() {
  const plans = await MembershipPlan.create([
    {
      name: "basic",
      displayName: "Basic",
      description: "Entry level plan for browsing and a first investment.",
      tier: 1,
      order: 1,
      isActive: true,
      isVisible: true,
      isDefault: true,
      pricing: {
        monthly: { amount: 0, currency: "EUR" },
        yearly: { amount: 0, currency: "EUR", discountPercentage: 0 },
      },
      features: {
        investments: {
          maxActiveInvestments: 1,
          maxMonthlyInvestments: 1,
          minInvestmentAmount: 10000,
          maxInvestmentAmount: 100000,
        },
        properties: {
          maxActiveProperties: 1,
          canListProperties: true,
        },
        commissions: {
          platformCommissionDiscount: 0,
          rentalCommissionDiscount: 0,
          referralBonusMultiplier: 1,
        },
        support: {
          level: "email",
          responseTime: "48h",
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
        },
      },
    },
    {
      name: "pro",
      displayName: "Pro",
      description: "Balanced plan for active investors and property owners.",
      tier: 2,
      order: 2,
      isActive: true,
      isVisible: true,
      isHighlighted: true,
      pricing: {
        monthly: { amount: 29, currency: "EUR" },
        yearly: { amount: 290, currency: "EUR", discountPercentage: 17 },
        trial: {
          enabled: true,
          days: 7,
          requiresCard: false,
        },
      },
      features: {
        investments: {
          maxActiveInvestments: 5,
          maxMonthlyInvestments: 5,
          minInvestmentAmount: 5000,
          maxInvestmentAmount: 500000,
        },
        properties: {
          maxActiveProperties: 6,
          canListProperties: true,
          priorityListing: true,
          featuredListingDays: 7,
        },
        commissions: {
          platformCommissionDiscount: 1,
          rentalCommissionDiscount: 1,
          referralBonusMultiplier: 1.2,
        },
        support: {
          level: "priority",
          responseTime: "24h",
          hasPhoneSupport: true,
          hasLiveChat: true,
        },
        services: {
          includedServices: ["legal_support", "translation_services"],
          serviceDiscounts: {
            visa_consultancy: 10,
            legal_support: 15,
            tax_advisory: 10,
            property_management: 5,
          },
        },
        analytics: {
          hasBasicAnalytics: true,
          hasAdvancedAnalytics: true,
          hasMarketReports: false,
          hasCustomReports: false,
        },
      },
      metadata: {
        badge: "Popular",
        color: "#2563EB",
      },
    },
    {
      name: "enterprise",
      displayName: "Enterprise",
      description: "Unlimited usage with dedicated support and premium services.",
      tier: 3,
      order: 3,
      isActive: true,
      isVisible: true,
      pricing: {
        monthly: { amount: 129, currency: "EUR" },
        yearly: { amount: 1290, currency: "EUR", discountPercentage: 17 },
      },
      features: {
        investments: {
          maxActiveInvestments: -1,
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
          platformCommissionDiscount: 3,
          rentalCommissionDiscount: 2,
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
          includedServices: [
            "visa_consultancy",
            "legal_support",
            "tax_advisory",
            "property_management",
            "investment_advisory",
          ],
          serviceDiscounts: {
            visa_consultancy: 100,
            legal_support: 50,
            tax_advisory: 50,
            property_management: 25,
          },
        },
        analytics: {
          hasBasicAnalytics: true,
          hasAdvancedAnalytics: true,
          hasMarketReports: true,
          hasCustomReports: true,
        },
      },
      metadata: {
        badge: "Best Value",
        color: "#059669",
      },
    },
  ]);

  return {
    basic: plans[0],
    pro: plans[1],
    enterprise: plans[2],
  };
}

async function createUsers() {
  const passwordHashes = {
    emre: await hashPassword("Test123!@#"),
    lara: await hashPassword("Lara123!@#"),
    selin: await hashPassword("Selin123!@#"),
    ayse: await hashPassword("Owner123!@#"),
    mehmet: await hashPassword("Mehmet123!@#"),
    john: await hashPassword("Rep123!@#"),
    admin: await hashPassword("Admin123!@#"),
  };

  const investorEmre = await Investor.create({
    email: "emre@investor.com",
    password: passwordHashes.emre,
    firstName: "Emre",
    lastName: "Yilmaz",
    fullName: "Emre Yilmaz",
    role: "investor",
    phoneNumber: "+905551234567",
    country: "Turkey",
    emailVerified: true,
    emailVerifiedAt: daysAgo(180),
    phoneVerified: true,
    phoneVerifiedAt: daysAgo(170),
    accountStatus: "active",
    membershipPlan: "pro",
    membershipStatus: "active",
    membershipActivatedAt: daysAgo(90),
    membershipExpiresAt: monthsFromNow(3),
    lastLoginAt: daysAgo(1),
    lastLoginIP: "95.70.1.10",
    registrationIP: "95.70.1.10",
    trustedIPs: [
      ...baseTrustedIp("95.70.1.10", "Home"),
      {
        ip: "85.105.21.90",
        name: "Office",
        addedAt: daysAgo(30),
        lastUsedAt: daysAgo(4),
      },
    ],
    consents: baseConsents(true),
    kycStatus: "Approved",
    is2FAEnabled: false,
    riskScore: 24,
    trustScore: 94,
    paymentHistory: [
      {
        paymentId: "pay_seed_emre_pro_01",
        amount: 29,
        currency: "EUR",
        method: "credit_card",
        plan: "pro",
        type: "membership_activation",
        status: "completed",
        date: daysAgo(90),
      },
    ],
    loginHistory: baseLoginHistory("95.70.1.10"),
    activeSessions: [
      {
        tokenId: "sess_seed_emre",
        deviceInfo: "Chrome on macOS",
        ip: "95.70.1.10",
        location: "Istanbul",
        createdAt: daysAgo(1),
        lastActivityAt: daysAgo(1),
      },
    ],
    investments: [],
    rentalIncome: [],
    favoriteProperties: [],
    bankAccountInfo: {
      iban: "TR120006700000000000123456",
      bankName: "Example Bank TR",
    },
    referralCode: "EMRE-PRO",
    activeInvestmentCount: 3,
    investmentLimit: 5,
    subscription: {
      currentPlan: "Pro",
      startDate: daysAgo(90),
      endDate: monthsFromNow(3),
      autoRenew: true,
    },
  });

  const investorLara = await Investor.create({
    email: "lara@investor.com",
    password: passwordHashes.lara,
    firstName: "Lara",
    lastName: "Costa",
    fullName: "Lara Costa",
    role: "investor",
    phoneNumber: "+351912000111",
    country: "Portugal",
    emailVerified: true,
    emailVerifiedAt: daysAgo(80),
    phoneVerified: true,
    phoneVerifiedAt: daysAgo(79),
    accountStatus: "active",
    membershipPlan: "basic",
    membershipStatus: "active",
    membershipActivatedAt: daysAgo(45),
    membershipExpiresAt: monthsFromNow(1),
    lastLoginAt: daysAgo(2),
    lastLoginIP: "89.214.44.33",
    registrationIP: "89.214.44.33",
    trustedIPs: baseTrustedIp("89.214.44.33", "Home"),
    consents: baseConsents(false),
    kycStatus: "Approved",
    riskScore: 31,
    trustScore: 88,
    loginHistory: baseLoginHistory("89.214.44.33"),
    investments: [],
    rentalIncome: [],
    favoriteProperties: [],
    bankAccountInfo: {
      iban: "PT50000201239876543219876",
      bankName: "Banco Seed",
    },
    activeInvestmentCount: 0,
    investmentLimit: 1,
    subscription: {
      currentPlan: "Basic",
      startDate: daysAgo(45),
      endDate: monthsFromNow(1),
      autoRenew: true,
    },
  });

  const investorSelin = await Investor.create({
    email: "selin@investor.com",
    password: passwordHashes.selin,
    firstName: "Selin",
    lastName: "Arslan",
    fullName: "Selin Arslan",
    role: "investor",
    phoneNumber: "+905302223344",
    country: "Turkey",
    emailVerified: true,
    emailVerifiedAt: daysAgo(5),
    phoneVerified: false,
    accountStatus: "active",
    membershipPlan: "basic",
    membershipStatus: "inactive",
    lastLoginAt: null,
    lastLoginIP: null,
    registrationIP: "78.189.12.44",
    trustedIPs: baseTrustedIp("78.189.12.44", "Registration"),
    consents: baseConsents(false),
    kycStatus: "Pending",
    riskScore: 50,
    trustScore: 75,
    loginHistory: [],
    investments: [],
    rentalIncome: [],
    favoriteProperties: [],
    activeInvestmentCount: 0,
    investmentLimit: 1,
    subscription: {
      currentPlan: "Basic",
      autoRenew: false,
    },
  });

  const ownerAyse = await PropertyOwner.create({
    email: "ayse@owner.com",
    password: passwordHashes.ayse,
    firstName: "Ayse",
    lastName: "Demir",
    fullName: "Ayse Demir",
    role: "property_owner",
    phoneNumber: "+351913456789",
    country: "Portugal",
    emailVerified: true,
    emailVerifiedAt: daysAgo(220),
    phoneVerified: true,
    phoneVerifiedAt: daysAgo(215),
    accountStatus: "active",
    membershipPlan: "pro",
    membershipStatus: "active",
    membershipActivatedAt: daysAgo(120),
    membershipExpiresAt: monthsFromNow(2),
    lastLoginAt: daysAgo(1),
    lastLoginIP: "85.240.14.21",
    registrationIP: "85.240.14.21",
    trustedIPs: [
      ...baseTrustedIp("85.240.14.21", "Home"),
      {
        ip: "85.240.14.22",
        name: "Office",
        addedAt: daysAgo(40),
        lastUsedAt: daysAgo(2),
      },
    ],
    consents: baseConsents(true),
    kycStatus: "Approved",
    is2FAEnabled: true,
    riskScore: 18,
    trustScore: 96,
    loginHistory: baseLoginHistory("85.240.14.21"),
    properties: [],
    rentPaymentHistory: [],
    bankAccountInfo: {
      iban: "PT50000201230000000001234",
      bankName: "Banco Lisboa",
    },
    completedContracts: 0,
    ongoingContracts: 2,
    totalProperties: 4,
    ownerTrustScore: 91,
  });

  const ownerMehmet = await PropertyOwner.create({
    email: "mehmet@owner.com",
    password: passwordHashes.mehmet,
    firstName: "Mehmet",
    lastName: "Kaya",
    fullName: "Mehmet Kaya",
    role: "property_owner",
    phoneNumber: "+995599223344",
    country: "Georgia",
    emailVerified: true,
    emailVerifiedAt: daysAgo(200),
    phoneVerified: true,
    phoneVerifiedAt: daysAgo(195),
    accountStatus: "active",
    membershipPlan: "basic",
    membershipStatus: "active",
    membershipActivatedAt: daysAgo(150),
    membershipExpiresAt: monthsFromNow(1),
    lastLoginAt: daysAgo(3),
    lastLoginIP: "176.221.15.31",
    registrationIP: "176.221.15.31",
    trustedIPs: baseTrustedIp("176.221.15.31", "Home"),
    consents: baseConsents(false),
    kycStatus: "Approved",
    riskScore: 29,
    trustScore: 87,
    loginHistory: baseLoginHistory("176.221.15.31"),
    properties: [],
    rentPaymentHistory: [],
    bankAccountInfo: {
      iban: "GE29NB0000000101904917",
      bankName: "Tbilisi Capital",
    },
    completedContracts: 1,
    ongoingContracts: 2,
    totalProperties: 4,
    ownerTrustScore: 84,
  });

  const localRepJohn = await LocalRepresentative.create({
    email: "john@rep.com",
    password: passwordHashes.john,
    firstName: "John",
    lastName: "Pereira",
    fullName: "John Pereira",
    role: "local_representative",
    phoneNumber: "+35699223311",
    country: "Malta",
    region: "Portugal & Malta",
    emailVerified: true,
    emailVerifiedAt: daysAgo(260),
    phoneVerified: true,
    phoneVerifiedAt: daysAgo(255),
    accountStatus: "active",
    membershipPlan: "enterprise",
    membershipStatus: "active",
    membershipActivatedAt: daysAgo(200),
    membershipExpiresAt: monthsFromNow(6),
    lastLoginAt: daysAgo(1),
    lastLoginIP: "91.198.77.44",
    registrationIP: "91.198.77.44",
    trustedIPs: baseTrustedIp("91.198.77.44", "Field Tablet"),
    consents: baseConsents(false),
    kycStatus: "Approved",
    is2FAEnabled: true,
    riskScore: 12,
    trustScore: 97,
    loginHistory: baseLoginHistory("91.198.77.44"),
    managedProperties: [],
    assistedTransactions: [],
    commissionEarned: {
      total: 4200,
      pending: 850,
      paid: 3350,
      history: [
        {
          amount: 1200,
          type: "investment",
          date: daysAgo(30),
          status: "paid",
          description: "Valletta property transfer assistance",
        },
      ],
    },
    bankAccountInfo: {
      iban: "MT84MALT011000012345MTLCAST001S",
      bankName: "Malta Operations Bank",
      accountHolder: "John Pereira",
    },
    referralStats: {
      totalReferred: 3,
      activeUsers: 2,
      totalCommissionFromReferrals: 600,
    },
  });

  const adminUser = await Admin.create({
    email: "admin@admin.com",
    password: passwordHashes.admin,
    firstName: "Admin",
    lastName: "User",
    fullName: "Admin User",
    role: "admin",
    phoneNumber: "+905559876543",
    country: "Turkey",
    emailVerified: true,
    emailVerifiedAt: daysAgo(300),
    phoneVerified: true,
    phoneVerifiedAt: daysAgo(290),
    accountStatus: "active",
    membershipPlan: "enterprise",
    membershipStatus: "active",
    membershipActivatedAt: daysAgo(300),
    membershipExpiresAt: monthsFromNow(12),
    lastLoginAt: daysAgo(1),
    lastLoginIP: "10.0.0.10",
    registrationIP: "10.0.0.10",
    trustedIPs: baseTrustedIp("10.0.0.10", "HQ"),
    consents: baseConsents(false),
    kycStatus: "Approved",
    is2FAEnabled: true,
    riskScore: 5,
    trustScore: 100,
    loginHistory: baseLoginHistory("10.0.0.10"),
    accessLevel: "Global",
  });

  return {
    investorEmre,
    investorLara,
    investorSelin,
    ownerAyse,
    ownerMehmet,
    localRepJohn,
    adminUser,
  };
}

async function createMemberships(plans, users) {
  const memberships = [
    {
      user: users.investorEmre,
      plan: plans.pro,
      amount: 29,
      interval: "monthly",
    },
    {
      user: users.investorLara,
      plan: plans.basic,
      amount: 0,
      interval: "monthly",
    },
    {
      user: users.ownerAyse,
      plan: plans.pro,
      amount: 29,
      interval: "monthly",
    },
    {
      user: users.ownerMehmet,
      plan: plans.basic,
      amount: 0,
      interval: "monthly",
    },
    {
      user: users.localRepJohn,
      plan: plans.enterprise,
      amount: 1290,
      interval: "yearly",
    },
    {
      user: users.adminUser,
      plan: plans.enterprise,
      amount: 0,
      interval: "yearly",
    },
  ];

  for (const item of memberships) {
    await Membership.create({
      user: item.user._id,
      plan: item.plan._id,
      planName: item.plan.name,
      status: "active",
      pricing: {
        amount: item.amount,
        currency: "EUR",
        interval: item.interval,
      },
      subscription: {
        currentPeriodStart: daysAgo(30),
        currentPeriodEnd: monthsFromNow(item.interval === "yearly" ? 12 : 1),
        cancelAtPeriodEnd: false,
        trialUsed: false,
      },
      activatedAt: daysAgo(30),
      expiresAt: monthsFromNow(item.interval === "yearly" ? 12 : 1),
      renewalDate: monthsFromNow(item.interval === "yearly" ? 12 : 1),
      lastPaymentDate: item.amount > 0 ? daysAgo(30) : null,
      nextBillingDate: monthsFromNow(item.interval === "yearly" ? 12 : 1),
      features: buildMembershipFeatures(item.plan),
      payments:
        item.amount > 0
          ? [
              {
                paymentId: `seed_membership_${item.user._id}`,
                amount: item.amount,
                currency: "EUR",
                status: "succeeded",
                method: "card",
                type: "subscription",
                description: `${item.plan.displayName} membership`,
                processedAt: daysAgo(30),
              },
            ]
          : [],
      usage: {
        currentActiveInvestments:
          item.user.role === "investor" ? item.user.activeInvestmentCount || 0 : 0,
        totalInvestmentsMade:
          item.user.role === "investor" ? item.user.investments?.length || 0 : 0,
        lastActivityAt: daysAgo(1),
      },
      notifications: {
        emailReminders: true,
        renewalReminder: true,
        paymentFailureAlert: true,
        planChangeAlert: true,
      },
      metadata: {
        source: "seed",
      },
    });
  }
}

async function createProperties(provider, users) {
  const propertyIds = {
    lisbon: createObjectId(),
    portoDraft: createObjectId(),
    barcelona: createObjectId(),
    valletta: createObjectId(),
    riga: createObjectId(),
    tallinn: createObjectId(),
    tbilisi: createObjectId(),
    batumi: createObjectId(),
  };

  const verifiedRecently = daysAgo(10);
  const verifiedEarlier = daysAgo(35);

  const lisbonImages = [
    await createPropertyImage(provider, {
      sourcePath: dummyFiles.imageWideA,
      seedKey: "property-lisbon-cover",
      propertyId: propertyIds.lisbon,
      ownerId: users.ownerAyse._id,
      order: 0,
      isPrimary: true,
      focusX: 52,
      focusY: 46,
    }),
    await createPropertyImage(provider, {
      sourcePath: dummyFiles.imagePhone,
      seedKey: "property-lisbon-gallery-1",
      propertyId: propertyIds.lisbon,
      ownerId: users.ownerAyse._id,
      order: 1,
      isPrimary: false,
      focusX: 50,
      focusY: 38,
    }),
  ];

  const lisbonTitleDeed = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.titleDeed,
    seedKey: "property-lisbon-title-deed",
    propertyId: propertyIds.lisbon,
    uploadedBy: users.ownerAyse._id,
    type: "title_deed",
    description: "Signed title deed for Lisbon listing",
    verifiedBy: users.adminUser._id,
    verifiedAt: verifiedRecently,
    uploadedAt: daysAgo(18),
  });
  const lisbonValuation = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.valuation,
    seedKey: "property-lisbon-valuation",
    propertyId: propertyIds.lisbon,
    uploadedBy: users.ownerAyse._id,
    type: "valuation_report",
    description: "Latest valuation report",
    verifiedBy: users.adminUser._id,
    verifiedAt: verifiedRecently,
    uploadedAt: daysAgo(17),
  });
  const lisbonFloorPlan = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.floorPlan,
    seedKey: "property-lisbon-floor-plan",
    propertyId: propertyIds.lisbon,
    uploadedBy: users.ownerAyse._id,
    type: "floor_plan",
    description: "Floor plan package",
    uploadedAt: daysAgo(16),
  });

  const portoImages = [
    await createPropertyImage(provider, {
      sourcePath: dummyFiles.imageBanner,
      seedKey: "property-porto-cover",
      propertyId: propertyIds.portoDraft,
      ownerId: users.ownerAyse._id,
      order: 0,
      isPrimary: true,
      focusX: 48,
      focusY: 50,
    }),
    await createPropertyImage(provider, {
      sourcePath: dummyFiles.imageSquare,
      seedKey: "property-porto-gallery-1",
      propertyId: propertyIds.portoDraft,
      ownerId: users.ownerAyse._id,
      order: 1,
      isPrimary: false,
      focusX: 50,
      focusY: 45,
    }),
  ];

  const portoTitleDeed = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.titleDeed,
    seedKey: "property-porto-title-deed",
    propertyId: propertyIds.portoDraft,
    uploadedBy: users.ownerAyse._id,
    type: "title_deed",
    description: "Draft listing title deed",
    uploadedAt: daysAgo(7),
  });
  const portoAnnotation = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.annotation,
    seedKey: "property-porto-annotation",
    propertyId: propertyIds.portoDraft,
    uploadedBy: users.ownerAyse._id,
    type: "annotation",
    description: "Annotation document to review before publishing",
    uploadedAt: daysAgo(6),
  });

  const barcelonaImages = [
    await createPropertyImage(provider, {
      sourcePath: dummyFiles.imageLandscape,
      seedKey: "property-barcelona-cover",
      propertyId: propertyIds.barcelona,
      ownerId: users.ownerMehmet._id,
      order: 0,
      isPrimary: true,
      focusX: 50,
      focusY: 45,
    }),
    await createPropertyImage(provider, {
      sourcePath: dummyFiles.imageTablet,
      seedKey: "property-barcelona-gallery-1",
      propertyId: propertyIds.barcelona,
      ownerId: users.ownerMehmet._id,
      order: 1,
      isPrimary: false,
      focusX: 51,
      focusY: 52,
    }),
  ];

  const barcelonaTitleDeed = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.titleDeed,
    seedKey: "property-barcelona-title-deed",
    propertyId: propertyIds.barcelona,
    uploadedBy: users.ownerMehmet._id,
    type: "title_deed",
    description: "Barcelona title deed",
    verifiedBy: users.adminUser._id,
    verifiedAt: verifiedEarlier,
    uploadedAt: daysAgo(50),
  });
  const barcelonaAnnotation = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.annotation,
    seedKey: "property-barcelona-annotation",
    propertyId: propertyIds.barcelona,
    uploadedBy: users.ownerMehmet._id,
    type: "annotation",
    description: "Land registry annotation package",
    verifiedBy: users.adminUser._id,
    verifiedAt: verifiedEarlier,
    uploadedAt: daysAgo(49),
  });
  const barcelonaTax = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.tax,
    seedKey: "property-barcelona-tax",
    propertyId: propertyIds.barcelona,
    uploadedBy: users.ownerMehmet._id,
    type: "tax_document",
    description: "Latest property tax filing",
    uploadedAt: daysAgo(48),
  });

  const vallettaImages = [
    await createPropertyImage(provider, {
      sourcePath: dummyFiles.imageWideB,
      seedKey: "property-valletta-cover",
      propertyId: propertyIds.valletta,
      ownerId: users.ownerAyse._id,
      order: 0,
      isPrimary: true,
      focusX: 49,
      focusY: 44,
    }),
    await createPropertyImage(provider, {
      sourcePath: dummyFiles.imageLandscape,
      seedKey: "property-valletta-gallery-1",
      propertyId: propertyIds.valletta,
      ownerId: users.ownerAyse._id,
      order: 1,
      isPrimary: false,
      focusX: 50,
      focusY: 50,
    }),
  ];

  const vallettaTitleDeed = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.titleDeed,
    seedKey: "property-valletta-title-deed",
    propertyId: propertyIds.valletta,
    uploadedBy: users.ownerAyse._id,
    type: "title_deed",
    description: "Active investment title deed",
    verifiedBy: users.adminUser._id,
    verifiedAt: daysAgo(55),
    uploadedAt: daysAgo(70),
  });
  const vallettaAnnotation = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.annotation,
    seedKey: "property-valletta-annotation",
    propertyId: propertyIds.valletta,
    uploadedBy: users.localRepJohn._id,
    type: "annotation",
    description: "Representative annotation document",
    verifiedBy: users.adminUser._id,
    verifiedAt: daysAgo(54),
    uploadedAt: daysAgo(69),
  });
  const vallettaValuation = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.valuation,
    seedKey: "property-valletta-valuation",
    propertyId: propertyIds.valletta,
    uploadedBy: users.ownerAyse._id,
    type: "valuation_report",
    description: "Independent valuation for active contract",
    verifiedBy: users.adminUser._id,
    verifiedAt: daysAgo(53),
    uploadedAt: daysAgo(68),
  });
  const vallettaTax = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.tax,
    seedKey: "property-valletta-tax",
    propertyId: propertyIds.valletta,
    uploadedBy: users.ownerAyse._id,
    type: "tax_document",
    description: "Property tax clearance",
    uploadedAt: daysAgo(67),
  });
  const vallettaFloorPlan = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.floorPlan,
    seedKey: "property-valletta-floor-plan",
    propertyId: propertyIds.valletta,
    uploadedBy: users.ownerAyse._id,
    type: "floor_plan",
    description: "Approved floor plan",
    uploadedAt: daysAgo(66),
  });

  const rigaImages = [
    await createPropertyImage(provider, {
      sourcePath: dummyFiles.imageSquare,
      seedKey: "property-riga-cover",
      propertyId: propertyIds.riga,
      ownerId: users.ownerAyse._id,
      order: 0,
      isPrimary: true,
      focusX: 50,
      focusY: 48,
    }),
  ];

  const rigaTitleDeed = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.titleDeed,
    seedKey: "property-riga-title-deed",
    propertyId: propertyIds.riga,
    uploadedBy: users.ownerAyse._id,
    type: "title_deed",
    description: "Rejected listing title deed",
    uploadedAt: daysAgo(20),
  });
  const rigaAnnotation = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.annotation,
    seedKey: "property-riga-annotation",
    propertyId: propertyIds.riga,
    uploadedBy: users.ownerAyse._id,
    type: "annotation",
    description: "Annotation with missing pages",
    uploadedAt: daysAgo(19),
  });

  const tallinnImages = [
    await createPropertyImage(provider, {
      sourcePath: dummyFiles.imageBanner,
      seedKey: "property-tallinn-cover",
      propertyId: propertyIds.tallinn,
      ownerId: users.ownerMehmet._id,
      order: 0,
      isPrimary: true,
      focusX: 50,
      focusY: 46,
    }),
  ];

  const tallinnTitleDeed = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.titleDeed,
    seedKey: "property-tallinn-title-deed",
    propertyId: propertyIds.tallinn,
    uploadedBy: users.ownerMehmet._id,
    type: "title_deed",
    description: "Completed contract title deed",
    verifiedBy: users.adminUser._id,
    verifiedAt: daysAgo(140),
    uploadedAt: daysAgo(180),
  });
  const tallinnValuation = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.valuation,
    seedKey: "property-tallinn-valuation",
    propertyId: propertyIds.tallinn,
    uploadedBy: users.ownerMehmet._id,
    type: "valuation_report",
    description: "Pre-investment valuation report",
    verifiedBy: users.adminUser._id,
    verifiedAt: daysAgo(140),
    uploadedAt: daysAgo(179),
  });

  const tbilisiImages = [
    await createPropertyImage(provider, {
      sourcePath: dummyFiles.imageTablet,
      seedKey: "property-tbilisi-cover",
      propertyId: propertyIds.tbilisi,
      ownerId: users.ownerMehmet._id,
      order: 0,
      isPrimary: true,
      focusX: 52,
      focusY: 47,
    }),
    await createPropertyImage(provider, {
      sourcePath: dummyFiles.imagePhone,
      seedKey: "property-tbilisi-gallery-1",
      propertyId: propertyIds.tbilisi,
      ownerId: users.ownerMehmet._id,
      order: 1,
      isPrimary: false,
      focusX: 48,
      focusY: 42,
    }),
  ];

  const tbilisiTitleDeed = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.titleDeed,
    seedKey: "property-tbilisi-title-deed",
    propertyId: propertyIds.tbilisi,
    uploadedBy: users.ownerMehmet._id,
    type: "title_deed",
    description: "Tbilisi public listing title deed",
    verifiedBy: users.adminUser._id,
    verifiedAt: daysAgo(22),
    uploadedAt: daysAgo(30),
  });
  const tbilisiValuation = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.valuation,
    seedKey: "property-tbilisi-valuation",
    propertyId: propertyIds.tbilisi,
    uploadedBy: users.ownerMehmet._id,
    type: "valuation_report",
    description: "Valuation for public listing",
    verifiedBy: users.adminUser._id,
    verifiedAt: daysAgo(21),
    uploadedAt: daysAgo(29),
  });

  const batumiImages = [
    await createPropertyImage(provider, {
      sourcePath: dummyFiles.imageWideA,
      seedKey: "property-batumi-cover",
      propertyId: propertyIds.batumi,
      ownerId: users.ownerMehmet._id,
      order: 0,
      isPrimary: true,
      focusX: 49,
      focusY: 44,
    }),
  ];

  const batumiTitleDeed = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.titleDeed,
    seedKey: "property-batumi-title-deed",
    propertyId: propertyIds.batumi,
    uploadedBy: users.ownerMehmet._id,
    type: "title_deed",
    description: "Title deed awaiting admin verification",
    uploadedAt: daysAgo(15),
  });
  const batumiTax = await createPropertyDocument(provider, {
    sourcePath: dummyFiles.tax,
    seedKey: "property-batumi-tax",
    propertyId: propertyIds.batumi,
    uploadedBy: users.ownerMehmet._id,
    type: "tax_document",
    description: "Tax clearance before activation",
    uploadedAt: daysAgo(14),
  });

  const properties = await Property.create([
    {
      _id: propertyIds.lisbon,
      country: "Portugal",
      city: "Lisbon",
      fullAddress: "Rua Augusta 120, Lisbon",
      mapSearchAddress: "Rua Augusta 120, Lisbon, Portugal",
      locationPin: { lat: 38.710173, lng: -9.138447 },
      description:
        "Central Lisbon apartment prepared for a first offer flow and public listing tests.",
      propertyType: "apartment",
      size: 92,
      rooms: 2,
      estimatedValue: 320000,
      requestedInvestment: 65000,
      rentOffered: 720,
      currency: "EUR",
      contractPeriodMonths: 24,
      images: lisbonImages,
      documents: [lisbonTitleDeed, lisbonValuation, lisbonFloorPlan],
      titleDeedDocument: {
        fileId: lisbonTitleDeed.fileId,
        url: lisbonTitleDeed.url,
        verified: true,
      },
      status: "published",
      trustScore: 88,
      owner: users.ownerAyse._id,
      viewCount: 183,
      favoriteCount: 1,
      investmentOfferCount: 1,
      favorites: [users.investorEmre._id],
      isFeatured: true,
      featuredAt: daysAgo(7),
      featuredUntil: daysFromNow(14),
      featuredWeeks: 3,
    },
    {
      _id: propertyIds.portoDraft,
      country: "Portugal",
      city: "Porto",
      fullAddress: "Avenida dos Aliados 45, Porto",
      mapSearchAddress: "Avenida dos Aliados 45, Porto, Portugal",
      locationPin: { lat: 41.148451, lng: -8.611007 },
      description:
        "Draft property with documents uploaded but still waiting for admin publication review.",
      propertyType: "house",
      size: 134,
      rooms: 3,
      estimatedValue: 410000,
      requestedInvestment: 82000,
      rentOffered: 890,
      currency: "EUR",
      contractPeriodMonths: 36,
      images: portoImages,
      documents: [portoTitleDeed, portoAnnotation],
      titleDeedDocument: {
        fileId: portoTitleDeed.fileId,
        url: portoTitleDeed.url,
        verified: false,
      },
      annotationDocument: {
        fileId: portoAnnotation.fileId,
        url: portoAnnotation.url,
        hasAnnotation: true,
      },
      status: "draft",
      trustScore: 73,
      owner: users.ownerAyse._id,
      viewCount: 21,
      favoriteCount: 0,
      investmentOfferCount: 0,
    },
    {
      _id: propertyIds.barcelona,
      country: "Spain",
      city: "Barcelona",
      fullAddress: "Carrer de Balmes 84, Barcelona",
      mapSearchAddress: "Carrer de Balmes 84, Barcelona, Spain",
      locationPin: { lat: 41.389378, lng: 2.161933 },
      description:
        "Barcelona property already in contract stage for document exchange and approval tests.",
      propertyType: "apartment",
      size: 118,
      rooms: 3,
      estimatedValue: 480000,
      requestedInvestment: 85000,
      rentOffered: 980,
      currency: "EUR",
      contractPeriodMonths: 30,
      images: barcelonaImages,
      documents: [barcelonaTitleDeed, barcelonaAnnotation, barcelonaTax],
      titleDeedDocument: {
        fileId: barcelonaTitleDeed.fileId,
        url: barcelonaTitleDeed.url,
        verified: true,
      },
      annotationDocument: {
        fileId: barcelonaAnnotation.fileId,
        url: barcelonaAnnotation.url,
        hasAnnotation: true,
      },
      status: "in_contract",
      trustScore: 90,
      owner: users.ownerMehmet._id,
      viewCount: 109,
      favoriteCount: 0,
      investmentOfferCount: 1,
    },
    {
      _id: propertyIds.valletta,
      country: "Malta",
      city: "Valletta",
      fullAddress: "Republic Street 14, Valletta",
      mapSearchAddress: "Republic Street 14, Valletta, Malta",
      locationPin: { lat: 35.898909, lng: 14.514553 },
      description:
        "Active contract scenario with paid, delayed and upcoming rental payments.",
      propertyType: "commercial",
      size: 140,
      rooms: 4,
      estimatedValue: 540000,
      requestedInvestment: 110000,
      rentOffered: 950,
      currency: "EUR",
      contractPeriodMonths: 24,
      images: vallettaImages,
      documents: [
        vallettaTitleDeed,
        vallettaAnnotation,
        vallettaValuation,
        vallettaTax,
        vallettaFloorPlan,
      ],
      titleDeedDocument: {
        fileId: vallettaTitleDeed.fileId,
        url: vallettaTitleDeed.url,
        verified: true,
      },
      annotationDocument: {
        fileId: vallettaAnnotation.fileId,
        url: vallettaAnnotation.url,
        hasAnnotation: true,
      },
      status: "active",
      trustScore: 94,
      owner: users.ownerAyse._id,
      viewCount: 146,
      favoriteCount: 0,
      investmentOfferCount: 1,
    },
    {
      _id: propertyIds.riga,
      country: "Latvia",
      city: "Riga",
      fullAddress: "Brivibas iela 88, Riga",
      mapSearchAddress: "Brivibas iela 88, Riga, Latvia",
      locationPin: { lat: 56.956777, lng: 24.127187 },
      description:
        "Rejected property with review notes and flagged issues for owner feedback flows.",
      propertyType: "other",
      size: 76,
      rooms: 2,
      estimatedValue: 180000,
      requestedInvestment: 45000,
      rentOffered: 430,
      currency: "EUR",
      contractPeriodMonths: 18,
      images: rigaImages,
      documents: [rigaTitleDeed, rigaAnnotation],
      titleDeedDocument: {
        fileId: rigaTitleDeed.fileId,
        url: rigaTitleDeed.url,
        verified: false,
      },
      annotationDocument: {
        fileId: rigaAnnotation.fileId,
        url: rigaAnnotation.url,
        hasAnnotation: true,
      },
      status: "rejected",
      trustScore: 58,
      owner: users.ownerAyse._id,
      viewCount: 8,
      favoriteCount: 0,
      investmentOfferCount: 0,
      reviewNotes:
        "Replace the annotation package and upload a recent tax document before resubmitting.",
      flaggedIssues: [
        "Annotation file is incomplete",
        "Tax document is older than twelve months",
      ],
      lastStatusChange: daysAgo(4),
    },
    {
      _id: propertyIds.tallinn,
      country: "Estonia",
      city: "Tallinn",
      fullAddress: "Pikk 18, Tallinn",
      mapSearchAddress: "Pikk 18, Tallinn, Estonia",
      locationPin: { lat: 59.437, lng: 24.745 },
      description:
        "Completed investment scenario with full payment history and transfer metadata.",
      propertyType: "house",
      size: 156,
      rooms: 4,
      estimatedValue: 460000,
      requestedInvestment: 90000,
      rentOffered: 820,
      currency: "EUR",
      contractPeriodMonths: 12,
      images: tallinnImages,
      documents: [tallinnTitleDeed, tallinnValuation],
      titleDeedDocument: {
        fileId: tallinnTitleDeed.fileId,
        url: tallinnTitleDeed.url,
        verified: true,
      },
      status: "completed",
      trustScore: 86,
      owner: users.ownerMehmet._id,
      viewCount: 91,
      favoriteCount: 0,
      investmentOfferCount: 1,
    },
    {
      _id: propertyIds.tbilisi,
      country: "Georgia",
      city: "Tbilisi",
      fullAddress: "Rustaveli Avenue 55, Tbilisi",
      mapSearchAddress: "Rustaveli Avenue 55, Tbilisi, Georgia",
      locationPin: { lat: 41.701251, lng: 44.793083 },
      description:
        "Second published listing kept open for browsing and favorites scenarios.",
      propertyType: "apartment",
      size: 101,
      rooms: 3,
      estimatedValue: 295000,
      requestedInvestment: 70000,
      rentOffered: 690,
      currency: "EUR",
      contractPeriodMonths: 24,
      images: tbilisiImages,
      documents: [tbilisiTitleDeed, tbilisiValuation],
      titleDeedDocument: {
        fileId: tbilisiTitleDeed.fileId,
        url: tbilisiTitleDeed.url,
        verified: true,
      },
      status: "published",
      trustScore: 82,
      owner: users.ownerMehmet._id,
      viewCount: 57,
      favoriteCount: 2,
      favorites: [users.investorEmre._id, users.investorLara._id],
      investmentOfferCount: 0,
    },
    {
      _id: propertyIds.batumi,
      country: "Georgia",
      city: "Batumi",
      fullAddress: "Zurab Gorgiladze 12, Batumi",
      mapSearchAddress: "Zurab Gorgiladze 12, Batumi, Georgia",
      locationPin: { lat: 41.647178, lng: 41.636932 },
      description:
        "In-contract property where title deed has been uploaded and awaits admin approval.",
      propertyType: "apartment",
      size: 94,
      rooms: 2,
      estimatedValue: 305000,
      requestedInvestment: 76000,
      rentOffered: 740,
      currency: "EUR",
      contractPeriodMonths: 20,
      images: batumiImages,
      documents: [batumiTitleDeed, batumiTax],
      titleDeedDocument: {
        fileId: batumiTitleDeed.fileId,
        url: batumiTitleDeed.url,
        verified: false,
      },
      status: "in_contract",
      trustScore: 80,
      owner: users.ownerMehmet._id,
      viewCount: 43,
      favoriteCount: 0,
      investmentOfferCount: 1,
    },
  ]);

  users.ownerAyse.properties = [
    propertyIds.lisbon,
    propertyIds.portoDraft,
    propertyIds.valletta,
    propertyIds.riga,
  ];
  users.ownerAyse.totalProperties = 4;
  users.ownerAyse.ongoingContracts = 2;
  await users.ownerAyse.save();

  users.ownerMehmet.properties = [
    propertyIds.barcelona,
    propertyIds.tallinn,
    propertyIds.tbilisi,
    propertyIds.batumi,
  ];
  users.ownerMehmet.totalProperties = 4;
  users.ownerMehmet.completedContracts = 1;
  users.ownerMehmet.ongoingContracts = 2;
  await users.ownerMehmet.save();

  users.investorEmre.favoriteProperties = [propertyIds.lisbon, propertyIds.tbilisi];
  await users.investorEmre.save();

  users.investorLara.favoriteProperties = [propertyIds.tbilisi];
  await users.investorLara.save();

  return {
    lisbon: properties[0],
    portoDraft: properties[1],
    barcelona: properties[2],
    valletta: properties[3],
    riga: properties[4],
    tallinn: properties[5],
    tbilisi: properties[6],
    batumi: properties[7],
  };
}

async function createInvestments(provider, users, properties) {
  const investmentIds = {
    lisbonOffer: createObjectId(),
    barcelonaContract: createObjectId(),
    vallettaActive: createObjectId(),
    tallinnCompleted: createObjectId(),
    batumiTitlePending: createObjectId(),
  };

  const lisbonOffer = await Investment.create({
    _id: investmentIds.lisbonOffer,
    property: properties.lisbon._id,
    investor: users.investorLara._id,
    propertyOwner: users.ownerAyse._id,
    amountInvested: properties.lisbon.requestedInvestment,
    currency: "EUR",
    status: "offer_sent",
    rentalPayments: [],
  });

  const barcelonaContractFile = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.investmentContract,
    seedKey: "investment-barcelona-contract",
    investmentId: investmentIds.barcelonaContract,
    uploadedBy: users.ownerMehmet._id,
    documentType: "contract",
    description: "Draft contract signed by owner",
    uploadedAt: daysAgo(12),
  });
  const barcelonaPaymentReceipt = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.paymentReceipt,
    seedKey: "investment-barcelona-payment-receipt",
    investmentId: investmentIds.barcelonaContract,
    uploadedBy: users.investorEmre._id,
    documentType: "payment_receipt",
    description: "Initial payment receipt",
    uploadedAt: daysAgo(11),
  });
  const barcelonaApostillePackage = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.investmentOther,
    seedKey: "investment-barcelona-apostille-package",
    investmentId: investmentIds.barcelonaContract,
    uploadedBy: users.investorEmre._id,
    documentType: "other",
    description: "Apostille and courier tracking package",
    uploadedAt: daysAgo(10),
  });

  const barcelonaContract = await Investment.create({
    _id: investmentIds.barcelonaContract,
    property: properties.barcelona._id,
    investor: users.investorEmre._id,
    propertyOwner: users.ownerMehmet._id,
    amountInvested: properties.barcelona.requestedInvestment,
    currency: "EUR",
    status: "contract_signed",
    representativeRequestedBy: users.investorEmre._id,
    representativeRequestDate: daysAgo(8),
    contractFile: barcelonaContractFile.embedded,
    paymentReceipt: barcelonaPaymentReceipt.embedded,
    additionalDocuments: [
      {
        type: "other",
        fileId: barcelonaApostillePackage.fileMetadata._id,
        url: barcelonaApostillePackage.fileMetadata.url,
        description: "Apostille and courier tracking package",
        uploadedAt: daysAgo(10),
        uploadedBy: users.investorEmre._id,
      },
    ],
    rentalPayments: [
      {
        month: monthKey(1),
        amount: properties.barcelona.rentOffered,
        status: "pending",
        dueDate: addDays(startOfMonthOffset(now, 1), 7),
      },
      {
        month: monthKey(2),
        amount: properties.barcelona.rentOffered,
        status: "pending",
        dueDate: addDays(startOfMonthOffset(now, 2), 7),
      },
    ],
  });

  const batumiContractFile = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.investmentContract,
    seedKey: "investment-batumi-contract",
    investmentId: investmentIds.batumiTitlePending,
    uploadedBy: users.ownerMehmet._id,
    documentType: "contract",
    description: "Executed contract before title deed approval",
    uploadedAt: daysAgo(20),
  });
  const batumiPaymentReceipt = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.paymentReceipt,
    seedKey: "investment-batumi-payment-receipt",
    investmentId: investmentIds.batumiTitlePending,
    uploadedBy: users.investorEmre._id,
    documentType: "payment_receipt",
    description: "Wire receipt for Batumi investment",
    uploadedAt: daysAgo(19),
  });
  const batumiTitleDeed = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.investmentTitleDeed,
    seedKey: "investment-batumi-title-deed",
    investmentId: investmentIds.batumiTitlePending,
    uploadedBy: users.localRepJohn._id,
    documentType: "title_deed",
    description: "Submitted title deed awaiting admin approval",
    uploadedAt: daysAgo(16),
  });
  const batumiNotaryDoc = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.notaryDocument,
    seedKey: "investment-batumi-notary",
    investmentId: investmentIds.batumiTitlePending,
    uploadedBy: users.localRepJohn._id,
    documentType: "notary_document",
    description: "Notary reference package",
    uploadedAt: daysAgo(15),
  });

  const batumiTitlePending = await Investment.create({
    _id: investmentIds.batumiTitlePending,
    property: properties.batumi._id,
    investor: users.investorEmre._id,
    propertyOwner: users.ownerMehmet._id,
    localRepresentative: users.localRepJohn._id,
    representativeRequestedBy: users.investorEmre._id,
    representativeRequestDate: daysAgo(18),
    amountInvested: properties.batumi.requestedInvestment,
    currency: "EUR",
    status: "title_deed_pending",
    contractFile: batumiContractFile.embedded,
    paymentReceipt: batumiPaymentReceipt.embedded,
    titleDeedDocument: batumiTitleDeed.embedded,
    additionalDocuments: [
      {
        type: "notary_document",
        fileId: batumiNotaryDoc.fileMetadata._id,
        url: batumiNotaryDoc.fileMetadata.url,
        description: "Supporting notary package for approval",
        uploadedAt: daysAgo(15),
        uploadedBy: users.localRepJohn._id,
      },
    ],
    rentalPayments: [
      {
        month: monthKey(1),
        amount: properties.batumi.rentOffered,
        status: "pending",
        dueDate: addDays(startOfMonthOffset(now, 1), 10),
      },
      {
        month: monthKey(2),
        amount: properties.batumi.rentOffered,
        status: "pending",
        dueDate: addDays(startOfMonthOffset(now, 2), 10),
      },
    ],
  });

  const vallettaContractFile = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.investmentContract,
    seedKey: "investment-valletta-contract",
    investmentId: investmentIds.vallettaActive,
    uploadedBy: users.ownerAyse._id,
    documentType: "contract",
    description: "Fully signed Valletta contract",
    uploadedAt: daysAgo(70),
  });
  const vallettaPaymentReceipt = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.paymentReceipt,
    seedKey: "investment-valletta-payment-receipt",
    investmentId: investmentIds.vallettaActive,
    uploadedBy: users.investorEmre._id,
    documentType: "payment_receipt",
    description: "Investor wire transfer receipt",
    uploadedAt: daysAgo(69),
  });
  const vallettaTitleDeed = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.investmentTitleDeed,
    seedKey: "investment-valletta-title-deed",
    investmentId: investmentIds.vallettaActive,
    uploadedBy: users.ownerAyse._id,
    documentType: "title_deed",
    description: "Verified Valletta title deed",
    uploadedAt: daysAgo(60),
    verifiedBy: users.adminUser._id,
    verifiedAt: daysAgo(58),
  });
  const vallettaTaxReceipt = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.investmentTaxReceipt,
    seedKey: "investment-valletta-tax-receipt",
    investmentId: investmentIds.vallettaActive,
    uploadedBy: users.localRepJohn._id,
    documentType: "tax_receipt",
    description: "Tax receipt for post-transfer package",
    uploadedAt: daysAgo(57),
  });
  const vallettaReceiptMonthMinusTwo = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.rentalReceipt,
    seedKey: "investment-valletta-rental-receipt-1",
    investmentId: investmentIds.vallettaActive,
    uploadedBy: users.ownerAyse._id,
    documentType: "rental_receipt",
    description: `Rental receipt for ${monthKey(-2)}`,
    uploadedAt: addDays(startOfMonthOffset(now, -2), 12),
  });
  const vallettaReceiptMonthMinusOne = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.rentalReceipt,
    seedKey: "investment-valletta-rental-receipt-2",
    investmentId: investmentIds.vallettaActive,
    uploadedBy: users.ownerAyse._id,
    documentType: "rental_receipt",
    description: `Rental receipt for ${monthKey(-1)}`,
    uploadedAt: addDays(startOfMonthOffset(now, -1), 13),
  });

  const activePayments = [
    {
      month: monthKey(-2),
      amount: properties.valletta.rentOffered,
      status: "paid",
      dueDate: addDays(startOfMonthOffset(now, -2), 10),
      paidAt: addDays(startOfMonthOffset(now, -2), 12),
      paymentReceipt: buildEmbeddedFileRef(
        vallettaReceiptMonthMinusTwo.fileMetadata
      ),
    },
    {
      month: monthKey(-1),
      amount: properties.valletta.rentOffered,
      status: "paid",
      dueDate: addDays(startOfMonthOffset(now, -1), 10),
      paidAt: addDays(startOfMonthOffset(now, -1), 13),
      paymentReceipt: buildEmbeddedFileRef(
        vallettaReceiptMonthMinusOne.fileMetadata
      ),
    },
    {
      month: monthKey(0),
      amount: properties.valletta.rentOffered,
      status: "delayed",
      dueDate: addDays(startOfMonthOffset(now, 0), 10),
    },
    {
      month: monthKey(1),
      amount: properties.valletta.rentOffered,
      status: "pending",
      dueDate: addDays(startOfMonthOffset(now, 1), 10),
    },
  ];

  const vallettaActive = await Investment.create({
    _id: investmentIds.vallettaActive,
    property: properties.valletta._id,
    investor: users.investorEmre._id,
    propertyOwner: users.ownerAyse._id,
    localRepresentative: users.localRepJohn._id,
    representativeRequestedBy: users.ownerAyse._id,
    representativeRequestDate: daysAgo(72),
    amountInvested: properties.valletta.requestedInvestment,
    currency: "EUR",
    status: "active",
    contractFile: vallettaContractFile.embedded,
    paymentReceipt: vallettaPaymentReceipt.embedded,
    titleDeedDocument: vallettaTitleDeed.embedded,
    additionalDocuments: [
      {
        type: "tax_receipt",
        fileId: vallettaTaxReceipt.fileMetadata._id,
        url: vallettaTaxReceipt.fileMetadata.url,
        description: "Tax receipt shared with investor",
        uploadedAt: daysAgo(57),
        uploadedBy: users.localRepJohn._id,
      },
    ],
    rentalPayments: activePayments,
  });

  const tallinnContractFile = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.investmentContract,
    seedKey: "investment-tallinn-contract",
    investmentId: investmentIds.tallinnCompleted,
    uploadedBy: users.ownerMehmet._id,
    documentType: "contract",
    description: "Historic completed contract",
    uploadedAt: daysAgo(180),
  });
  const tallinnPaymentReceipt = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.paymentReceipt,
    seedKey: "investment-tallinn-payment-receipt",
    investmentId: investmentIds.tallinnCompleted,
    uploadedBy: users.investorEmre._id,
    documentType: "payment_receipt",
    description: "Historic payment receipt",
    uploadedAt: daysAgo(179),
  });
  const tallinnTitleDeed = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.investmentTitleDeed,
    seedKey: "investment-tallinn-title-deed",
    investmentId: investmentIds.tallinnCompleted,
    uploadedBy: users.ownerMehmet._id,
    documentType: "title_deed",
    description: "Historic verified title deed",
    uploadedAt: daysAgo(175),
    verifiedBy: users.adminUser._id,
    verifiedAt: daysAgo(174),
  });
  const tallinnPoa = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.powerOfAttorney,
    seedKey: "investment-tallinn-poa",
    investmentId: investmentIds.tallinnCompleted,
    uploadedBy: users.localRepJohn._id,
    documentType: "power_of_attorney",
    description: "Power of attorney for completed transfer",
    uploadedAt: daysAgo(173),
  });
  const tallinnTransferDocument = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.transferDocument,
    seedKey: "investment-tallinn-transfer-document",
    investmentId: investmentIds.tallinnCompleted,
    uploadedBy: users.adminUser._id,
    documentType: "transfer_document",
    description: "Market sale transfer record",
    uploadedAt: daysAgo(15),
  });
  const tallinnReceiptMonthMinusSix = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.rentalReceipt,
    seedKey: "investment-tallinn-rental-receipt-1",
    investmentId: investmentIds.tallinnCompleted,
    uploadedBy: users.ownerMehmet._id,
    documentType: "rental_receipt",
    description: `Rental receipt for ${monthKey(-6)}`,
    uploadedAt: addDays(startOfMonthOffset(now, -6), 9),
  });
  const tallinnReceiptMonthMinusFive = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.rentalReceipt,
    seedKey: "investment-tallinn-rental-receipt-2",
    investmentId: investmentIds.tallinnCompleted,
    uploadedBy: users.ownerMehmet._id,
    documentType: "rental_receipt",
    description: `Rental receipt for ${monthKey(-5)}`,
    uploadedAt: addDays(startOfMonthOffset(now, -5), 9),
  });
  const tallinnReceiptMonthMinusFour = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.rentalReceipt,
    seedKey: "investment-tallinn-rental-receipt-3",
    investmentId: investmentIds.tallinnCompleted,
    uploadedBy: users.ownerMehmet._id,
    documentType: "rental_receipt",
    description: `Rental receipt for ${monthKey(-4)}`,
    uploadedAt: addDays(startOfMonthOffset(now, -4), 10),
  });
  const tallinnReceiptMonthMinusThree = await createInvestmentDocument(provider, {
    sourcePath: dummyFiles.rentalReceipt,
    seedKey: "investment-tallinn-rental-receipt-4",
    investmentId: investmentIds.tallinnCompleted,
    uploadedBy: users.ownerMehmet._id,
    documentType: "rental_receipt",
    description: `Rental receipt for ${monthKey(-3)}`,
    uploadedAt: addDays(startOfMonthOffset(now, -3), 9),
  });

  const completedPayments = [
    {
      month: monthKey(-6),
      amount: properties.tallinn.rentOffered,
      status: "paid",
      dueDate: addDays(startOfMonthOffset(now, -6), 8),
      paidAt: addDays(startOfMonthOffset(now, -6), 9),
      paymentReceipt: buildEmbeddedFileRef(
        tallinnReceiptMonthMinusSix.fileMetadata
      ),
    },
    {
      month: monthKey(-5),
      amount: properties.tallinn.rentOffered,
      status: "paid",
      dueDate: addDays(startOfMonthOffset(now, -5), 8),
      paidAt: addDays(startOfMonthOffset(now, -5), 9),
      paymentReceipt: buildEmbeddedFileRef(
        tallinnReceiptMonthMinusFive.fileMetadata
      ),
    },
    {
      month: monthKey(-4),
      amount: properties.tallinn.rentOffered,
      status: "paid",
      dueDate: addDays(startOfMonthOffset(now, -4), 8),
      paidAt: addDays(startOfMonthOffset(now, -4), 10),
      paymentReceipt: buildEmbeddedFileRef(
        tallinnReceiptMonthMinusFour.fileMetadata
      ),
    },
    {
      month: monthKey(-3),
      amount: properties.tallinn.rentOffered,
      status: "paid",
      dueDate: addDays(startOfMonthOffset(now, -3), 8),
      paidAt: addDays(startOfMonthOffset(now, -3), 9),
      paymentReceipt: buildEmbeddedFileRef(
        tallinnReceiptMonthMinusThree.fileMetadata
      ),
    },
  ];

  const tallinnCompleted = await Investment.create({
    _id: investmentIds.tallinnCompleted,
    property: properties.tallinn._id,
    investor: users.investorEmre._id,
    propertyOwner: users.ownerMehmet._id,
    localRepresentative: users.localRepJohn._id,
    representativeRequestedBy: users.investorEmre._id,
    representativeRequestDate: daysAgo(182),
    amountInvested: properties.tallinn.requestedInvestment,
    currency: "EUR",
    status: "completed",
    contractFile: tallinnContractFile.embedded,
    paymentReceipt: tallinnPaymentReceipt.embedded,
    titleDeedDocument: tallinnTitleDeed.embedded,
    additionalDocuments: [
      {
        type: "power_of_attorney",
        fileId: tallinnPoa.fileMetadata._id,
        url: tallinnPoa.fileMetadata.url,
        description: "Representative transfer authority",
        uploadedAt: daysAgo(173),
        uploadedBy: users.localRepJohn._id,
      },
    ],
    rentalPayments: completedPayments,
    transferOfProperty: {
      transferred: true,
      date: daysAgo(15),
      method: "market_sale",
      transferDocument: {
        fileId: tallinnTransferDocument.fileMetadata._id,
        url: tallinnTransferDocument.fileMetadata.url,
      },
    },
  });

  users.investorEmre.investments = [
    barcelonaContract._id,
    batumiTitlePending._id,
    vallettaActive._id,
    tallinnCompleted._id,
  ];
  users.investorEmre.activeInvestmentCount = 3;
  users.investorEmre.rentalIncome = [
    {
      propertyId: properties.valletta._id,
      amount: properties.valletta.rentOffered,
      currency: "EUR",
      status: "Paid",
      date: addDays(startOfMonthOffset(now, -2), 12),
    },
    {
      propertyId: properties.valletta._id,
      amount: properties.valletta.rentOffered,
      currency: "EUR",
      status: "Paid",
      date: addDays(startOfMonthOffset(now, -1), 13),
    },
  ];
  await users.investorEmre.save();

  users.investorLara.investments = [lisbonOffer._id];
  await users.investorLara.save();

  users.localRepJohn.managedProperties = [properties.valletta._id, properties.batumi._id];
  users.localRepJohn.assistedTransactions = [
    {
      property: properties.valletta._id,
      investor: users.investorEmre._id,
      transactionDate: daysAgo(58),
      status: "active",
      commission: 1200,
    },
    {
      property: properties.tallinn._id,
      investor: users.investorEmre._id,
      transactionDate: daysAgo(15),
      status: "completed",
      commission: 900,
    },
  ];
  await users.localRepJohn.save();

  return {
    lisbonOffer,
    barcelonaContract,
    vallettaActive,
    tallinnCompleted,
    batumiTitlePending,
  };
}

async function createRentalPaymentCollection(users, properties, investments) {
  const activePayments = investments.vallettaActive.rentalPayments.map((payment) => ({
    investment: investments.vallettaActive._id,
    property: properties.valletta._id,
    investor: users.investorEmre._id,
    propertyOwner: users.ownerAyse._id,
    month: payment.month,
    amount: payment.amount,
    currency: "EUR",
    status: payment.status,
    dueDate: payment.dueDate,
    paidAt: payment.paidAt,
    paymentMethod: payment.status === "paid" ? "bank_transfer" : undefined,
    paymentReceipt: payment.paymentReceipt?.url,
    transactionId:
      payment.status === "paid" ? `seed_${payment.month.replace("-", "")}` : undefined,
  }));

  const completedPayments = investments.tallinnCompleted.rentalPayments.map((payment) => ({
    investment: investments.tallinnCompleted._id,
    property: properties.tallinn._id,
    investor: users.investorEmre._id,
    propertyOwner: users.ownerMehmet._id,
    month: payment.month,
    amount: payment.amount,
    currency: "EUR",
    status: payment.status,
    dueDate: payment.dueDate,
    paidAt: payment.paidAt,
    paymentMethod: "wise",
    paymentReceipt: payment.paymentReceipt?.url,
    transactionId: `completed_${payment.month.replace("-", "")}`,
  }));

  await RentalPayment.insertMany([...activePayments, ...completedPayments]);
}

async function createUserKycFiles(provider, users) {
  const identityFile = await uploadSeedAsset({
    provider,
    sourcePath: dummyFiles.genericPdf,
    seedKey: "user-selin-kyc-identity",
    uploadedBy: users.investorSelin._id,
    relatedModel: "User",
    relatedId: users.investorSelin._id,
    documentType: "kyc_document",
    isPublic: false,
    description: "Pending KYC identity document",
    tags: ["seed", "user", "kyc"],
  });

  identityFile.url = buildPreviewUrl(identityFile._id);
  await identityFile.save();

  const addressFile = await uploadSeedAsset({
    provider,
    sourcePath: dummyFiles.other,
    seedKey: "user-selin-kyc-address",
    uploadedBy: users.investorSelin._id,
    relatedModel: "User",
    relatedId: users.investorSelin._id,
    documentType: "kyc_document",
    isPublic: false,
    description: "Pending KYC proof of address",
    tags: ["seed", "user", "kyc"],
  });

  addressFile.url = buildPreviewUrl(addressFile._id);
  await addressFile.save();
}

async function createNotifications(users, properties, investments) {
  await Notification.insertMany([
    {
      recipient: users.ownerAyse._id,
      recipientRole: "property_owner",
      type: "new_investment_offer",
      title: "New offer for Lisbon listing",
      message: "Lara Costa sent a new investment offer for the Lisbon property.",
      relatedEntity: {
        entityType: "investment",
        entityId: investments.lisbonOffer._id,
      },
      priority: "high",
      isRead: false,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      recipient: users.investorEmre._id,
      recipientRole: "investor",
      type: "offer_accepted",
      title: "Barcelona offer accepted",
      message: "Your Barcelona investment moved to contract stage.",
      relatedEntity: {
        entityType: "investment",
        entityId: investments.barcelonaContract._id,
      },
      priority: "high",
      isRead: false,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
    },
    {
      recipient: users.investorEmre._id,
      recipientRole: "investor",
      type: "title_deed_registered",
      title: "Valletta title deed registered",
      message: "The Valletta investment is active and rent distribution has started.",
      relatedEntity: {
        entityType: "investment",
        entityId: investments.vallettaActive._id,
      },
      priority: "medium",
      isRead: true,
      readAt: daysAgo(30),
      createdAt: daysAgo(58),
      updatedAt: daysAgo(30),
    },
    {
      recipient: users.adminUser._id,
      recipientRole: "admin",
      type: "user_registration",
      title: "KYC approval waiting",
      message: "Selin Arslan has submitted documents and is waiting for KYC approval.",
      relatedEntity: {
        entityType: "user",
        entityId: users.investorSelin._id,
      },
      priority: "medium",
      isRead: false,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
    {
      recipient: users.adminUser._id,
      recipientRole: "admin",
      type: "general_announcement",
      title: "Title deed approval queue",
      message: "Batumi investment title deed is ready for admin approval.",
      relatedEntity: {
        entityType: "investment",
        entityId: investments.batumiTitlePending._id,
      },
      priority: "urgent",
      isRead: false,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      recipient: users.ownerMehmet._id,
      recipientRole: "property_owner",
      type: "contract_uploaded",
      title: "Barcelona contract uploaded",
      message: "The Barcelona contract package is available for review.",
      relatedEntity: {
        entityType: "document",
        entityId: investments.barcelonaContract.contractFile.fileId,
      },
      priority: "medium",
      isRead: true,
      readAt: daysAgo(9),
      createdAt: daysAgo(12),
      updatedAt: daysAgo(9),
    },
  ]);
}

async function createActivityLogs(users, properties, investments) {
  await ActivityLog.insertMany([
    {
      user: users.ownerAyse._id,
      action: "property_created",
      details: {
        propertyId: properties.portoDraft._id,
        city: properties.portoDraft.city,
        status: properties.portoDraft.status,
      },
      ip: users.ownerAyse.lastLoginIP,
      severity: "low",
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    },
    {
      user: users.investorLara._id,
      action: "investment_offer_sent",
      details: {
        propertyId: properties.lisbon._id,
        investmentId: investments.lisbonOffer._id,
        amount: investments.lisbonOffer.amountInvested,
      },
      ip: users.investorLara.lastLoginIP,
      severity: "medium",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      user: users.investorEmre._id,
      action: "contract_signed",
      details: {
        investmentId: investments.barcelonaContract._id,
        propertyId: properties.barcelona._id,
      },
      ip: users.investorEmre.lastLoginIP,
      severity: "medium",
      createdAt: daysAgo(12),
      updatedAt: daysAgo(12),
    },
    {
      user: users.adminUser._id,
      action: "kyc_verification_requested",
      details: {
        userId: users.investorSelin._id,
      },
      ip: users.adminUser.lastLoginIP,
      severity: "high",
      isAdminAction: true,
      performedBy: users.adminUser._id,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
    {
      user: users.ownerAyse._id,
      action: "title_deed_registered",
      details: {
        investmentId: investments.vallettaActive._id,
        propertyId: properties.valletta._id,
      },
      ip: users.ownerAyse.lastLoginIP,
      severity: "medium",
      createdAt: daysAgo(58),
      updatedAt: daysAgo(58),
    },
  ]);
}

function printSummary(users, properties, investments) {
  console.log("");
  console.log("Seed completed successfully.");
  console.log("");
  console.log("Credentials:");
  console.log("  admin@admin.com / Admin123!@#");
  console.log("  emre@investor.com / Test123!@#");
  console.log("  lara@investor.com / Lara123!@#");
  console.log("  selin@investor.com / Selin123!@#");
  console.log("  ayse@owner.com / Owner123!@#");
  console.log("  mehmet@owner.com / Mehmet123!@#");
  console.log("  john@rep.com / Rep123!@#");
  console.log("");
  console.log("Scenario coverage:");
  console.log(
    `  properties: published=${[properties.lisbon, properties.tbilisi].length}, draft=1, in_contract=2, active=1, completed=1, rejected=1`,
  );
  console.log(
    `  investments: offer_sent=1, contract_signed=1, title_deed_pending=1, active=1, completed=1`,
  );
  console.log(
    `  pending kyc users: 1 (${users.investorSelin.email})`,
  );
  console.log("");
  console.log("High value records:");
  console.log(`  active investment id: ${investments.vallettaActive._id}`);
  console.log(`  title deed pending id: ${investments.batumiTitlePending._id}`);
  console.log(`  draft property id: ${properties.portoDraft._id}`);
  console.log(`  published property id: ${properties.lisbon._id}`);
}

async function seed() {
  await connectToDatabase();
  const provider = createStorageProvider();

  try {
    const { storage } = await resetDatabaseAndStorage({ clearStorage: true });

    if (storage.storageType === "minio") {
      console.log(
        `Storage reset: bucket=${storage.bucket}, removed=${storage.clearedObjects}`,
      );
    }

    const plans = await createMembershipPlans();
    const users = await createUsers();
    await createMemberships(plans, users);
    await createUserKycFiles(provider, users);
    const properties = await createProperties(provider, users);
    const investments = await createInvestments(provider, users, properties);
    await createRentalPaymentCollection(users, properties, investments);
    await createNotifications(users, properties, investments);
    await createActivityLogs(users, properties, investments);

    printSummary(users, properties, investments);
  } finally {
    await disconnectDatabase();
  }
}

seed().catch(async (error) => {
  console.error("Seed failed:", error);
  await disconnectDatabase();
  process.exit(1);
});
