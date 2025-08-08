const mongoose = require("mongoose");

const TwoFactorAuthSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    method: {
      type: String,
      enum: ["email", "sms", "authenticator"],
      required: true,
    },
    secret: String, // For authenticator apps
    tempSecret: String, // Temporary secret during setup
    backupCodes: [
      {
        type: String,
      },
    ],
    isEnabled: {
      type: Boolean,
      default: false,
    },
    enabledAt: Date,
    disabledAt: Date,
    lastUsedAt: Date,
    failedAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TwoFactorAuth", TwoFactorAuthSchema);
