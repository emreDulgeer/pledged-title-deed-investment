// server/routes/reportRoutes.js

const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { auth, authorize } = require("../middlewares/authMiddleware");
const { body, param, query } = require("express-validator");
const { validateRequest } = require("../utils/validator");
const rateLimiter = require("../middlewares/rateLimiter");

// ==================== REPORT MANAGEMENT ====================

/**
 * POST /api/reports/user/:userId
 * Kullanıcıyı rapor et (Herhangi bir kullanıcı)
 */
router.post(
  "/user/:userId",
  auth,
  rateLimiter.moderate,
  [
    param("userId").isMongoId(),
    body("category").isIn([
      "spam",
      "harassment",
      "fraud",
      "inappropriate_content",
      "fake_listing",
      "scam",
      "impersonation",
      "other",
    ]),
    body("description").notEmpty().trim().isLength({ min: 20, max: 2000 }),
    body("relatedContent").optional().isObject(),
    body("relatedContent.type")
      .optional()
      .isIn(["property", "investment", "message", "profile", "other"]),
    body("relatedContent.id").optional().isMongoId(),
    body("relatedContent.url").optional().isURL(),
    body("evidence").optional().isArray(),
  ],
  validateRequest,
  reportController.reportUser
);

/**
 * GET /api/reports
 * Tüm raporları getir (Admin)
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
    query("status")
      .optional()
      .isIn([
        "pending",
        "under_review",
        "resolved",
        "dismissed",
        "action_taken",
      ]),
    query("priority").optional().isIn(["low", "medium", "high", "urgent"]),
    query("category").optional().isString(),
    query("reporterId").optional().isMongoId(),
    query("reportedUserId").optional().isMongoId(),
  ],
  validateRequest,
  reportController.getAllReports
);

/**
 * GET /api/reports/statistics
 * Report istatistikleri (Admin)
 */
router.get(
  "/statistics",
  auth,
  authorize(["admin"]),
  reportController.getReportStatistics
);

/**
 * GET /api/reports/:reportId
 * Rapor detayı getir (Admin)
 */
router.get(
  "/:reportId",
  auth,
  authorize(["admin"]),
  [param("reportId").isMongoId()],
  validateRequest,
  reportController.getReportById
);

/**
 * POST /api/reports/:reportId/resolve
 * Raporu çöz (Admin)
 */
router.post(
  "/:reportId/resolve",
  auth,
  authorize(["admin"]),
  rateLimiter.strict,
  [
    param("reportId").isMongoId(),
    body("decision").notEmpty().trim(),
    body("actionTaken").isIn([
      "warning_sent",
      "user_banned",
      "content_removed",
      "no_action",
      "other",
    ]),
    body("internalNotes").optional().trim(),
    body("shouldBan").optional().isBoolean(),
    body("banType").optional().isIn(["permanent", "temporary"]),
    body("banReason").optional().trim(),
    body("banExpiresAt").optional().isISO8601(),
  ],
  validateRequest,
  reportController.resolveReport
);

/**
 * POST /api/reports/:reportId/dismiss
 * Raporu reddet (Admin)
 */
router.post(
  "/:reportId/dismiss",
  auth,
  authorize(["admin"]),
  rateLimiter.strict,
  [
    param("reportId").isMongoId(),
    body("reason").notEmpty().trim().isLength({ min: 10, max: 500 }),
  ],
  validateRequest,
  reportController.dismissReport
);

/**
 * POST /api/reports/:reportId/review
 * Raporu incelemeye al (Admin)
 */
router.post(
  "/:reportId/review",
  auth,
  authorize(["admin"]),
  [param("reportId").isMongoId()],
  validateRequest,
  reportController.reviewReport
);

/**
 * GET /api/reports/user/:userId
 * Kullanıcı hakkındaki raporları getir (Admin)
 */
router.get(
  "/user/:userId",
  auth,
  authorize(["admin"]),
  [
    param("userId").isMongoId(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  reportController.getReportsForUser
);

/**
 * GET /api/reports/by-user/:userId
 * Kullanıcının yaptığı raporları getir (Admin veya kendisi)
 */
router.get(
  "/by-user/:userId",
  auth,
  [
    param("userId").isMongoId(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  reportController.getReportsByUser
);

module.exports = router;
