const mongoose = require("mongoose");

const PasswordHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    changeReason: {
      type: String,
      enum: ["user_change", "reset", "admin_reset", "expired", "compromised"],
    },
    ip: String,
  },
  {
    timestamps: true,
  }
);

// Keep last 5 passwords per user
PasswordHistorySchema.index({ user: 1, changedAt: -1 });

// Static method to check if password was used before
PasswordHistorySchema.statics.wasUsedBefore = async function (
  userId,
  password
) {
  const bcrypt = require("bcryptjs");

  // Get last 5 passwords
  const history = await this.find({ user: userId })
    .sort({ changedAt: -1 })
    .limit(5);

  for (const record of history) {
    const match = await bcrypt.compare(password, record.passwordHash);
    if (match) {
      return true;
    }
  }

  return false;
};

module.exports = mongoose.model("PasswordHistory", PasswordHistorySchema);
