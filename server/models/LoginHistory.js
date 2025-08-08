const mongoose = require("mongoose");

const LoginHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    loginTime: {
      type: Date,
      default: Date.now,
    },
    logoutTime: Date,
    ip: String,
    userAgent: String,
    deviceType: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "unknown"],
    },
    browser: String,
    os: String,
    location: {
      country: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    loginMethod: {
      type: String,
      enum: ["password", "2fa", "social", "sso"],
    },
    wasSuccessful: {
      type: Boolean,
      default: true,
    },
    failureReason: String,
    sessionDuration: Number, // in seconds
    suspicious: {
      type: Boolean,
      default: false,
    },
    suspiciousReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
LoginHistorySchema.index({ user: 1, loginTime: -1 });
LoginHistorySchema.index({ ip: 1 });
LoginHistorySchema.index({ suspicious: 1 });

// TTL - keep login history for 6 months
LoginHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 15552000 });

module.exports = mongoose.model("LoginHistory", LoginHistorySchema);
