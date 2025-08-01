// server/routes/investmentRoutes.js

const router = require("express").Router();
const investmentController = require("../controllers/investmentController");
const fakeAuth = require("../middlewares/fakeAuth");

// Public routes - Yok (tüm investment işlemleri auth gerektirir)

// Investor routes
router.post(
  "/property/:propertyId/offer",
  fakeAuth("investor"),
  investmentController.createInvestmentOffer
);

router.get("/my", fakeAuth("investor"), investmentController.getMyInvestments);

// Property Owner routes
router.post(
  "/:id/accept",
  fakeAuth("property_owner"),
  investmentController.acceptOffer
);

router.post(
  "/:id/reject",
  fakeAuth("property_owner"),
  investmentController.rejectOffer
);

router.post(
  "/:id/payment",
  fakeAuth("property_owner"),
  investmentController.makeRentalPayment
);

router.get(
  "/property/:propertyId",
  fakeAuth(["property_owner", "admin"]),
  investmentController.getPropertyInvestments
);

// Shared routes (Investor & Property Owner)
router.post(
  "/:id/contract",
  fakeAuth(["investor", "property_owner", "admin"]),
  investmentController.uploadContract
);

router.get(
  "/:id",
  fakeAuth(["investor", "property_owner", "admin", "local_representative"]),
  investmentController.getInvestmentById
);

// Property Owner & Local Representative routes
router.post(
  "/:id/title-deed",
  fakeAuth(["property_owner", "local_representative", "admin"]),
  investmentController.uploadTitleDeed
);

// Admin routes
router.get("/", fakeAuth("admin"), investmentController.getAllInvestments);

router.post(
  "/:id/assign-representative",
  fakeAuth("admin"),
  investmentController.assignLocalRepresentative
);

router.post(
  "/:id/refund",
  fakeAuth(["property_owner", "admin"]),
  investmentController.processRefund
);

router.post(
  "/:id/transfer",
  fakeAuth("admin"),
  investmentController.transferProperty
);

// Rental payment endpoints
router.get(
  "/rental-payments/owner",
  fakeAuth("property_owner"),
  investmentController.getPropertyOwnerRentalPayments
);

router.get(
  "/rental-payments/investor",
  fakeAuth("investor"),
  investmentController.getInvestorRentalPayments
);

// Representative request endpoint
router.post(
  "/:id/request-representative",
  fakeAuth(["investor", "property_owner"]),
  investmentController.requestLocalRepresentative
);

// Reports
router.get(
  "/reports/upcoming-payments",
  fakeAuth(["admin", "local_representative"]),
  investmentController.getUpcomingPayments
);

router.get(
  "/reports/delayed-payments",
  fakeAuth(["admin", "local_representative"]),
  investmentController.getDelayedPayments
);

router.get(
  "/:id/statistics",
  fakeAuth(["admin", "property_owner", "investor"]),
  investmentController.getInvestmentStatistics
);

module.exports = router;
