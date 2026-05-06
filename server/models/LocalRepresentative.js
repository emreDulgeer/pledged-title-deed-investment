// server/models/LocalRepresentative.js

const mongoose = require("mongoose");
const User = require("./User");
const {
  SUPPORTED_PROPERTY_COUNTRY_NAMES,
} = require("../utils/propertyCountries");
const {
  getPrimaryRepresentativeRegion,
  getRepresentativeRegions,
} = require("../utils/representativeRegions");

const LocalRepresentativeSchema = new mongoose.Schema({
  region: {
    type: String,
    enum: SUPPORTED_PROPERTY_COUNTRY_NAMES,
    default: null,
  },
  regions: [
    {
      type: String,
      enum: SUPPORTED_PROPERTY_COUNTRY_NAMES,
    },
  ],
  requestStats: {
    claimed: {
      type: Number,
      default: 0,
    },
    activeAssignments: {
      type: Number,
      default: 0,
    },
    completedAssignments: {
      type: Number,
      default: 0,
    },
  },
  managedProperties: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
    },
  ],
  assistedTransactions: [
    {
      property: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
      investor: { type: mongoose.Schema.Types.ObjectId, ref: "Investor" },
      transactionDate: Date,
      status: String,
      commission: Number,
    },
  ],
  commissionEarned: {
    total: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    history: [
      {
        amount: Number,
        type: {
          type: String,
          enum: ["investment", "service", "referral"],
        },
        date: Date,
        status: {
          type: String,
          enum: ["pending", "paid", "cancelled"],
        },
        description: String,
      },
    ],
  },
  bankAccountInfo: {
    iban: String,
    bankName: String,
    accountHolder: String,
  },
  referralStats: {
    totalReferred: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    totalCommissionFromReferrals: { type: Number, default: 0 },
  },
});

LocalRepresentativeSchema.pre("validate", function normalizeRegions(next) {
  const normalizedRegions = getRepresentativeRegions(this);

  if (!normalizedRegions.length) {
    this.invalidate(
      "regions",
      "At least one supported region is required for a local representative",
    );
    return next();
  }

  this.regions = normalizedRegions;
  this.region = getPrimaryRepresentativeRegion(this);
  return next();
});

LocalRepresentativeSchema.index({ regions: 1 });

module.exports = User.discriminator(
  "LocalRepresentative",
  LocalRepresentativeSchema
);
