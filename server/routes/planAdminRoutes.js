// server/routes/planAdminRoutes.js

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const planAdminController = require("../controllers/planAdminController");
const auth = require("../../middlewares/auth");
const authorize = require("../../middlewares/authorize");
const validateRequest = require("../../middlewares/validateRequest");
const rateLimiter = require("../../middlewares/rateLimiter");

// Tüm route'lar admin yetkisi gerektirir
router.use(auth);
router.use(authorize(["admin"]));

// ==================== PLAN YÖNETİMİ ====================

// Tüm planları listele
router.get(
  "/",
  [
    query("includeInactive").optional().isBoolean(),
    query("includeStats").optional().isBoolean(),
  ],
  validateRequest,
  planAdminController.getAllPlans
);

// Yeni plan oluştur
// Yeni plan oluştur
router.post(
  "/",
  rateLimiter.strict,
  [
    body("name")
      .trim()
      .isLength({ min: 2, max: 50 })
      .matches(/^[a-z0-9_]+$/)
      .withMessage("Plan adı küçük harf, sayı ve _ içerebilir"),
    body("displayName").trim().isLength({ min: 2, max: 100 }),
    body("description").trim().isLength({ min: 10, max: 500 }),

    // >>> EKLE: tier zorunlu ve >=1
    body("tier")
      .isInt({ min: 1 })
      .withMessage("tier sayısal ve en az 1 olmalı"),

    body("order").optional().isInt({ min: 0 }),
    body("pricing.monthly.amount")
      .isFloat({ min: 0 })
      .withMessage("Aylık fiyat 0 veya daha büyük olmalı"),
    body("pricing.yearly.amount")
      .isFloat({ min: 0 })
      .withMessage("Yıllık fiyat 0 veya daha büyük olmalı"),
    body("features.investments.maxActiveInvestments")
      .isInt({ min: -1 })
      .withMessage("-1 (sınırsız) veya pozitif sayı olmalı"),
  ],
  validateRequest,
  planAdminController.createPlan
);

// Plan güncelle
router.put(
  "/:planId",
  rateLimiter.strict,
  [
    param("planId").isMongoId(),
    body("displayName").optional().trim().isLength({ min: 2, max: 100 }),
    body("description").optional().trim().isLength({ min: 10, max: 500 }),
    body("pricing.monthly.amount").optional().isFloat({ min: 0 }),
    body("pricing.yearly.amount").optional().isFloat({ min: 0 }),
    body("features").optional().isObject(),
    body("isActive").optional().isBoolean(),
    body("isVisible").optional().isBoolean(),
    body("isHighlighted").optional().isBoolean(),
  ],
  validateRequest,
  planAdminController.updatePlan
);

// Plan sil (soft delete)
router.delete(
  "/:planId",
  rateLimiter.strict,
  [param("planId").isMongoId()],
  validateRequest,
  planAdminController.deletePlan
);

// Plan kopyala
router.post(
  "/:planId/clone",
  rateLimiter.strict,
  [
    param("planId").isMongoId(),
    body("name")
      .trim()
      .isLength({ min: 2, max: 50 })
      .matches(/^[a-z0-9_]+$/),
    body("displayName").trim().isLength({ min: 2, max: 100 }),
  ],
  validateRequest,
  planAdminController.clonePlan
);

// ==================== PLAN ÖZELLİKLERİ ====================

// Plan özelliklerini toplu güncelle
router.patch(
  "/:planId/features",
  rateLimiter.strict,
  [param("planId").isMongoId(), body("features").isObject()],
  validateRequest,
  planAdminController.bulkUpdateFeatures
);

// Plan sıralamasını güncelle
router.put(
  "/order",
  rateLimiter.moderate,
  [
    body("plans").isArray(),
    body("plans.*.planId").isMongoId(),
    body("plans.*.order").isInt({ min: 0 }),
  ],
  validateRequest,
  planAdminController.updatePlanOrder
);

// ==================== PROMOSYON YÖNETİMİ ====================

// Plan promosyonu oluştur/güncelle
router.put(
  "/:planId/promotion",
  rateLimiter.strict,
  [
    param("planId").isMongoId(),
    body("hasPromotion").isBoolean(),
    body("promotionType")
      .optional()
      .isIn(["percentage", "fixed", "trial_extension"]),
    body("promotionValue").optional().isFloat({ min: 0 }),
    body("promotionCode")
      .optional()
      .trim()
      .isLength({ min: 4, max: 20 })
      .isAlphanumeric(),
    body("promotionStartDate").optional().isISO8601(),
    body("promotionEndDate").optional().isISO8601(),
    body("promotionMaxUses").optional().isInt({ min: -1 }),
  ],
  validateRequest,
  planAdminController.managePlanPromotion
);

// ==================== KULLANICI YÖNETİMİ ====================

// Kullanıcıları başka plana taşı
router.post(
  "/migrate-users",
  rateLimiter.strict,
  [
    body("sourcePlanId").isMongoId(),
    body("targetPlanId").isMongoId(),
    body("userIds").optional().isArray(),
    body("userIds.*").optional().isMongoId(),
  ],
  validateRequest,
  planAdminController.migratePlanUsers
);

// ==================== ANALİTİK VE RAPORLAMA ====================

// Plan karşılaştırması
router.get(
  "/compare",
  [
    query("planIds")
      .notEmpty()
      .withMessage("Plan ID'leri gerekli (virgülle ayrılmış)"),
  ],
  validateRequest,
  planAdminController.comparePlans
);

// Plan istatistikleri
router.get(
  "/:planId/statistics",
  [
    param("planId").isMongoId(),
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
  ],
  validateRequest,
  planAdminController.getPlanStatistics
);

module.exports = router;
