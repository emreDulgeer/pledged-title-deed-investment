// server/middlewares/rateLimiter.js

const rateLimit = require("express-rate-limit");
const responseWrapper = require("../utils/responseWrapper");

/**
 * Create rate limiter - Development'ta memory store kullan
 */
function createRateLimiter(options) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message:
      options.message ||
      "Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin.",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      if (responseWrapper) {
        responseWrapper.tooManyRequests(res, options.message);
      } else {
        res.status(429).json({
          success: false,
          message: options.message,
        });
      }
    },
    skip: (req) => {
      // Skip rate limiting for admin users
      return req.user && req.user.role === "admin";
    },
  });
}

// Different rate limiters for different endpoints
const rateLimiters = {
  // Very strict - for sensitive operations
  strict: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: "Bu işlem için saatlik limit aşıldı",
  }),

  // Moderate - for auth operations
  moderate: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: "Çok fazla giriş denemesi, 15 dakika sonra tekrar deneyin",
  }),

  // Light - for general API calls
  light: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    message: "API kullanım limiti aşıldı",
  }),

  // Custom creator for specific needs
  custom: (windowMs, max, message) =>
    createRateLimiter({ windowMs, max, message }),
};

module.exports = rateLimiters;
