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

    images: [String],
    documents: [String],

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

    // Öne çıkarma özellikleri - PDF'e göre
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
        `⚠️ UYARI: Girilen kira ve getiri tutarsız olabilir. Rent = ${this.rentOffered}, Yield = ${this.annualYieldPercent}`
      );
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

module.exports = mongoose.model("Property", PropertySchema);
