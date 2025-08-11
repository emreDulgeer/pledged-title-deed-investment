// models/Token.js - Session management için eklenecek alanlar

const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: [
        "access",
        "refresh",
        "email_verification",
        "password_reset",
        "2fa_backup",
        "2fa_code",
      ],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },

    // Session management için yeni alanlar
    deviceInfo: {
      type: String,
      default: "Unknown Device",
    },
    ip: {
      type: String,
      required: function () {
        return this.type === "refresh";
      },
    },
    userAgent: String,
    location: String,
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },

    // Security
    isRevoked: {
      type: Boolean,
      default: false,
    },
    revokedAt: Date,
    revokedReason: String,

    // Session fingerprint (browser/device identification)
    fingerprint: String,

    // Trusted device
    isTrustedDevice: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
TokenSchema.index({ user: 1, type: 1 });
TokenSchema.index({ token: 1 });
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
TokenSchema.index({ user: 1, type: 1, isRevoked: 1, expiresAt: 1 });

// Methods
TokenSchema.methods.updateLastUsed = async function () {
  this.lastUsedAt = new Date();
  await this.save();
};

TokenSchema.methods.revoke = async function (reason) {
  this.isRevoked = true;
  this.revokedAt = new Date();
  this.revokedReason = reason || "Manual revocation";
  await this.save();
};

// Statics
TokenSchema.statics.getActiveSessionsForUser = async function (userId) {
  return this.find({
    user: userId,
    type: "refresh",
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });
};

TokenSchema.statics.revokeAllUserTokens = async function (
  userId,
  exceptTokenId = null
) {
  const query = {
    user: userId,
    isRevoked: false,
  };

  if (exceptTokenId) {
    query._id = { $ne: exceptTokenId };
  }

  return this.updateMany(query, {
    isRevoked: true,
    revokedAt: new Date(),
    revokedReason: "All sessions revoked by user",
  });
};

module.exports = mongoose.model("Token", TokenSchema);
