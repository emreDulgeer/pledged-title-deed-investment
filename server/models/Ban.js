// server/models/Ban.js

const mongoose = require("mongoose");

const BanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Ban tipi
    banType: {
      type: String,
      enum: ["permanent", "temporary"],
      required: true,
    },

    // Süre (temporary için)
    expiresAt: {
      type: Date,
      index: true,
    },

    // Ban nedeni
    reason: {
      type: String,
      required: true,
      maxlength: 1000,
    },

    // Kim banladı
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Ban durumu
    status: {
      type: String,
      enum: ["active", "expired", "lifted"],
      default: "active",
      index: true,
    },

    // Ban kaldırılma bilgileri
    liftedAt: Date,
    liftedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    liftReason: String,

    // Ban kategorisi
    category: {
      type: String,
      enum: [
        "spam",
        "harassment",
        "fraud",
        "inappropriate_content",
        "violation_of_terms",
        "security_threat",
        "payment_issues",
        "other",
      ],
      required: true,
    },

    // İlgili rapor varsa
    relatedReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
    },

    // Admin notları
    adminNotes: String,

    // Otomatik ban mı (sistem tarafından)
    isAutomatic: {
      type: Boolean,
      default: false,
    },

    // IP adresi (güvenlik için)
    ipAddress: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
BanSchema.index({ user: 1, status: 1 });
BanSchema.index({ expiresAt: 1, status: 1 });
BanSchema.index({ bannedBy: 1 });

// Virtual: Ban aktif mi
BanSchema.virtual("isActive").get(function () {
  if (this.status !== "active") return false;
  if (this.banType === "permanent") return true;
  if (this.banType === "temporary") {
    return this.expiresAt && new Date() < this.expiresAt;
  }
  return false;
});

// Method: Banı kaldır
BanSchema.methods.lift = async function (adminId, reason) {
  this.status = "lifted";
  this.liftedAt = new Date();
  this.liftedBy = adminId;
  this.liftReason = reason;
  return await this.save();
};

// Static: Kullanıcının aktif banını getir
BanSchema.statics.findActiveBan = async function (userId) {
  const now = new Date();

  return await this.findOne({
    user: userId,
    status: "active",
    $or: [
      { banType: "permanent" },
      { banType: "temporary", expiresAt: { $gt: now } },
    ],
  }).populate("bannedBy", "fullName email role");
};

// Static: Süresi dolan banları güncelle
BanSchema.statics.expireOldBans = async function () {
  const now = new Date();

  const result = await this.updateMany(
    {
      banType: "temporary",
      status: "active",
      expiresAt: { $lte: now },
    },
    {
      $set: { status: "expired" },
    }
  );

  return result.modifiedCount;
};

// Pre-save: Süre kontrolü
BanSchema.pre("save", function (next) {
  // Temporary ban için expiresAt zorunlu
  if (this.banType === "temporary" && !this.expiresAt) {
    next(new Error("Temporary ban requires expiresAt date"));
  }

  // Permanent ban için expiresAt olmamalı
  if (this.banType === "permanent" && this.expiresAt) {
    this.expiresAt = undefined;
  }

  next();
});

module.exports = mongoose.model("Ban", BanSchema);
