// server/routes/investmentRoutes.js

const router = require("express").Router();
const investmentController = require("../controllers/investmentController");
const investmentFileController = require("../controllers/investmentFileController");
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");

// ===== INVESTOR ROUTES =====

// Yatırım teklifi gönder
router.post(
  "/property/:propertyId/offer",
  auth,
  authorize(["investor"]),
  investmentController.createInvestmentOffer
);

// Investor'ın yatırımlarını listele
router.get(
  "/my",
  auth,
  authorize(["investor"]),
  investmentController.getMyInvestments
);

// Investor'ın kira gelirlerini listele
router.get(
  "/rental-payments/investor",
  auth,
  authorize(["investor"]),
  investmentController.getInvestorRentalPayments
);

// ===== PROPERTY OWNER ROUTES =====

// Teklifi kabul et
router.post(
  "/:id/accept",
  auth,
  authorize(["property_owner"]),
  investmentController.acceptOffer
);

// Teklifi reddet
router.post(
  "/:id/reject",
  auth,
  authorize(["property_owner"]),
  investmentController.rejectOffer
);

// Kira ödemesi kaydet
router.post(
  "/:id/payment",
  auth,
  authorize(["property_owner"]),
  investmentController.makeRentalPayment
);

// Property'ye ait yatırımları listele
router.get(
  "/property/:propertyId",
  auth,
  authorize(["property_owner", "admin"]),
  investmentController.getPropertyInvestments
);

// Property Owner'ın kira ödemelerini listele
router.get(
  "/rental-payments/owner",
  auth,
  authorize(["property_owner"]),
  investmentController.getPropertyOwnerRentalPayments
);

// ===== FILE OPERATIONS (Separate Controller) =====

// Kontrat yükle (Investor & Property Owner)
router.post(
  "/:id/contract",
  auth,
  authorize(["investor", "property_owner", "admin"]),
  investmentFileController.uploadContract
);

// Tapu kaydı yükle (Property Owner & Local Rep)
router.post(
  "/:id/title-deed",
  auth,
  authorize(["property_owner", "local_representative", "admin"]),
  investmentFileController.uploadTitleDeed
);

// Payment receipt yükle (Investor)
router.post(
  "/:id/payment-receipt",
  auth,
  authorize(["investor", "admin"]),
  investmentFileController.uploadPaymentReceipt
);

// Rental receipt yükle (Property Owner)
router.post(
  "/:id/rental-receipt",
  auth,
  authorize(["property_owner", "admin"]),
  investmentFileController.uploadRentalReceipt
);

// Additional document yükle
router.post(
  "/:id/documents",
  auth,
  authorize(["investor", "property_owner", "admin", "local_representative"]),
  investmentFileController.uploadAdditionalDocument
);

// Investment dökümanlarını listele
router.get(
  "/:id/documents",
  auth,
  authorize(["investor", "property_owner", "admin", "local_representative"]),
  investmentFileController.getInvestmentDocuments
);

// Investment dökümanını indir
router.get(
  "/:investmentId/documents/:fileId/download",
  auth,
  authorize(["investor", "property_owner", "admin", "local_representative"]),
  investmentFileController.downloadInvestmentDocument
);

// Investment dökümanını sil (Admin only)
router.delete(
  "/:investmentId/documents/:fileId",
  auth,
  authorize(["admin"]),
  investmentFileController.deleteInvestmentDocument
);

// ===== SHARED ROUTES =====

// Investment detayını getir
router.get(
  "/:id",
  auth,
  authorize(["investor", "property_owner", "admin", "local_representative"]),
  investmentController.getInvestmentById
);

// Representative talep et
router.post(
  "/:id/request-representative",
  auth,
  authorize(["investor", "property_owner"]),
  investmentController.requestLocalRepresentative
);

// ===== ADMIN ROUTES =====

// Tüm yatırımları listele
router.get(
  "/",
  auth,
  authorize(["admin"]),
  investmentController.getAllInvestments
);

// Title deed'i onayla
router.post(
  "/:id/approve-title-deed",
  auth,
  authorize(["admin"]),
  investmentController.approveTitleDeed
);

// Local representative ata
router.post(
  "/:id/assign-representative",
  auth,
  authorize(["admin"]),
  investmentController.assignLocalRepresentative
);

// İade işlemi
router.post(
  "/:id/refund",
  auth,
  authorize(["property_owner", "admin"]),
  investmentController.processRefund
);

// Property transferi
router.post(
  "/:id/transfer",
  auth,
  authorize(["admin"]),
  investmentController.transferProperty
);

// ===== REPORTS =====

// Yaklaşan ödemeler
router.get(
  "/reports/upcoming-payments",
  auth,
  authorize(["admin", "local_representative"]),
  investmentController.getUpcomingPayments
);

// Geciken ödemeler
router.get(
  "/reports/delayed-payments",
  auth,
  authorize(["admin", "local_representative"]),
  investmentController.getDelayedPayments
);

// Investment istatistikleri
router.get(
  "/:id/statistics",
  auth,
  authorize(["admin", "property_owner", "investor"]),
  investmentController.getInvestmentStatistics
);

module.exports = router;
