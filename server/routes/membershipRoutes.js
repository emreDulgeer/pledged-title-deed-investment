// server/routes/membershipRoutes.js

const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const membershipController = require("../controllers/membershipController");
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const validateRequest = require("../middlewares/validateRequest");
const rateLimiter = require("../middlewares/rateLimiter");

// ==================== PUBLIC ROUTES ====================

// Planları listele (herkes görebilir)
router.get("/plans", membershipController.getPlans);

// ==================== USER ROUTES (Auth Required) ====================

// Mevcut üyelik durumu
router.get("/status", auth, membershipController.getStatus);

router.post(
  "/change-plan",
  auth,
  rateLimiter.moderate,
  [body("planId").isMongoId().withMessage("Geçerli plan ID gerekli")],
  validateRequest,
  membershipController.changePlanNow
);

// Üyeliği iptal et (Basic plana geç)
router.post(
  "/cancel",
  auth,
  rateLimiter.strict,
  [
    body("reason")
      .optional()
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage("İptal nedeni 10-500 karakter arasında olmalı"),
  ],
  validateRequest,
  membershipController.cancel
);

router.post(
  "/activate",
  auth,
  rateLimiter.strict,
  [
    body("userId").isMongoId().withMessage("Geçerli kullanıcı ID gerekli"),
    body("planId").isMongoId().withMessage("Geçerli plan ID gerekli"),
  ],
  validateRequest,
  membershipController.activateNow
);

// Admin: Üyelik süresini uzat
router.post(
  "/admin/extend",
  auth,
  authorize(["admin"]),
  rateLimiter.strict,
  [
    body("userId").isMongoId().withMessage("Geçerli kullanıcı ID gerekli"),
    body("days")
      .isInt({ min: 1, max: 365 })
      .withMessage("Gün sayısı 1-365 arasında olmalı"),
    body("reason")
      .optional()
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage("Neden 10-500 karakter arasında olmalı"),
  ],
  validateRequest,
  membershipController.extendMembership
);

// Admin: Üyelik istatistikleri
router.get(
  "/admin/statistics",
  auth,
  authorize(["admin"]),
  membershipController.getStatistics
);

module.exports = router;
