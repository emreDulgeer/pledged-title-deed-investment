// server/services/geocoding/index.js

/**
 * Geocoding Service Export
 * Backward compatibility için eski geocodingService.js import'larını destekler
 */

const geocodingAdapter = require("./geocodingAdapter");

// Eski kullanıma uyumluluk için doğrudan export et
module.exports = geocodingAdapter;

// Gelişmiş kullanım için named exports
module.exports.geocodingService = geocodingAdapter;
module.exports.NominatimProvider = require("./providers/nominatimProvider");
module.exports.GoogleMapsProvider = require("./providers/googleMapsProvider");
