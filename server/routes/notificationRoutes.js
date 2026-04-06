const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const validateRequest = require("../middlewares/validateRequest");
const { body, param, query } = require("express-validator");

// ===== Kullanıcı Bildirimleri =====

// Kullanıcının bildirimlerini getir
router.get(
  "/my-notifications",
  auth,
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Sayfa numarası geçerli değil"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit geçerli değil"),
    query("type")
      .optional()
      .isIn([
        "kyc_pending",
        "kyc_approved",
        "kyc_rejected",
        "property_pending",
        "property_approved",
        "property_rejected",
        "investment_created",
        "payment_received",
        "document_uploaded",
        "message_received",
        "system_announcement",
        "custom",
      ])
      .withMessage("Geçersiz bildirim tipi"),
    query("isRead")
      .optional()
      .isIn(["true", "false"])
      .withMessage("isRead true veya false olmalı"),
    query("priority")
      .optional()
      .isIn(["low", "normal", "high", "critical"])
      .withMessage("Geçersiz öncelik seviyesi"),
  ],
  validateRequest,
  notificationController.getMyNotifications
);

// Okunmamış bildirim sayısını getir
router.get("/unread-count", auth, notificationController.getUnreadCount);

// Bildirimi okundu olarak işaretle
router.patch(
  "/:notificationId/read",
  auth,
  [param("notificationId").isMongoId().withMessage("Geçersiz bildirim ID")],
  validateRequest,
  notificationController.markAsRead
);

// Tüm bildirimleri okundu olarak işaretle
router.patch("/mark-all-read", auth, notificationController.markAllAsRead);

// Bildirimi sil
router.delete(
  "/:notificationId",
  auth,
  [param("notificationId").isMongoId().withMessage("Geçersiz bildirim ID")],
  validateRequest,
  notificationController.deleteNotification
);

// Birden fazla bildirimi sil
router.delete(
  "/bulk/delete",
  auth,
  [
    body("notificationIds")
      .isArray({ min: 1 })
      .withMessage("En az bir bildirim ID gerekli"),
    body("notificationIds.*").isMongoId().withMessage("Geçersiz bildirim ID"),
  ],
  validateRequest,
  notificationController.deleteMultipleNotifications
);

// ===== Admin İşlemleri =====

// Toplu bildirim gönder
router.post(
  "/admin/bulk",
  auth,
  authorize("admin"),
  [
    body("title").notEmpty().withMessage("Başlık zorunlu"),
    body("message").notEmpty().withMessage("Mesaj zorunlu"),
    body("type")
      .optional()
      .isIn(["system_announcement", "custom"])
      .withMessage("Geçersiz bildirim tipi"),
    body("priority")
      .optional()
      .isIn(["low", "normal", "high", "critical"])
      .withMessage("Geçersiz öncelik"),
    body("channels").optional().isObject().withMessage("Kanallar obje olmalı"),
    body("recipientFilter")
      .optional()
      .isObject()
      .withMessage("Alıcı filtresi obje olmalı"),
  ],
  validateRequest,
  notificationController.sendBulkNotification
);

// Belirli bir kullanıcıya bildirim gönder
router.post(
  "/admin/user/:userId",
  auth,
  authorize("admin"),
  [
    param("userId").isMongoId().withMessage("Geçersiz kullanıcı ID"),
    body("title").notEmpty().withMessage("Başlık zorunlu"),
    body("message").notEmpty().withMessage("Mesaj zorunlu"),
    body("type")
      .optional()
      .isIn([
        "kyc_pending",
        "kyc_approved",
        "kyc_rejected",
        "property_pending",
        "property_approved",
        "property_rejected",
        "investment_created",
        "payment_received",
        "document_uploaded",
        "message_received",
        "system_announcement",
        "custom",
      ])
      .withMessage("Geçersiz bildirim tipi"),
    body("priority")
      .optional()
      .isIn(["low", "normal", "high", "critical"])
      .withMessage("Geçersiz öncelik"),
    body("actions").optional().isArray().withMessage("Aksiyonlar dizi olmalı"),
    body("channels").optional().isObject().withMessage("Kanallar obje olmalı"),
  ],
  validateRequest,
  notificationController.sendNotificationToUser
);

// Bildirim istatistiklerini getir
router.get(
  "/admin/stats",
  auth,
  authorize("admin"),
  notificationController.getNotificationStats
);

// Eski bildirimleri temizle
router.post(
  "/admin/cleanup",
  auth,
  authorize("admin"),
  [
    body("daysOld")
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage("Gün sayısı 1-365 arasında olmalı"),
  ],
  validateRequest,
  notificationController.cleanupOldNotifications
);

module.exports = router;
