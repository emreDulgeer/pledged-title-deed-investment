// server/models/Property.js

const mongoose = require("mongoose");

const PropertySchema = new mongoose.Schema(
  {
    country: { type: String, required: true },
    city: { type: String, required: true },
    fullAddress: String,
    locationPin: {
      lat: Number,
      lng: Number,
    },
    description: String,
    propertyType: {
      type: String,
      enum: ["apartment", "house", "commercial", "other"],
    },
    size: Number, // m²
    rooms: Number,
    estimatedValue: Number,
    requestedInvestment: { type: Number, required: true },

    rentOffered: Number,
    annualYieldPercent: Number,
    currency: { type: String, default: "EUR" },

    contractPeriodMonths: Number,

    // Görsel dosyalar - FileMetadata ile ilişkili
    images: [
      {
        fileId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FileMetadata",
        },
        url: String,
        isPrimary: {
          type: Boolean,
          default: false,
        },
        order: Number,
        uploadedAt: Date,
      },
    ],

    // Dökümanlar - FileMetadata ile ilişkili
    documents: [
      {
        type: {
          type: String,
          enum: [
            "title_deed",
            "annotation",
            "valuation_report",
            "tax_document",
            "floor_plan",
            "other",
          ],
          required: true,
        },
        fileId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FileMetadata",
          required: true,
        },
        url: String,
        fileName: String,
        description: String,
        uploadedAt: Date,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        verifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        verifiedAt: Date,
      },
    ],

    // Ana dökümanlar için hızlı erişim
    titleDeedDocument: {
      fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FileMetadata",
      },
      url: String,
      verified: {
        type: Boolean,
        default: false,
      },
    },

    annotationDocument: {
      fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FileMetadata",
      },
      url: String,
      hasAnnotation: {
        type: Boolean,
        default: false,
      },
    },

    status: {
      type: String,
      enum: [
        "draft",
        "pending_review",
        "published",
        "in_contract",
        "active",
        "completed",
        "on_resale",
      ],
      default: "draft",
    },
    trustScore: { type: Number, default: 50 },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PropertyOwner",
      required: true,
    },

    // PDF'e göre eklenen alanlar
    viewCount: { type: Number, default: 0 },
    favoriteCount: { type: Number, default: 0 },
    investmentOfferCount: { type: Number, default: 0 },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Investor" }],

    // Admin için review notları
    reviewNotes: String,
    lastStatusChange: Date,
    flaggedIssues: [String],

    // Öne Çıkarma özellikleri - PDF'e göre
    isFeatured: { type: Boolean, default: false },
    featuredAt: Date,
    featuredUntil: Date,
    featuredWeeks: Number,
  },
  { timestamps: true }
);

// Pre-save hook to calculate rentOffered or annualYieldPercent if one is missing
PropertySchema.pre("save", function (next) {
  const hasRent = typeof this.rentOffered === "number";
  const hasYield = typeof this.annualYieldPercent === "number";

  if (hasRent && !hasYield && this.requestedInvestment) {
    const yearly = this.rentOffered * 12;
    this.annualYieldPercent = parseFloat(
      ((yearly / this.requestedInvestment) * 100).toFixed(2)
    );
  } else if (!hasRent && hasYield && this.requestedInvestment) {
    const monthly =
      ((this.annualYieldPercent / 100) * this.requestedInvestment) / 12;
    this.rentOffered = parseFloat(monthly.toFixed(2));
  } else if (hasRent && hasYield && this.requestedInvestment) {
    const expected = ((this.rentOffered * 12) / this.requestedInvestment) * 100;
    if (Math.abs(expected - this.annualYieldPercent) > 1) {
      console.warn(
        `⚠️ UYARI: Girilen kira ve getiri tutarsız olabilir. 
Rent = ${this.rentOffered}, Yield = ${this.annualYieldPercent}`
      );
    }
  }

  // Ana resmi belirle
  if (this.images && this.images.length > 0) {
    const hasPrimary = this.images.some((img) => img.isPrimary);
    if (!hasPrimary) {
      this.images[0].isPrimary = true;
    }
  }

  next();
});

// Status değişikliği takibi için middleware
PropertySchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.status) {
    update.lastStatusChange = new Date();
  }
  next();
});

// İndeksler - performans için
PropertySchema.index({ country: 1, city: 1, status: 1 });
PropertySchema.index({ owner: 1, status: 1 });
PropertySchema.index({ annualYieldPercent: -1, status: 1 });
PropertySchema.index({ requestedInvestment: 1, status: 1 });
PropertySchema.index({ createdAt: -1 });
PropertySchema.index({ isFeatured: 1, featuredUntil: 1 });

module.exports = mongoose.model("Property", PropertySchema);
