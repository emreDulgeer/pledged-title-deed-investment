// models/TwoFactorAuth.js

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
    secret: {
      type: String,
      // For authenticator apps (encrypted)
    },
    tempSecret: {
      type: String,
      // Temporary secret during setup
    },
    isEnabled: {
      type: Boolean,
      default: false,
    },
    enabledAt: Date,
    disabledAt: Date,
    backupCodes: [
      {
        type: String,
      },
    ],
    usedBackupCodes: [
      {
        code: String,
        usedAt: Date,
      },
    ],
    lastUsedAt: Date,
    // SMS/Email specific
    phoneNumber: {
      type: String,
      required: function () {
        return this.method === "sms";
      },
    },
    email: {
      type: String,
      required: function () {
        return this.method === "email";
      },
    },
    // Security
    trustedDevices: [
      {
        deviceId: String,
        deviceName: String,
        addedAt: Date,
        lastUsedAt: Date,
      },
    ],
    // Settings
    settings: {
      requireForLogin: {
        type: Boolean,
        default: true,
      },
      requireForPasswordChange: {
        type: Boolean,
        default: true,
      },
      requireForTransfer: {
        type: Boolean,
        default: true,
      },
      rememberDeviceDays: {
        type: Number,
        default: 30,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
TwoFactorAuthSchema.index({ user: 1 });
TwoFactorAuthSchema.index({ user: 1, isEnabled: 1 });

// Methods
TwoFactorAuthSchema.methods.verifyBackupCode = function (code) {
  const hashedCode = require("crypto")
    .createHash("sha256")
    .update(code)
    .digest("hex");

  const index = this.backupCodes.indexOf(hashedCode);

  if (index === -1) {
    return false;
  }

  // Remove used backup code
  this.backupCodes.splice(index, 1);
  this.usedBackupCodes.push({
    code: hashedCode,
    usedAt: new Date(),
  });

  return true;
};

TwoFactorAuthSchema.methods.generateNewBackupCodes = function () {
  const crypto = require("crypto");
  const codes = [];
  const hashedCodes = [];

  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
    hashedCodes.push(crypto.createHash("sha256").update(code).digest("hex"));
  }

  this.backupCodes = hashedCodes;
  this.usedBackupCodes = [];

  return codes; // Return unhashed codes to show user once
};

TwoFactorAuthSchema.methods.addTrustedDevice = function (deviceId, deviceName) {
  const existingDevice = this.trustedDevices.find(
    (d) => d.deviceId === deviceId
  );

  if (existingDevice) {
    existingDevice.lastUsedAt = new Date();
  } else {
    this.trustedDevices.push({
      deviceId,
      deviceName: deviceName || "Unknown Device",
      addedAt: new Date(),
      lastUsedAt: new Date(),
    });
  }

  // Keep only last 5 devices
  if (this.trustedDevices.length > 5) {
    this.trustedDevices.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    this.trustedDevices = this.trustedDevices.slice(0, 5);
  }
};

TwoFactorAuthSchema.methods.isTrustedDevice = function (deviceId) {
  const device = this.trustedDevices.find((d) => d.deviceId === deviceId);

  if (!device) {
    return false;
  }

  // Check if device trust has expired
  const daysSinceLastUse =
    (new Date() - device.lastUsedAt) / (1000 * 60 * 60 * 24);

  if (daysSinceLastUse > this.settings.rememberDeviceDays) {
    // Remove expired device
    this.trustedDevices = this.trustedDevices.filter(
      (d) => d.deviceId !== deviceId
    );
    return false;
  }

  return true;
};

// Statics
TwoFactorAuthSchema.statics.getEnabledUsersCount = async function () {
  return this.countDocuments({ isEnabled: true });
};

TwoFactorAuthSchema.statics.getMethodStatistics = async function () {
  return this.aggregate([
    {
      $match: { isEnabled: true },
    },
    {
      $group: {
        _id: "$method",
        count: { $sum: 1 },
      },
    },
  ]);
};

module.exports = mongoose.model("TwoFactorAuth", TwoFactorAuthSchema);
