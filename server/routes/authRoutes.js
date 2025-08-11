// server/routes/authRoutes.js

const router = require("express").Router();
const authController = require("../controllers/authController");
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const rateLimiter = require("../middlewares/rateLimiter");
const validateRequest = require("../middlewares/validateRequest");
const { body, param } = require("express-validator");

// Import required models and utilities for inline routes
const User = require("../models/User");
const responseWrapper = require("../utils/responseWrapper");
const NotificationService = require("../services/notificationService");
const notificationService = new NotificationService();

// ==================== PUBLIC ROUTES ====================

// Register
router.post(
  "/register",
  rateLimiter.strict, // 5 requests per hour
  [
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("fullName").notEmpty().trim(),
    body("role").isIn(["investor", "property_owner", "local_representative"]),
    body("acceptedTerms").isBoolean().equals("true"),
    body("acceptedGDPR").isBoolean().equals("true"),
  ],
  validateRequest,
  authController.register
);

// Login
router.post(
  "/login",
  rateLimiter.moderate, // 10 requests per 15 minutes
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  validateRequest,
  authController.login
);

// Logout
router.post("/logout", auth, authController.logout);

// Refresh Token
router.post(
  "/refresh-token",
  rateLimiter.light, // 30 requests per hour
  [body("refreshToken").notEmpty()],
  validateRequest,
  authController.refreshToken
);

// Forgot Password
router.post(
  "/forgot-password",
  rateLimiter.strict, // 5 requests per hour
  [body("email").isEmail().normalizeEmail()],
  validateRequest,
  authController.forgotPassword
);

// Reset Password
router.post(
  "/reset-password/:token",
  rateLimiter.moderate,
  [
    param("token").notEmpty(),
    body("password").isLength({ min: 8 }),
    body("confirmPassword")
      .custom((value, { req }) => value === req.body.password)
      .withMessage("Passwords must match"),
  ],
  validateRequest,
  authController.resetPassword
);

// ==================== AUTHENTICATED ROUTES ====================

// Get Current User Profile
router.get("/me", auth, authController.getCurrentUser);

// Update Profile
router.patch(
  "/profile",
  auth,
  [
    body("fullName").optional().trim(),
    body("phoneNumber").optional(),
    body("country").optional(),
  ],
  validateRequest,
  authController.updateProfile
);

// Change Password
router.post(
  "/change-password",
  auth,
  rateLimiter.strict,
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 8 }),
    body("confirmPassword")
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage("Passwords must match"),
  ],
  validateRequest,
  authController.changePassword
);

// ==================== EMAIL & PHONE VERIFICATION ====================

// Resend Verification Email
router.post(
  "/resend-verification-email",
  rateLimiter.strict,
  [body("email").isEmail().normalizeEmail()],
  validateRequest,
  authController.resendVerificationEmail ||
    ((req, res) => {
      return responseWrapper.notImplemented(
        res,
        "Bu özellik henüz aktif değil"
      );
    })
);

// Verify Email
router.get(
  "/verify-email/:token",
  rateLimiter.moderate,
  [param("token").notEmpty()],
  validateRequest,
  authController.verifyEmail
);

// Send Phone Verification (Stub for now)
router.post(
  "/send-phone-verification",
  auth,
  rateLimiter.strict,
  [body("phoneNumber").isMobilePhone()],
  validateRequest,
  authController.sendPhoneVerification ||
    ((req, res) => {
      return responseWrapper.notImplemented(
        res,
        "Telefon doğrulama henüz aktif değil"
      );
    })
);

// Verify Phone (Stub for now)
router.post(
  "/verify-phone",
  auth,
  rateLimiter.moderate,
  [body("code").isLength({ min: 6, max: 6 })],
  validateRequest,
  authController.verifyPhone ||
    ((req, res) => {
      return responseWrapper.notImplemented(
        res,
        "Telefon doğrulama henüz aktif değil"
      );
    })
);

// ==================== 2FA ROUTES ====================

// Setup 2FA (İlk kurulum - method seçimi)
router.post(
  "/2fa/setup",
  auth,
  rateLimiter.strict,
  [body("method").isIn(["email", "sms", "authenticator"])],
  validateRequest,
  authController.setup2FA ||
    authController.enable2FA ||
    ((req, res) => {
      return responseWrapper.notImplemented(res, "2FA setup henüz aktif değil");
    })
);

// Enable 2FA (Setup sonrası aktivasyon - sadece kod ile)
router.post(
  "/2fa/enable",
  auth,
  rateLimiter.strict,
  [body("code").notEmpty()], // Sadece kod gerekli
  validateRequest,
  authController.enable2FA ||
    ((req, res) => {
      return responseWrapper.notImplemented(
        res,
        "2FA enable henüz aktif değil"
      );
    })
);

// Disable 2FA
router.post(
  "/2fa/disable",
  auth,
  rateLimiter.strict,
  [body("password").notEmpty(), body("code").notEmpty()],
  validateRequest,
  authController.disable2FA
);

// Verify 2FA Code
router.post(
  "/2fa/verify",
  rateLimiter.moderate,
  [body("email").isEmail(), body("code").notEmpty()],
  validateRequest,
  authController.verify2FA
);

// Generate New Backup Codes
router.post(
  "/2fa/backup-codes",
  auth,
  rateLimiter.strict,
  [body("password").notEmpty()],
  validateRequest,
  authController.generateBackupCodes
);

// ==================== MEMBERSHIP ROUTES ====================

// Activate Membership (after payment) - Stub implementation
router.post(
  "/membership/activate",
  auth, // Sadece giriş yapmış kullanıcı
  [
    body("plan").isIn(["Basic", "Pro", "Enterprise"]),
    body("paymentId").notEmpty(),
    body("paymentMethod").optional(),
  ],
  validateRequest,
  authController.activateMembership ||
    (async (req, res) => {
      try {
        const { plan, paymentId } = req.body;
        const user = await User.findById(req.user.id);

        user.membershipPlan = plan;
        user.membershipStatus = "active";
        user.membershipActivatedAt = new Date();
        user.membershipExpiresAt = new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ); // 1 yıl
        user.accountStatus = "active";

        await user.save();

        return responseWrapper.success(res, user, "Üyelik aktifleştirildi");
      } catch (error) {
        return responseWrapper.error(res, "Üyelik aktifleştirilemedi");
      }
    })
);

// Upgrade/Downgrade Membership
router.post(
  "/membership/change",
  auth,
  [
    body("newPlan").isIn(["Basic", "Pro", "Enterprise"]),
    body("paymentId").notEmpty(), // Ödeme doğrulaması için
  ],
  validateRequest,
  authController.changeMembership
);

// Cancel Membership
router.post(
  "/membership/cancel",
  auth,
  rateLimiter.strict,
  [body("reason").optional().trim()],
  validateRequest,
  authController.cancelMembership
);

// Get Membership Status
router.get("/membership/status", auth, authController.getMembershipStatus);

// ==================== ACCOUNT DELETION ROUTES ====================

// Request Account Deletion (Stub implementation)
router.post(
  "/account/delete-request",
  auth,
  rateLimiter.strict,
  [body("reason").notEmpty().trim(), body("password").notEmpty()],
  validateRequest,
  authController.requestAccountDeletion ||
    ((req, res) => {
      return responseWrapper.notImplemented(
        res,
        "Hesap silme özelliği henüz aktif değil"
      );
    })
);

// Cancel Account Deletion (Stub implementation)
router.post(
  "/account/cancel-deletion",
  auth,
  authController.cancelAccountDeletion
);

// Admin: Approve Account Deletion
router.post(
  "/account/approve-deletion/:requestId",
  auth,
  authorize(["admin"]),
  [param("requestId").isMongoId()],
  validateRequest,
  authController.approveAccountDeletion
);

// Admin: Reject Account Deletion
router.post(
  "/account/reject-deletion/:requestId",
  auth,
  authorize(["admin"]),
  [param("requestId").isMongoId()],
  validateRequest,
  authController.rejectAccountDeletion ||
    ((req, res) => {
      return responseWrapper.notImplemented(
        res,
        "Bu özellik henüz aktif değil"
      );
    })
);

// ==================== ADMIN ROUTES ====================

// Admin: Get All Users (Stub implementation)
router.get(
  "/admin/users",
  auth,
  authorize(["admin"]),
  authController.getAllUsers ||
    (async (req, res) => {
      try {
        const users = await User.find().select("-password");
        return responseWrapper.success(res, users);
      } catch (error) {
        return responseWrapper.error(res, "Kullanıcılar alınamadı");
      }
    })
);

// Admin: Get User By ID (Stub implementation)
router.get(
  "/admin/users/:userId",
  auth,
  authorize(["admin"]),
  [param("userId").isMongoId()],
  validateRequest,
  authController.getUserById ||
    (async (req, res) => {
      try {
        const user = await User.findById(req.params.userId).select("-password");
        if (!user) {
          return responseWrapper.notFound(res, "Kullanıcı bulunamadı");
        }
        return responseWrapper.success(res, user);
      } catch (error) {
        return responseWrapper.error(res, "Kullanıcı alınamadı");
      }
    })
);

// Admin: Update User Status (Stub implementation)
router.patch(
  "/admin/users/:userId/status",
  auth,
  authorize(["admin"]),
  [
    param("userId").isMongoId(),
    body("status").isIn(["active", "suspended", "deleted"]),
  ],
  validateRequest,
  authController.updateUserStatus ||
    (async (req, res) => {
      try {
        const user = await User.findById(req.params.userId);
        if (!user) {
          return responseWrapper.notFound(res, "Kullanıcı bulunamadı");
        }
        user.accountStatus = req.body.status;
        await user.save();
        return responseWrapper.success(
          res,
          user,
          "Kullanıcı durumu güncellendi"
        );
      } catch (error) {
        return responseWrapper.error(res, "Durum güncellenemedi");
      }
    })
);

// Admin: Update User Role (Stub implementation)
router.patch(
  "/admin/users/:userId/role",
  auth,
  authorize(["admin"]),
  [
    param("userId").isMongoId(),
    body("role").isIn([
      "investor",
      "property_owner",
      "local_representative",
      "admin",
    ]),
  ],
  validateRequest,
  authController.updateUserRole ||
    (async (req, res) => {
      return responseWrapper.notImplemented(
        res,
        "Rol güncelleme henüz aktif değil"
      );
    })
);

// Admin: Force Password Reset (Stub implementation)
router.post(
  "/admin/users/:userId/force-password-reset",
  auth,
  authorize(["admin"]),
  [param("userId").isMongoId()],
  validateRequest,
  authController.forcePasswordReset ||
    (async (req, res) => {
      return responseWrapper.notImplemented(
        res,
        "Şifre sıfırlama zorlama henüz aktif değil"
      );
    })
);

// Admin: View Activity Logs (Stub implementation)
router.get(
  "/admin/activity-logs",
  auth,
  authorize(["admin"]),
  authController.getActivityLogs ||
    (async (req, res) => {
      try {
        const ActivityLog = require("../models/ActivityLog");
        const logs = await ActivityLog.find()
          .populate("user", "email fullName")
          .sort("-createdAt")
          .limit(100);
        return responseWrapper.success(res, logs);
      } catch (error) {
        return responseWrapper.error(res, "Loglar alınamadı");
      }
    })
);

// Admin: View Security Alerts (Stub implementation)
router.get(
  "/admin/security-alerts",
  auth,
  authorize(["admin"]),
  authController.getSecurityAlerts ||
    (async (req, res) => {
      try {
        const ActivityLog = require("../models/ActivityLog");
        const alerts = await ActivityLog.find({
          severity: { $in: ["high", "critical"] },
        })
          .populate("user", "email fullName")
          .sort("-createdAt")
          .limit(50);
        return responseWrapper.success(res, alerts);
      } catch (error) {
        return responseWrapper.error(res, "Güvenlik uyarıları alınamadı");
      }
    })
);

// Admin: Blacklist Token (Stub implementation)
router.post(
  "/admin/blacklist-token",
  auth,
  authorize(["admin"]),
  [body("token").notEmpty(), body("reason").notEmpty()],
  validateRequest,
  authController.blacklistToken ||
    (async (req, res) => {
      return responseWrapper.notImplemented(
        res,
        "Token blacklist özelliği henüz aktif değil"
      );
    })
);

// Admin: Activate Local Representative (Stub implementation)
router.post(
  "/admin/activate-representative/:userId",
  auth,
  authorize(["admin"]),
  [param("userId").isMongoId()],
  validateRequest,
  authController.activateLocalRepresentative ||
    (async (req, res) => {
      return responseWrapper.notImplemented(
        res,
        "Temsilci aktivasyonu henüz aktif değil"
      );
    })
);

// Admin: Get Pending Representatives (onay bekleyenler)
router.get(
  "/admin/pending-representatives",
  auth,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const pendingReps = await User.find({
        role: "local_representative",
        accountStatus: "pending_admin_approval",
      }).select("-password");

      return responseWrapper.success(res, pendingReps);
    } catch (error) {
      console.error("Get pending representatives error:", error);
      return responseWrapper.error(res, "Hata oluştu");
    }
  }
);

// Admin: Approve KYC
router.post(
  "/admin/users/:userId/approve-kyc",
  auth,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.userId);
      if (!user) {
        return responseWrapper.notFound(res, "Kullanıcı bulunamadı");
      }

      // KYC durumunu güncelle
      user.kycStatus = "Approved";
      await user.save();

      // Bildirim gönder - Doğru parametre sırası ile
      await notificationService.createNotification(
        user._id, // recipientId
        user.role, // recipientRole
        {
          // notificationData
          type: "kyc_approved",
          title: "KYC Onaylandı",
          message:
            "Kimlik doğrulamanız onaylandı. Artık tüm işlemleri yapabilirsiniz.",
          priority: "high",
        }
      );

      return responseWrapper.success(res, user, "KYC onayı başarıyla verildi");
    } catch (err) {
      console.error("KYC approve error:", err);
      return responseWrapper.error(res, "KYC onayı sırasında hata oluştu");
    }
  }
);

// Admin: Reject KYC
router.post(
  "/admin/users/:userId/reject-kyc",
  auth,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const { reason } = req.body;
      const user = await User.findById(req.params.userId);

      if (!user) {
        return responseWrapper.notFound(res, "Kullanıcı bulunamadı");
      }

      // KYC durumunu güncelle
      user.kycStatus = "Rejected";
      await user.save();

      // Bildirim gönder - Doğru parametre sırası ile
      await notificationService.createNotification(
        user._id, // recipientId
        user.role, // recipientRole
        {
          // notificationData
          type: "kyc_rejected",
          title: "KYC Reddedildi",
          message:
            reason ||
            "Kimlik doğrulamanız reddedildi. Lütfen tekrar deneyin veya destek ile iletişime geçin.",
          priority: "high",
        }
      );

      return responseWrapper.success(res, user, "KYC reddedildi");
    } catch (err) {
      console.error("KYC reject error:", err);
      return responseWrapper.error(res, "KYC reddetme sırasında hata oluştu");
    }
  }
);

// Admin: Get Pending KYC Users
router.get(
  "/admin/pending-kyc",
  auth,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const pendingUsers = await User.find({
        kycStatus: "Pending",
        emailVerified: true, // Email doğrulanmış kullanıcılar
      }).select("-password");

      return responseWrapper.success(res, pendingUsers);
    } catch (error) {
      console.error("Get pending KYC users error:", error);
      return responseWrapper.error(res, "Hata oluştu");
    }
  }
);
router.get(
  "/admin/pending-kyc/:userId",
  auth,
  authorize(["admin"]),
  [param("userId").isMongoId()],
  validateRequest,
  authController.getPendingKycUserById
);
// ==================== ADMIN ACCOUNT DELETION ROUTES ====================

// Admin: Get Account Deletion Requests (Pagination, Sorting, Filtering destekli)
router.get(
  "/admin/account-deletion-requests",
  auth,
  authorize(["admin"]),
  authController.getAccountDeletionRequests
);

// Admin: Get Account Deletion Request By ID (Detaylı bilgi)
router.get(
  "/admin/account-deletion-requests/:requestId",
  auth,
  authorize(["admin"]),
  [param("requestId").isMongoId()],
  validateRequest,
  authController.getAccountDeletionRequestById
);
// ==================== SECURITY ROUTES ====================

// Get Login History
router.get("/security/login-history", auth, authController.getLoginHistory);

// Get Active Sessions
router.get("/security/sessions", auth, authController.getActiveSessions);

// Revoke All Sessions
router.post(
  "/security/revoke-all-sessions",
  auth,
  rateLimiter.strict,
  [body("password").notEmpty()],
  validateRequest,
  authController.revokeAllSessions
);

// Get Trusted IPs
router.get("/security/trusted-ip", auth, authController.getTrustedIPs);

// Add Trusted IP
router.post(
  "/security/trusted-ip",
  auth,
  rateLimiter.moderate,
  [
    body("ip").notEmpty().isIP(),
    body("name").optional().trim().isLength({ max: 50 }),
  ],
  validateRequest,
  authController.addTrustedIP
);

// Remove Trusted IP
router.delete(
  "/security/trusted-ip/:ip",
  auth,
  [param("ip").isIP()],
  validateRequest,
  authController.removeTrustedIP
);

// ==================== OAUTH ROUTES (Future Implementation) ====================

// router.get("/oauth/google", authController.googleAuth);
// router.get("/oauth/google/callback", authController.googleCallback);
// router.get("/oauth/facebook", authController.facebookAuth);
// router.get("/oauth/facebook/callback", authController.facebookCallback);

module.exports = router;
