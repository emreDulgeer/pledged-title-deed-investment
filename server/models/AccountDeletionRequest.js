// models/AccountDeletionRequest.js

const mongoose = require("mongoose");

const AccountDeletionRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // Bir kullanıcının aynı anda sadece bir silme talebi olabilir
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    additionalComments: {
      type: String,
      maxlength: 1000,
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
    requestedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    scheduledDeletionDate: {
      type: Date,
      required: true,
    },
    requestIP: {
      type: String,
      required: true,
    },

    // Admin işlemleri
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

    // İptal bilgileri
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancelledAt: Date,

    // Tamamlanma bilgileri
    completedAt: Date,

    // Data export talebi
    dataExportRequested: {
      type: Boolean,
      default: false,
    },
    dataExportUrl: String,
    dataExportGeneratedAt: Date,

    // Kontrol alanları
    hasActiveContracts: {
      type: Boolean,
      default: false,
    },
    hasPendingPayments: {
      type: Boolean,
      default: false,
    },

    // GDPR/KVKK uyumluluğu
    gdprCompliant: {
      type: Boolean,
      default: true,
    },
    dataRetentionNotes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
AccountDeletionRequestSchema.index({ user: 1, status: 1 });
AccountDeletionRequestSchema.index({ scheduledDeletionDate: 1, status: 1 });
AccountDeletionRequestSchema.index({ status: 1, requestedAt: -1 });

// Methods
AccountDeletionRequestSchema.methods.canBeCancelled = function () {
  return ["pending_approval", "approved"].includes(this.status);
};

AccountDeletionRequestSchema.methods.getDaysUntilDeletion = function () {
  if (this.status !== "approved") return null;

  const now = new Date();
  const diffTime = this.scheduledDeletionDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
};

AccountDeletionRequestSchema.methods.isOverdue = function () {
  if (this.status !== "approved") return false;
  return new Date() > this.scheduledDeletionDate;
};

AccountDeletionRequestSchema.methods.approve = async function (adminId) {
  this.status = "approved";
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  return this.save();
};

AccountDeletionRequestSchema.methods.reject = async function (adminId, reason) {
  this.status = "rejected";
  this.rejectedBy = adminId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

AccountDeletionRequestSchema.methods.cancel = async function (userId) {
  this.status = "cancelled";
  this.cancelledBy = userId;
  this.cancelledAt = new Date();
  return this.save();
};

AccountDeletionRequestSchema.methods.complete = async function () {
  this.status = "completed";
  this.completedAt = new Date();
  return this.save();
};

// Statics
AccountDeletionRequestSchema.statics.getPendingDeletions = async function () {
  return this.find({
    status: "approved",
    scheduledDeletionDate: { $lte: new Date() },
  }).populate("user");
};

AccountDeletionRequestSchema.statics.getActiveRequestByUserId = async function (
  userId
) {
  return this.findOne({
    user: userId,
    status: { $in: ["pending_approval", "approved"] },
  });
};

AccountDeletionRequestSchema.statics.getPendingApprovals = async function () {
  return this.find({
    status: "pending_approval",
  })
    .populate("user", "fullName email role")
    .sort("-requestedAt");
};

AccountDeletionRequestSchema.statics.getRecentRequests = async function (
  limit = 10
) {
  return this.find()
    .populate("user", "fullName email")
    .populate("approvedBy", "fullName")
    .populate("rejectedBy", "fullName")
    .sort("-requestedAt")
    .limit(limit);
};

AccountDeletionRequestSchema.statics.getStatistics = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    pending_approval: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    completed: 0,
  };

  stats.forEach((stat) => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

// Virtuals
AccountDeletionRequestSchema.virtual("isPending").get(function () {
  return this.status === "pending_approval";
});

AccountDeletionRequestSchema.virtual("isApproved").get(function () {
  return this.status === "approved";
});

AccountDeletionRequestSchema.virtual("isRejected").get(function () {
  return this.status === "rejected";
});

AccountDeletionRequestSchema.virtual("isCancelled").get(function () {
  return this.status === "cancelled";
});

AccountDeletionRequestSchema.virtual("isCompleted").get(function () {
  return this.status === "completed";
});

// Hooks
AccountDeletionRequestSchema.pre("save", function (next) {
  // Eğer onaylandıysa ve scheduled date yoksa, 90 gün sonrasını ayarla
  if (this.status === "approved" && !this.scheduledDeletionDate) {
    this.scheduledDeletionDate = new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000
    );
  }
  next();
});

// Deletion tarihini geçmiş approved request'leri otomatik olarak overdue olarak işaretle
AccountDeletionRequestSchema.pre("find", function () {
  // Bu bir cron job ile daha iyi handle edilebilir
  // Burada sadece query'ye ekleme yapıyoruz
});

module.exports = mongoose.model(
  "AccountDeletionRequest",
  AccountDeletionRequestSchema
);
