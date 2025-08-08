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
    },
    type: {
      type: String,
      enum: [
        "refresh",
        "email_verification",
        "password_reset",
        "2fa_code",
        "phone_verification",
      ],
      required: true,
    },
    deviceInfo: String,
    ip: String,
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Index for quick lookup
TokenSchema.index({ user: 1, type: 1 });
TokenSchema.index({ token: 1 });
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Token", TokenSchema);
