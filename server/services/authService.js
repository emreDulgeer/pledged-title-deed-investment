// server/services/authService.js

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Token = require("../models/Token");
const BlacklistedToken = require("../models/BlacklistedToken");
const ActivityLog = require("../models/ActivityLog");
const LoginHistory = require("../models/LoginHistory");
const PasswordHistory = require("../models/PasswordHistory");

class AuthService {
  /**
   * Generate JWT tokens
   */
  generateTokens(user, rememberMe = false) {
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      membershipPlan: user.membershipPlan,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: rememberMe ? "30d" : "24h",
    });

    const refreshToken = jwt.sign(
      { userId: user._id, type: "refresh" },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: rememberMe ? "90d" : "7d" }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Validate password against history
   */
  async validatePasswordHistory(userId, newPassword) {
    const wasUsed = await PasswordHistory.wasUsedBefore(userId, newPassword);

    if (wasUsed) {
      throw new Error(
        "Bu şifre daha önce kullanılmış. Lütfen farklı bir şifre seçin."
      );
    }

    return true;
  }

  /**
   * Record password change
   */
  async recordPasswordChange(
    userId,
    passwordHash,
    reason = "user_change",
    changedBy = null
  ) {
    await PasswordHistory.create({
      user: userId,
      passwordHash,
      changeReason: reason,
      changedBy: changedBy || userId,
    });

    // Keep only last 5 passwords
    const history = await PasswordHistory.find({ user: userId })
      .sort({ changedAt: -1 })
      .skip(5);

    if (history.length > 0) {
      await PasswordHistory.deleteMany({
        _id: { $in: history.map((h) => h._id) },
      });
    }
  }

  /**
   * Check for suspicious login patterns
   */
  async checkSuspiciousActivity(userId, currentIP, userAgent) {
    const recentLogins = await LoginHistory.find({
      user: userId,
      loginTime: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).sort({ loginTime: -1 });

    const suspiciousPatterns = [];

    // Check for multiple IPs in short time
    const uniqueIPs = [...new Set(recentLogins.map((l) => l.ip))];
    if (uniqueIPs.length > 3) {
      suspiciousPatterns.push("Multiple IPs detected");
    }

    // Check for different countries
    const countries = [
      ...new Set(recentLogins.map((l) => l.location?.country).filter(Boolean)),
    ];
    if (countries.length > 1) {
      suspiciousPatterns.push("Login from multiple countries");
    }

    // Check for rapid login attempts
    if (recentLogins.length > 10) {
      suspiciousPatterns.push("Excessive login attempts");
    }

    // Check for impossible travel
    if (recentLogins.length >= 2) {
      const lastLogin = recentLogins[1];
      const timeDiff = (new Date() - lastLogin.loginTime) / 1000 / 60 / 60; // hours

      if (
        lastLogin.location &&
        timeDiff < 2 &&
        lastLogin.location.country !== req.location?.country
      ) {
        suspiciousPatterns.push("Impossible travel detected");
      }
    }

    if (suspiciousPatterns.length > 0) {
      await ActivityLog.create({
        user: userId,
        action: "unusual_activity_detected",
        details: {
          patterns: suspiciousPatterns,
          ip: currentIP,
          userAgent,
        },
        ip: currentIP,
        severity: "high",
      });

      return true;
    }

    return false;
  }

  /**
   * Record login attempt
   */
  async recordLogin(user, req, success = true, failureReason = null) {
    const loginRecord = {
      user: user._id,
      loginTime: new Date(),
      ip: req.ip,
      userAgent: req.get("user-agent"),
      deviceType: req.device?.device || "unknown",
      browser: req.device?.browser || "unknown",
      os: req.device?.os || "unknown",
      location: req.location,
      loginMethod: user.is2FAEnabled ? "2fa" : "password",
      wasSuccessful: success,
      failureReason,
    };

    await LoginHistory.create(loginRecord);
  }

  /**
   * Clean expired tokens
   */
  async cleanExpiredTokens() {
    // Tokens with TTL index will auto-delete
    // This is for manual cleanup if needed
    await Token.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    await BlacklistedToken.deleteMany({
      expiresAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
  }

  /**
   * Invalidate all user sessions
   */
  async invalidateAllSessions(userId, exceptToken = null) {
    // Delete all refresh tokens
    const query = { user: userId, type: "refresh" };
    if (exceptToken) {
      query.token = { $ne: exceptToken };
    }

    await Token.deleteMany(query);
  }

  /**
   * Check account lock status
   */
  async checkAccountLock(user) {
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil(
        (user.lockUntil - Date.now()) / 1000 / 60
      );
      throw new Error(`Account locked for ${remainingTime} minutes`);
    }

    if (user.loginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
      throw new Error("Account locked due to multiple failed attempts");
    }
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(userId, alertType, details) {
    const user = await User.findById(userId);
    const emailService = require("./emailService");

    await emailService.sendSecurityAlert(user.email, {
      type: alertType,
      ...details,
    });

    // Also create a notification
    const notificationService = require("./notificationService");
    await notificationService.createNotification({
      recipient: userId,
      type: "security_alert",
      title: "Security Alert",
      message: `Unusual activity detected on your account: ${alertType}`,
      priority: "urgent",
    });
  }
}

module.exports = new AuthService();
