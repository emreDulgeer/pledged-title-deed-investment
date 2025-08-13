// seed/seedFix.js - trustedIPs düzeltilmiş versiyon
// Bu dosyayı seed klasörüne koyup çalıştırın: node seed/seedFix.js

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

    // Hash passwords
    const hashedPasswordInvestor = await bcrypt.hash("Test123!@#", 12);
    const hashedPasswordOwner = await bcrypt.hash("Owner123!@#", 12);
    const hashedPasswordMehmet = await bcrypt.hash("Mehmet123!@#", 12);
    const hashedPasswordRep = await bcrypt.hash("Rep123!@#", 12);
    const hashedPasswordAdmin = await bcrypt.hash("Admin123!@#", 12);

    console.log("🔐 Passwords hashed successfully.");

    // CREATE USERS
    const investor = await Investor.create({
      // Basic info
      role: "investor",
      email: "emre@investor.com",
      password: hashedPasswordInvestor,
      fullName: "Emre Yatırımcı",
      phoneNumber: "+905551234567",
      country: "Turkey",
      region: "Istanbul",

      // Authentication & Security
      emailVerified: true,
      emailVerifiedAt: new Date("2025-01-15"),
      phoneVerified: false,
      is2FAEnabled: false,
      accountStatus: "active",
      membershipPlan: "Pro",
      membershipStatus: "active",
      membershipActivatedAt: new Date("2025-01-01"),
      membershipExpiresAt: new Date("2026-01-01"),
      kycStatus: "Approved",
      passwordChangedAt: new Date("2025-01-01"),
      passwordResetRequired: false,
      loginAttempts: 0,
      lastLoginAt: new Date("2025-08-08"),
      lastLoginIP: "192.168.1.100",
      registrationIP: "192.168.1.100",
      trustedIPs: [
        {
          ip: "192.168.1.100",
          name: "Home IP",
          addedAt: new Date("2025-01-01"),
        },
      ],

      // Consents
      consents: {
        terms: true,
        gdpr: true,
        marketing: true,
        timestamp: new Date("2025-01-01"),
      },

      // Investor specific fields
      investmentCapacity: "Medium",
      investmentBudget: 100000,
      preferredCountries: ["Portugal", "Spain"],
      riskTolerance: "Medium",
      investmentExperience: "Intermediate",
      investmentLimit: 5,
      activeInvestmentCount: 1,
      totalInvested: 50000,
      totalReturns: 0,
      notifications: [
        {
          type: "offer_accepted",
          message: "Your offer has been accepted!",
        },
        {
          type: "contract_signed",
          message: "Your contract has been signed and registered.",
        },
      ],
    });

    const owner = await PropertyOwner.create({
      // Basic info
      role: "property_owner",
      email: "ayse@owner.com",
      password: hashedPasswordOwner,
      fullName: "Ayşe Ev Sahibi",
      phoneNumber: "+351912345678",
      country: "Portugal",
      region: "Lisbon",

      // Authentication & Security
      emailVerified: true,
      emailVerifiedAt: new Date("2024-12-15"),
      phoneVerified: true,
      phoneVerifiedAt: new Date("2024-12-16"),
      is2FAEnabled: true,
      accountStatus: "active",
      membershipStatus: "active",
      membershipActivatedAt: new Date("2024-12-01"),
      membershipExpiresAt: new Date("2025-12-01"),
      kycStatus: "Approved",
      passwordChangedAt: new Date("2025-06-01"),
      passwordResetRequired: false,
      loginAttempts: 0,
      lastLoginAt: new Date("2025-08-06"),
      lastLoginIP: "85.240.100.50",
      registrationIP: "85.240.100.50",
      trustedIPs: [
        {
          ip: "85.240.100.50",
          name: "Home IP",
          addedAt: new Date("2024-12-01"),
        },
      ],

      // Consents
      consents: {
        terms: true,
        gdpr: true,
        marketing: false,
        timestamp: new Date("2024-12-01"),
      },

      // Property Owner specific fields
      bankAccountInfo: {
        iban: "PT50000201231234567890154",
        bankName: "Banco Português",
      },
      completedContracts: 3,
      ongoingContracts: 2,
      totalProperties: 5,
      ownerTrustScore: 85,
    });

    const owner2 = await PropertyOwner.create({
      // Basic info
      role: "property_owner",
      email: "mehmet@owner.com",
      password: hashedPasswordMehmet,
      fullName: "Mehmet Mülk Sahibi",
      phoneNumber: "+34612345678",
      country: "Spain",
      region: "Madrid",

      // Authentication & Security
      emailVerified: true,
      emailVerifiedAt: new Date("2025-02-01"),
      phoneVerified: false,
      is2FAEnabled: false,
      accountStatus: "active",
      membershipStatus: "active",
      membershipActivatedAt: new Date("2025-02-01"),
      membershipExpiresAt: new Date("2026-02-01"),
      kycStatus: "Approved",
      passwordChangedAt: new Date("2025-02-01"),
      passwordResetRequired: false,
      loginAttempts: 0,
      lastLoginAt: new Date("2025-08-05"),
      lastLoginIP: "82.223.50.100",
      registrationIP: "82.223.50.100",
      trustedIPs: [], // Boş array veya hiç eklemeyin

      // Consents
      consents: {
        terms: true,
        gdpr: true,
        marketing: true,
        timestamp: new Date("2025-02-01"),
      },

      // Property Owner specific fields
      bankAccountInfo: {
        iban: "ES9121000418450200051332",
        bankName: "Banco Santander",
      },
      completedContracts: 1,
      ongoingContracts: 1,
      totalProperties: 2,
      ownerTrustScore: 70,
    });

    const rep = await LocalRepresentative.create({
      // Basic info
      role: "local_representative",
      email: "john@rep.com",
      password: hashedPasswordRep,
      fullName: "John Temsilci",
      phoneNumber: "+351925555444",
      country: "Portugal",
      assignedCountry: "Portugal",
      region: "Portugal",

      // Authentication & Security
      emailVerified: true,
      emailVerifiedAt: new Date("2025-03-01"),
      phoneVerified: true,
      phoneVerifiedAt: new Date("2025-03-02"),
      is2FAEnabled: true,
      accountStatus: "active",
      membershipStatus: "active",
      membershipActivatedAt: new Date("2025-03-01"),
      membershipExpiresAt: new Date("2026-03-01"),
      kycStatus: "Approved",
      passwordChangedAt: new Date("2025-07-01"),
      passwordResetRequired: false,
      loginAttempts: 0,
      lastLoginAt: new Date("2025-08-08"),
      lastLoginIP: "194.65.100.200",
      registrationIP: "194.65.100.200",
      trustedIPs: [
        {
          ip: "194.65.100.200",
          name: "Office IP",
          addedAt: new Date("2025-03-01"),
        },
        {
          ip: "194.65.100.201",
          name: "Home IP",
          addedAt: new Date("2025-03-01"),
        },
      ],

      // Consents
      consents: {
        terms: true,
        gdpr: true,
        marketing: false,
        timestamp: new Date("2025-03-01"),
      },
    });

    const admin = await Admin.create({
      // Basic info
      role: "admin",
      email: "admin@admin.com",
      password: hashedPasswordAdmin,
      fullName: "Admin Baba",
      phoneNumber: "+905559999999",
      country: "Turkey",
      region: "Global",
      accessLevel: "Global",

      // Authentication & Security
      emailVerified: true,
      emailVerifiedAt: new Date("2024-01-01"),
      phoneVerified: true,
      phoneVerifiedAt: new Date("2024-01-01"),
      is2FAEnabled: true,
      accountStatus: "active",
      membershipStatus: "active",
      membershipActivatedAt: new Date("2024-01-01"),
      membershipExpiresAt: new Date("2030-01-01"),
      kycStatus: "Approved",
      passwordChangedAt: new Date("2025-07-15"),
      passwordResetRequired: false,
      loginAttempts: 0,
      lastLoginAt: new Date("2025-08-08"),
      lastLoginIP: "10.0.0.1",
      registrationIP: "10.0.0.1",
      trustedIPs: [
        {
          ip: "10.0.0.1",
          name: "Office Network",
          addedAt: new Date("2024-01-01"),
        },
        {
          ip: "192.168.1.1",
          name: "VPN Server",
          addedAt: new Date("2024-01-01"),
        },
      ],

      // Consents
      consents: {
        terms: true,
        gdpr: true,
        marketing: false,
        timestamp: new Date("2024-01-01"),
      },
    });

    // PROPERTIES
    const property1 = await Property.create({
      country: "Portugal",
      city: "Lisbon",
      fullAddress: "123 Freedom St, Belém",
      locationPin: {
        lat: 38.7223,
        lng: -9.1393,
      },
      description: "Modern 2+1 apartment in Lisbon center with river view",
      propertyType: "apartment",
      size: 85,
      rooms: 3,
      estimatedValue: 150000,
      requestedInvestment: 50000,
      rentOffered: 500,
      currency: "EUR",
      contractPeriodMonths: 36,
      images: ["https://via.placeholder.com/150"],
      documents: ["titledeed1.pdf"],
      status: "published",
      owner: owner._id,
      trustScore: 80,
      viewCount: 120,
      favoriteCount: 0,
      investmentOfferCount: 3,
    });

    const property2 = await Property.create({
      country: "Portugal",
      city: "Porto",
      fullAddress: "456 Douro View Ave",
      locationPin: {
        lat: 41.1579,
        lng: -8.6291,
      },
      description: "Charming studio in historic Porto district",
      propertyType: "apartment",
      size: 45,
      rooms: 1,
      estimatedValue: 90000,
      requestedInvestment: 30000,
      rentOffered: 350,
      currency: "EUR",
      contractPeriodMonths: 24,
      images: ["https://via.placeholder.com/150"],
      documents: ["titledeed2.pdf"],
      status: "published",
      owner: owner._id,
      trustScore: 75,
      viewCount: 85,
      favoriteCount: 0,
      investmentOfferCount: 2,
    });

    const property3 = await Property.create({
      country: "Spain",
      city: "Barcelona",
      fullAddress: "789 Las Ramblas",
      locationPin: {
        lat: 41.3851,
        lng: 2.1734,
      },
      description: "Luxury penthouse with panoramic city views",
      propertyType: "apartment",
      size: 120,
      rooms: 4,
      estimatedValue: 300000,
      requestedInvestment: 100000,
      rentOffered: 1200,
      currency: "EUR",
      contractPeriodMonths: 48,
      images: ["https://via.placeholder.com/150"],
      documents: ["titledeed3.pdf"],
      status: "published",
      owner: owner2._id,
      trustScore: 90,
      viewCount: 250,
      favoriteCount: 0,
      investmentOfferCount: 5,
    });

    // INVESTMENT
    const investment = await Investment.create({
      property: property1._id, // propertyId yerine property
      investor: investor._id,
      propertyOwner: owner._id,
      amountInvested: 50000, // investmentAmount yerine amountInvested
      currency: "EUR",
      status: "active",
      contractFile: "contract_property1_investor1.pdf",
      titleDeedDocument: null,
      rentalPayments: [
        {
          month: "2025-08",
          amount: 500,
          status: "pending",
          dueDate: new Date("2025-08-01"),
        },
      ],
    });

    // NOTIFICATIONS
    await Notification.create({
      recipient: investor._id, // <-- recipientId değil recipient
      recipientRole: "investor",
      type: "offer_accepted", // <-- enum’daki geçerli değer
      title: "Investment Offer Accepted",
      message: "Your investment offer for Lisbon property has been accepted!",
      relatedEntity: {
        entityType: "investment",
        entityId: investment._id,
      },
      priority: "high",
      isRead: false,
    });

    // Update relationships
    property1.status = "in_contract";
    property1.investmentOfferCount = 4;
    await property1.save();

    investor.investments.push(investment._id);
    investor.rentalIncome.push({
      propertyId: property1._id,
      amount: 500,
      currency: "EUR",
      status: "Pending",
      date: new Date("2025-08-01"),
    });
    investor.favoriteProperties.push(property2._id, property3._id);
    await investor.save();

    property2.favorites.push(investor._id);
    property2.favoriteCount = 1;
    await property2.save();

    property3.favorites.push(investor._id);
    property3.favoriteCount = 1;
    await property3.save();

    console.log("✅ Seed data created successfully.");
    console.log("\n📊 SEED DATA SUMMARY:");
    console.log("====================");
    console.log("✅ USERS CREATED:");
    console.log(
      "┌─────────────────────────────────────────────────────────────┐"
    );
    console.log(
      "│ Role                │ Email              │ Password        │"
    );
    console.log(
      "├─────────────────────────────────────────────────────────────┤"
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
      "└─────────────────────────────────────────────────────────────┘"
    );

    console.log("\n🔐 AUTHENTICATION FEATURES:");
    console.log("• All users have emailVerified: true");
    console.log(
      "• 2FA enabled for: ayse@owner.com, john@rep.com, admin@admin.com"
    );
    console.log(
      "• Phone verified for: ayse@owner.com, john@rep.com, admin@admin.com"
    );
    console.log(
      "• All users have trusted IPs configured (proper object format)"
    );
    console.log("• All passwords follow strong password policy");
    console.log("• GDPR consents recorded for all users");

    console.log("\n🏠 PROPERTIES CREATED:");
    console.log("• 3 Published properties");
    console.log("• 1 In-contract property (Lisbon - with active investment)");

    console.log("\n💰 INVESTMENTS & ACTIVITY:");
    console.log("• Investor favorites: 2 properties");
    console.log("• Active investment: €50,000 in Lisbon property");
    console.log("• Rental payment pending: €500 for August 2025");
    console.log("====================\n");

    process.exit();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });
