const router = require("express").Router();
const propertyController = require("../controllers/propertyController");
const fakeAuth = require("../middlewares/fakeAuth");

// Public routes
router.get("/", propertyController.getProperties);
router.get("/featured", propertyController.getFeaturedProperties);
router.get("/map", propertyController.getPropertiesForMap);
router.get("/:id", propertyController.getPropertyById);

// Property Owner routes
router.post("/", fakeAuth("property_owner"), propertyController.createProperty);
router.put(
  "/:id",
  fakeAuth("property_owner"),
  propertyController.updateProperty
);
router.delete(
  "/:id",
  fakeAuth("property_owner"),
  propertyController.deleteProperty
);

router.get(
  "/my/properties",
  fakeAuth("property_owner"),
  propertyController.getMyProperties
);
router.get(
  "/my/properties/:id",
  fakeAuth("property_owner"),
  propertyController.getMyPropertyById
);
router.get(
  "/:id/statistics",
  fakeAuth("property_owner"),
  propertyController.getPropertyStatistics
);
router.get(
  "/my/statistics",
  fakeAuth("property_owner"),
  propertyController.getMyPropertiesStatistics
);
router.post(
  "/:id/feature",
  fakeAuth("property_owner"),
  propertyController.featureProperty
);

// Admin routes
router.get(
  "/admin/all",
  fakeAuth("admin"),
  propertyController.getAllProperties
);
router.patch(
  "/:id/status",
  fakeAuth("admin"),
  propertyController.updatePropertyStatus
);
router.post("/:id/flag", fakeAuth("admin"), propertyController.flagProperty);

// Investor routes (favorites)
router.post(
  "/:id/favorite",
  fakeAuth("investor"),
  propertyController.toggleFavorite
);
router.get(
  "/my/favorites",
  fakeAuth("investor"),
  propertyController.getFavoriteProperties
);

module.exports = router;
