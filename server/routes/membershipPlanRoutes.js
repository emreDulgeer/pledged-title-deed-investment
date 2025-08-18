// server/routes/membershipPlanRoutes.js

const express = require("express");
const router = express.Router();
const membershipPlanController = require("../controllers/membershipPlanController");
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const rateLimiter = require("../middlewares/rateLimiter");

// ==================== PUBLIC ROUTES ====================

/**
 * @route   GET /api/membership-plans
 * @desc    Görünür planları getir
 * @access  Public
 */
router.get("/", membershipPlanController.getPublicPlans);

/**
 * @route   GET /api/membership-plans/featured
 * @desc    Öne çıkan planları getir
 * @access  Public
 */
router.get("/featured", membershipPlanController.getFeaturedPlans);

/**
 * @route   GET /api/membership-plans/trial
 * @desc    Deneme süresi olan planları getir
 * @access  Public
 */
router.get("/trial", membershipPlanController.getTrialPlans);

/**
 * @route   GET /api/membership-plans/by-feature
 * @desc    Özelliğe göre planları filtrele
 * @access  Public
 * @query   feature: string, value: any
 */
router.get("/by-feature", membershipPlanController.getPlansByFeature);

/**
 * @route   GET /api/membership-plans/:id
 * @desc    Plan detayını getir
 * @access  Public
 */
router.get("/:id", membershipPlanController.getPlanById);

/**
 * @route   POST /api/membership-plans/compare
 * @desc    Planları karşılaştır
 * @access  Public
 * @body    { planIds: string[] }
 */
router.post(
  "/compare",
  rateLimiter.moderate, // 1 dakikada 20 istek
  membershipPlanController.comparePlans
);

/**
 * @route   POST /api/membership-plans/:id/calculate-price
 * @desc    Plan fiyatını hesapla (promosyon dahil)
 * @access  Public
 * @body    { interval: "monthly"|"yearly", promoCode?: string }
 */
router.post(
  "/:id/calculate-price",
  rateLimiter.moderate,
  membershipPlanController.calculatePrice
);

// ==================== authD ROUTES ====================

/**
 * @route   GET /api/membership-plans/recommendations
 * @desc    Kullanıcı için upgrade önerileri
 * @access  Private
 */
router.get(
  "/recommendations",
  auth,
  membershipPlanController.getUpgradeRecommendations
);

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/membership-plans/admin/all
 * @desc    Tüm planları getir (inaktif dahil)
 * @access  Admin
 * @query   includeInactive: boolean
 */
router.get(
  "/admin/all",
  auth,
  authorize(["admin"]),
  membershipPlanController.getAllPlans
);

/**
 * @route   POST /api/membership-plans/admin/create
 * @desc    Yeni plan oluştur
 * @access  Admin
 */
router.post(
  "/admin/create",
  auth,
  authorize(["admin"]),
  membershipPlanController.createPlan
);

/**
 * @route   PUT /api/membership-plans/admin/:id
 * @desc    Plan güncelle
 * @access  Admin
 */
router.put(
  "/admin/:id",
  auth,
  authorize(["admin"]),
  membershipPlanController.updatePlan
);

/**
 * @route   DELETE /api/membership-plans/admin/:id
 * @desc    Plan sil (soft delete)
 * @access  Admin
 */
router.delete(
  "/admin/:id",
  auth,
  authorize(["admin"]),
  membershipPlanController.deletePlan
);

/**
 * @route   PATCH /api/membership-plans/admin/:id/features
 * @desc    Plan özelliklerini güncelle
 * @access  Admin
 * @body    { features: object }
 */
router.patch(
  "/admin/:id/features",
  auth,
  authorize(["admin"]),
  membershipPlanController.updatePlanFeatures
);

/**
 * @route   PATCH /api/membership-plans/admin/:id/pricing
 * @desc    Plan fiyatlandırmasını güncelle
 * @access  Admin
 * @body    { pricing: object }
 */
router.patch(
  "/admin/:id/pricing",
  auth,
  authorize(["admin"]),
  membershipPlanController.updatePlanPricing
);

/**
 * @route   POST /api/membership-plans/admin/:id/promotion
 * @desc    Promosyon ekle/güncelle
 * @access  Admin
 * @body    { code, discountPercentage, validUntil, maxUses }
 */
router.post(
  "/admin/:id/promotion",
  auth,
  authorize(["admin"]),
  membershipPlanController.updatePromotion
);

/**
 * @route   PUT /api/membership-plans/admin/order
 * @desc    Plan sıralamasını güncelle
 * @access  Admin
 * @body    { orders: [{ planId, order }] }
 */
router.put(
  "/admin/order",
  auth,
  authorize(["admin"]),
  membershipPlanController.updatePlanOrder
);

/**
 * @route   GET /api/membership-plans/admin/:id/statistics
 * @desc    Plan istatistiklerini getir
 * @access  Admin
 * @query   startDate?: date, endDate?: date
 */
router.get(
  "/admin/:id/statistics",
  auth,
  authorize(["admin"]),
  membershipPlanController.getPlanStatistics
);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error("MembershipPlan Route Error:", err);
  return res.status(500).json({
    success: false,
    message: "Bir hata oluştu",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

module.exports = router;
