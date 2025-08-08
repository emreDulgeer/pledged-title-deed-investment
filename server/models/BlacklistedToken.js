const mongoose = require("mongoose");

const BlacklistedTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
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
    reason: {
      type: String,
      enum: [
        "user_logout",
        "password_changed",
        "suspicious_activity",
        "admin_action",
      ],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    ip: String,
    blacklistedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Auto cleanup after token natural expiry
BlacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 }); // Keep for 1 day after expiry

module.exports = mongoose.model("BlacklistedToken", BlacklistedTokenSchema);
