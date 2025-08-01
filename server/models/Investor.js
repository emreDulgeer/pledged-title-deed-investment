const mongoose = require("mongoose");
const User = require("./User");

const InvestorSchema = new mongoose.Schema({
  investments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Investment" }],
  rentalIncome: [
    {
      propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
      amount: Number,
      currency: String,
      status: { type: String, enum: ["Paid", "Pending", "Delayed"] },
      date: Date,
    },
  ],
  bankAccountInfo: {
    iban: String,
    bankName: String,
  },
  favoriteProperties: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
  ],
  referralCode: String,
  referredBy: String,
  purchasedServices: [
    {
      serviceName: String,
      serviceId: mongoose.Schema.Types.ObjectId,
      price: Number,
      purchaseDate: Date,
      status: {
        type: String,
        enum: ["pending", "in_progress", "completed", "cancelled"],
        default: "pending",
      },
    },
  ],
  subscription: {
    currentPlan: {
      type: String,
      enum: ["Basic", "Pro", "Enterprise"],
      default: "Basic",
    },
    startDate: Date,
    endDate: Date,
    autoRenew: { type: Boolean, default: true },
  },
  activeInvestmentCount: { type: Number, default: 0 },
  investmentLimit: { type: Number, default: 1 },
});

module.exports = User.discriminator("Investor", InvestorSchema);
