// server/services/geocoding/geocodingAdapter.js

const NominatimProvider = require("./providers/nominatimProvider");
const GoogleMapsProvider = require("./providers/googleMapsProvider");
const logger = require("../../utils/logger");

/**
 * Geocoding Adapter
 * Provider seçimi ve runtime fallback mekanizması
 *
 * Default: Nominatim (OSM) - ücretsiz, key gerektirmez
 * Optional: Google Maps - API key gerektirir
 *
 * Fallback stratejisi:
 * 1. Config'den provider seç
 * 2. Google seçildiyse ama key yoksa → Nominatim'e dön
 * 3. İlk provider başarısızsa → fallback provider dene
 */
class GeocodingAdapter {
  constructor() {
    this.provider = null;
    this.fallbackProvider = null;
    this._initializeProviders();
  }

  /**
   * Provider'ları başlat
   */
  _initializeProviders() {
    const configProvider = (
      process.env.GEOCODING_PROVIDER || "nominatim"
    ).toLowerCase();
    const hasGoogleKey = !!process.env.GOOGLE_MAPS_API_KEY;

    // Provider seçimi
    if (configProvider === "google" && hasGoogleKey) {
      logger.info("🗺️  Geocoding Provider: Google Maps");
      this.provider = new GoogleMapsProvider();
      this.fallbackProvider = new NominatimProvider(); // Fallback olarak Nominatim
    } else {
      if (configProvider === "google" && !hasGoogleKey) {
        logger.warn(
          "⚠️  Google Maps seçildi ama API key yok. Nominatim kullanılacak.",
        );
      }
      logger.info("🗺️  Geocoding Provider: Nominatim (OpenStreetMap)");
      this.provider = new NominatimProvider();
      this.fallbackProvider = null; // Nominatim zaten default
    }

    // Provider bilgisini logla
    const providerInfo = this.provider.getProviderInfo();
    logger.info(`📍 Provider: ${providerInfo.name}`);
    logger.info(`💰 Free: ${providerInfo.isFree ? "Yes" : "No"}`);
    logger.info(`🔑 Requires Key: ${providerInfo.requiresKey ? "Yes" : "No"}`);

    if (this.fallbackProvider) {
      logger.info(
        `🔄 Fallback: ${this.fallbackProvider.getProviderInfo().name}`,
      );
    }
  }

  /**
   * Geocode with automatic fallback
   */
  async geocode(address) {
    try {
      return await this.provider.geocode(address);
    } catch (error) {
      logger.warn(`Primary provider failed for geocode: ${error.message}`);

      if (this.fallbackProvider) {
        logger.info("Trying fallback provider...");
        try {
          return await this.fallbackProvider.geocode(address);
        } catch (fallbackError) {
          logger.error(
            `Fallback provider also failed: ${fallbackError.message}`,
          );
          throw new Error("All geocoding providers failed");
        }
      }

      throw error;
    }
  }

  /**
   * Reverse geocode with automatic fallback
   */
  async reverseGeocode(lat, lng) {
    try {
      return await this.provider.reverseGeocode(lat, lng);
    } catch (error) {
      logger.warn(
        `Primary provider failed for reverse geocode: ${error.message}`,
      );

      if (this.fallbackProvider) {
        logger.info("Trying fallback provider...");
        try {
          return await this.fallbackProvider.reverseGeocode(lat, lng);
        } catch (fallbackError) {
          logger.error(
            `Fallback provider also failed: ${fallbackError.message}`,
          );
          throw new Error("All reverse geocoding providers failed");
        }
      }

      throw error;
    }
  }

  /**
   * Validate address
   */
  async validateAddress(address) {
    try {
      return await this.provider.validateAddress(address);
    } catch (error) {
      if (this.fallbackProvider) {
        try {
          return await this.fallbackProvider.validateAddress(address);
        } catch (fallbackError) {
          return false;
        }
      }
      return false;
    }
  }

  /**
   * Calculate distance between two points (Haversine formula)
   * Bu fonksiyon provider'dan bağımsız - matematiksel hesaplama
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    return this.provider.calculateDistance(lat1, lng1, lat2, lng2);
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(lat, lng) {
    return this.provider.validateCoordinates(lat, lng);
  }

  /**
   * Check if coordinates are in Turkey
   */
  isInTurkey(lat, lng) {
    return this.provider.isInTurkey(lat, lng);
  }

  /**
   * Batch geocode addresses
   */
  async batchGeocode(addresses) {
    try {
      return await this.provider.batchGeocode(addresses);
    } catch (error) {
      logger.warn(
        `Primary provider failed for batch geocode: ${error.message}`,
      );

      if (this.fallbackProvider) {
        logger.info("Trying fallback provider for batch geocode...");
        try {
          return await this.fallbackProvider.batchGeocode(addresses);
        } catch (fallbackError) {
          logger.error(
            `Fallback provider also failed: ${fallbackError.message}`,
          );
          throw new Error("All providers failed for batch geocoding");
        }
      }

      throw error;
    }
  }

  /**
   * Get current provider info
   */
  getProviderInfo() {
    const info = this.provider.getProviderInfo();
    if (this.fallbackProvider) {
      info.fallback = this.fallbackProvider.getProviderInfo();
    }
    return info;
  }

  /**
   * Health check - provider çalışıyor mu?
   */
  async healthCheck() {
    try {
      // Basit bir test koordinatı (İstanbul)
      const result = await this.reverseGeocode(41.0082, 28.9784);
      return {
        status: "healthy",
        provider: this.provider.getProviderInfo().name,
        testResult: !!result,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        provider: this.provider.getProviderInfo().name,
        error: error.message,
      };
    }
  }
}

// Singleton pattern - uygulama boyunca tek bir instance
let instance = null;

const getGeocodingService = () => {
  if (!instance) {
    instance = new GeocodingAdapter();
  }
  return instance;
};

module.exports = getGeocodingService();
