// server/models/LocalRepresentative.js

const mongoose = require("mongoose");
const User = require("./User");

const LocalRepresentativeSchema = new mongoose.Schema({
  region: {
    type: String,
    required: true, // Hangi ülke/bölgeden sorumlu
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

module.exports = User.discriminator(
  "LocalRepresentative",
  LocalRepresentativeSchema
);
