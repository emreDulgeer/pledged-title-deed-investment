// utils/authHelpers.js - authController'da kullanılacak yardımcı fonksiyonlar

/**
 * Check if user has pending payments
 */
const checkPendingPayments = async (userId) => {
  const Investment = require("../models/Investment");

  const pendingPayments = await Investment.find({
    $or: [
      {
        investor: userId,
        status: "active",
        nextPaymentDate: { $lte: new Date() },
        paymentStatus: { $ne: "completed" },
      },
      {
        propertyOwner: userId,
        status: "active",
        ownerPaymentStatus: { $ne: "completed" },
      },
    ],
  });

  return pendingPayments.length > 0;
};

/**
 * Get user's active contracts count
 */
const getActiveContractsCount = async (userId) => {
  const Investment = require("../models/Investment");

  const count = await Investment.countDocuments({
    $or: [
      { investor: userId, status: "active" },
      { propertyOwner: userId, status: "active" },
    ],
  });

  return count;
};

/**
 * Check password strength
 */
const checkPasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return {
      isValid: false,
      message: `Şifre en az ${minLength} karakter olmalıdır`,
    };
  }

  if (!hasUpperCase) {
    return {
      isValid: false,
      message: "Şifre en az bir büyük harf içermelidir",
    };
  }

  if (!hasLowerCase) {
    return {
      isValid: false,
      message: "Şifre en az bir küçük harf içermelidir",
    };
  }

  if (!hasNumbers) {
    return {
      isValid: false,
      message: "Şifre en az bir rakam içermelidir",
    };
  }

  if (!hasSpecialChar) {
    return {
      isValid: false,
      message: "Şifre en az bir özel karakter içermelidir",
    };
  }

  return {
    isValid: true,
    message: "Şifre güçlü",
  };
};

/**
 * Get user model by role (discriminator)
 */
const getUserModelByRole = (role) => {
  switch (role) {
    case "investor":
      return require("../models/Investor");
    case "property_owner":
      return require("../models/PropertyOwner");
    case "local_representative":
      return require("../models/LocalRepresentative");
    case "admin":
      return require("../models/User");
    default:
      return require("../models/User");
  }
};

/**
 * Generate secure random token
 */
const generateSecureToken = (length = 32) => {
  const crypto = require("crypto");
  return crypto.randomBytes(length).toString("hex");
};

/**
 * Hash token for storage
 */
const hashToken = (token) => {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Check if IP is trusted
 */
const isIPTrusted = async (userId, ip) => {
  const User = require("../models/User");
  const user = await User.findById(userId).select("trustedIPs");

  if (!user || !user.trustedIPs || user.trustedIPs.length === 0) {
    return false;
  }

  return user.trustedIPs.some((trustedIP) => trustedIP.ip === ip);
};

/**
 * Log security event
 */
const logSecurityEvent = async (
  userId,
  action,
  details,
  severity = "medium"
) => {
  const ActivityLog = require("../models/ActivityLog");

  await ActivityLog.create({
    user: userId,
    action,
    details,
    severity,
    timestamp: new Date(),
  });
};

/**
 * Notify admins about critical events
 */
const notifyAdmins = async (notificationData) => {
  const User = require("../models/User");
  const notificationService = require("../services/notificationService");

  const admins = await User.find({ role: "admin" }).select("_id");

  for (const admin of admins) {
    await notificationService.createNotification(
      admin._id,
      "admin",
      notificationData
    );
  }
};

/**
 * Validate GDPR/KVKK consent
 */
const validateConsents = (consents) => {
  if (!consents) {
    return {
      isValid: false,
      message: "Onaylar gereklidir",
    };
  }

  if (!consents.terms) {
    return {
      isValid: false,
      message: "Kullanım koşulları onayı zorunludur",
    };
  }

  if (!consents.gdpr) {
    return {
      isValid: false,
      message: "KVKK/GDPR onayı zorunludur",
    };
  }

  return {
    isValid: true,
    message: "Onaylar geçerli",
  };
};

/**
 * Get user's location from IP
 */
const getLocationFromIP = async (ip) => {
  // Bu fonksiyon gerçek uygulamada bir IP geolocation servisi kullanmalı
  // Örnek: ipapi, ipgeolocation, maxmind vb.

  // Şimdilik basit bir mock response
  if (ip === "127.0.0.1" || ip === "::1") {
    return "Localhost";
  }

  // Gerçek implementasyon için:
  // const response = await axios.get(`https://ipapi.co/${ip}/json/`);
  // return `${response.data.city}, ${response.data.country}`;

  return "Unknown Location";
};

module.exports = {
  checkPendingPayments,
  getActiveContractsCount,
  checkPasswordStrength,
  getUserModelByRole,
  generateSecureToken,
  hashToken,
  isIPTrusted,
  logSecurityEvent,
  notifyAdmins,
  validateConsents,
  getLocationFromIP,
};
