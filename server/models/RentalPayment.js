// server/models/RentalPayment.js

const mongoose = require("mongoose");

const RentalPaymentSchema = new mongoose.Schema(
  {
    investment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Investment",
      required: true,
    },
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
    month: {
      type: String, // "2025-07"
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "EUR",
    },
    status: {
      type: String,
      enum: ["paid", "pending", "delayed"],
      default: "pending",
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paidAt: Date,
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "wise", "cash", "other"],
    },
    paymentReceipt: String,
    transactionId: String,
    notes: String,
    // Gecikme bilgileri
    delayedSince: Date,
    daysDelayed: {
      type: Number,
      default: 0,
    },
    delayNotificationsSent: {
      type: Number,
      default: 0,
    },
    lastDelayNotificationAt: Date,
  },
  {
    timestamps: true,
    indexes: [
      { investor: 1, status: 1, month: -1 },
      { propertyOwner: 1, status: 1, month: -1 },
      { investment: 1, month: 1 },
      { status: 1, dueDate: 1 },
      { property: 1, status: 1 },
    ],
  }
);

// Gecikme günlerini otomatik hesapla
RentalPaymentSchema.pre("save", function (next) {
  if (this.status === "delayed" && !this.delayedSince) {
    this.delayedSince = new Date();
  }

  if (this.status === "delayed" && this.dueDate) {
    const now = new Date();
    const diffTime = Math.abs(now - this.dueDate);
    this.daysDelayed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  next();
});

// Virtual fields
RentalPaymentSchema.virtual("isOverdue").get(function () {
  return this.status === "pending" && this.dueDate < new Date();
});

RentalPaymentSchema.virtual("daysUntilDue").get(function () {
  if (this.status !== "pending") return null;
  const now = new Date();
  const diffTime = this.dueDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model("RentalPayment", RentalPaymentSchema);
