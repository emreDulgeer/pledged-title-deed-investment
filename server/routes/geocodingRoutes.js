// server/routes/geocodingRoutes.js

const router = require("express").Router();
const geocodingService = require("../services/geocoding");
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const responseWrapper = require("../utils/responseWrapper");

/**
 * Geocoding provider bilgisini getir
 * GET /api/geocoding/provider-info
 */
router.get("/provider-info", auth, authorize(["admin"]), async (req, res) => {
  try {
    const info = geocodingService.getProviderInfo();
    return responseWrapper.success(
      res,
      info,
      "Provider information retrieved successfully",
    );
  } catch (error) {
    return responseWrapper.error(res, error.message);
  }
});

/**
 * Geocoding health check
 * GET /api/geocoding/health
 */
router.get("/health", auth, authorize(["admin"]), async (req, res) => {
  try {
    const health = await geocodingService.healthCheck();
    return responseWrapper.success(res, health, "Health check completed");
  } catch (error) {
    return responseWrapper.error(res, error.message);
  }
});

/**
 * Test geocoding - adres → koordinat
 * POST /api/geocoding/test/geocode
 * Body: { address: "Istanbul, Turkey" }
 */
router.post("/test/geocode", auth, authorize(["admin"]), async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return responseWrapper.badRequest(res, "Address is required");
    }

    const result = await geocodingService.geocode(address);

    if (!result) {
      return responseWrapper.notFound(res, "Address not found");
    }

    return responseWrapper.success(res, result, "Geocoding successful");
  } catch (error) {
    return responseWrapper.error(res, error.message);
  }
});

/**
 * Test reverse geocoding - koordinat → adres
 * POST /api/geocoding/test/reverse
 * Body: { lat: 41.0082, lng: 28.9784 }
 */
router.post("/test/reverse", auth, authorize(["admin"]), async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return responseWrapper.badRequest(
        res,
        "Latitude and longitude are required",
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (!geocodingService.validateCoordinates(latitude, longitude)) {
      return responseWrapper.badRequest(res, "Invalid coordinates");
    }

    const result = await geocodingService.reverseGeocode(latitude, longitude);

    if (!result) {
      return responseWrapper.notFound(res, "Location not found");
    }

    return responseWrapper.success(res, result, "Reverse geocoding successful");
  } catch (error) {
    return responseWrapper.error(res, error.message);
  }
});

/**
 * Test batch geocoding
 * POST /api/geocoding/test/batch
 * Body: { addresses: ["Istanbul, Turkey", "Ankara, Turkey"] }
 */
router.post("/test/batch", auth, authorize(["admin"]), async (req, res) => {
  try {
    const { addresses } = req.body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return responseWrapper.badRequest(res, "Addresses array is required");
    }

    if (addresses.length > 10) {
      return responseWrapper.badRequest(
        res,
        "Maximum 10 addresses allowed for testing",
      );
    }

    const results = await geocodingService.batchGeocode(addresses);

    return responseWrapper.success(res, results, "Batch geocoding completed");
  } catch (error) {
    return responseWrapper.error(res, error.message);
  }
});

module.exports = router;
