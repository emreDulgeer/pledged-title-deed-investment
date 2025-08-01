const router = require("express").Router();
const notificationController = require("../controllers/notificationController");
const fakeAuth = require("../middlewares/fakeAuth");

// User routes (tüm giriş yapmış kullanıcılar)
router.get(
  "/my",
  fakeAuth("investor"),
  notificationController.getMyNotifications
);

router.get(
  "/my/unread-count",
  fakeAuth("investor"),
  notificationController.getUnreadCount
);

router.patch(
  "/:id/read",
  fakeAuth("investor"),
  notificationController.markAsRead
);

router.patch(
  "/mark-all-read",
  fakeAuth("investor"),
  notificationController.markAllAsRead
);

// Admin routes
router.post(
  "/bulk",
  fakeAuth("admin"),
  notificationController.sendBulkNotification
);

router.post(
  "/system",
  fakeAuth("admin"),
  notificationController.sendSystemNotification
);

module.exports = router;
