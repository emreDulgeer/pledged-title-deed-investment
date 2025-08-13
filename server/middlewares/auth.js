// server/middlewares/auth.js

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const BlacklistedToken = require("../models/BlacklistedToken");
const ActivityLog = require("../models/ActivityLog");
const responseWrapper = require("../utils/responseWrapper");
const crypto = require("crypto");
const Token = require("../models/Token");
const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return responseWrapper.unauthorized(res, "Token bulunamadı");
    }

    // Check if token is blacklisted
    const isBlacklisted = await BlacklistedToken.isBlacklisted(token);
    if (isBlacklisted) {
      return responseWrapper.unauthorized(
        res,
        "Token geçersiz. Lütfen tekrar giriş yapın."
      );
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return responseWrapper.unauthorized(res, "Token süresi dolmuş");
      }
      if (error.name === "JsonWebTokenError") {
        return responseWrapper.unauthorized(res, "Geçersiz token");
      }
      throw error;
    }

    // Get user from database
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return responseWrapper.unauthorized(res, "Kullanıcı bulunamadı");
    }

    // Check if user is active
    if (user.accountStatus === "suspended") {
      return responseWrapper.forbidden(res, "Hesabınız askıya alınmış");
    }

    if (user.accountStatus === "deleted") {
      return responseWrapper.forbidden(res, "Hesabınız silinmiş");
    }

    if (user.accountStatus === "pending_deletion") {
      return responseWrapper.forbidden(
        res,
        "Hesabınız silinme sürecinde. İptal etmek için destek ile iletişime geçin."
      );
    }

    // Check if password was changed after token issued
    if (user.passwordChangedAt) {
      const passwordChangedTimestamp = parseInt(
        user.passwordChangedAt.getTime() / 1000,
        10
      );

      if (decoded.iat < passwordChangedTimestamp) {
        return responseWrapper.unauthorized(
          res,
          "Şifreniz değiştirildi. Lütfen tekrar giriş yapın."
        );
      }
    }

    // Membership kontrolü
    if (user.role !== "admin") {
      if (user.membershipStatus === "inactive") {
        const publicPaths = [
          "/auth/profile",
          "/auth/logout",
          "/auth/membership/activate",
        ];

        if (!publicPaths.some((path) => req.path.includes(path))) {
          return responseWrapper.forbidden(
            res,
            "Üyeliğiniz aktif değil. Lütfen üyelik planı satın alın."
          );
        }
      }

      if (user.membershipStatus === "expired") {
        return responseWrapper.forbidden(
          res,
          "Üyeliğinizin süresi dolmuş. Lütfen üyeliğinizi yenileyin."
        );
      }

      // Üyelik süresi kontrolü
      if (user.membershipExpiresAt && user.membershipExpiresAt < new Date()) {
        user.membershipStatus = "expired";
        await user.save();
        return responseWrapper.forbidden(res, "Üyeliğinizin süresi dolmuş.");
      }
    }

    // KYC kontrolü (opsiyonel - bazı route'lar için devre dışı bırakılabilir)
    if (!req.skipKYCCheck) {
      const skipKYCPaths = [
        "/auth/profile",
        "/auth/verify-email",
        "/kyc/upload",
        "/auth/logout",
        "/auth/membership",
      ];

      if (
        !skipKYCPaths.some((path) => req.path.includes(path)) &&
        user.kycStatus !== "Approved" &&
        user.role !== "admin"
      ) {
        return responseWrapper.forbidden(res, "KYC onayı bekleniyor");
      }
    }

    // User bilgisini request'e ekle
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      membershipPlan: user.membershipPlan,
      membershipStatus: user.membershipStatus,
      kycStatus: user.kycStatus,
      country: user.country,
      emailVerified: user.emailVerified,
      is2FAEnabled: user.is2FAEnabled,
    };

    // Role'e göre discriminator model'ini yükle
    switch (user.role) {
      case "investor":
        const Investor = require("../models/Investor");
        const investor = await Investor.findById(user._id).select("-password");
        req.userDetails = investor;
        req.user.investmentLimit = investor.investmentLimit;
        req.user.activeInvestmentCount = investor.activeInvestmentCount;
        break;

      case "property_owner":
        const PropertyOwner = require("../models/PropertyOwner");
        const owner = await PropertyOwner.findById(user._id).select(
          "-password"
        );
        req.userDetails = owner;
        req.user.ownerTrustScore = owner.ownerTrustScore;
        break;

      case "local_representative":
        const LocalRepresentative = require("../models/LocalRepresentative");
        const rep = await LocalRepresentative.findById(user._id).select(
          "-password"
        );
        req.userDetails = rep;
        req.user.assignedCountry = rep.assignedCountry;
        break;

      case "admin":
        const Admin = require("../models/Admin");
        const admin = await Admin.findById(user._id).select("-password");
        req.userDetails = admin;
        req.user.accessLevel = admin.accessLevel;
        break;

      default:
        req.userDetails = user;
    }

    // Update last activity
    const tokenDoc = await Token.findOne({
      token: crypto.createHash("sha256").update(token).digest("hex"),
      type: "access",
    });

    if (tokenDoc) {
      tokenDoc.lastUsedAt = new Date();
      await tokenDoc.save();
    }

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return responseWrapper.error(res, "Authentication hatası");
  }
};

// ===== YENİ: Optional auth middleware =====
// Bazı route'lar için authentication opsiyonel olabilir
auth.optional = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    req.user = null;
    return next();
  }

  return auth(req, res, next);
};

// ===== YENİ: Skip KYC check for specific routes =====
auth.skipKYC = async (req, res, next) => {
  req.skipKYCCheck = true;
  return auth(req, res, next);
};

// ===== YENİ: Require 2FA for sensitive operations =====
auth.require2FA = async (req, res, next) => {
  await auth(req, res, (err) => {
    if (err) return;

    if (!req.user.is2FAEnabled) {
      return responseWrapper.forbidden(
        res,
        "Bu işlem için 2FA etkinleştirmeniz gerekiyor"
      );
    }

    const twoFAToken = req.header("X-2FA-Token") || req.body.twoFAToken;

    if (!twoFAToken) {
      return responseWrapper.forbidden(res, "2FA token gerekli");
    }

    // Token'ı doğrula
    next();
  });
};

// ===== YENİ: Admin-only middleware =====
auth.adminOnly = async (req, res, next) => {
  await auth(req, res, (err) => {
    if (err) return;

    if (req.user.role !== "admin") {
      return responseWrapper.forbidden(res, "Bu işlem sadece adminler için");
    }

    const requiredLevel = req.requiredAdminLevel;
    if (requiredLevel && req.user.accessLevel !== requiredLevel) {
      return responseWrapper.forbidden(
        res,
        `Bu işlem için ${requiredLevel} admin yetkisi gerekli`
      );
    }

    next();
  });
};

module.exports = auth;
