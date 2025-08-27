// server/models/Investment.js

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

    // File references - FileMetadata ile ilişkili
    contractFile: {
      fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FileMetadata",
      },
      url: String,
      uploadedAt: Date,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    paymentReceipt: {
      fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FileMetadata",
      },
      url: String,
      uploadedAt: Date,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    titleDeedDocument: {
      fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FileMetadata",
      },
      url: String,
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

    // Diğer dökümanlar (ek belgeler)
    additionalDocuments: [
      {
        type: {
          type: String,
          enum: [
            "notary_document",
            "power_of_attorney",
            "tax_receipt",
            "other",
          ],
        },
        fileId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FileMetadata",
        },
        url: String,
        description: String,
        uploadedAt: Date,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

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
        paymentReceipt: {
          fileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FileMetadata",
          },
          url: String,
        },
      },
    ],

    refund: {
      refunded: Boolean,
      amount: Number,
      refundedAt: Date,
      refundReceipt: {
        fileId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FileMetadata",
        },
        url: String,
      },
    },

    transferOfProperty: {
      transferred: Boolean,
      date: Date,
      method: {
        type: String,
        enum: ["manual", "market_sale", "investor_accept"],
      },
      transferDocument: {
        fileId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FileMetadata",
        },
        url: String,
      },
    },
  },
  { timestamps: true }
);

// Indexes for performance
InvestmentSchema.index({ property: 1, status: 1 });
InvestmentSchema.index({ investor: 1, status: 1 });
InvestmentSchema.index({ propertyOwner: 1, status: 1 });
InvestmentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Investment", InvestmentSchema);
