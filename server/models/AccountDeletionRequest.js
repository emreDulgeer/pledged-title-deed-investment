const mongoose = require("mongoose");

const AccountDeletionRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    additionalComments: String,
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    scheduledDeletionDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending_approval",
        "approved",
        "rejected",
        "cancelled",
        "completed",
      ],
      default: "pending_approval",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: Date,
    rejectionReason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancelledAt: Date,
    completedAt: Date,
    requestIP: String,
    dataExportRequested: {
      type: Boolean,
      default: false,
    },
    dataExportUrl: String,
    dataExportGeneratedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Index for scheduled deletion job
AccountDeletionRequestSchema.index({
  status: 1,
  scheduledDeletionDate: 1,
});

module.exports = mongoose.model(
  "AccountDeletionRequest",
  AccountDeletionRequestSchema
);
