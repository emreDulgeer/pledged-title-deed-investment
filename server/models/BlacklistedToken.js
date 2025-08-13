// models/BlacklistedToken.js

const mongoose = require("mongoose");

const BlacklistedTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenType: {
      type: String,
      enum: ["access", "refresh"],
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "user_logout",
        "password_changed",
        "account_deleted",
        "security_breach",
        "forced_logout",
        "all_sessions_revoked",
        "2fa_changed",
        "suspicious_activity",
      ],
      required: true,
    },
    ip: String,
    userAgent: String,
    blacklistedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index - blacklisted token'ları 30 gün sonra sil
BlacklistedTokenSchema.index(
  { blacklistedAt: 1 },
  { expireAfterSeconds: 2592000 } // 30 gün
);

// Indexes for efficient querying
BlacklistedTokenSchema.index({ user: 1, tokenType: 1 });
BlacklistedTokenSchema.index({ expiresAt: 1 });

// Methods
BlacklistedTokenSchema.statics.isBlacklisted = async function (token) {
  const blacklisted = await this.findOne({
    token,
    expiresAt: { $gt: new Date() },
  });
  return !!blacklisted;
};

BlacklistedTokenSchema.statics.blacklistUserTokens = async function (
  userId,
  reason
) {
  const Token = require("./Token");

  // Find all active tokens for user
  const activeTokens = await Token.find({
    user: userId,
    expiresAt: { $gt: new Date() },
  });

  // Blacklist them all
  const blacklistPromises = activeTokens.map((token) => {
    return this.create({
      token: token.token,
      tokenType: token.type,
      user: userId,
      expiresAt: token.expiresAt,
      reason: reason || "forced_logout",
    });
  });

  await Promise.all(blacklistPromises);

  return activeTokens.length;
};

module.exports = mongoose.model("BlacklistedToken", BlacklistedTokenSchema);
