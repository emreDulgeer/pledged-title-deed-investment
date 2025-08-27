// server/middlewares/rateLimiter.js

const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = rateLimit;

// Light limiter - Genel API istekleri için
const light = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dakika
  max: 100, // 100 istek
  message: {
    success: false,
    message: "Çok fazla istek gönderdiniz, lütfen biraz bekleyin",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate limiter - Orta seviye işlemler için
const moderate = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dakika
  max: 50, // 50 istek
  message: {
    success: false,
    message: "İstek limiti aşıldı, lütfen 1 dakika bekleyin",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter - Hassas işlemler için (login, register, vb.)
const strict = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // 5 istek
  message: {
    success: false,
    message: "Çok fazla deneme yaptınız, lütfen 15 dakika bekleyin",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Başarılı istekleri sayma
});

// ===== YENİ: Dosya işlemleri için özel limiter'lar =====

// Upload limiter - Dosya yükleme için
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 50, // Dakikada 10 yükleme
  message: {
    success: false,
    message: "Çok fazla dosya yükleme isteği. Lütfen 1 dakika bekleyin",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req);
    const userId = req.user?._id || req.user?.id || "anonymous";
    return `${req.ip}_${userId}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Dosya yükleme limiti aşıldı. Lütfen 1 dakika bekleyin",
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Download limiter - Dosya indirme için
const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // Dakikada 30 indirme
  message: {
    success: false,
    message: "Çok fazla indirme isteği. Lütfen biraz bekleyin",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Heavy operation limiter - Ağır işlemler için
const heavyOperation = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 10, // Saatte 10 işlem
  message: {
    success: false,
    message: "Bu işlem için saatlik limit aşıldı",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset limiter
const passwordReset = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 3, // Saatte 3 deneme
  message: {
    success: false,
    message: "Çok fazla şifre sıfırlama isteği",
  },
  skipSuccessfulRequests: true,
});

// Email verification limiter
const emailVerification = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 5, // Saatte 5 deneme
  message: {
    success: false,
    message: "Çok fazla email doğrulama isteği",
  },
});

// Dynamic rate limiter creator - Özel durumlar için
const createCustomLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || {
      success: false,
      message: "Rate limit exceeded",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Kullanıcı rolüne göre dinamik limit
const dynamicRoleLimiter = (req, res, next) => {
  const role = req.user?.role;
  let limiter;

  switch (role) {
    case "admin":
      // Admin'ler için yüksek limit
      limiter = createCustomLimiter({
        windowMs: 1 * 60 * 1000,
        max: 1000,
      });
      break;
    case "property_owner":
    case "investor":
      // Normal kullanıcılar için orta limit
      limiter = createCustomLimiter({
        windowMs: 1 * 60 * 1000,
        max: 200,
      });
      break;
    default:
      // Misafirler için düşük limit
      limiter = createCustomLimiter({
        windowMs: 1 * 60 * 1000,
        max: 50,
      });
  }

  return limiter(req, res, next);
};

module.exports = {
  light,
  moderate,
  strict,
  uploadLimiter,
  downloadLimiter,
  heavyOperation,
  passwordReset,
  emailVerification,
  createCustomLimiter,
  dynamicRoleLimiter,
};
