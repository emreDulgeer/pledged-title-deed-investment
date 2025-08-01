const mongoose = require("mongoose");

const InvestmentSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    investor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Investor",
      required: true,
    },
    propertyOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PropertyOwner",
      required: true,
    },
    localRepresentative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LocalRepresentative",
      default: null,
    },
    representativeRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    representativeRequestDate: Date,
    amountInvested: Number,
    currency: { type: String, default: "EUR" },
    status: {
      type: String,
      enum: [
        "offer_sent",
        "contract_signed",
        "title_deed_pending",
        "active",
        "completed",
        "defaulted",
      ],
      default: "offer_sent",
    },
    contractFile: String, // signed PDF
    paymentReceipt: String, // ödeme dekontu
    titleDeedDocument: String, // uploaded annotation or QR
    rentalPayments: [
      {
        month: String, // "2025-07"
        amount: Number,
        status: {
          type: String,
          enum: ["paid", "pending", "delayed"],
          default: "pending",
        },
        paidAt: Date,
        paymentReceipt: String,
      },
    ],
    refund: {
      refunded: Boolean,
      amount: Number,
      refundedAt: Date,
    },
    transferOfProperty: {
      transferred: Boolean,
      date: Date,
      method: {
        type: String,
        enum: ["manual", "market_sale", "investor_accept"],
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Investment", InvestmentSchema);
