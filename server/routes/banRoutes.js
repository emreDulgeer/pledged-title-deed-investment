// server/routes/banRoutes.js

const express = require("express");
const router = express.Router();
const banController = require("../controllers/banController");
const { auth, authorize } = require("../middlewares/authMiddleware");
const { body, param, query } = require("express-validator");
const { validateRequest } = require("../utils/validator");
const rateLimiter = require("../middlewares/rateLimiter");

// ==================== BAN MANAGEMENT (Admin Only) ====================

/**
 * POST /api/bans/user/:userId
 * Kullanıcıyı banla (Admin)
 */
router.post(
  "/user/:userId",
  auth,
  authorize(["admin"]),
  rateLimiter.strict,
  [
    param("userId").isMongoId(),
    body("banType").isIn(["permanent", "temporary"]),
    body("reason").notEmpty().trim().isLength({ min: 10, max: 1000 }),
    body("category").isIn([
      "spam",
      "harassment",
      "fraud",
      "inappropriate_content",
      "violation_of_terms",
      "security_threat",
      "payment_issues",
      "other",
    ]),
    body("expiresAt").optional().isISO8601(),
    body("adminNotes").optional().trim().isLength({ max: 2000 }),
    body("relatedReport").optional().isMongoId(),
  ],
  validateRequest,
  banController.banUser
);

/**
 * POST /api/bans/user/:userId/lift
 * Banı kaldır (Admin)
 */
router.post(
  "/user/:userId/lift",
  auth,
  authorize(["admin"]),
  rateLimiter.strict,
  [
    param("userId").isMongoId(),
    body("reason").notEmpty().trim().isLength({ min: 10, max: 500 }),
  ],
  validateRequest,
  banController.unbanUser
);

/**
 * GET /api/bans
 * Tüm banları getir (Admin)
 */
router.get(
  "/",
  auth,
  authorize(["admin"]),
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("sortBy").optional().isString(),
    query("sortOrder").optional().isIn(["asc", "desc"]),
    query("status").optional().isIn(["active", "expired", "lifted"]),
    query("banType").optional().isIn(["permanent", "temporary"]),
    query("category").optional().isString(),
    query("userId").optional().isMongoId(),
  ],
  validateRequest,
  banController.getAllBans
);

/**
 * GET /api/bans/statistics
 * Ban istatistikleri (Admin)
 */
router.get(
  "/statistics",
  auth,
  authorize(["admin"]),
  banController.getBanStatistics
);

/**
 * GET /api/bans/:banId
 * Ban detayı getir (Admin)
 */
router.get(
  "/:banId",
  auth,
  authorize(["admin"]),
  [param("banId").isMongoId()],
  validateRequest,
  banController.getBanById
);

/**
 * GET /api/bans/user/:userId/history
 * Kullanıcının ban geçmişi
 */
router.get(
  "/user/:userId/history",
  auth,
  [param("userId").isMongoId()],
  validateRequest,
  banController.getUserBanHistory
);

/**
 * GET /api/bans/user/:userId/status
 * Kullanıcının ban durumunu kontrol et
 */
router.get(
  "/user/:userId/status",
  auth,
  [param("userId").isMongoId()],
  validateRequest,
  banController.checkBanStatus
);

module.exports = router;
