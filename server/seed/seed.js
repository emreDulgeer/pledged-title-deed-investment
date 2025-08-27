// seed/seed.js - Updated with new models

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Models
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
const FileMetadata = require("../models/FileMetadata");
const RentalPayment = require("../models/RentalPayment");
const ActivityLog = require("../models/ActivityLog");

// MongoDB Connection
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/pledged_platform"
  )
  .then(async () => {
    console.log("🟢 MongoDB connected. Checking existing data...");

    // Check if data exists
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      console.log(
        `⚠️ Found ${existingUsers} existing users. Dropping database...`
      );
      await mongoose.connection.db.dropDatabase();
      console.log("🗑️ Database dropped.");
    } else {
      console.log("🗑️ No existing data found. Proceeding with fresh seed...");
    }

    // ==================== MEMBERSHIP PLANS ====================
    console.log("📋 Creating Membership Plans...");

    const basicPlan = await MembershipPlan.create({
      name: "basic",
      displayName: "Basic",
      description: "Perfect for getting started with real estate investments",
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
        },
        support: {
          level: "email",
          responseTime: "48h",
        },
      },
    });

    const proPlan = await MembershipPlan.create({
      name: "pro",
      displayName: "Pro",
      description: "For serious investors and property owners",
      tier: 2,
      order: 2,
      isActive: true,
      isVisible: true,
      isHighlighted: true,
      pricing: {
        monthly: { amount: 19, currency: "EUR" },
        yearly: { amount: 199, currency: "EUR", discountPercentage: 15 },
      },
      features: {
        investments: {
          maxActiveInvestments: 5,
          maxMonthlyInvestments: 3,
          minInvestmentAmount: 5000,
          maxInvestmentAmount: 500000,
        },
        properties: {
          maxActiveProperties: 5,
          canListProperties: true,
          priorityListing: true,
          featuredListingDays: 7,
        },
        commissions: {
          platformCommissionDiscount: 1,
          rentalCommissionDiscount: 1,
        },
        support: {
          level: "priority",
          responseTime: "24h",
          hasPhoneSupport: true,
        },
      },
      metadata: {
        color: "#3B82F6",
        icon: "star",
        badge: "Most Popular",
      },
    });

    const enterprisePlan = await MembershipPlan.create({
      name: "enterprise",
      displayName: "Enterprise",
      description: "For institutions and high-volume investors",
      tier: 3,
      order: 3,
      isActive: true,
      isVisible: true,
      pricing: {
        monthly: { amount: 99, currency: "EUR" },
        yearly: { amount: 999, currency: "EUR", discountPercentage: 20 },
      },
      features: {
        investments: {
          maxActiveInvestments: -1, // unlimited
          maxMonthlyInvestments: -1,
          minInvestmentAmount: 1000,
          maxInvestmentAmount: -1,
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
        },
        support: {
          level: "dedicated",
          responseTime: "1h",
          hasPhoneSupport: true,
          hasDedicatedManager: true,
        },
      },
      metadata: {
        color: "#10B981",
        icon: "crown",
        badge: "Best Value",
      },
    });

    console.log("✅ Membership Plans created");

    // ==================== USERS ====================
    console.log("👥 Creating Users...");

    // Hash passwords
    const hashedPasswordInvestor = await bcrypt.hash("Test123!@#", 12);
    const hashedPasswordOwner = await bcrypt.hash("Owner123!@#", 12);
    const hashedPasswordMehmet = await bcrypt.hash("Mehmet123!@#", 12);
    const hashedPasswordRep = await bcrypt.hash("Rep123!@#", 12);
    const hashedPasswordAdmin = await bcrypt.hash("Admin123!@#", 12);

    // INVESTOR
    const investor = await Investor.create({
      email: "emre@investor.com",
      password: hashedPasswordInvestor,
      firstName: "Emre",
      lastName: "Yilmaz",
      fullName: "Emre Yilmaz",
      role: "investor",
      country: "TR",
      phoneNumber: "+905551234567",
      emailVerified: true,
      phoneVerified: false,
      twoFactorEnabled: false,
      accountStatus: "active",
      kycStatus: "Approved",
      membershipPlan: "basic",
      membershipStatus: "active",
      membershipActivatedAt: new Date(),
      membershipExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      trustedIPs: [{ ip: "192.168.1.1", label: "home", addedAt: new Date() }],
      consents: {
        gdpr: true,
        terms: true,
        consentedAt: new Date(),
      },

      investments: [],
      rentalIncome: [],
      favoriteProperties: [],
      bankAccountInfo: {
        iban: "TR1234567890123456789012",
        bankName: "Example Bank",
      },
      activeInvestmentCount: 0,
      investmentLimit: 1, // Basic plan limit
    });

    // PROPERTY OWNER 1
    const owner = await PropertyOwner.create({
      email: "ayse@owner.com",
      password: hashedPasswordOwner,
      firstName: "Ayse",
      lastName: "Demir",
      fullName: "Ayse Demir",
      role: "property_owner",
      country: "PT",
      phoneNumber: "+351912345678",
      emailVerified: true,
      phoneVerified: true,
      twoFactorEnabled: true,
      accountStatus: "active",
      kycStatus: "Approved",
      membershipPlan: "pro",
      membershipStatus: "active",
      membershipActivatedAt: new Date(),
      membershipExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      trustedIPs: [
        { ip: "192.168.1.2", label: "home", addedAt: new Date() },
        { ip: "10.0.0.1", label: "office", addedAt: new Date() },
      ],
      consents: {
        gdpr: true, // dataProcessing true idi; GDPR onayı olarak true verelim
        terms: true, // şartlar onayı
        consentedAt: new Date(),
      },
      properties: [],
      rentPaymentHistory: [],
      bankAccountInfo: {
        iban: "PT50000201231234567890154",
        bankName: "Banco Example",
      },
      completedContracts: 2,
      ongoingContracts: 1,
      totalProperties: 2,
      ownerTrustScore: 85,
    });

    // PROPERTY OWNER 2
    const owner2 = await PropertyOwner.create({
      email: "mehmet@owner.com",
      password: hashedPasswordMehmet,
      firstName: "Mehmet",
      lastName: "Kaya",
      fullName: "Mehmet Kaya",
      role: "property_owner",
      country: "ES",
      phoneNumber: "+34612345678",
      emailVerified: true,
      phoneVerified: false,
      twoFactorEnabled: false,
      accountStatus: "active",
      kycStatus: "Approved",
      membershipPlan: "basic",
      membershipStatus: "active",
      membershipActivatedAt: new Date(),
      membershipExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      trustedIPs: [{ ip: "192.168.1.3", label: "home", addedAt: new Date() }],
      consents: {
        gdpr: true,
        terms: true,
        consentedAt: new Date(),
      },
      properties: [],
      rentPaymentHistory: [],
      bankAccountInfo: {
        iban: "ES9121000418450200051332",
        bankName: "Banco Santander",
      },
      completedContracts: 0,
      ongoingContracts: 0,
      totalProperties: 1,
      ownerTrustScore: 50,
    });

    // LOCAL REPRESENTATIVE
    const localRep = await LocalRepresentative.create({
      email: "john@rep.com",
      password: hashedPasswordRep,
      firstName: "John",
      lastName: "Doe",
      fullName: "John Doe",
      role: "local_representative",
      country: "PT",
      phoneNumber: "+351923456789",
      emailVerified: true,
      phoneVerified: true,
      twoFactorEnabled: true,
      accountStatus: "active",
      kycStatus: "Approved",
      membershipPlan: "enterprise",
      membershipStatus: "active",
      membershipActivatedAt: new Date(),
      membershipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      trustedIPs: [
        { ip: "192.168.1.4", label: "home", addedAt: new Date() },
        { ip: "10.0.0.2", label: "office", addedAt: new Date() },
        { ip: "172.16.0.1", label: "vpn", addedAt: new Date() },
      ],
      consents: {
        gdpr: true,
        terms: true,
        consentedAt: new Date(),
      },
      region: "Portugal",
      managedProperties: [],
      assistedTransactions: [],
      commissionEarned: {
        total: 5000,
        pending: 500,
        paid: 4500,
        history: [],
      },
      bankAccountInfo: {
        iban: "PT50000201239876543210987",
        bankName: "Millennium BCP",
      },
    });

    // ADMIN
    const admin = await Admin.create({
      email: "admin@admin.com",
      password: hashedPasswordAdmin,
      firstName: "Admin",
      lastName: "User",
      fullName: "Admin User",
      role: "admin",
      country: "TR",
      phoneNumber: "+905559876543",
      emailVerified: true,
      phoneVerified: true,
      twoFactorEnabled: true,
      accountStatus: "active",
      kycStatus: "Approved",
      membershipPlan: "enterprise",
      membershipStatus: "active",
      trustedIPs: [
        { ip: "192.168.1.100", label: "office", addedAt: new Date() },
        { ip: "10.0.0.100", label: "dc", addedAt: new Date() },
      ],
      consents: {
        gdpr: true,
        terms: true,
        consentedAt: new Date(),
      },
      adminLevel: "super_admin",
      permissions: ["all"],
      department: "Management",
      lastPasswordChange: new Date(),
    });

    console.log("✅ Users created");

    // ==================== MEMBERSHIPS ====================
    console.log("💳 Creating Memberships...");

    // Investor - Basic membership
    await Membership.create({
      user: investor._id,
      plan: basicPlan._id,
      planName: "basic",
      status: "active",
      pricing: {
        amount: 0,
        currency: "EUR",
        interval: "monthly",
      },
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      features: basicPlan.features,
    });

    // Property Owner 1 - Pro membership
    await Membership.create({
      user: owner._id,
      plan: proPlan._id,
      planName: "pro",
      status: "active",
      pricing: {
        amount: 19,
        currency: "EUR",
        interval: "monthly",
      },
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      features: proPlan.features,
      paymentHistory: [
        {
          date: new Date(),
          amount: 19,
          currency: "EUR",
          paymentMethod: "card",
          transactionId: "pay_123456789",
          status: "completed",
          description: "Pro Plan - Monthly subscription",
        },
      ],
    });

    // Property Owner 2 - Basic membership
    await Membership.create({
      user: owner2._id,
      plan: basicPlan._id,
      planName: "basic",
      status: "active",
      pricing: {
        amount: 0,
        currency: "EUR",
        interval: "monthly",
      },
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      features: basicPlan.features,
    });

    // Local Rep - Enterprise membership
    await Membership.create({
      user: localRep._id,
      plan: enterprisePlan._id,
      planName: "enterprise",
      status: "active",
      pricing: {
        amount: 999,
        currency: "EUR",
        interval: "yearly",
      },
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      features: enterprisePlan.features,
    });

    console.log("✅ Memberships created");
    // ==================== FILE METADATA (for new file system) ====================
    console.log("📁 Creating File Metadata...");

    // Contract file for investment
    const contractFile = await FileMetadata.create({
      filename: "contract_lisbon_emre_signed.pdf",
      originalName: "Investment Contract - Lisbon Property.pdf",
      mimeType: "application/pdf",
      size: 2458624, // ~2.4MB
      directory: "investments/contracts",
      url: "/uploads/investments/contracts/contract_lisbon_emre_signed.pdf",
      path: "uploads/investments/contracts/contract_lisbon_emre_signed.pdf",
      storageType: "local",
      hash: "a1b2c3d4e5f6789",
      uploadedBy: investor._id,
      relatedModel: "Investment",
      documentType: "contract",
      isPublic: false,
      virusScanStatus: "clean",
    });

    // Title deed for property
    const titleDeedFile = await FileMetadata.create({
      filename: "title_deed_lisbon_property.pdf",
      originalName: "Title Deed - Lisbon Property.pdf",
      mimeType: "application/pdf",
      size: 1548234,
      directory: "properties/documents",
      url: "/uploads/properties/documents/title_deed_lisbon_property.pdf",
      path: "uploads/properties/documents/title_deed_lisbon_property.pdf",
      storageType: "local",
      hash: "b2c3d4e5f67890",
      uploadedBy: owner._id,
      relatedModel: "Property",

      documentType: "title_deed",
      isPublic: false,
      virusScanStatus: "clean",
    });
    const lisbonImg1 = await FileMetadata.create({
      filename: "lisbon-apt-1.jpg",
      originalName: "lisbon-apt-1.jpg",
      mimeType: "image/jpeg",
      directory: "properties/images",
      url: "/uploads/properties/images/lisbon-apt-1.jpg",
      path: "uploads/properties/images/lisbon-apt-1.jpg",
      storageType: "local",
      uploadedBy: owner._id, // mantıklı bir user
      relatedModel: "Property", // şemana uygun
      documentType: "other",
      isPublic: true,
      hash: "c3d4e5f67890",
      size: 345678, // ~345KB
    });
    const contractFilePorto = await FileMetadata.create({
      filename: "contract_porto_emre_signed.pdf",
      originalName: "Investment Contract - Porto Property.pdf",
      mimeType: "application/pdf",
      size: 2458624, // ~2.4MB
      directory: "investments/contracts",
      url: "/uploads/investments/contracts/contract_porto_emre_signed.pdf",
      path: "uploads/investments/contracts/contract_porto_emre_signed.pdf",
      storageType: "local",
      hash: "a1b2c3d4e5f6789",
      uploadedBy: investor._id,
      relatedModel: "Investment",
      documentType: "contract",
      isPublic: false,
      virusScanStatus: "clean",
    });
    const titleDeedPorto = await FileMetadata.create({
      filename: "title_deed_porto_property.pdf",
      originalName: "Title Deed - Porto Property.pdf",
      mimeType: "application/pdf",
      size: 1548234,
      directory: "properties/documents",
      url: "/uploads/properties/documents/title_deed_porto_property.pdf",
      path: "uploads/properties/documents/title_deed_porto_property.pdf",
      storageType: "local",
      hash: "b2c3d4e5f67890",
      uploadedBy: owner._id,
      relatedModel: "Property",
      documentType: "title_deed",
      isPublic: false,
      virusScanStatus: "clean",
    });
    const PortoTmg = await FileMetadata.create({
      filename: "porto_tmg.pdf",
      originalName: "Porto TMG.pdf",
      mimeType: "application/pdf",
      size: 1548234,
      directory: "properties/documents",
      url: "/uploads/properties/documents/porto_tmg.pdf",
      path: "uploads/properties/documents/porto_tmg.pdf",
      storageType: "local",
      hash: "b2c3d4e5f67890",
      uploadedBy: owner._id,
      relatedModel: "Property",
      documentType: "title_deed",
      isPublic: false,
      virusScanStatus: "clean",
    });
    const barcelonaTitleDeed = await FileMetadata.create({
      filename: "title_deed_barcelona_property.pdf",
      originalName: "Title Deed - Barcelona Property.pdf",
      mimeType: "application/pdf",
      size: 1548234,
      directory: "properties/documents",
      url: "/uploads/properties/documents/title_deed_barcelona_property.pdf",
      path: "uploads/properties/documents/title_deed_barcelona_property.pdf",
      storageType: "local",
      hash: "b2c3d4e5f67890",
      uploadedBy: owner._id,
      relatedModel: "Property",

      documentType: "title_deed",
      isPublic: false,
      virusScanStatus: "clean",
    });
    const barcelonaTmg = await FileMetadata.create({
      filename: "barcelona_tmg.pdf",
      originalName: "Barcelona TMG.pdf",
      mimeType: "application/pdf",
      size: 1548234,
      directory: "properties/documents",
      url: "/uploads/properties/documents/barcelona_tmg.pdf",
      path: "uploads/properties/documents/barcelona_tmg.pdf",
      storageType: "local",
      hash: "b2c3d4e5f67890",
      uploadedBy: owner._id,
      relatedModel: "Property",
      documentType: "title_deed",
      isPublic: false,
      virusScanStatus: "clean",
    });

    console.log("✅ File Metadata created");
    // ==================== PROPERTIES ====================
    console.log("🏠 Creating Properties...");

    const property1 = await Property.create({
      country: "Portugal",
      city: "Lisbon",
      fullAddress: "123 Main Street, Lisbon",
      locationPin: { lat: 38.7223, lng: -9.1393 },
      description: "Beautiful apartment in central Lisbon with river view",
      propertyType: "apartment",
      size: 85,
      rooms: 2,
      estimatedValue: 250000,
      requestedInvestment: 50000,
      rentOffered: 500,
      currency: "EUR",
      contractPeriodMonths: 36,
      images: [{ fileId: lisbonImg1._id, type: "other" }],
      documents: [{ fileId: titleDeedFile._id, type: "title_deed" }],
      status: "in_contract",
      owner: owner._id,
      trustScore: 85,
      viewCount: 120,
      favoriteCount: 0,
      investmentOfferCount: 4,
      isFeatured: false,
    });

    const property2 = await Property.create({
      country: "Portugal",
      city: "Porto",
      fullAddress: "456 Beach Road, Porto",
      locationPin: { lat: 41.1579, lng: -8.6291 },
      description: "Modern house near the beach with ocean view",
      propertyType: "house",
      size: 150,
      rooms: 3,
      estimatedValue: 350000,
      requestedInvestment: 75000,
      rentOffered: 800,
      currency: "EUR",
      contractPeriodMonths: 48,
      images: [{ fileId: PortoTmg._id, type: "other" }],
      documents: [
        { fileId: contractFilePorto._id, type: "title_deed" },
        { fileId: titleDeedPorto._id, type: "valuation_report" },
      ],
      status: "published",
      owner: owner._id,
      trustScore: 75,
      viewCount: 85,
      favoriteCount: 1,
      investmentOfferCount: 2,
      isFeatured: true,
      featuredAt: new Date(),
      featuredUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      featuredWeeks: 1,
    });

    const property3 = await Property.create({
      country: "Spain",
      city: "Barcelona",
      fullAddress: "789 Las Ramblas, Barcelona",
      locationPin: { lat: 41.3851, lng: 2.1734 },
      description: "Luxury penthouse with panoramic city views",
      propertyType: "apartment",
      size: 120,
      rooms: 4,
      estimatedValue: 300000,
      requestedInvestment: 100000,
      rentOffered: 1200,
      currency: "EUR",
      contractPeriodMonths: 48,
      images: [{ fileId: barcelonaTmg._id, type: "other" }],
      documents: [{ fileId: barcelonaTitleDeed._id, type: "title_deed" }],
      status: "published",
      owner: owner2._id,
      trustScore: 90,
      viewCount: 250,
      favoriteCount: 1,
      investmentOfferCount: 5,
      isFeatured: false,
    });

    // Update owner properties array
    owner.properties = [property1._id, property2._id];
    await owner.save();
    owner2.properties = [property3._id];
    await owner2.save();
    titleDeedFile.relatedId = property1._id;
    await titleDeedFile.save();
    lisbonImg1.relatedId = property1._id;
    await lisbonImg1.save();
    contractFilePorto.relatedId = property2._id;
    await contractFilePorto.save();
    titleDeedPorto.relatedId = property2._id;
    await titleDeedPorto.save();
    barcelonaTitleDeed.relatedId = property3._id;
    await barcelonaTitleDeed.save();
    barcelonaTmg.relatedId = property3._id;
    await barcelonaTmg.save();
    console.log("✅ Properties created");

    // ==================== INVESTMENT ====================
    console.log("💰 Creating Investment...");

    const investment = await Investment.create({
      property: property1._id,
      investor: investor._id,
      propertyOwner: owner._id,
      amountInvested: 50000,
      currency: "EUR",
      status: "active",
      contractFile: contractFile._id, // Reference to FileMetadata
      titleDeedDocument: titleDeedFile._id, // Reference to FileMetadata
      rentalPayments: [
        {
          month: "2025-01",
          amount: 500,
          status: "paid",
          paidAt: new Date("2025-01-15"),
          paymentReceipt: null,
        },
        {
          month: "2025-02",
          amount: 500,
          status: "pending",
          dueDate: new Date("2025-02-01"),
        },
        {
          month: "2025-03",
          amount: 500,
          status: "pending",
          dueDate: new Date("2025-03-01"),
        },
      ],
    });

    // Update contract file relation
    contractFile.relatedId = investment._id;
    await contractFile.save();

    // Update investor
    investor.investments.push(investment._id);
    investor.activeInvestmentCount = 1;
    investor.favoriteProperties.push(property2._id, property3._id);
    await investor.save();

    // Update property favorites
    property2.favorites.push(investor._id);
    property2.favoriteCount = 1;
    await property2.save();

    property3.favorites.push(investor._id);
    property3.favoriteCount = 1;
    await property3.save();

    console.log("✅ Investment created");

    // ==================== RENTAL PAYMENTS ====================
    console.log("💸 Creating Rental Payments...");

    await RentalPayment.create({
      investment: investment._id,
      property: property1._id,
      investor: investor._id,
      propertyOwner: owner._id,
      month: "2025-01",
      amount: 500,
      currency: "EUR",
      status: "paid",
      dueDate: new Date("2025-01-01"),
      paidAt: new Date("2025-01-15"),
      paymentMethod: "bank_transfer",
    });

    await RentalPayment.create({
      investment: investment._id,
      property: property1._id,
      investor: investor._id,
      propertyOwner: owner._id,
      month: "2025-02",
      amount: 500,
      currency: "EUR",
      status: "pending",
      dueDate: new Date("2025-02-01"),
    });

    console.log("✅ Rental Payments created");

    // ==================== NOTIFICATIONS ====================
    console.log("🔔 Creating Notifications...");

    await Notification.create({
      recipient: investor._id,
      recipientRole: "investor",
      type: "offer_accepted",
      title: "Investment Offer Accepted",
      message: "Your investment offer for Lisbon property has been accepted!",
      relatedEntity: {
        entityType: "investment",
        entityId: investment._id,
      },
      priority: "high",
      isRead: false,
    });

    await Notification.create({
      recipient: owner._id,
      recipientRole: "property_owner",
      type: "rent_payment_received",
      title: "Rent Payment Received",
      message:
        "January 2025 rent payment has been received for your Lisbon property",
      relatedEntity: {
        entityType: "payment",
        entityId: investment._id,
      },
      priority: "medium",
      isRead: true,
      readAt: new Date(),
    });

    await Notification.create({
      recipient: owner._id,
      recipientRole: "property_owner",
      type: "upcoming_rent_payment",
      title: "Upcoming Rent Payment",
      message: "February 2025 rent payment is due in 5 days",
      relatedEntity: {
        entityType: "investment",
        entityId: investment._id,
      },
      priority: "low",
      isRead: false,
    });

    console.log("✅ Notifications created");

    // ==================== ACTIVITY LOGS ====================
    console.log("📊 Creating Activity Logs...");

    await ActivityLog.create({
      user: investor._id,
      action: "user_login",
      details: { loginMethod: "email" },
      ip: "192.168.1.1",
      userAgent: "Mozilla/5.0...",
    });

    await ActivityLog.create({
      user: investor._id,
      action: "investment_offer_sent",
      details: {
        propertyId: property1._id,
        amount: 50000,
      },
      severity: "medium",
    });

    await ActivityLog.create({
      user: owner._id,
      action: "property_created",
      details: {
        propertyId: property1._id,
        city: "Lisbon",
      },
    });

    console.log("✅ Activity Logs created");

    // ==================== SUMMARY ====================
    console.log("\n📊 SEED DATA SUMMARY:");
    console.log("====================");

    console.log("\n✅ MEMBERSHIP PLANS:");
    console.log("• Basic Plan (Free)");
    console.log("• Pro Plan (€19/month)");
    console.log("• Enterprise Plan (€99/month)");

    console.log("\n✅ USERS CREATED:");
    console.log(
      "┌────────────────────┬────────────────────┬─────────────────┐"
    );
    console.log(
      "│ Role               │ Email              │ Password        │"
    );
    console.log(
      "├────────────────────┼────────────────────┼─────────────────┤"
    );
    console.log(
      "│ Investor           │ emre@investor.com  │ Test123!@#      │"
    );
    console.log(
      "│ Property Owner     │ ayse@owner.com     │ Owner123!@#     │"
    );
    console.log(
      "│ Property Owner     │ mehmet@owner.com   │ Mehmet123!@#    │"
    );
    console.log(
      "│ Local Rep          │ john@rep.com       │ Rep123!@#       │"
    );
    console.log(
      "│ Admin              │ admin@admin.com    │ Admin123!@#     │"
    );
    console.log(
      "└────────────────────┴────────────────────┴─────────────────┘"
    );

    console.log("\n🏠 PROPERTIES:");
    console.log("• 1 In-contract property (Lisbon)");
    console.log("• 1 Featured property (Porto)");
    console.log("• 1 Published property (Barcelona)");

    console.log("\n💰 INVESTMENTS:");
    console.log("• Active investment: €50,000 in Lisbon property");
    console.log("• January 2025: Paid (€500)");
    console.log("• February 2025: Pending (€500)");
    console.log("• Contract and Title Deed uploaded");

    console.log("\n📁 FILE SYSTEM:");
    console.log("• FileMetadata collection initialized");
    console.log("• Contract PDF uploaded");
    console.log("• Title Deed PDF uploaded");

    console.log("\n💳 MEMBERSHIPS:");
    console.log("• Investor: Basic (Active)");
    console.log("• Ayse: Pro (Active)");
    console.log("• Mehmet: Basic (Active)");
    console.log("• John: Enterprise (Active)");

    console.log("\n🔔 NOTIFICATIONS:");
    console.log("• 3 notifications created");
    console.log("• Activity logs initialized");

    console.log("\n✨ SEED COMPLETED SUCCESSFULLY!");
    console.log("====================\n");

    process.exit();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });
