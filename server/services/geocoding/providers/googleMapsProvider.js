// server/services/geocoding/providers/googleMapsProvider.js

const axios = require("axios");
const logger = require("../../../utils/logger");

/**
 * Google Maps Geocoding Provider
 * API key gerektirir
 * Rate limit: Pay-as-you-go (ücretli)
 * https://developers.google.com/maps/documentation/geocoding
 */
class GoogleMapsProvider {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = "https://maps.googleapis.com/maps/api";

    if (!this.apiKey) {
      logger.warn("⚠️ Google Maps API key is not configured");
    }
  }

  /**
   * Adres string'inden koordinat döndürür
   */
  async geocode(address) {
    try {
      if (!this.apiKey) {
        throw new Error("Google Maps API key is not configured");
      }

      const query =
        address && typeof address === "object" && !Array.isArray(address)
          ? this._buildFreeformQuery(address)
          : address;

      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          address: query,
          key: this.apiKey,
        },
      });

      if (response.data.status === "OK" && response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
          placeId: result.place_id,
          addressComponents: result.address_components,
        };
      }

      if (response.data.status === "ZERO_RESULTS") {
        return null;
      }

      throw new Error(`Geocoding failed: ${response.data.status}`);
    } catch (error) {
      logger.error("Google Maps geocoding error:", error.message);
      throw new Error("Failed to geocode address with Google Maps");
    }
  }

  /**
   * Koordinatlardan adres string'i döndürür (Reverse Geocoding)
   */
  async reverseGeocode(lat, lng) {
    try {
      if (!this.apiKey) {
        throw new Error("Google Maps API key is not configured");
      }

      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          latlng: `${lat},${lng}`,
          key: this.apiKey,
        },
      });

      if (response.data.status === "OK" && response.data.results.length > 0) {
        const result = response.data.results[0];

        // Adres bileşenlerinden şehir ve ülke bilgisini çıkar
        const addressComponents = result.address_components;
        let city = "";
        let country = "";

        addressComponents.forEach((component) => {
          if (component.types.includes("locality")) {
            city = component.long_name;
          }
          if (
            component.types.includes("administrative_area_level_1") &&
            !city
          ) {
            city = component.long_name;
          }
          if (component.types.includes("country")) {
            country = component.short_name; // 2-letter code (TR, US, etc.)
          }
        });

        return {
          address: result.formatted_address,
          city: city,
          country: country,
          placeId: result.place_id,
        };
      }

      if (response.data.status === "ZERO_RESULTS") {
        return null;
      }

      throw new Error(`Reverse geocoding failed: ${response.data.status}`);
    } catch (error) {
      logger.error("Google Maps reverse geocoding error:", error.message);
      throw new Error("Failed to reverse geocode with Google Maps");
    }
  }

  async search(address, options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error("Google Maps API key is not configured");
      }

      const query =
        address && typeof address === "object" && !Array.isArray(address)
          ? this._buildFreeformQuery(address)
          : address;

      if (!query) {
        return [];
      }

      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          address: query,
          key: this.apiKey,
          ...(options.countrycodes
            ? { components: `country:${options.countrycodes}` }
            : {}),
        },
      });

      if (response.data.status !== "OK" || !response.data.results?.length) {
        if (response.data.status === "ZERO_RESULTS") {
          return [];
        }
        throw new Error(`Search failed: ${response.data.status}`);
      }

      return response.data.results
        .slice(0, Math.min(options.limit || 5, 10))
        .map((result) => ({
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
          placeId: result.place_id,
          name:
            result.address_components?.[0]?.long_name ||
            result.formatted_address?.split(",")?.[0] ||
            "",
          addressComponents: result.address_components,
        }));
    } catch (error) {
      logger.error("Google Maps search error:", error.message);
      throw new Error("Failed to search address with Google Maps");
    }
  }

  /**
   * Adres validasyonu
   */
  async validateAddress(address) {
    try {
      const result = await this.geocode(address);
      return result !== null;
    } catch (error) {
      return false;
    }
  }

  _buildFreeformQuery(address) {
    return [
      [address.houseNumber, address.street].filter(Boolean).join(" ").trim(),
      address.amenity,
      address.city,
      address.county,
      address.state,
      address.postalcode,
      address.country,
    ]
      .filter(Boolean)
      .join(", ");
  }

  /**
   * Koordinat validasyonu
   */
  validateCoordinates(lat, lng) {
    return (
      typeof lat === "number" &&
      typeof lng === "number" &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  /**
   * İki nokta arası mesafe hesaplama (Haversine)
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Dünya'nın yarıçapı (km)
    const dLat = this._toRadians(lat2 - lat1);
    const dLng = this._toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRadians(lat1)) *
        Math.cos(this._toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // 1 ondalık basamak
  }

  _toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Türkiye sınırları kontrolü
   */
  isInTurkey(lat, lng) {
    return lat >= 36 && lat <= 42 && lng >= 26 && lng <= 45;
  }

  /**
   * Batch geocoding (rate limiting ile)
   */
  async batchGeocode(addresses) {
    const results = [];

    for (let i = 0; i < addresses.length; i++) {
      try {
        const result = await this.geocode(addresses[i]);
        results.push({
          address: addresses[i],
          success: true,
          data: result,
        });

        // Rate limiting: Her request arasında 100ms bekle
        if (i < addresses.length - 1) {
          await this._delay(100);
        }
      } catch (error) {
        results.push({
          address: addresses[i],
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Provider bilgisi
   */
  getProviderInfo() {
    return {
      name: "Google Maps",
      isFree: false,
      requiresKey: true,
      hasKey: !!this.apiKey,
      rateLimit: "Pay-as-you-go",
      website: "https://developers.google.com/maps",
    };
  }
}

module.exports = GoogleMapsProvider;
