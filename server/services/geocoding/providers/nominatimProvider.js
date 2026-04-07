// server/services/geocoding/providers/nominatimProvider.js

const axios = require("axios");
const logger = require("../../../utils/logger");

/**
 * Nominatim (OpenStreetMap) Geocoding Provider
 * Ücretsiz, API key gerektirmez
 * Rate limit: 1 request/second (User-Agent header gerekli)
 * https://nominatim.org/release-docs/latest/api/Overview/
 */
class NominatimProvider {
  constructor() {
    this.baseUrl = "https://nominatim.openstreetmap.org";
    this.userAgent = process.env.APP_NAME || "PledgedTitleDeedInvestment/1.0";
    this.lastRequestTime = 0;
    this.minRequestInterval = 1000; // 1 saniye (Nominatim policy)
  }

  /**
   * Rate limiting - Nominatim policy gereği
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Adres string'inden koordinat döndürür
   */
  async geocode(address) {
    try {
      await this.enforceRateLimit();

      const searchParams = this._buildSearchParams(address);

      const response = await axios.get(`${this.baseUrl}/search`, {
        params: searchParams,
        headers: {
          "User-Agent": this.userAgent,
        },
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];

        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          formattedAddress: result.display_name,
          placeId: result.place_id?.toString(),
          addressComponents: this._parseAddressComponents(result.address),
        };
      }

      return null;
    } catch (error) {
      if (this._isStructuredQuery(address)) {
        return await this._geocodeStructuredWithFallback(address);
      }

      logger.error("Nominatim geocoding error:", error.message);
      throw new Error("Failed to geocode address with Nominatim");
    }
  }

  async _geocodeStructuredWithFallback(address) {
    try {
      await this.enforceRateLimit();

      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: this._buildFreeformQuery(address),
          format: "json",
          addressdetails: 1,
          limit: 1,
        },
        headers: {
          "User-Agent": this.userAgent,
        },
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];

        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          formattedAddress: result.display_name,
          placeId: result.place_id?.toString(),
          addressComponents: this._parseAddressComponents(result.address),
        };
      }

      return null;
    } catch (error) {
      logger.error("Nominatim geocoding error:", error.message);
      throw new Error("Failed to geocode address with Nominatim");
    }
  }

  /**
   * Koordinatlardan adres string'i döndürür (Reverse Geocoding)
   */
  async reverseGeocode(lat, lng) {
    try {
      await this.enforceRateLimit();

      const response = await axios.get(`${this.baseUrl}/reverse`, {
        params: {
          lat: lat,
          lon: lng,
          format: "json",
          addressdetails: 1,
        },
        headers: {
          "User-Agent": this.userAgent,
        },
      });

      if (response.data && response.data.address) {
        const address = response.data.address;

        // Şehir bilgisini öncelik sırasıyla al
        const city =
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          address.county ||
          "";

        return {
          address: response.data.display_name,
          city: city,
          country: address.country_code?.toUpperCase() || "",
          placeId: response.data.place_id?.toString(),
        };
      }

      return null;
    } catch (error) {
      logger.error("Nominatim reverse geocoding error:", error.message);
      throw new Error("Failed to reverse geocode with Nominatim");
    }
  }

  async search(address, options = {}) {
    try {
      await this.enforceRateLimit();

      const query = this._buildFreeformQuery(address);
      if (!query) {
        return [];
      }

      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: query,
          format: "json",
          addressdetails: 1,
          limit: Math.min(options.limit || 5, 10),
          namedetails: 1,
          ...(options.countrycodes
            ? { countrycodes: options.countrycodes }
            : {}),
        },
        headers: {
          "User-Agent": this.userAgent,
        },
      });

      return (response.data || []).map((result) => ({
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        formattedAddress: result.display_name,
        placeId: result.place_id?.toString(),
        name:
          result.namedetails?.name ||
          result.name ||
          result.display_name?.split(",")?.[0] ||
          "",
        addressComponents: this._parseAddressComponents(result.address),
      }));
    } catch (error) {
      logger.error("Nominatim search error:", error.message);
      throw new Error("Failed to search address with Nominatim");
    }
  }

  /**
   * Adres bileşenlerini parse et
   */
  _parseAddressComponents(osmAddress) {
    if (!osmAddress) return [];

    const components = [];

    // OSM address yapısını Google-benzeri componenta çevir
    if (osmAddress.road) {
      components.push({ type: "route", long_name: osmAddress.road });
    }

    if (osmAddress.city || osmAddress.town || osmAddress.village) {
      components.push({
        type: "locality",
        long_name: osmAddress.city || osmAddress.town || osmAddress.village,
      });
    }

    if (osmAddress.state) {
      components.push({
        type: "administrative_area_level_1",
        long_name: osmAddress.state,
      });
    }

    if (osmAddress.country) {
      components.push({
        type: "country",
        long_name: osmAddress.country,
        short_name: osmAddress.country_code?.toUpperCase(),
      });
    }

    if (osmAddress.postcode) {
      components.push({ type: "postal_code", long_name: osmAddress.postcode });
    }

    return components;
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

  _isStructuredQuery(address) {
    return !!address && typeof address === "object" && !Array.isArray(address);
  }

  _buildSearchParams(address) {
    if (!this._isStructuredQuery(address)) {
      return {
        q: address,
        format: "json",
        addressdetails: 1,
        limit: 1,
      };
    }

    const params = {
      format: "json",
      addressdetails: 1,
      limit: 1,
    };

    const street = [address.houseNumber, address.street]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (address.amenity) params.amenity = address.amenity;
    if (street) params.street = street;
    if (address.city) params.city = address.city;
    if (address.county) params.county = address.county;
    if (address.state) params.state = address.state;
    if (address.postalcode) params.postalcode = address.postalcode;
    if (address.country) params.country = address.country;

    const countryCode = this._normalizeCountryCode(
      address.countryCode || address.country,
    );
    if (countryCode) {
      params.countrycodes = countryCode.toLowerCase();
    }

    return params;
  }

  _buildFreeformQuery(address) {
    if (!this._isStructuredQuery(address)) {
      return address;
    }

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

  _normalizeCountryCode(value) {
    if (!value || typeof value !== "string") return null;
    const trimmed = value.trim();
    if (trimmed.length === 2) return trimmed;

    const countryMap = {
      turkey: "TR",
      turkiye: "TR",
      "türkiye": "TR",
      usa: "US",
      "united states": "US",
      "united kingdom": "GB",
      england: "GB",
      germany: "DE",
      france: "FR",
      spain: "ES",
      italy: "IT",
    };

    return countryMap[trimmed.toLowerCase()] || null;
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

  /**
   * Provider bilgisi
   */
  getProviderInfo() {
    return {
      name: "Nominatim (OpenStreetMap)",
      isFree: true,
      requiresKey: false,
      rateLimit: "1 request/second",
      website: "https://nominatim.org",
    };
  }
}

module.exports = NominatimProvider;
