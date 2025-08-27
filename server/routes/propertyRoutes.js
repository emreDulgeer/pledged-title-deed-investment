// server/routes/propertyRoutes.js

const router = require("express").Router();
const propertyController = require("../controllers/propertyController");
const propertyFileController = require("../controllers/propertyFileController");
const auth = require("../middlewares/auth");
const optionalAuth = require("../middlewares/optionalAuth");
const authorize = require("../middlewares/authorize");

// ===== PUBLIC ROUTES =====
router.get("/", propertyController.getProperties);
router.get("/featured", propertyController.getFeaturedProperties);
router.get("/map", propertyController.getPropertiesForMap);
router.get("/:id", propertyController.getPropertyById);
router.get("/:id/files", optionalAuth, propertyFileController.getPropertyFiles); // Public or Auth

// ===== PROPERTY OWNER ROUTES =====
// Property CRUD
router.post(
  "/",
  auth,
  authorize(["property_owner"]),
  propertyController.createProperty
);
router.put(
  "/:id",
  auth,
  authorize(["property_owner"]),
  propertyController.updateProperty
);
router.delete(
  "/:id",
  auth,
  authorize(["property_owner"]),
  propertyController.deleteProperty
);

// Property listeleme
router.get(
  "/my/properties",
  auth,
  authorize(["property_owner"]),
  propertyController.getMyProperties
);
router.get(
  "/my/properties/:id",
  auth,
  authorize(["property_owner"]),
  propertyController.getMyPropertyById
);

// Property istatistikleri
router.get(
  "/:id/statistics",
  auth,
  authorize(["property_owner"]),
  propertyController.getPropertyStatistics
);
router.get(
  "/my/statistics",
  auth,
  authorize(["property_owner"]),
  propertyController.getMyPropertiesStatistics
);

// Property öne çıkarma
router.post(
  "/:id/feature",
  auth,
  authorize(["property_owner"]),
  propertyController.featureProperty
);

// ===== PROPERTY FILE OPERATIONS =====
// Görsel yükleme (Property Owner & Admin)
router.post(
  "/:id/images",
  auth,
  authorize(["property_owner", "admin"]),
  propertyFileController.uploadPropertyImage
);

// Döküman yükleme (Property Owner, Admin & Local Rep)
router.post(
  "/:id/documents",
  auth,
  authorize(["property_owner", "admin", "local_representative"]),
  propertyFileController.uploadPropertyDocument
);

// Primary görsel ayarlama
router.patch(
  "/:propertyId/images/:imageId/primary",
  auth,
  authorize(["property_owner", "admin"]),
  propertyFileController.setPrimaryImage
);

// Görsel silme
router.delete(
  "/:propertyId/images/:imageId",
  auth,
  authorize(["property_owner", "admin"]),
  propertyFileController.deletePropertyImage
);

// Döküman silme
router.delete(
  "/:propertyId/documents/:documentId",
  auth,
  authorize(["property_owner", "admin"]),
  propertyFileController.deletePropertyDocument
);

// ===== ADMIN ROUTES =====
// Admin property yönetimi
router.get(
  "/admin/all",
  auth,
  authorize(["admin"]),
  propertyController.getAllProperties
);
router.patch(
  "/:id/status",
  auth,
  authorize(["admin"]),
  propertyController.updatePropertyStatus
);
router.post(
  "/:id/flag",
  auth,
  authorize(["admin"]),
  propertyController.flagProperty
);

// Admin döküman onayı (title deed, annotation verification)
router.post(
  "/:propertyId/documents/:documentId/verify",
  auth,
  authorize(["admin", "local_representative"]),
  async (req, res) => {
    try {
      const { propertyId, documentId } = req.params;
      const userId = req.user._id;

      const Property = require("../models/Property");
      const property = await Property.findById(propertyId);

      if (!property) {
        return require("../utils/responseWrapper").notFound(
          res,
          "Property not found"
        );
      }

      // Dökümanı bul ve onayla
      const document = property.documents.find(
        (doc) => doc.fileId.toString() === documentId
      );

      if (!document) {
        return require("../utils/responseWrapper").notFound(
          res,
          "Document not found"
        );
      }

      document.verifiedBy = userId;
      document.verifiedAt = new Date();

      // Eğer title deed veya annotation ise hızlı erişim alanlarını güncelle
      if (
        document.type === "title_deed" &&
        property.titleDeedDocument?.fileId?.toString() === documentId
      ) {
        property.titleDeedDocument.verified = true;
      }

      await property.save();

      return require("../utils/responseWrapper").success(
        res,
        {
          propertyId: property._id,
          documentId: documentId,
          verified: true,
        },
        "Document verified successfully"
      );
    } catch (error) {
      return require("../utils/responseWrapper").error(res, error.message);
    }
  }
);

// ===== INVESTOR ROUTES (favorites) =====
router.post(
  "/:id/favorite",
  auth,
  authorize(["investor"]),
  propertyController.toggleFavorite
);
router.get(
  "/my/favorites",
  auth,
  authorize(["investor"]),
  propertyController.getFavoriteProperties
);

module.exports = router;
