const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
require("../models");
// MODELLERİ YÜKLE
const User = require("../models/User");
const Investor = require("../models/Investor");
const PropertyOwner = require("../models/PropertyOwner");
const LocalRepresentative = require("../models/LocalRepresentative");
const Admin = require("../models/Admin");
const Property = require("../models/Property");
const Investment = require("../models/Investment");
const RentalPayment = require("../models/RentalPayment");
const Notification = require("../models/Notification");

// MONGO CONNECTION
mongoose
  .connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/pledged_platform",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(async () => {
    console.log("🟢 MongoDB connected. Checking existing data...");

    // Check if database has data
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const hasData = collections.length > 0;

    if (hasData) {
      // Check if any collection has documents
      let totalDocuments = 0;
      for (const collection of collections) {
        const count = await mongoose.connection.db
          .collection(collection.name)
          .countDocuments();
        totalDocuments += count;
      }

      if (totalDocuments > 0) {
        console.log(
          `📊 Database contains ${totalDocuments} documents across ${collections.length} collections.`
        );
        console.log("⚠️  Skipping database drop to preserve existing data.");
        console.log(
          "💡 To force seed with fresh data, manually drop the database first."
        );
        process.exit(0);
      }
    }

    console.log("🗑️ No existing data found. Proceeding with database drop...");
    await mongoose.connection.dropDatabase();
    console.log("🗑️ Existing database dropped.");

    // USERS
    const investor = await Investor.create({
      role: "investor",
      email: "emre@investor.com",
      password: "123456",
      fullName: "Emre Yatırımcı",
      country: "Turkey",
      is2FAEnabled: false,
      membershipPlan: "Pro",
      kycStatus: "Approved",
      bankAccountInfo: {
        iban: "TR123456789012345678901234",
        bankName: "Ziraat Bankası",
      },
      favoriteProperties: [], // Favori property'ler için boş array
      referralCode: "INV-EMRE-2025",
      referredBy: null,
      purchasedServices: [
        {
          serviceName: "Visa Consultancy",
          price: 500,
          purchaseDate: new Date(),
          status: "completed",
        },
      ],
      subscription: {
        currentPlan: "Pro",
        startDate: new Date("2025-07-01"),
        endDate: new Date("2026-07-01"),
        autoRenew: true,
      },
      activeInvestmentCount: 1,
      investmentLimit: 5,
      notifications: [
        {
          type: "rent_payment_due",
          message: "Your rent payment is due soon.",
        },
        {
          type: "contract_signed",
          message: "Your contract has been signed and registered.",
        },
      ],
    });

    const owner = await PropertyOwner.create({
      role: "property_owner",
      email: "ayse@owner.com",
      password: "123456",
      fullName: "Ayşe Ev Sahibi",
      country: "Portugal",
      kycStatus: "Approved",
      bankAccountInfo: {
        iban: "PT50000201231234567890154",
        bankName: "Banco Português",
      },
      // PDF'e göre owner performans verileri
      completedContracts: 3,
      ongoingContracts: 2,
      totalProperties: 5,
      ownerTrustScore: 85,
    });

    const owner2 = await PropertyOwner.create({
      role: "property_owner",
      email: "mehmet@owner.com",
      password: "123456",
      fullName: "Mehmet Mülk Sahibi",
      country: "Spain",
      kycStatus: "Approved",
      bankAccountInfo: {
        iban: "ES9121000418450200051332",
        bankName: "Banco Santander",
      },
      // PDF'e göre owner performans verileri
      completedContracts: 1,
      ongoingContracts: 1,
      totalProperties: 2,
      ownerTrustScore: 70,
    });

    const rep = await LocalRepresentative.create({
      role: "local_representative",
      email: "john@rep.com",
      password: "123456",
      fullName: "John Temsilci",
      country: "Portugal",
      assignedCountry: "Portugal",
      region: "Portugal",
    });

    const admin = await Admin.create({
      role: "admin",
      email: "admin@admin.com",
      password: "admin123",
      fullName: "Admin Baba",
      accessLevel: "Global",
    });

    // PROPERTIES - Çeşitli ülke ve şehirlerden
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
      documents: ["titledeed.pdf"],
      status: "published",
      owner: owner._id,
      trustScore: 80,
      viewCount: 125,
      favoriteCount: 0,
      investmentOfferCount: 3,
      favorites: [],
    });

    const property2 = await Property.create({
      country: "Portugal",
      city: "Porto",
      fullAddress: "456 Wine Street, Ribeira",
      locationPin: {
        lat: 41.1496,
        lng: -8.6109,
      },
      description: "Traditional Portuguese house in historic Porto",
      propertyType: "house",
      size: 120,
      rooms: 4,
      estimatedValue: 200000,
      requestedInvestment: 75000,
      rentOffered: 800,
      currency: "EUR",
      contractPeriodMonths: 48,
      images: ["https://via.placeholder.com/150"],
      documents: ["titledeed2.pdf"],
      status: "published",
      owner: owner._id,
      trustScore: 85,
      viewCount: 89,
      favoriteCount: 0,
      investmentOfferCount: 2,
    });

    const property3 = await Property.create({
      country: "Spain",
      city: "Barcelona",
      fullAddress: "789 Las Ramblas, Gothic Quarter",
      locationPin: {
        lat: 41.3851,
        lng: 2.1734,
      },
      description: "Luxury apartment near Barcelona beach",
      propertyType: "apartment",
      size: 95,
      rooms: 3,
      estimatedValue: 250000,
      requestedInvestment: 100000,
      annualYieldPercent: 8, // Yıllık getiri oranı belirtildi
      currency: "EUR",
      contractPeriodMonths: 60,
      images: ["https://via.placeholder.com/150"],
      documents: ["titledeed3.pdf"],
      status: "published",
      owner: owner2._id,
      trustScore: 75,
      viewCount: 203,
      favoriteCount: 0,
      investmentOfferCount: 5,
    });

    const property4 = await Property.create({
      country: "Spain",
      city: "Madrid",
      fullAddress: "321 Gran Via, Centro",
      locationPin: {
        lat: 40.4168,
        lng: -3.7038,
      },
      description: "Commercial property in Madrid business center",
      propertyType: "commercial",
      size: 200,
      rooms: 0,
      estimatedValue: 500000,
      requestedInvestment: 200000,
      rentOffered: 2500,
      currency: "EUR",
      contractPeriodMonths: 24,
      images: ["https://via.placeholder.com/150"],
      documents: ["titledeed4.pdf"],
      status: "published",
      owner: owner2._id,
      trustScore: 90,
      viewCount: 156,
      favoriteCount: 0,
      investmentOfferCount: 1,
    });

    // Öne çıkarılmış property
    const featuredProperty = await Property.create({
      country: "Portugal",
      city: "Lisbon",
      fullAddress: "999 Premium Avenue, Cascais",
      locationPin: {
        lat: 38.6979,
        lng: -9.4215,
      },
      description: "Premium villa with ocean view - FEATURED PROPERTY",
      propertyType: "house",
      size: 300,
      rooms: 6,
      estimatedValue: 800000,
      requestedInvestment: 300000,
      rentOffered: 3500,
      currency: "EUR",
      contractPeriodMonths: 60,
      images: ["https://via.placeholder.com/150"],
      documents: ["titledeed5.pdf"],
      status: "published",
      owner: owner._id,
      trustScore: 95,
      viewCount: 450,
      favoriteCount: 0,
      investmentOfferCount: 8,
      // Öne çıkarma özellikleri
      isFeatured: true,
      featuredAt: new Date(),
      featuredUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 hafta
      featuredWeeks: 1,
    });

    // Draft durumunda property (admin panelinde görünür)
    const draftProperty = await Property.create({
      country: "Latvia",
      city: "Riga",
      fullAddress: "555 Baltic Street",
      description: "New development project",
      propertyType: "apartment",
      size: 70,
      rooms: 2,
      estimatedValue: 80000,
      requestedInvestment: 40000,
      rentOffered: 400,
      currency: "EUR",
      contractPeriodMonths: 36,
      status: "draft",
      owner: owner._id,
      trustScore: 50,
    });

    // Pending review durumunda property
    const pendingProperty = await Property.create({
      country: "Estonia",
      city: "Tallinn",
      fullAddress: "777 Digital Street",
      description: "Tech hub office space",
      propertyType: "commercial",
      size: 150,
      rooms: 0,
      estimatedValue: 300000,
      requestedInvestment: 150000,
      rentOffered: 1800,
      currency: "EUR",
      contractPeriodMonths: 48,
      status: "pending_review",
      owner: owner2._id,
      trustScore: 60,
      reviewNotes: "Waiting for document verification",
      // Admin tarafından işaretlenmiş sorunlar
      flaggedIssues: ["Eksik tapu belgesi", "Fotoğraflar net değil"],
    });

    // INVESTMENT
    const investment = await Investment.create({
      property: property1._id,
      investor: investor._id,
      propertyOwner: property1.owner, // <<<<< DÜZELTME BURADA
      amountInvested: 50000,
      currency: "EUR",
      status: "contract_signed",
      rentalPayments: [
        {
          month: "2025-08",
          amount: 500,
          status: "pending",
        },
      ],
    });
    await RentalPayment.create({
      investment: investment._id,
      property: property1._id,
      propertyOwner: owner._id,
      investor: investor._id,
      amount: 500,
      currency: "EUR",
      status: "pending",
      dueDate: new Date("2025-08-01"),
      month: "2025-08",
    });
    await Notification.create({
      recipient: investor._id,
      recipientRole: "investor",
      type: "rent_payment_received", //
      title: "Rent Payment Received",
      message: "You have received a €500 rent payment for August.",
      isRead: false,
    });

    // Property1'in durumunu in_contract yap
    property1.status = "in_contract";
    property1.investmentOfferCount = 4; // Bir teklif kabul edildi
    await property1.save();

    // Investor'a favori property'ler ekle
    investor.investments.push(investment._id);
    investor.rentalIncome.push({
      propertyId: property1._id,
      amount: 500,
      currency: "EUR",
      status: "Pending",
      date: new Date("2025-08-01"),
    });

    // Investor'ın favorilerine property2 ve property3'ü ekle
    investor.favoriteProperties.push(property2._id, property3._id);
    await investor.save();

    // Property2 ve property3'ün favorites array'ine investor'ı ekle
    property2.favorites.push(investor._id);
    property2.favoriteCount = 1;
    await property2.save();

    property3.favorites.push(investor._id);
    property3.favoriteCount = 1;
    await property3.save();

    console.log("✅ Seed data created successfully.");

    console.log("\n📊 SEED DATA SUMMARY:");
    console.log("====================");
    console.log("Users created:");
    console.log("- Investor: emre@investor.com (password: 123456)");
    console.log(
      "- Property Owners: ayse@owner.com, mehmet@owner.com (password: 123456)"
    );
    console.log("- Local Rep: john@rep.com (password: 123456)");
    console.log("- Admin: admin@admin.com (password: admin123)");
    console.log("\nProperties created:");
    console.log("- 4 Published properties (Portugal: 2, Spain: 2)");
    console.log("- 1 Featured property (Portugal)");
    console.log("- 1 In-contract property (with active investment)");
    console.log("- 1 Draft property (Latvia)");
    console.log("- 1 Pending review property (Estonia)");
    console.log("\nInvestor favorites: 2 properties");
    console.log("Active investment: 1 (€50,000 in Lisbon property)");
    console.log("====================\n");

    process.exit();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });
