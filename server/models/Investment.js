// server/models/Investment.js

const mongoose = require("mongoose");
const {
  SUPPORTED_PROPERTY_COUNTRY_NAMES,
} = require("../utils/propertyCountries");

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
    representativeRequestedByRole: {
      type: String,
      enum: ["investor", "property_owner"],
      default: null,
    },
    representativeRequestedRegion: {
      type: String,
      enum: SUPPORTED_PROPERTY_COUNTRY_NAMES,
      default: null,
    },
    representativeRequestStatus: {
      type: String,
      enum: ["none", "pending", "fulfilled", "cancelled"],
      default: "none",
    },
    representativeRequestClaimedAt: Date,
    representativeRequestResolvedAt: Date,
    amountInvested: Number,
    currency: { type: String, default: "EUR" },
    status: {
      type: String,
      enum: [
        "offer_sent",
        "rejected",
        "contract_signed",
        "title_deed_pending",
        "active",
        "completed",
        "refunded",
        "defaulted",
      ],
      default: "offer_sent",
    },

    offerTerms: {
      ownershipPercent: Number,
      desiredMonthlyRent: Number,
      annualYieldPercent: Number,
      message: String,
    },

    offerDecision: {
      acceptedAt: Date,
      rejectedAt: Date,
      rejectionReason: String,
      decidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
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

    contractWorkflow: {
      investorSigned: {
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
      ownerSigned: {
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
      fullySignedAt: Date,
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

    principalPayment: {
      status: {
        type: String,
        enum: [
          "not_started",
          "instructions_ready",
          "receipt_uploaded",
          "confirmed",
          "failed",
          "cancelled",
        ],
        default: "not_started",
      },
      providerKey: String,
      providerLabel: String,
      method: String,
      amount: Number,
      currency: String,
      referenceCode: String,
      externalPaymentId: String,
      instructions: {
        summary: String,
        recipientName: String,
        bankName: String,
        iban: String,
        swiftCode: String,
        accountNumber: String,
        transferNote: String,
        steps: [String],
      },
      initiatedAt: Date,
      initiatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      receiptUploadedAt: Date,
      receiptUploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      confirmedAt: Date,
      confirmedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      lastError: String,
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
        dueDate: Date,
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
InvestmentSchema.index({
  representativeRequestStatus: 1,
  representativeRequestedRegion: 1,
  localRepresentative: 1,
});

module.exports = mongoose.model("Investment", InvestmentSchema);
