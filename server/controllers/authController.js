// server/controllers/authController.js

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Token = require("../models/Token");
const BlacklistedToken = require("../models/BlacklistedToken");
const ActivityLog = require("../models/ActivityLog");
const TwoFactorAuth = require("../models/TwoFactorAuth");
const AccountDeletionRequest = require("../models/AccountDeletionRequest");
const responseWrapper = require("../utils/responseWrapper");
const emailService = require("../services/emailService");
const smsService = require("../services/smsService");
const validator = require("validator");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const notificationService = require("../services/notificationService");
class AuthController {
  constructor() {
    this.authService = require("../services/authService");
    this.notificationService = notificationService;
  }
  generateBackupCodesInternal = () => {
    const crypto = require("crypto");
    const codes = [];

    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      codes.push(`${code.substr(0, 4)}-${code.substr(4)}`);
    }

    return codes;
  };
  /**
   * REGISTER - Kayıt işlemi (üyelik tipi aktifleştirme ayrı)
   */
  register = async (req, res) => {
    try {
      const {
        email,
        password,
        fullName,
        phoneNumber,
        country,
        role,
        acceptedTerms,
        acceptedGDPR,
        marketingConsent,
      } = req.body;

      // Validation
      if (!email || !password || !fullName || !role) {
        return responseWrapper.badRequest(res, "Zorunlu alanlar eksik");
      }

      // Email validation
      if (!validator.isEmail(email)) {
        return responseWrapper.badRequest(res, "Geçersiz email formatı");
      }

      // Password strength check
      const passwordStrength = this.checkPasswordStrength(password);
      if (!passwordStrength.isValid) {
        return responseWrapper.badRequest(res, passwordStrength.message);
      }

      // GDPR/KVKK consent check
      if (!acceptedTerms || !acceptedGDPR) {
        return responseWrapper.badRequest(
          res,
          "Kullanım koşulları ve KVKK/GDPR onayı zorunludur"
        );
      }

      // Check if user exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return responseWrapper.conflict(
          res,
          "Bu email adresi zaten kullanılıyor"
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user based on role
      const UserModel = this.getUserModelByRole(role);

      const userData = {
        email: email.toLowerCase(),
        password: hashedPassword,
        fullName,
        phoneNumber,
        country,
        role,
        membershipPlan: "Basic", // Default plan
        membershipStatus: "active", // Ödeme yapılana kadar inactive olacak şimdilik active
        kycStatus: "Pending",
        is2FAEnabled: false,
        emailVerified: false,
        phoneVerified: false,
        consents: {
          terms: acceptedTerms,
          gdpr: acceptedGDPR,
          marketing: marketingConsent || false,
          timestamp: new Date(),
        },
        accountStatus: "pending_activation", // Üyelik aktifleştirme bekliyor
        registrationIP: req.ip,
        lastLoginIP: null,
        loginAttempts: 0,
        lockUntil: null,
      };

      // Role-specific additional fields
      if (role === "property_owner") {
        userData.ownerTrustScore = 50;
        userData.completedContracts = 0;
      } else if (role === "investor") {
        userData.investmentLimit = 1;
        userData.referralCode = this.generateReferralCode();
      } else if (role === "local_representative") {
        userData.region = req.body.region;
        if (!userData.region) {
          return responseWrapper.badRequest(res, "Bölge bilgisi zorunludur");
        }
      }

      const user = new UserModel(userData);
      await user.save();

      // Create email verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

      await Token.create({
        user: user._id,
        token: hashedToken,
        type: "email_verification",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      // Send verification email
      await emailService.sendVerificationEmail(user.email, verificationToken);

      // Log registration
      await ActivityLog.create({
        user: user._id,
        action: "user_registration",
        details: {
          role: user.role,
          country: user.country,
          ip: req.ip,
          userAgent: req.get("user-agent"),
        },
        ip: req.ip,
      });

      return responseWrapper.created(res, {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          membershipStatus: user.membershipStatus,
        },
        message:
          "Kayıt başarılı. Lütfen email adresinizi doğrulayın ve üyelik planınızı aktifleştirin.",
      });
    } catch (error) {
      console.error("Register error:", error);
      return responseWrapper.error(
        res,
        "Kayıt işlemi sırasında bir hata oluştu"
      );
    }
  };

  verifyToken = async (req, res) => {
    try {
      const userId = req.user?.id || req.user?._id;
      if (!userId) {
        return responseWrapper.unauthorized(res, "Yetkilendirme bilgisi yok");
      }

      const user = await User.findById(userId).select("-password");
      if (!user) {
        return responseWrapper.unauthorized(res, "Kullanıcı bulunamadı");
      }

      if (["suspended", "deleted"].includes(user.accountStatus)) {
        return responseWrapper.forbidden(res, "Hesap erişilemez durumda");
      }

      const userDetails = await this.getUserDetails(user);

      // Token'ı header'dan çek
      const authHeader = req.headers.authorization || "";
      const raw = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

      let expiresIn = null;
      let requiresRefresh = false;

      if (raw) {
        const decoded = jwt.decode(raw); // auth middleware zaten verify etmiş sayıyoruz
        if (decoded && typeof decoded.exp === "number") {
          const now = Math.floor(Date.now() / 1000);
          expiresIn = Math.max(decoded.exp - now, 0);
          requiresRefresh = expiresIn < 3600; // < 1 saat
        }
      }

      return responseWrapper.success(res, {
        valid: true,
        user: userDetails,
        expiresIn,
        requiresRefresh,
      });
    } catch (error) {
      console.error("Verify token error:", error);
      return responseWrapper.error(res, "Token doğrulama hatası");
    }
  };

  checkToken = async (req, res) => {
    try {
      // Auth middleware başarılı olduysa token geçerlidir
      return responseWrapper.success(res, {
        valid: true,
        userId: req.user.id,
        role: req.user.role,
      });
    } catch (error) {
      return responseWrapper.unauthorized(res, "Token geçersiz");
    }
  };
  /**
   * LOGIN - Giriş işlemi
   */
  login = async (req, res) => {
    try {
      const { email, password, twoFactorCode, rememberMe } = req.body;

      // Validation
      if (!email || !password) {
        return responseWrapper.badRequest(res, "Email ve şifre zorunludur");
      }

      // Find user
      const user = await User.findOne({ email: email.toLowerCase() }).select(
        "+password +loginAttempts +lockUntil"
      );

      if (!user) {
        // Security: Generic error message
        return responseWrapper.unauthorized(res, "Email veya şifre hatalı");
      }

      // Check if account is locked
      if (user.lockUntil && user.lockUntil > Date.now()) {
        const remainingTime = Math.ceil(
          (user.lockUntil - Date.now()) / 1000 / 60
        );
        return responseWrapper.tooManyRequests(
          res,
          `Hesabınız ${remainingTime} dakika boyunca kilitlendi. Çok fazla başarısız giriş denemesi.`
        );
      }

      // Check account status
      if (user.accountStatus === "suspended") {
        return responseWrapper.forbidden(
          res,
          "Hesabınız askıya alınmış. Destek ile iletişime geçin."
        );
      }

      if (user.accountStatus === "deleted") {
        return responseWrapper.forbidden(res, "Bu hesap silinmiş.");
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        // Increment login attempts
        user.loginAttempts = (user.loginAttempts || 0) + 1;

        // Lock account after 5 failed attempts
        if (user.loginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          await user.save();

          // Log suspicious activity
          await ActivityLog.create({
            user: user._id,
            action: "account_locked",
            details: {
              reason: "Multiple failed login attempts",
              ip: req.ip,
            },
            ip: req.ip,
            severity: "high",
          });

          // Send security alert email
          await emailService.sendSecurityAlert(user.email, {
            type: "account_locked",
            ip: req.ip,
            timestamp: new Date(),
          });

          return responseWrapper.tooManyRequests(
            res,
            "Çok fazla başarısız giriş denemesi. Hesabınız 30 dakika boyunca kilitlendi."
          );
        }

        await user.save();
        return responseWrapper.unauthorized(res, "Email veya şifre hatalı");
      }

      // Check 2FA if enabled
      if (user.is2FAEnabled) {
        // Development modda SKIP_2FA=true ise 2FA'yı atla
        if (process.env.SKIP_2FA === "true") {
          console.log(`⚠️ 2FA skipped for ${user.email} (Development Mode)`);
        } else {
          if (!twoFactorCode) {
            // Check if authenticator app is configured
            const twoFactorAuth = await TwoFactorAuth.findOne({
              user: user._id,
            });

            if (twoFactorAuth && twoFactorAuth.method === "authenticator") {
              // For authenticator apps, don't send code, just request it
              return responseWrapper.success(res, {
                requiresTwoFactor: true,
                method: "authenticator",
                message:
                  "Lütfen authenticator uygulamanızdaki 6 haneli kodu girin",
              });
            } else {
              // Send 2FA code via email/SMS
              try {
                const code = await this.send2FACode(user);

                // Development'ta kodu console'a yaz
                if (process.env.NODE_ENV === "development") {
                  console.log(`\n🔐 2FA Code for ${user.email}: ${code}\n`);
                }

                return responseWrapper.success(res, {
                  requiresTwoFactor: true,
                  method: twoFactorAuth ? twoFactorAuth.method : "email",
                  message: `2FA kodu ${
                    twoFactorAuth ? twoFactorAuth.method : "email"
                  } ile gönderildi`,
                });
              } catch (error) {
                console.error("2FA code send error:", error);

                // 2FA gönderiminde hata olursa, kullanıcının 2FA'sını geçici olarak devre dışı bırak
                // ve admin'e bildir
                user.is2FAEnabled = false;
                await user.save();

                await ActivityLog.create({
                  user: user._id,
                  action: "2fa_error",
                  details: {
                    error: error.message,
                    temporarilyDisabled: true,
                  },
                  severity: "high",
                  ip: req.ip,
                });

                // Admin'e bildir
                await this.notifyAdmins({
                  type: "2fa_error",
                  title: "2FA Hatası",
                  message: `${user.email} için 2FA gönderiminde hata oluştu ve geçici olarak devre dışı bırakıldı`,
                  priority: "high",
                });

                // Kullanıcıya normal login izni ver ama uyar
                console.error(
                  `❌ 2FA error for ${user.email}, temporarily disabled`
                );

                // Normal login flow'a devam et
              }
            }
          } else {
            // Verify 2FA code
            const isValidCode = await this.verify2FACode(
              user._id,
              twoFactorCode
            );

            if (!isValidCode) {
              user.loginAttempts = (user.loginAttempts || 0) + 1;
              await user.save();

              return responseWrapper.unauthorized(res, "Geçersiz 2FA kodu");
            }
          }
        }
      }

      // Check if email is verified
      if (!user.emailVerified) {
        // Development modda SKIP_EMAIL_VERIFICATION=true ise atla
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

      // Reset login attempts on successful login
      user.loginAttempts = 0;
      user.lockUntil = null;
      user.lastLoginAt = new Date();
      user.lastLoginIP = req.ip;
      await user.save();

      // Generate tokens
      const tokenExpiry = rememberMe ? "30d" : "24h";
      const refreshExpiry = rememberMe ? "90d" : "7d";

      const accessToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: user.role,
          membershipPlan: user.membershipPlan,
        },
        process.env.JWT_SECRET,
        { expiresIn: tokenExpiry }
      );

      const refreshToken = jwt.sign(
        { userId: user._id, type: "refresh" },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: refreshExpiry }
      );

      // Store refresh token in database
      await Token.create({
        user: user._id,
        token: refreshToken,
        type: "refresh",
        deviceInfo: req.get("user-agent"),
        ip: req.ip,
        expiresAt: new Date(
          Date.now() + (rememberMe ? 90 : 7) * 24 * 60 * 60 * 1000
        ),
      });

      // Load user details based on role
      const userDetails = await this.getUserDetails(user);

      // Log successful login
      await ActivityLog.create({
        user: user._id,
        action: "user_login",
        details: {
          ip: req.ip,
          userAgent: req.get("user-agent"),
          rememberMe: !!rememberMe,
        },
        ip: req.ip,
      });

      // Check for concurrent sessions from different IPs
      await this.checkConcurrentSessions(user._id, req.ip);

      return responseWrapper.success(
        res,
        {
          user: userDetails,
          accessToken,
          refreshToken,
          expiresIn: rememberMe ? 2592000 : 86400, // seconds
        },
        "Giriş başarılı"
      );
    } catch (error) {
      console.error("Login error:", error);
      return responseWrapper.error(
        res,
        "Giriş işlemi sırasında bir hata oluştu"
      );
    }
  };

  /**
   * LOGOUT - Çıkış işlemi
   */
  logout = async (req, res) => {
    try {
      const token = req.header("Authorization")?.replace("Bearer ", "");
      const refreshToken = req.body.refreshToken;

      if (!token) {
        return responseWrapper.badRequest(res, "Token gerekli");
      }

      // Blacklist current access token
      const decoded = jwt.decode(token);
      await BlacklistedToken.create({
        token: token,
        tokenType: "access",
        user: req.user.id,
        expiresAt: new Date(decoded.exp * 1000),
        reason: "user_logout",
        ip: req.ip,
      });

      // Revoke refresh token if provided
      if (refreshToken) {
        await Token.findOneAndUpdate(
          {
            user: req.user.id,
            token: refreshToken,
            type: "refresh",
            isRevoked: false,
          },
          {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: "user_logout",
            lastUsedAt: new Date(),
          }
        );
      }

      // If no explicit refresh token was sent, revoke the latest active session token
      if (!refreshToken) {
        await Token.findOneAndUpdate(
          {
            user: req.user.id,
            type: "refresh",
            isRevoked: false,
            expiresAt: { $gt: new Date() },
          },
          {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: "user_logout",
            lastUsedAt: new Date(),
          },
          {
            sort: { createdAt: -1 },
          }
        );
      }

      // Log logout
      await ActivityLog.create({
        user: req.user.id,
        action: "user_logout",
        details: {
          ip: req.ip,
          userAgent: req.get("user-agent"),
          refreshTokenRevoked: !!refreshToken,
        },
        ip: req.ip,
      });

      return responseWrapper.success(res, null, "Çıkış başarılı");
    } catch (error) {
      console.error("Logout error:", error);
      return responseWrapper.error(
        res,
        "Çıkış işlemi sırasında bir hata oluştu"
      );
    }
  };

  /**
   * REFRESH TOKEN - Token yenileme
   */
  refreshToken = async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return responseWrapper.badRequest(res, "Refresh token gerekli");
      }

      // Verify refresh token
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      } catch (error) {
        return responseWrapper.unauthorized(res, "Geçersiz refresh token");
      }

      // Check if token exists in database
      const storedToken = await Token.findOne({
        user: decoded.userId,
        token: refreshToken,
        type: "refresh",
      });

      if (!storedToken) {
        return responseWrapper.unauthorized(res, "Refresh token bulunamadı");
      }

      if (storedToken.isRevoked) {
        return responseWrapper.unauthorized(
          res,
          "Refresh token geçersiz. Lütfen tekrar giriş yapın."
        );
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        await storedToken.deleteOne();
        return responseWrapper.unauthorized(res, "Refresh token süresi dolmuş");
      }

      // Get user
      const user = await User.findById(decoded.userId);
      if (!user) {
        return responseWrapper.unauthorized(res, "Kullanıcı bulunamadı");
      }

      // Generate new access token
      const newAccessToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: user.role,
          membershipPlan: user.membershipPlan,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Optionally rotate refresh token
      const shouldRotate = Math.random() > 0.5; // 50% chance to rotate
      let newRefreshToken = refreshToken;

      if (shouldRotate) {
        await storedToken.updateOne({
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: "refresh_token_rotation",
          lastUsedAt: new Date(),
        });

        // Generate new refresh token
        newRefreshToken = jwt.sign(
          { userId: user._id, type: "refresh" },
          process.env.JWT_REFRESH_SECRET,
          { expiresIn: "7d" }
        );

        // Store new refresh token
        await Token.create({
          user: user._id,
          token: newRefreshToken,
          type: "refresh",
          deviceInfo: req.get("user-agent"),
          ip: req.ip,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
      } else {
        storedToken.lastUsedAt = new Date();
        await storedToken.save();
      }

      return responseWrapper.success(
        res,
        {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
        "Token yenilendi"
      );
    } catch (error) {
      console.error("Refresh token error:", error);
      return responseWrapper.error(
        res,
        "Token yenileme sırasında bir hata oluştu"
      );
    }
  };

  /**
   * ACTIVATE MEMBERSHIP - Üyelik planı aktifleştirme (ödeme sonrası)
   */
  activateMembership = async (req, res) => {
    try {
      const { plan, paymentId, paymentMethod } = req.body;
      const userId = req.user.id;

      const user = await User.findById(userId);
      if (!user) {
        return responseWrapper.notFound(res, "Kullanıcı bulunamadı");
      }

      // Üyelik bilgilerini güncelle
      user.membershipPlan = plan;
      user.membershipStatus = "active";
      user.membershipActivatedAt = new Date();
      user.membershipExpiresAt = new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ); // 1 yıl
      user.accountStatus = "active";

      await user.save();

      // Log aktivasyon
      await ActivityLog.create({
        user: userId,
        action: "membership_activated",
        details: {
          plan,
          paymentId,
          paymentMethod,
        },
        ip: req.ip,
      });

      return responseWrapper.success(
        res,
        {
          membershipPlan: user.membershipPlan,
          membershipStatus: user.membershipStatus,
          expiresAt: user.membershipExpiresAt,
        },
        "Üyelik başarıyla aktifleştirildi"
      );
    } catch (error) {
      console.error("Activate membership error:", error);
      return responseWrapper.error(res, "Üyelik aktifleştirilemedi");
    }
  };

  /**
   * CHANGE MEMBERSHIP - Üyelik planı değiştirme
   */
  changeMembership = async (req, res) => {
    try {
      const { newPlan, paymentId } = req.body;
      const userId = req.user.id;

      const user = await User.findById(userId);
      if (!user) {
        return responseWrapper.notFound(res, "Kullanıcı bulunamadı");
      }

      const oldPlan = user.membershipPlan;

      // Üyelik planını güncelle
      user.membershipPlan = newPlan;
      user.membershipStatus = "active";

      // Süreyi uzat/güncelle
      if (user.membershipExpiresAt < new Date()) {
        user.membershipExpiresAt = new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        );
      }

      await user.save();

      // Log değişiklik
      await ActivityLog.create({
        user: userId,
        action:
          oldPlan === "Basic" && newPlan !== "Basic"
            ? "membership_upgraded"
            : "membership_downgraded",
        details: {
          oldPlan,
          newPlan,
          paymentId,
        },
        ip: req.ip,
      });

      return responseWrapper.success(
        res,
        {
          membershipPlan: user.membershipPlan,
          membershipStatus: user.membershipStatus,
          expiresAt: user.membershipExpiresAt,
        },
        `Üyelik planı ${newPlan} olarak güncellendi`
      );
    } catch (error) {
      console.error("Change membership error:", error);
      return responseWrapper.error(res, "Üyelik planı değiştirilemedi");
    }
  };

  /**
   * CANCEL MEMBERSHIP - Üyelik iptali
   */
  cancelMembership = async (req, res) => {
    try {
      const { reason } = req.body;
      const userId = req.user.id;

      const user = await User.findById(userId);
      if (!user) {
        return responseWrapper.notFound(res, "Kullanıcı bulunamadı");
      }

      // Üyelik durumunu güncelle
      user.membershipStatus = "cancelled";
      user.membershipPlan = "Basic"; // Basic'e düşür

      await user.save();

      // Log iptal
      await ActivityLog.create({
        user: userId,
        action: "membership_cancelled",
        details: {
          reason,
          previousPlan: user.membershipPlan,
        },
        ip: req.ip,
      });

      return responseWrapper.success(
        res,
        null,
        "Üyeliğiniz iptal edildi. Basic plana geçiş yapıldı."
      );
    } catch (error) {
      console.error("Cancel membership error:", error);
      return responseWrapper.error(res, "Üyelik iptal edilemedi");
    }
  };

  /**
   * REQUEST ACCOUNT DELETION - Hesap silme talebi
   */
  requestAccountDeletion = async (req, res) => {
    try {
      const { reason, password } = req.body;
      const userId = req.user.id;

      // Verify password
      const user = await User.findById(userId).select("+password");
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return responseWrapper.unauthorized(res, "Şifre hatalı");
      }

      // Check for active contracts
      const Investment = require("../models/Investment");
      const activeInvestments = await Investment.find({
        $or: [
          { investor: userId, status: "active" },
          { propertyOwner: userId, status: "active" },
        ],
      });

      if (activeInvestments.length > 0) {
        return responseWrapper.forbidden(
          res,
          "Aktif kontratınız bulunduğu için hesabınızı silemezsiniz. " +
            "Önce tüm aktif kontratlarınızın tamamlanması gerekmektedir."
        );
      }

      // Check for pending payments
      const hasPendingPayments = await this.checkPendingPayments(userId);
      if (hasPendingPayments) {
        return responseWrapper.forbidden(
          res,
          "Bekleyen ödemeleriniz bulunduğu için hesabınızı silemezsiniz."
        );
      }

      // Create deletion request
      const deletionRequest = await AccountDeletionRequest.create({
        user: userId,
        reason,
        requestedAt: new Date(),
        scheduledDeletionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        status: "pending_approval",
        requestIP: req.ip,
      });

      // Update user status
      user.accountStatus = "pending_deletion";
      await user.save();

      // Notify admins
      await this.notificationService.notifyAdmins({
        type: "account_deletion_request",
        title: "Hesap Silme Talebi",
        message: `${user.fullName} (${user.email}) hesabını silmek istiyor.`,
        priority: "high",
        relatedEntity: {
          entityType: "user",
          entityId: user._id,
        },
      });

      // Log deletion request
      await ActivityLog.create({
        user: userId,
        action: "account_deletion_requested",
        details: {
          reason,
          scheduledDate: deletionRequest.scheduledDeletionDate,
        },
        ip: req.ip,
        severity: "high",
      });

      // Send confirmation email
      await emailService.sendAccountDeletionRequestEmail(user.email, {
        scheduledDate: deletionRequest.scheduledDeletionDate,
      });

      return responseWrapper.success(res, {
        message:
          "Hesap silme talebiniz alındı. Admin onayı sonrası hesabınız 90 gün içinde silinecektir.",
        scheduledDeletionDate: deletionRequest.scheduledDeletionDate,
      });
    } catch (error) {
      console.error("Request account deletion error:", error);
      return responseWrapper.error(
        res,
        "Hesap silme talebi sırasında bir hata oluştu"
      );
    }
  };

  /**
   * CANCEL ACCOUNT DELETION - Hesap silme talebini iptal et
   */
  cancelAccountDeletion = async (req, res) => {
    try {
      const userId = req.user.id;

      const deletionRequest = await AccountDeletionRequest.findOne({
        user: userId,
        status: { $in: ["pending_approval", "approved"] },
      });

      if (!deletionRequest) {
        return responseWrapper.notFound(
          res,
          "Aktif hesap silme talebi bulunamadı"
        );
      }

      // Update deletion request
      deletionRequest.status = "cancelled";
      deletionRequest.cancelledAt = new Date();
      deletionRequest.cancelledBy = userId;
      await deletionRequest.save();

      // Update user status
      const user = await User.findById(userId);
      user.accountStatus = "active";
      await user.save();

      // Log cancellation
      await ActivityLog.create({
        user: userId,
        action: "account_deletion_cancelled",
        details: {
          requestId: deletionRequest._id,
        },
        ip: req.ip,
      });

      return responseWrapper.success(
        res,
        null,
        "Hesap silme talebi iptal edildi"
      );
    } catch (error) {
      console.error("Cancel account deletion error:", error);
      return responseWrapper.error(
        res,
        "İptal işlemi sırasında bir hata oluştu"
      );
    }
  };
  getAccountDeletionRequests = async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status = "all",
        sortBy = "requestedAt",
        sortOrder = "desc",
      } = req.query;

      // Filtre oluştur
      const filter = {};
      if (
        status !== "all" &&
        ["pending_approval", "approved", "rejected", "cancelled"].includes(
          status
        )
      ) {
        filter.status = status;
      }

      // Pagination ayarları
      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

      // Talepleri getir (çoklu get için sadece temel bilgiler)
      const requests = await AccountDeletionRequest.find(filter)
        .populate("user", "fullName email role")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      // Toplam sayı
      const total = await AccountDeletionRequest.countDocuments(filter);

      return responseWrapper.success(res, {
        requests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Get account deletion requests error:", error);
      return responseWrapper.error(res, "Hesap silme talepleri alınamadı");
    }
  };

  /**
   * GET ACCOUNT DELETION REQUEST BY ID - ID'ye göre hesap silme talebi detayı (Admin)
   */
  getAccountDeletionRequestById = async (req, res) => {
    try {
      const { requestId } = req.params;

      const request = await AccountDeletionRequest.findById(requestId)
        .populate("user", "-password")
        .populate("approvedBy", "fullName email")
        .populate("rejectedBy", "fullName email");

      if (!request) {
        return responseWrapper.notFound(res, "Hesap silme talebi bulunamadı");
      }

      // Kullanıcının detaylı bilgilerini getir
      const userId = request.user._id;
      let detailedInfo = {
        request: request.toObject(),
      };

      // Investments bilgilerini ekle
      const Investment = require("../models/Investment");
      const investments = await Investment.find({
        $or: [{ investor: userId }, { propertyOwner: userId }],
      }).populate("propertyId", "title location");

      detailedInfo.userInvestments = investments;

      // Properties bilgilerini ekle (eğer property owner ise)
      if (request.user.role === "property_owner") {
        const Property = require("../models/Property");
        const properties = await Property.find({ owner: userId }).select(
          "title location totalValue status"
        );

        detailedInfo.userProperties = properties;
      }

      // Activity logs
      const recentActivities = await ActivityLog.find({ user: userId })
        .sort("-createdAt")
        .limit(10);

      detailedInfo.recentActivities = recentActivities;

      return responseWrapper.success(res, detailedInfo);
    } catch (error) {
      console.error("Get account deletion request by ID error:", error);
      return responseWrapper.error(res, "Talep detayları alınamadı");
    }
  };
  /**
   * VERIFY EMAIL - Email doğrulama
   */
  // authController.js güncellemeleri

  verifyEmail = async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return responseWrapper.badRequest(res, "Token gerekli");
      }

      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      const storedToken = await Token.findOne({
        token: hashedToken,
        type: "email_verification",
      }).populate("user");

      if (!storedToken) {
        return responseWrapper.badRequest(
          res,
          "Geçersiz veya süresi dolmuş token"
        );
      }

      if (storedToken.expiresAt < new Date()) {
        await storedToken.deleteOne();
        return responseWrapper.badRequest(res, "Token süresi dolmuş");
      }

      // Update user
      const user = storedToken.user;
      if (user.kycStatus === "pending") {
        await notificationService.notifyAdminsAboutPendingKYC(user._id);
      }
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();

      // ÖNEMLI: investor ve property_owner için hesabı otomatik aktif et
      // local_representative için admin onayı gerekli
      if (user.role === "investor" || user.role === "property_owner") {
        user.accountStatus = "active";

        // Email gönder
        await emailService.sendAccountActivatedEmail(user.email, {
          fullName: user.fullName,
          role: user.role,
        });

        // Bildirim oluştur
        await this.notificationService.createNotification(
          user._id,
          user.role, // or explicit: "investor" / "property_owner" / "local_representative" / "admin"
          {
            type: "account_activated",
            title: "Hesabınız Aktifleştirildi",
            message: `Tebrikler! ${user.fullName} (${user.role}) hesabınız aktifleştirildi.`,
            priority: "high",
          }
        );
      } else if (user.role === "local_representative") {
        // Local representative için admin onayı bekliyor
        user.accountStatus = "pending_admin_approval";

        // Admin'lere bildirim gönder
        await this.notificationService.notifyAdmins({
          type: "representative_awaiting_approval",
          title: "Yeni Temsilci Onay Bekliyor",
          message: `${user.fullName} (${user.region}) temsilci hesabı onay bekliyor.`,
          priority: "high",
          relatedEntity: {
            entityType: "user",
            entityId: user._id,
          },
        });

        // Kullanıcıya bilgi emaili
        await emailService.sendPendingApprovalEmail(user.email, {
          fullName: user.fullName,
          message:
            "Email adresiniz doğrulandı. Hesabınızın aktifleştirilmesi için admin onayı bekleniyor.",
        });
      }

      await user.save();

      // Delete token
      await storedToken.deleteOne();

      // Log verification
      await ActivityLog.create({
        user: user._id,
        action: "email_verified",
        details: {
          email: user.email,
          accountActivated: user.accountStatus === "active",
        },
        ip: req.ip,
      });

      const responseMessage =
        user.accountStatus === "active"
          ? "Email adresiniz doğrulandı ve hesabınız aktifleştirildi!"
          : "Email adresiniz doğrulandı. Hesap aktivasyonu için admin onayı bekleniyor.";

      return responseWrapper.success(res, {
        accountStatus: user.accountStatus,
        message: responseMessage,
      });
    } catch (error) {
      console.error("Verify email error:", error);
      return responseWrapper.error(
        res,
        "Email doğrulama sırasında bir hata oluştu"
      );
    }
  };

  // KYC ONAY - Admin tarafından KYC onayı
  approveKYC = async (req, res) => {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        kycStatus: "approved",
        kycApprovedAt: new Date(),
        kycApprovedBy: req.user._id,
      },
      { new: true }
    );

    // Kullanıcıya bildirim gönder
    await notificationService.createNotification({
      recipientId: userId,
      recipientRole: user.role,
      type: "kyc_approved",
      title: "KYC Doğrulaması Onaylandı",
      message:
        "KYC doğrulama süreciniz başarıyla tamamlandı. Artık tüm platform özelliklerini kullanabilirsiniz.",
      priority: "high",
      channels: {
        inApp: true,
        email: true,
      },
      actions: [
        {
          label: "Yatırım Fırsatlarını Keşfet",
          url: "/properties",
          type: "primary",
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: "KYC onaylandı",
      data: user,
    });
  };
  // KYC RED - Admin tarafından KYC reddi
  rejectKYC = async (req, res) => {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        kycStatus: "rejected",
        kycRejectedAt: new Date(),
        kycRejectedBy: req.user._id,
        kycRejectionReason: reason,
      },
      { new: true }
    );

    // Kullanıcıya bildirim gönder
    await notificationService.createNotification({
      recipientId: userId,
      recipientRole: user.role,
      type: "kyc_rejected",
      title: "KYC Doğrulaması Reddedildi",
      message: `KYC doğrulama başvurunuz reddedildi. Sebep: ${reason}. Lütfen gerekli düzenlemeleri yaparak tekrar başvurun.`,
      priority: "high",
      channels: {
        inApp: true,
        email: true,
      },
      actions: [
        {
          label: "KYC Bilgilerini Düzenle",
          url: "/profile/kyc",
          type: "primary",
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: "KYC reddedildi",
      data: user,
    });
  };
  /**
   * ACTIVATE MEMBERSHIP - Üyelik planı aktifleştirme
   * Frontend'den ödeme doğrulaması sonrası çağrılır
   * Investor ve Property Owner kendi üyeliklerini aktifleştirebilir
   */
  activateMembership = async (req, res) => {
    try {
      const { plan, paymentId, paymentMethod } = req.body;
      const userId = req.user.id; // Kendi üyeliğini aktifleştiriyor

      const user = await User.findById(userId);
      if (!user) {
        return responseWrapper.notFound(res, "Kullanıcı bulunamadı");
      }

      // Sadece investor ve property_owner kendi üyeliğini aktifleştirebilir
      if (user.role !== "investor" && user.role !== "property_owner") {
        return responseWrapper.forbidden(res, "Bu işlem için yetkiniz yok");
      }

      // Hesap aktif olmalı (email doğrulanmış olmalı)
      if (user.accountStatus !== "active") {
        return responseWrapper.forbidden(
          res,
          "Üyelik aktifleştirmek için önce email adresinizi doğrulayın"
        );
      }

      // Zaten aktif üyelik varsa
      if (
        user.membershipStatus === "active" &&
        user.membershipExpiresAt > new Date()
      ) {
        return responseWrapper.badRequest(
          res,
          "Zaten aktif bir üyeliğiniz var"
        );
      }

      // Update membership
      user.membershipPlan = plan;
      user.membershipStatus = "active";
      user.membershipActivatedAt = new Date();

      // Set membership expiry based on plan (30 gün tüm planlar için)
      const expiryDays = {
        Basic: 30,
        Pro: 30,
        Enterprise: 30,
      };

      user.membershipExpiresAt = new Date(
        Date.now() + expiryDays[plan] * 24 * 60 * 60 * 1000
      );

      // Update investment limit based on plan (investor için)
      if (user.role === "investor") {
        const limits = {
          Basic: 1,
          Pro: 5,
          Enterprise: -1, // unlimited
        };

        const Investor = require("../models/Investor");
        await Investor.findByIdAndUpdate(userId, {
          investmentLimit: limits[plan],
        });
      }

      await user.save();

      // Log membership activation
      await ActivityLog.create({
        user: user._id,
        action: "membership_activated",
        details: {
          plan,
          paymentId,
          paymentMethod,
          activatedBy: "self",
        },
        ip: req.ip,
      });

      // Send confirmation email
      await emailService.sendMembershipActivationEmail(user.email, {
        plan,
        expiresAt: user.membershipExpiresAt,
      });

      // Create notification
      await this.notificationService.createNotification(
        user._id,
        user.role, // or explicit: "investor" / "property_owner" / "local_representative" / "admin"
        {
          type: "membership_upgraded",
          title: "Üyeliğiniz Aktifleştirildi",
          message: `${plan} üyelik planınız başarıyla aktifleştirildi.`,
          priority: "high",
        }
      );

      return responseWrapper.success(
        res,
        {
          membershipPlan: user.membershipPlan,
          membershipStatus: user.membershipStatus,
          membershipExpiresAt: user.membershipExpiresAt,
          investmentLimit: user.role === "investor" ? limits[plan] : undefined,
        },
        "Üyeliğiniz başarıyla aktifleştirildi"
      );
    } catch (error) {
      console.error("Activate membership error:", error);
      return responseWrapper.error(
        res,
        "Üyelik aktifleştirme sırasında bir hata oluştu"
      );
    }
  };
  getMembershipStatus = async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return responseWrapper.notFound(res, "Kullanıcı bulunamadı");
      }

      return responseWrapper.success(res, {
        plan: user.membershipPlan,
        status: user.membershipStatus,
        activatedAt: user.membershipActivatedAt,
        expiresAt: user.membershipExpiresAt,
        daysRemaining: user.membershipExpiresAt
          ? Math.max(
              0,
              Math.ceil(
                (user.membershipExpiresAt - new Date()) / (1000 * 60 * 60 * 24)
              )
            )
          : null,
      });
    } catch (error) {
      console.error("Get membership status error:", error);
      return responseWrapper.error(res, "Üyelik durumu alınamadı");
    }
  };
  /**
   * ACTIVATE LOCAL REPRESENTATIVE - Admin tarafından temsilci aktivasyonu
   */
  activateLocalRepresentative = async (req, res) => {
    try {
      const { userId } = req.params;

      // Admin kontrolü (authorize middleware'de yapılıyor)
      const user = await User.findById(userId);

      if (!user) {
        return responseWrapper.notFound(res, "Kullanıcı bulunamadı");
      }

      if (user.role !== "local_representative") {
        return responseWrapper.badRequest(
          res,
          "Bu kullanıcı bir temsilci değil"
        );
      }

      if (user.accountStatus === "active") {
        return responseWrapper.badRequest(res, "Hesap zaten aktif");
      }

      // Aktifleştir
      user.accountStatus = "active";
      user.membershipStatus = "active"; // Temsilciler için üyelik ücretsiz
      user.membershipPlan = "Enterprise"; // Temsilciler için özel plan
      user.membershipActivatedAt = new Date();
      user.membershipExpiresAt = new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ); // 1 yıl

      await user.save();

      // Email gönder
      await emailService.sendRepresentativeActivatedEmail(user.email, {
        fullName: user.fullName,
        region: user.region,
      });

      // Bildirim oluştur
      await this.notificationService.createNotification({
        recipient: user._id,
        type: "account_activated",
        title: "Temsilci Hesabınız Aktifleştirildi",
        message: `Tebrikler! ${user.region} bölgesi temsilcisi olarak hesabınız onaylandı ve aktifleştirildi.`,
        priority: "high",
      });

      // Log
      await ActivityLog.create({
        user: userId,
        action: "account_activated",
        details: {
          activatedBy: req.user.id,
          role: "local_representative",
          region: user.region,
        },
        ip: req.ip,
        performedBy: req.user.id,
        isAdminAction: true,
      });

      return responseWrapper.success(
        res,
        {
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            region: user.region,
            accountStatus: user.accountStatus,
          },
        },
        "Temsilci hesabı başarıyla aktifleştirildi"
      );
    } catch (error) {
      console.error("Activate representative error:", error);
      return responseWrapper.error(
        res,
        "Temsilci aktivasyonu sırasında hata oluştu"
      );
    }
  };

  /**
   * CHANGE MEMBERSHIP - Üyelik planı değiştirme (upgrade/downgrade)
   */
  changeMembership = async (req, res) => {
    try {
      const { newPlan, paymentId } = req.body;
      const userId = req.user.id;

      const user = await User.findById(userId);

      if (user.membershipPlan === newPlan) {
        return responseWrapper.badRequest(
          res,
          "Zaten bu planda üyeliğiniz var"
        );
      }

      const oldPlan = user.membershipPlan;
      user.membershipPlan = newPlan;

      // Yeni plan limitleri (investor için)
      if (user.role === "investor") {
        const limits = {
          Basic: 1,
          Pro: 5,
          Enterprise: -1,
        };

        const Investor = require("../models/Investor");
        await Investor.findByIdAndUpdate(userId, {
          investmentLimit: limits[newPlan],
        });
      }

      // Süreyi uzat (her plan değişikliğinde 30 gün daha)
      user.membershipExpiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      );
      await user.save();

      // Log
      await ActivityLog.create({
        user: userId,
        action:
          oldPlan < newPlan ? "membership_upgraded" : "membership_downgraded",
        details: {
          oldPlan,
          newPlan,
          paymentId,
        },
        ip: req.ip,
      });

      // Email
      await emailService.sendMembershipChangeEmail(user.email, {
        oldPlan,
        newPlan,
        expiresAt: user.membershipExpiresAt,
      });

      return responseWrapper.success(
        res,
        {
          membershipPlan: user.membershipPlan,
          membershipExpiresAt: user.membershipExpiresAt,
        },
        `Üyeliğiniz ${newPlan} planına ${
          oldPlan < newPlan ? "yükseltildi" : "düşürüldü"
        }`
      );
    } catch (error) {
      console.error("Change membership error:", error);
      return responseWrapper.error(
        res,
        "Üyelik değişikliği sırasında hata oluştu"
      );
    }
  };

  /**
   * SETUP 2FA - 2FA kurulumu
   */
  setup2FA = async (req, res) => {
    try {
      const userId = req.user.id;
      const { method } = req.body; // "email", "sms", "authenticator"

      const user = await User.findById(userId);

      if (method === "authenticator") {
        // Generate secret for authenticator app (Google Authenticator, Authy, Microsoft Authenticator)
        const secret = speakeasy.generateSecret({
          name: `Pledged Platform (${user.email})`,
          length: 32,
          // This creates a label that will appear in the authenticator app
          issuer: "Pledged Platform",
        });

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        // Store secret temporarily (will be confirmed when user verifies)
        await TwoFactorAuth.findOneAndUpdate(
          { user: userId },
          {
            user: userId,
            method: "authenticator",
            secret: null, // Don't save the real secret yet
            isEnabled: false,
            tempSecret: secret.base32, // Save temporarily until verified
            backupCodes: [],
          },
          { upsert: true, new: true }
        );

        console.log(
          `\n🔐 Authenticator Secret for ${user.email}: ${secret.base32}`
        );
        console.log(
          `📱 Compatible with: Google Authenticator, Authy, Microsoft Authenticator, 1Password, etc.\n`
        );

        return responseWrapper.success(
          res,
          {
            method: "authenticator",
            qrCode: qrCodeUrl,
            manualEntryKey: secret.base32,
            appName: "Pledged Platform",
            accountName: user.email,
            instructions: {
              step1:
                "Authenticator uygulamanızı açın (Google Authenticator, Authy, Microsoft Authenticator vb.)",
              step2: "'+' veya 'Hesap Ekle' butonuna tıklayın",
              step3: "QR kodunu tarayın veya manuel giriş anahtarını kullanın",
              step4: "Uygulamada görünen 6 haneli kodu girerek doğrulayın",
            },
            compatibleApps: [
              "Google Authenticator",
              "Microsoft Authenticator",
              "Authy",
              "1Password",
              "LastPass Authenticator",
              "Duo Mobile",
            ],
          },
          "2FA kurulumu başlatıldı. QR kodu tarayın veya kodu manuel girin."
        );
      } else {
        // Email or SMS based 2FA
        await TwoFactorAuth.findOneAndUpdate(
          { user: userId },
          {
            user: userId,
            method,
            isEnabled: false,
            secret: null,
            tempSecret: null,
            backupCodes: [],
            // 🔑 method'a göre zorunlu alanları kayda yaz
            ...(method === "email" ? { email: user.email } : {}),
            ...(method === "sms" ? { phoneNumber: user.phoneNumber } : {}),
          },
          { upsert: true, new: true }
        );

        // Send verification code
        const code = this.generate2FACode();
        await this.store2FACode(userId, code);

        if (method === "email") {
          await emailService.send2FACode(user.email, code);
        } else if (method === "sms") {
          await smsService.send2FACode(user.phoneNumber, code);
        }

        return responseWrapper.success(res, {
          method,
          message: `Doğrulama kodu ${
            method === "email" ? "email" : "SMS"
          } ile gönderildi`,
        });
      }
    } catch (error) {
      console.error("Setup 2FA error:", error);
      return responseWrapper.error(
        res,
        "2FA kurulumu sırasında bir hata oluştu"
      );
    }
  };

  /**
   * ENABLE 2FA - 2FA'yı etkinleştir
   */
  enable2FA = async (req, res) => {
    try {
      const userId = req.user.id;
      const { code } = req.body;

      const twoFactorAuth = await TwoFactorAuth.findOne({ user: userId });

      if (!twoFactorAuth) {
        return responseWrapper.badRequest(res, "2FA kurulumu yapılmamış");
      }

      let isValid = false;

      if (twoFactorAuth.method === "authenticator") {
        // Verify TOTP code
        isValid = speakeasy.totp.verify({
          secret: twoFactorAuth.tempSecret || twoFactorAuth.secret,
          encoding: "base32",
          token: code,
          window: 2,
        });
      } else {
        // Verify email/SMS code
        isValid = await this.verify2FACode(userId, code);
      }

      if (!isValid) {
        return responseWrapper.badRequest(res, "Geçersiz doğrulama kodu");
      }

      // Enable 2FA
      twoFactorAuth.isEnabled = true;
      twoFactorAuth.enabledAt = new Date();
      if (twoFactorAuth.tempSecret) {
        twoFactorAuth.secret = twoFactorAuth.tempSecret;
        twoFactorAuth.tempSecret = undefined;
      }
      await twoFactorAuth.save();

      // Update user
      const user = await User.findById(userId);
      user.is2FAEnabled = true;
      await user.save();

      // Generate backup codes
      const backupCodes = this.generateBackupCodesInternal();
      const hashedBackupCodes = backupCodes.map((code) =>
        crypto.createHash("sha256").update(code).digest("hex")
      );

      twoFactorAuth.backupCodes = hashedBackupCodes;
      await twoFactorAuth.save();

      // TÜM OTURUMLARI SONLANDIR (güvenlik için)
      await this.invalidateAllUserSessions(user._id, "2fa_enabled");

      // Log 2FA activation
      await ActivityLog.create({
        user: userId,
        action: "2fa_enabled",
        details: {
          method: twoFactorAuth.method,
          allSessionsRevoked: true,
        },
        ip: req.ip,
        severity: "high",
      });

      // Security alert
      await emailService.sendSecurityAlert(user.email, {
        type: "2fa_enabled",
        method: twoFactorAuth.method,
        ip: req.ip,
        timestamp: new Date(),
        note: "2FA etkinleştirildi. Güvenlik için tüm oturumlarınız sonlandırıldı.",
      });

      return responseWrapper.success(res, {
        backupCodes,
        message:
          "2FA başarıyla etkinleştirildi. Yedek kodlarınızı güvenli bir yerde saklayın. Tüm cihazlarda tekrar giriş yapmanız gerekecek.",
      });
    } catch (error) {
      console.error("Enable 2FA error:", error);
      return responseWrapper.error(
        res,
        "2FA etkinleştirme sırasında bir hata oluştu"
      );
    }
  };

  /**
   * DISABLE 2FA - 2FA'yı devre dışı bırak
   */
  disable2FA = async (req, res) => {
    try {
      const userId = req.user.id;
      const { password, code } = req.body;

      // Verify password
      const user = await User.findById(userId).select("+password");
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return responseWrapper.unauthorized(res, "Şifre hatalı");
      }

      // Verify 2FA code
      const isValidCode = await this.verify2FACode(userId, code);
      if (!isValidCode) {
        return responseWrapper.unauthorized(res, "Geçersiz 2FA kodu");
      }

      // Disable 2FA
      await TwoFactorAuth.findOneAndUpdate(
        { user: userId },
        {
          isEnabled: false,
          disabledAt: new Date(),
          backupCodes: [],
        }
      );

      user.is2FAEnabled = false;
      await user.save();

      // Log 2FA deactivation
      await ActivityLog.create({
        user: userId,
        action: "2fa_disabled",
        details: {},
        ip: req.ip,
        severity: "medium",
      });

      // Send security alert
      await emailService.sendSecurityAlert(user.email, {
        type: "2fa_disabled",
        ip: req.ip,
        timestamp: new Date(),
      });

      return responseWrapper.success(res, null, "2FA devre dışı bırakıldı");
    } catch (error) {
      console.error("Disable 2FA error:", error);
      return responseWrapper.error(
        res,
        "2FA devre dışı bırakma sırasında bir hata oluştu"
      );
    }
  };
  send2FACode = async (user) => {
    // 6 haneli kod üret
    // send2FACode(user)
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 haneli string
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 dk

    // Eski 2FA kodlarını temizle (opsiyonel ama iyi pratik)
    await Token.deleteMany({ user: user._id, type: "2fa_code" });

    // Hashle ve kaydet
    const crypto = require("crypto");
    const hashed = crypto.createHash("sha256").update(code).digest("hex");

    await Token.create({
      user: user._id,
      token: hashed,
      type: "2fa_code",
      expiresAt,
    });

    // Gönderim: method=email ise mail, sms ise sms
    if (TwoFactorAuth.method === "sms" && user.phoneNumber) {
      await smsService.send2FACode(user.phoneNumber, code);
    } else {
      await emailService.send2FACode(user.email, code);
    }

    // (İstersen dev modda kodu konsola da bas)
    if (process.env.NODE_ENV !== "production") {
      console.log("DEV 2FA CODE:", code);
    }

    return code;
  };

  /**
   * Generate 2FA code
   */
  generate2FACode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Store 2FA code
   */
  async store2FACode(userId, code) {
    const crypto = require("crypto");
    const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

    await Token.create({
      user: userId,
      token: hashedCode,
      type: "2fa_code",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });
  }

  /**
   * Verify 2FA code
   */
  async verify2FACode(userId, code) {
    try {
      const twoFA = await TwoFactorAuth.findOne({ user: userId });

      // Authenticator yalnızca aktif ve secret varsa TOTP kontrolü yapar
      if (
        twoFA &&
        twoFA.method === "authenticator" &&
        twoFA.isEnabled &&
        twoFA.secret
      ) {
        const speakeasy = require("speakeasy");
        return speakeasy.totp.verify({
          secret: twoFA.secret,
          encoding: "base32",
          token: code,
          window: 2,
        });
      }

      // Email/SMS doğrulaması: Token tablosu
      const crypto = require("crypto");
      const hashed = crypto.createHash("sha256").update(code).digest("hex");

      const tokenDoc = await Token.findOne({
        user: userId,
        token: hashed,
        type: "2fa_code",
        expiresAt: { $gt: new Date() },
      });

      if (!tokenDoc) return false;

      await tokenDoc.deleteOne(); // tek kullanımlık
      return true;
    } catch (err) {
      console.error("Verify 2FA code error:", err);
      return false;
    }
  }

  /**
   * FORGOT PASSWORD - Şifremi unuttum
   */
  forgotPassword = async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return responseWrapper.badRequest(res, "Email adresi gerekli");
      }

      const user = await User.findOne({ email: email.toLowerCase() });

      // Security: Don't reveal if user exists
      if (!user) {
        return responseWrapper.success(
          res,
          null,
          "Eğer bu email adresi sistemde kayıtlıysa, şifre sıfırlama linki gönderildi."
        );
      }

      // Check for recent password reset requests (rate limiting)
      const recentRequest = await Token.findOne({
        user: user._id,
        type: "password_reset",
        createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) }, // 5 minutes
      });

      if (recentRequest) {
        return responseWrapper.tooManyRequests(
          res,
          "Lütfen bir sonraki şifre sıfırlama talebinde bulunmak için 5 dakika bekleyin."
        );
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      await Token.create({
        user: user._id,
        token: hashedToken,
        type: "password_reset",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });

      // Send reset email
      await emailService.sendPasswordResetEmail(user.email, resetToken);

      // Log password reset request
      await ActivityLog.create({
        user: user._id,
        action: "password_reset_requested",
        details: {
          ip: req.ip,
        },
        ip: req.ip,
      });

      return responseWrapper.success(
        res,
        null,
        "Eğer bu email adresi sistemde kayıtlıysa, şifre sıfırlama linki gönderildi."
      );
    } catch (error) {
      console.error("Forgot password error:", error);
      return responseWrapper.error(
        res,
        "Şifre sıfırlama talebi sırasında bir hata oluştu"
      );
    }
  };

  /**
   * RESET PASSWORD - Şifre sıfırlama
   */
  resetPassword = async (req, res) => {
    try {
      const { token } = req.params;
      const { password, confirmPassword } = req.body;

      if (!token || !password || !confirmPassword) {
        return responseWrapper.badRequest(res, "Gerekli alanlar eksik");
      }

      if (password !== confirmPassword) {
        return responseWrapper.badRequest(res, "Şifreler eşleşmiyor");
      }

      // Check password strength
      const passwordStrength = this.checkPasswordStrength(password);
      if (!passwordStrength.isValid) {
        return responseWrapper.badRequest(res, passwordStrength.message);
      }

      // Find token
      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
      const storedToken = await Token.findOne({
        token: hashedToken,
        type: "password_reset",
      }).populate("user");

      if (!storedToken) {
        return responseWrapper.badRequest(
          res,
          "Geçersiz veya süresi dolmuş token"
        );
      }

      if (storedToken.expiresAt < new Date()) {
        await storedToken.deleteOne();
        return responseWrapper.badRequest(res, "Token süresi dolmuş");
      }

      // Update password
      const user = storedToken.user;
      user.password = await bcrypt.hash(password, 12);
      user.passwordChangedAt = new Date();
      await user.save();

      // Delete token
      await storedToken.deleteOne();

      // TÜM OTURUMLARI SONLANDIR
      await this.invalidateAllUserSessions(user._id, "password_reset");

      // Log password reset
      await ActivityLog.create({
        user: user._id,
        action: "password_reset_completed",
        details: {
          ip: req.ip,
          allSessionsRevoked: true,
        },
        ip: req.ip,
        severity: "high",
      });

      // Send confirmation email
      await emailService.sendPasswordResetConfirmation(user.email);

      // Security alert
      await emailService.sendSecurityAlert(user.email, {
        type: "password_changed",
        ip: req.ip,
        timestamp: new Date(),
        note: "Tüm oturumlarınız güvenlik nedeniyle sonlandırıldı. Lütfen tekrar giriş yapın.",
      });

      return responseWrapper.success(
        res,
        null,
        "Şifreniz başarıyla sıfırlandı. Güvenlik için tüm oturumlarınız sonlandırıldı."
      );
    } catch (error) {
      console.error("Reset password error:", error);
      return responseWrapper.error(
        res,
        "Şifre sıfırlama sırasında bir hata oluştu"
      );
    }
  };

  /**
   * CHANGE PASSWORD - Şifre değiştirme (giriş yapmış kullanıcı)
   */
  changePassword = async (req, res) => {
    try {
      const { oldPassword, newPassword, confirmPassword } = req.body;
      const userId = req.user.id;

      if (!oldPassword || !newPassword || !confirmPassword) {
        return responseWrapper.badRequest(res, "Tüm alanlar zorunludur");
      }

      if (newPassword !== confirmPassword) {
        return responseWrapper.badRequest(res, "Yeni şifreler eşleşmiyor");
      }

      // Get user with password
      const user = await User.findById(userId).select("+password");
      if (!user) {
        return responseWrapper.notFound(res, "Kullanıcı bulunamadı");
      }

      // Verify old password
      const isValidPassword = await bcrypt.compare(oldPassword, user.password);
      if (!isValidPassword) {
        return responseWrapper.unauthorized(res, "Mevcut şifre hatalı");
      }

      // Check if new password is same as old
      if (oldPassword === newPassword) {
        return responseWrapper.badRequest(
          res,
          "Yeni şifre eski şifre ile aynı olamaz"
        );
      }

      // Check password strength
      const passwordStrength = this.checkPasswordStrength(newPassword);
      if (!passwordStrength.isValid) {
        return responseWrapper.badRequest(res, passwordStrength.message);
      }

      // Update password
      user.password = await bcrypt.hash(newPassword, 12);
      user.passwordChangedAt = new Date();
      user.passwordResetRequired = false;
      await user.save();

      // Mevcut token'ı al
      const currentToken = req.headers.authorization?.replace("Bearer ", "");

      // TÜM DİĞER OTURUMLARI SONLANDIR (mevcut hariç)
      await this.invalidateAllUserSessions(
        user._id,
        "password_changed",
        currentToken
      );

      // Log password change
      await ActivityLog.create({
        user: userId,
        action: "password_changed",
        details: {
          ip: req.ip,
          allOtherSessionsRevoked: true,
        },
        ip: req.ip,
        severity: "high",
      });

      // Send confirmation email
      await emailService.sendPasswordChangeConfirmation(user.email);

      // Security alert
      await emailService.sendSecurityAlert(user.email, {
        type: "password_changed",
        ip: req.ip,
        timestamp: new Date(),
        note: "Diğer tüm oturumlarınız güvenlik nedeniyle sonlandırıldı.",
      });

      return responseWrapper.success(
        res,
        null,
        "Şifreniz başarıyla değiştirildi. Diğer cihazlarda tekrar giriş yapmanız gerekecek."
      );
    } catch (error) {
      console.error("Change password error:", error);
      return responseWrapper.error(
        res,
        "Şifre değiştirme sırasında hata oluştu"
      );
    }
  };

  // ==================== HELPER METHODS ====================

  /**
   * Get user model by role
   */
  getUserModelByRole(role) {
    const models = {
      investor: require("../models/Investor"),
      property_owner: require("../models/PropertyOwner"),
      local_representative: require("../models/LocalRepresentative"),
      admin: require("../models/Admin"),
    };
    return models[role] || User;
  }

  /**
   * Get user details with role-specific data
   */
  async getUserDetails(user) {
    const baseDetails = {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      membershipPlan: user.membershipPlan,
      membershipStatus: user.membershipStatus,
      kycStatus: user.kycStatus,
      emailVerified: user.emailVerified,
      is2FAEnabled: user.is2FAEnabled,
      country: user.country,
    };

    // Add role-specific fields
    switch (user.role) {
      case "investor":
        const Investor = require("../models/Investor");
        const investor = await Investor.findById(user._id);
        return {
          ...baseDetails,
          investmentLimit: investor.investmentLimit,
          activeInvestmentCount: investor.activeInvestmentCount,
          referralCode: investor.referralCode,
        };

      case "property_owner":
        const PropertyOwner = require("../models/PropertyOwner");
        const owner = await PropertyOwner.findById(user._id);
        return {
          ...baseDetails,
          ownerTrustScore: owner.ownerTrustScore,
          totalProperties: owner.totalProperties,
          ongoingContracts: owner.ongoingContracts,
        };

      case "local_representative":
        const LocalRepresentative = require("../models/LocalRepresentative");
        const rep = await LocalRepresentative.findById(user._id);
        return {
          ...baseDetails,
          region: rep.region,
          commissionEarned: rep.commissionEarned.total,
        };

      case "admin":
        const Admin = require("../models/Admin");
        const admin = await Admin.findById(user._id);
        return {
          ...baseDetails,
          accessLevel: admin.accessLevel,
        };

      default:
        return baseDetails;
    }
  }

  /**
   * Check password strength
   */
  checkPasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasNonAlphas = /\W/.test(password);

    if (password.length < minLength) {
      return {
        isValid: false,
        message: `Şifre en az ${minLength} karakter olmalıdır`,
      };
    }

    if (!hasUpperCase || !hasLowerCase) {
      return {
        isValid: false,
        message: "Şifre hem büyük hem küçük harf içermelidir",
      };
    }

    if (!hasNumbers) {
      return {
        isValid: false,
        message: "Şifre en az bir rakam içermelidir",
      };
    }

    if (!hasNonAlphas) {
      return {
        isValid: false,
        message: "Şifre en az bir özel karakter içermelidir",
      };
    }

    return { isValid: true };
  }

  /**
   * Generate 2FA code
   */
  generate2FACode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Store 2FA code
   */
  async store2FACode(userId, code) {
    const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

    await Token.create({
      user: userId,
      token: hashedCode,
      type: "2fa_code",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });
  }

  /**
   * Verify 2FA code
   */
  async verify2FACode(userId, code) {
    const twoFactorAuth = await TwoFactorAuth.findOne({ user: userId });

    if (!twoFactorAuth) {
      return false;
    }

    if (twoFactorAuth.method === "authenticator") {
      // Verify TOTP
      return speakeasy.totp.verify({
        secret: twoFactorAuth.secret,
        encoding: "base32",
        token: code,
        window: 2,
      });
    } else {
      // Verify email/SMS code
      const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

      const storedToken = await Token.findOne({
        user: userId,
        token: hashedCode,
        type: "2fa_code",
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        return false;
      }

      await storedToken.deleteOne();
      return true;
    }
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
    }
    return codes;
  }

  /**
   * Check concurrent sessions
   */
  async checkConcurrentSessions(userId, currentIP) {
    const activeSessions = await Token.find({
      user: userId,
      type: "refresh",
      expiresAt: { $gt: new Date() },
    });

    const differentIPs = activeSessions.filter(
      (session) => session.ip !== currentIP
    );

    if (differentIPs.length > 0) {
      // Log suspicious activity
      await ActivityLog.create({
        user: userId,
        action: "concurrent_sessions_detected",
        details: {
          currentIP,
          otherIPs: differentIPs.map((s) => s.ip),
        },
        ip: currentIP,
        severity: "medium",
      });
    }
  }

  /**
   * Check pending payments
   */
  async checkPendingPayments(userId) {
    const Investment = require("../models/Investment");

    const pendingPayments = await Investment.find({
      $or: [{ investor: userId }, { propertyOwner: userId }],
      "rentalPayments.status": "pending",
    });

    return pendingPayments.length > 0;
  }

  /**
   * Generate referral code
   */
  generateReferralCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  // server/controllers/authController.js dosyasının sonuna ekleyin:

  /**
   * RESEND VERIFICATION EMAIL
   */
  resendVerificationEmail = async (req, res) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        // Güvenlik için kullanıcının var olup olmadığını açıklama
        return responseWrapper.success(
          res,
          null,
          "Eğer email kayıtlıysa, doğrulama emaili gönderildi."
        );
      }

      if (user.emailVerified) {
        return responseWrapper.badRequest(res, "Email zaten doğrulanmış.");
      }

      // Yeni token oluştur
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

      // Eski tokeni sil, yenisini ekle
      await Token.deleteMany({ user: user._id, type: "email_verification" });

      await Token.create({
        user: user._id,
        token: hashedToken,
        type: "email_verification",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 saat
      });

      // Email gönder
      await emailService.sendVerificationEmail(user.email, verificationToken);

      return responseWrapper.success(
        res,
        null,
        "Doğrulama emaili tekrar gönderildi."
      );
    } catch (error) {
      console.error("Resend verification error:", error);
      return responseWrapper.error(
        res,
        "Email gönderimi sırasında hata oluştu"
      );
    }
  };

  /**
   * GET CURRENT USER
   */
  getCurrentUser = async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("-password");

      if (!user) {
        return responseWrapper.notFound(res, "Kullanıcı bulunamadı");
      }

      const userDetails = await this.getUserDetails(user);

      return responseWrapper.success(res, userDetails);
    } catch (error) {
      console.error("Get current user error:", error);
      return responseWrapper.error(res, "Kullanıcı bilgileri alınamadı");
    }
  };

  /**
   * UPDATE PROFILE
   */
  updateProfile = async (req, res) => {
    try {
      const { fullName, phoneNumber, country } = req.body;

      const user = await User.findById(req.user.id);

      if (!user) {
        return responseWrapper.notFound(res, "Kullanıcı bulunamadı");
      }

      // Update fields
      if (fullName) user.fullName = fullName;
      if (phoneNumber) user.phoneNumber = phoneNumber;
      if (country) user.country = country;

      await user.save();

      return responseWrapper.success(
        res,
        {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          country: user.country,
        },
        "Profil güncellendi"
      );
    } catch (error) {
      console.error("Update profile error:", error);
      return responseWrapper.error(res, "Profil güncellenemedi");
    }
  };

  /**
   * VERIFY 2FA (during login)
   */
  verify2FA = async (req, res) => {
    try {
      const { email, code } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return responseWrapper.unauthorized(res, "Geçersiz email veya kod");
      }

      const isValid = await this.verify2FACode(user._id, code);

      if (!isValid) {
        return responseWrapper.unauthorized(res, "Geçersiz 2FA kodu");
      }

      return responseWrapper.success(res, {
        verified: true,
        message: "2FA doğrulama başarılı, login işlemini tamamlayabilirsiniz",
      });
    } catch (error) {
      console.error("Verify 2FA error:", error);
      return responseWrapper.error(res, "2FA doğrulama hatası");
    }
  };

  /**
   * GENERATE BACKUP CODES
   */
  generateBackupCodes = async (req, res) => {
    try {
      const { password } = req.body;
      const userId = req.user.id;

      // Şifre kontrolü
      const user = await User.findById(userId).select("+password");
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return responseWrapper.unauthorized(res, "Şifre hatalı");
      }

      // Yeni backup kodları oluştur - Internal method kullan
      const backupCodes = this.generateBackupCodesInternal();
      const hashedBackupCodes = backupCodes.map((code) =>
        crypto.createHash("sha256").update(code).digest("hex")
      );

      // Güncelle
      await TwoFactorAuth.findOneAndUpdate(
        { user: userId },
        { backupCodes: hashedBackupCodes }
      );

      return responseWrapper.success(res, {
        backupCodes,
        message: "Yeni backup kodları oluşturuldu. Güvenli bir yerde saklayın.",
      });
    } catch (error) {
      console.error("Generate backup codes error:", error);
      return responseWrapper.error(res, "Backup kodları oluşturulamadı");
    }
  };

  // Admin metodları (şimdilik stub)
  // authController.js dosyasına eklenecek stub metodlar
  // Bu metodları authController class'ının içine ekleyin

  // ==================== ADMIN STUB METHODS ====================

  /**
   * Get all users (Admin)
   */
  getAllUsers = async (req, res) => {
    try {
      const users = await User.find().select("-password");
      return responseWrapper.success(res, users);
    } catch (error) {
      console.error("Get all users error:", error);
      return responseWrapper.error(res, "Kullanıcılar alınamadı");
    }
  };

  /**
   * Get user by ID (Admin)
   */
  getUserById = async (req, res) => {
    try {
      const user = await User.findById(req.params.userId).select("-password");
      if (!user) {
        return responseWrapper.notFound(res, "Kullanıcı bulunamadı");
      }
      return responseWrapper.success(res, user);
    } catch (error) {
      console.error("Get user by ID error:", error);
      return responseWrapper.error(res, "Kullanıcı alınamadı");
    }
  };

  /**
   * Update user status (Admin)
   */
  updateUserStatus = async (req, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return responseWrapper.notFound(res, "Kullanıcı bulunamadı");
      }

      user.accountStatus = status;
      await user.save();

      return responseWrapper.success(res, user, "Kullanıcı durumu güncellendi");
    } catch (error) {
      console.error("Update user status error:", error);
      return responseWrapper.error(res, "Durum güncellenemedi");
    }
  };

  /**
   * Update user role (Admin)
   */
  updateUserRole = async (req, res) => {
    return responseWrapper.notImplemented(
      res,
      "Rol güncelleme özelliği henüz aktif değil"
    );
  };

  /**
   * Force password reset (Admin)
   */
  forcePasswordReset = async (req, res) => {
    return responseWrapper.notImplemented(
      res,
      "Şifre sıfırlama zorlama özelliği henüz aktif değil"
    );
  };

  /**
   * Get activity logs (Admin)
   */
  getActivityLogs = async (req, res) => {
    try {
      const ActivityLog = require("../models/ActivityLog");
      const logs = await ActivityLog.find()
        .populate("user", "email fullName")
        .sort("-createdAt")
        .limit(100);
      return responseWrapper.success(res, logs);
    } catch (error) {
      console.error("Get activity logs error:", error);
      return responseWrapper.error(res, "Loglar alınamadı");
    }
  };

  /**
   * Get security alerts (Admin)
   */
  getSecurityAlerts = async (req, res) => {
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
      console.error("Get security alerts error:", error);
      return responseWrapper.error(res, "Güvenlik uyarıları alınamadı");
    }
  };

  /**
   * Blacklist token (Admin)
   */
  blacklistToken = async (req, res) => {
    return responseWrapper.notImplemented(
      res,
      "Token blacklist özelliği henüz aktif değil"
    );
  };

  /**
   * Activate local representative (Admin)
   */
  activateLocalRepresentative = async (req, res) => {
    return responseWrapper.notImplemented(
      res,
      "Temsilci aktivasyonu henüz aktif değil"
    );
  };

  /**
   * Suspend user (Admin)
   */
  suspendUser = async (req, res) => {
    return responseWrapper.notImplemented(
      res,
      "Kullanıcı askıya alma özelliği henüz aktif değil"
    );
  };

  /**
   * Unsuspend user (Admin)
   */
  unsuspendUser = async (req, res) => {
    return responseWrapper.notImplemented(
      res,
      "Askıdan alma özelliği henüz aktif değil"
    );
  };

  // ==================== SECURITY STUB METHODS ====================

  /**
   * Get login history
   */
  getLoginHistory = async (req, res) => {
    try {
      const userId = req.user.id;
      const { limit = 20 } = req.query;

      const loginHistory = await ActivityLog.find({
        user: userId,
        action: {
          $in: ["user_login", "suspicious_login_attempt", "account_locked"],
        },
      })
        .select("action details ip userAgent createdAt")
        .sort("-createdAt")
        .limit(parseInt(limit));

      return responseWrapper.success(res, loginHistory);
    } catch (error) {
      console.error("Get login history error:", error);
      return responseWrapper.error(res, "Giriş geçmişi alınamadı");
    }
  };

  /**
   * Get active sessions
   */
  getActiveSessions = async (req, res) => {
    try {
      const Token = require("../models/Token");
      const sessions = await Token.find({
        user: req.user.id,
        type: "refresh",
        expiresAt: { $gt: new Date() },
      });
      return responseWrapper.success(res, sessions);
    } catch (error) {
      return responseWrapper.error(res, "Oturumlar alınamadı");
    }
  };

  /**
   * GET ACTIVE SESSIONS - Aktif oturumları getir
   */
  getActiveSessions = async (req, res) => {
    try {
      const userId = req.user.id;

      // Aktif refresh token'ları bul
      const sessions = await Token.find({
        user: userId,
        type: "refresh",
        expiresAt: { $gt: new Date() },
      })
        .select("token createdAt expiresAt lastUsedAt deviceInfo ip")
        .sort("-createdAt");

      // Her oturum için detaylı bilgi hazırla
      const detailedSessions = sessions.map((session) => ({
        id: session._id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastUsedAt: session.lastUsedAt || session.createdAt,
        deviceInfo: session.deviceInfo || "Bilinmeyen Cihaz",
        ip: session.ip,
        isCurrent:
          session.token === req.headers.authorization?.replace("Bearer ", ""),
      }));

      return responseWrapper.success(res, detailedSessions);
    } catch (error) {
      console.error("Get active sessions error:", error);
      return responseWrapper.error(res, "Aktif oturumlar alınamadı");
    }
  };

  /**
   * REVOKE ALL SESSIONS - Tüm oturumları sonlandır
   */
  revokeAllSessions = async (req, res) => {
    try {
      const { password } = req.body;
      const userId = req.user.id;

      // Şifre doğrulama
      const user = await User.findById(userId).select("+password");
      if (!user) {
        return responseWrapper.notFound(res, "Kullanıcı bulunamadı");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return responseWrapper.unauthorized(res, "Şifre hatalı");
      }

      // Mevcut token'ı bul
      const authHeader = req.headers.authorization;
      let currentTokenHash = null;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const currentToken = authHeader.substring(7);
        // Token'ı hash'le ki veritabanındaki ile karşılaştırabilelim
        currentTokenHash = crypto
          .createHash("sha256")
          .update(currentToken)
          .digest("hex");
      }

      // Tüm refresh token'ları sil (mevcut hariç)
      const deleteQuery = {
        user: userId,
        type: { $in: ["refresh", "access"] },
      };

      // Eğer mevcut token varsa, onu hariç tut
      if (currentTokenHash) {
        deleteQuery.token = { $ne: currentTokenHash };
      }

      const result = await Token.deleteMany(deleteQuery);
      console.log(`Deleted ${result.deletedCount} tokens for user ${userId}`);

      // Tüm access token'ları blacklist'e ekle
      const activeTokens = await Token.find({
        user: userId,
        type: "access",
        expiresAt: { $gt: new Date() },
      });

      for (const token of activeTokens) {
        await BlacklistedToken.create({
          token: token.token,
          tokenType: "access",
          user: userId,
          expiresAt: token.expiresAt,
          reason: "all_sessions_revoked",
          ip: req.ip,
        });
      }

      // Activity log
      await ActivityLog.create({
        user: userId,
        action: "revoke_all_sessions",
        details: {
          reason: "User initiated",
          ip: req.ip,
          sessionsRevoked: result.deletedCount,
        },
        ip: req.ip,
        severity: "medium",
      });

      // Email bildirimi gönder
      await emailService.sendSecurityAlert(user.email, {
        type: "all_sessions_revoked",
        ip: req.ip,
        timestamp: new Date(),
      });

      return responseWrapper.success(res, {
        sessionsRevoked: result.deletedCount,
        message:
          "Tüm oturumlar sonlandırıldı. Güvenlik için tekrar giriş yapmanız gerekecek.",
      });
    } catch (error) {
      console.error("Revoke all sessions error:", error);
      return responseWrapper.error(res, "Oturumlar sonlandırılamadı");
    }
  };

  /**
   * ADD TRUSTED IP - Güvenilir IP ekle
   */
  addTrustedIP = async (req, res) => {
    try {
      const { ip, name } = req.body;
      const userId = req.user.id;

      // IP formatını kontrol et
      const ipRegex =
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(ip)) {
        return responseWrapper.badRequest(res, "Geçersiz IP adresi");
      }

      const user = await User.findById(userId);

      if (!user.trustedIPs) {
        user.trustedIPs = [];
      }

      // Aynı IP zaten eklenmişse hata dön
      if (user.trustedIPs.some((trustedIP) => trustedIP.ip === ip)) {
        return responseWrapper.conflict(
          res,
          "Bu IP adresi zaten güvenilir listede"
        );
      }

      // Maksimum 5 güvenilir IP
      if (user.trustedIPs.length >= 5) {
        return responseWrapper.badRequest(
          res,
          "Maksimum 5 güvenilir IP ekleyebilirsiniz"
        );
      }

      user.trustedIPs.push({
        ip,
        name: name || "İsimsiz IP",
        addedAt: new Date(),
      });

      await user.save();

      // Activity log
      await ActivityLog.create({
        user: userId,
        action: "trusted_ip_added",
        details: { ip, name },
        ip: req.ip,
      });

      return responseWrapper.success(
        res,
        user.trustedIPs,
        "Güvenilir IP eklendi"
      );
    } catch (error) {
      console.error("Add trusted IP error:", error);
      return responseWrapper.error(res, "Güvenilir IP eklenemedi");
    }
  };

  /**
   * REMOVE TRUSTED IP - Güvenilir IP kaldır
   */
  removeTrustedIP = async (req, res) => {
    try {
      const { ip } = req.params;
      const userId = req.user.id;

      const user = await User.findById(userId);

      if (!user.trustedIPs || user.trustedIPs.length === 0) {
        return responseWrapper.notFound(res, "Güvenilir IP bulunamadı");
      }

      const initialLength = user.trustedIPs.length;
      user.trustedIPs = user.trustedIPs.filter(
        (trustedIP) => trustedIP.ip !== ip
      );

      if (user.trustedIPs.length === initialLength) {
        return responseWrapper.notFound(res, "Belirtilen IP adresi bulunamadı");
      }

      await user.save();

      // Activity log
      await ActivityLog.create({
        user: userId,
        action: "trusted_ip_removed",
        details: { ip },
        ip: req.ip,
      });

      return responseWrapper.success(
        res,
        user.trustedIPs,
        "Güvenilir IP kaldırıldı"
      );
    } catch (error) {
      console.error("Remove trusted IP error:", error);
      return responseWrapper.error(res, "Güvenilir IP kaldırılamadı");
    }
  };

  /**
   * GET TRUSTED IPS - Güvenilir IP listesini getir
   */
  getTrustedIPs = async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId).select("trustedIPs");

      return responseWrapper.success(res, user.trustedIPs || []);
    } catch (error) {
      console.error("Get trusted IPs error:", error);
      return responseWrapper.error(res, "Güvenilir IP listesi alınamadı");
    }
  };

  // ==================== PHONE VERIFICATION STUB METHODS ====================

  /**
   * Send phone verification
   */
  sendPhoneVerification = async (req, res) => {
    return responseWrapper.notImplemented(
      res,
      "Telefon doğrulama özelliği henüz aktif değil"
    );
  };

  /**
   * Verify phone
   */
  verifyPhone = async (req, res) => {
    return responseWrapper.notImplemented(
      res,
      "Telefon doğrulama özelliği henüz aktif değil"
    );
  };

  // ==================== ACCOUNT DELETION STUB METHODS (Eğer eksikse) ====================

  /**
   * Reject account deletion (Admin)
   */
  rejectAccountDeletion = async (req, res) => {
    return responseWrapper.notImplemented(
      res,
      "Hesap silme reddetme özelliği henüz aktif değil"
    );
  };

  /**
   * Activate membership
   */
  activateMembership = async (req, res) => {
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

      return responseWrapper.success(
        res,
        {
          membershipPlan: user.membershipPlan,
          membershipStatus: user.membershipStatus,
          expiresAt: user.membershipExpiresAt,
        },
        "Üyelik aktifleştirildi"
      );
    } catch (error) {
      console.error("Activate membership error:", error);
      return responseWrapper.error(res, "Üyelik aktifleştirilemedi");
    }
  };
  approveAccountDeletion = async (req, res) => {
    try {
      const { requestId } = req.params;

      const deletionRequest = await AccountDeletionRequest.findById(
        requestId
      ).populate("user");
      if (!deletionRequest) {
        return responseWrapper.notFound(res, "Silme talebi bulunamadı");
      }

      deletionRequest.status = "approved";
      deletionRequest.approvedBy = req.user.id;
      deletionRequest.approvedAt = new Date();
      await deletionRequest.save();

      return responseWrapper.success(res, null, "Hesap silme talebi onaylandı");
    } catch (error) {
      console.error("Approve account deletion error:", error);
      return responseWrapper.error(res, "Onaylama sırasında hata oluştu");
    }
  };

  /**
   * REJECT ACCOUNT DELETION - Hesap silme reddi (Admin)
   */
  rejectAccountDeletion = async (req, res) => {
    try {
      const { requestId } = req.params;
      const { reason } = req.body;

      const deletionRequest = await AccountDeletionRequest.findById(
        requestId
      ).populate("user");
      if (!deletionRequest) {
        return responseWrapper.notFound(res, "Silme talebi bulunamadı");
      }

      deletionRequest.status = "rejected";
      deletionRequest.rejectedBy = req.user.id;
      deletionRequest.rejectedAt = new Date();
      deletionRequest.rejectionReason = reason;
      await deletionRequest.save();

      // Kullanıcı durumunu normale çevir
      const user = deletionRequest.user;
      user.accountStatus = "active";
      await user.save();

      return responseWrapper.success(
        res,
        null,
        "Hesap silme talebi reddedildi"
      );
    } catch (error) {
      console.error("Reject account deletion error:", error);
      return responseWrapper.error(res, "Reddetme sırasında hata oluştu");
    }
  };
  /**
   * GET PENDING KYC USERS - KYC onayı bekleyen kullanıcıları getir (Admin)
   * Pagination, sıralama ve filtreleme destekler
   */
  getPendingKycUsers = async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        search = "",
        country,
        role,
      } = req.query;

      // Temel filtre
      const filter = {
        kycStatus: "Pending",
        emailVerified: true,
      };

      // Opsiyonel filtreler
      if (search) {
        filter.$or = [
          { email: { $regex: search, $options: "i" } },
          { fullName: { $regex: search, $options: "i" } },
        ];
      }

      if (country) {
        filter.country = country;
      }

      if (role && ["investor", "property_owner"].includes(role)) {
        filter.role = role;
      }

      // Pagination ayarları
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

      // Kullanıcıları getir
      const users = await User.find(filter)
        .select(
          "fullName email role country kycStatus createdAt membershipPlan phoneNumber"
        )
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      // Toplam sayı
      const total = await User.countDocuments(filter);

      return responseWrapper.success(res, {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1,
        },
      });
    } catch (error) {
      console.error("Get pending KYC users error:", error);
      return responseWrapper.error(res, "KYC bekleyen kullanıcılar alınamadı");
    }
  };

  /**
   * GET PENDING KYC USER BY ID - ID'ye göre KYC bekleyen kullanıcı detayı (Admin)
   */
  getPendingKycUserById = async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await User.findOne({
        _id: userId,
        kycStatus: "Pending",
      }).select("-password");

      if (!user) {
        return responseWrapper.notFound(
          res,
          "KYC bekleyen kullanıcı bulunamadı"
        );
      }

      // Role'e göre detaylı bilgileri getir
      let detailedUser = user.toObject();

      if (user.role === "investor") {
        const Investor = require("../models/Investor");
        const investor = await Investor.findById(userId).populate(
          "investments",
          "propertyId amount status createdAt"
        );

        detailedUser.investorDetails = {
          investments: investor.investments,
          totalInvested: investor.totalInvested,
          activeInvestmentCount: investor.activeInvestmentCount,
          investmentLimit: investor.investmentLimit,
        };
      } else if (user.role === "property_owner") {
        const PropertyOwner = require("../models/PropertyOwner");
        const Property = require("../models/Property");

        const owner = await PropertyOwner.findById(userId);
        const properties = await Property.find({ owner: userId }).select(
          "title location totalValue status"
        );

        detailedUser.ownerDetails = {
          properties,
          totalProperties: owner.totalProperties,
          activeProperties: owner.activeProperties,
          ownerTrustScore: owner.ownerTrustScore,
        };
      }

      return responseWrapper.success(res, detailedUser);
    } catch (error) {
      console.error("Get pending KYC user by ID error:", error);
      return responseWrapper.error(res, "Kullanıcı detayları alınamadı");
    }
  };

  revokeSession = async (req, res) => {
    return responseWrapper.success(
      res,
      null,
      "Oturum iptal özelliği henüz aktif değil"
    );
  };
  async invalidateAllUserSessions(
    userId,
    reason = "security_action",
    excludeCurrentToken = null
  ) {
    try {
      // Tüm refresh ve access token'ları sil
      const deleteQuery = {
        user: userId,
        type: { $in: ["refresh", "access"] },
      };

      // Mevcut token'ı hariç tut (opsiyonel)
      if (excludeCurrentToken) {
        const hashedToken = crypto
          .createHash("sha256")
          .update(excludeCurrentToken)
          .digest("hex");
        deleteQuery.token = { $ne: hashedToken };
      }

      const result = await Token.deleteMany(deleteQuery);

      // Activity log
      await ActivityLog.create({
        user: userId,
        action: "sessions_invalidated",
        details: {
          reason,
          sessionsRevoked: result.deletedCount,
        },
        severity: "high",
      });

      return result.deletedCount;
    } catch (error) {
      console.error("Invalidate sessions error:", error);
      throw error;
    }
  }
}

module.exports = new AuthController();
