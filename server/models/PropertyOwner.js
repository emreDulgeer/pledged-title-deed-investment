const mongoose = require("mongoose");
const User = require("./User");

const PropertyOwnerSchema = new mongoose.Schema({
  properties: [{ type: mongoose.Schema.Types.ObjectId, ref: "Property" }],
  rentPaymentHistory: [
    {
      investorId: { type: mongoose.Schema.Types.ObjectId, ref: "Investor" },
      amount: Number,
      currency: String,
      date: Date,
      status: { type: String, enum: ["Paid", "Pending", "Delayed"] },
    },
  ],
  bankAccountInfo: {
    iban: String,
    bankName: String,
  },
  // Embedded notification kaldırıldı ⬇
  // notifications: [...], ❌ silindi

  completedContracts: { type: Number, default: 0 },
  ongoingContracts: { type: Number, default: 0 },
  totalProperties: { type: Number, default: 0 },
  ownerTrustScore: { type: Number, default: 50 },
});

module.exports = User.discriminator("PropertyOwner", PropertyOwnerSchema);
