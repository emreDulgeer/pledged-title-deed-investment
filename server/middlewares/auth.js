// server/middlewares/auth.js

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const BlacklistedToken = require("../models/BlacklistedToken");
const ActivityLog = require("../models/ActivityLog");
const responseWrapper = require("../utils/responseWrapper");

const auth = async (req, res, next) => {
  try {
    // Token'ı header'dan al
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return responseWrapper.unauthorized(res, "Lütfen giriş yapın");
    }

    // ===== YENİ: Blacklist kontrolü =====
    const blacklisted = await BlacklistedToken.findOne({ token });
    if (blacklisted) {
      // Şüpheli aktivite logla
      if (blacklisted.user) {
        await ActivityLog.create({
          user: blacklisted.user,
          action: "suspicious_login_attempt",
          details: {
            reason: "Attempted to use blacklisted token",
            ip: req.ip,
          },
          ip: req.ip,
          severity: "high",
        });
      }
      return responseWrapper.unauthorized(res, "Token geçersiz");
    }

    // Token'ı doğrula
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        return responseWrapper.unauthorized(res, "Geçersiz token");
      }
      if (error.name === "TokenExpiredError") {
        return responseWrapper.unauthorized(res, "Token süresi dolmuş");
      }
      throw error;
    }

    // Kullanıcıyı bul - daha fazla field seç
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return responseWrapper.unauthorized(res, "Geçersiz token");
    }

    // ===== YENİ: Gelişmiş hesap durumu kontrolleri =====

    // Hesap durumu kontrolü
    if (user.accountStatus === "suspended") {
      return responseWrapper.forbidden(
        res,
        "Hesabınız askıya alınmış. Destek ile iletişime geçin."
      );
    }

    if (user.accountStatus === "deleted") {
      return responseWrapper.forbidden(res, "Bu hesap silinmiş.");
    }

    if (user.accountStatus === "pending_deletion") {
      return responseWrapper.forbidden(
        res,
        "Bu hesap silinmek üzere. İptal etmek için destek ile iletişime geçin."
      );
    }

    // ===== YENİ: Şifre sıfırlama zorunluluğu =====
    if (user.passwordResetRequired && req.path !== "/auth/change-password") {
      return responseWrapper.forbidden(
        res,
        "Şifrenizi değiştirmeniz gerekiyor"
      );
    }

    // ===== YENİ: Email doğrulama kontrolü =====
    if (!user.emailVerified && req.path !== "/auth/verify-email") {
      // Development modda SKIP_EMAIL_VERIFICATION=true ise uyarı ver ama geçiş izni ver
      if (process.env.SKIP_EMAIL_VERIFICATION === "true") {
        console.log(
          `⚠️ Email verification skipped for ${user.email} (Development Mode)`
        );
      } else {
        return responseWrapper.forbidden(
          res,
          "Email adresiniz doğrulanmamış. Lütfen email adresinizi doğrulayın."
        );
      }
    }

    // ===== YENİ: Üyelik durumu kontrolü (admin hariç) =====
    if (user.role !== "admin") {
      // Development modda SKIP_MEMBERSHIP_CHECK=true ise uyarı ver ama geçiş izni ver
      if (process.env.SKIP_MEMBERSHIP_CHECK === "true") {
        console.log(
          `⚠️ Membership check skipped for ${user.email} (Development Mode)`
        );
      } else {
        // Üyelik durumu kontrolü
        if (user.membershipStatus === "inactive") {
          return responseWrapper.forbidden(
            res,
            "Üyeliğiniz aktif değil. Lütfen üyelik planı satın alın."
          );
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
    }

    // KYC kontrolü (opsiyonel - bazı route'lar için devre dışı bırakılabilir)
    const skipKYCPaths = [
      "/auth/profile",
      "/auth/verify-email",
      "/kyc/upload",
      "/auth/logout",
    ];

    if (
      !skipKYCPaths.includes(req.path) &&
      user.kycStatus !== "Approved" &&
      user.role !== "admin"
    ) {
      return responseWrapper.forbidden(res, "KYC onayı bekleniyor");
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

        // Yatırım limiti bilgisini ekle
        req.user.investmentLimit = investor.investmentLimit;
        req.user.activeInvestmentCount = investor.activeInvestmentCount;
        break;

      case "property_owner":
        const PropertyOwner = require("../models/PropertyOwner");
        const owner = await PropertyOwner.findById(user._id).select(
          "-password"
        );
        req.userDetails = owner;

        // Trust score'u ekle
        req.user.ownerTrustScore = owner.ownerTrustScore;
        break;

      case "local_representative":
        const LocalRepresentative = require("../models/LocalRepresentative");
        const rep = await LocalRepresentative.findById(user._id).select(
          "-password"
        );
        req.userDetails = rep;

        // Bölge bilgisini ekle
        req.user.region = rep.region;
        break;

      case "admin":
        const Admin = require("../models/Admin");
        const admin = await Admin.findById(user._id).select("-password");
        req.userDetails = admin;

        // Access level'ı ekle
        req.user.accessLevel = admin.accessLevel;
        break;
    }

    // ===== YENİ: IP değişikliği kontrolü (opsiyonel güvenlik özelliği) =====
    if (
      user.trustedIPs &&
      user.trustedIPs.length > 0 &&
      process.env.CHECK_TRUSTED_IPS === "true"
    ) {
      const clientIP = req.ip;
      if (!user.trustedIPs.includes(clientIP)) {
        // Şüpheli aktivite olarak logla ama bloklamA
        await ActivityLog.create({
          user: user._id,
          action: "ip_address_changed",
          details: {
            newIP: clientIP,
            trustedIPs: user.trustedIPs,
            warning: "Login from untrusted IP",
          },
          ip: clientIP,
          severity: "medium",
        });

        // İsterseniz burada kullanıcıya bildirim gönderebilirsiniz
        // ama girişi engellemiyoruz
      }
    }

    // ===== YENİ: Son aktivite güncelleme =====
    // Her 5 dakikada bir güncelle (performans için)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (!user.lastActivityAt || user.lastActivityAt < fiveMinutesAgo) {
      user.lastActivityAt = new Date();
      user.lastActivityIP = req.ip;
      await user.save();
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
    // Token yoksa user null olarak devam et
    req.user = null;
    return next();
  }

  // Token varsa normal auth işlemini yap
  return auth(req, res, next);
};

// ===== YENİ: Skip KYC check for specific routes =====
auth.skipKYC = async (req, res, next) => {
  req.skipKYCCheck = true;
  return auth(req, res, next);
};

// ===== YENİ: Require 2FA for sensitive operations =====
auth.require2FA = async (req, res, next) => {
  // Önce normal auth kontrolü
  await auth(req, res, (err) => {
    if (err) return;

    // 2FA kontrolü
    if (!req.user.is2FAEnabled) {
      return responseWrapper.forbidden(
        res,
        "Bu işlem için 2FA etkinleştirmeniz gerekiyor"
      );
    }

    // 2FA token'ı kontrol et (header'dan veya body'den)
    const twoFAToken = req.header("X-2FA-Token") || req.body.twoFAToken;

    if (!twoFAToken) {
      return responseWrapper.forbidden(res, "2FA token gerekli");
    }

    // Token'ı doğrula (TwoFactorAuth servisini kullanarak)
    // Bu kısım authController'da implement edilmeli

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

    // Admin access level kontrolü (opsiyonel)
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
