// server/services/propertyService.js

const PropertyRepository = require("../repositories/propertyRepository");
const geocodingService = require("./geocoding");
const {
  propertyFilters,
  propertySortFields,
} = require("../utils/paginationHelper");
const {
  toPropertyListDtoArray,
  toPropertyDetailDto,
  toPropertyInvestorViewDto,
  toPropertyInvestorViewDtoArray,
  toPropertyAdminViewDto,
  toPropertyOwnerViewDto,
  toPropertyOwnerViewDtoArray,
} = require("../utils/dto/Properties");
const {
  SUPPORTED_PROPERTY_COUNTRY_NAMES,
  normalizeSupportedPropertyCountry,
} = require("../utils/propertyCountries");
const officialPropertyDataService = require("./officialPropertyData");

const SUPPORTED_PROPERTY_COUNTRIES_MESSAGE = `Properties can only be created in the supported countries: ${SUPPORTED_PROPERTY_COUNTRY_NAMES.join(", ")}`;

const normalizePropertyCountryOrThrow = (country) => {
  const normalizedCountry = normalizeSupportedPropertyCountry(country);

  if (!normalizedCountry) {
    throw new Error(SUPPORTED_PROPERTY_COUNTRIES_MESSAGE);
  }

  return normalizedCountry;
};

class PropertyService {
  constructor() {
    this.propertyRepository = new PropertyRepository();
    this.officialPropertyDataService = officialPropertyDataService;
  }

  buildGeocodeInput(fullAddress, city, country, mapSearchAddress = "") {
    const normalizedFullAddress =
      mapSearchAddress?.trim?.() || fullAddress?.trim?.() || "";
    const normalizedCity = city?.trim?.() || "";
    const normalizedCountry = country?.trim?.() || "";

    const useFreeform = normalizedFullAddress.includes(",");

    if (useFreeform) {
      const seen = new Set();
      return [normalizedFullAddress, normalizedCity, normalizedCountry]
        .filter(Boolean)
        .filter((part) => {
          const key = part.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .join(", ");
    }

    return {
      street: normalizedFullAddress || undefined,
      city: normalizedCity || undefined,
      country: normalizedCountry || undefined,
    };
  }

  // Public listings iÃ§in - TÃœM FÄ°LTRELER EKLENDI
  async getPublicProperties(queryParams, userId = null) {
    // PDF'e gÃ¶re: country, city, propertyType, yield range, investment range, contract period filtrelemeleri
    const options = {
      populate: "owner",
      allowedFilters: propertyFilters,
      allowedSortFields: propertySortFields,
      customFilters: { status: "published" },
    };

    const result = await this.propertyRepository.paginate(queryParams, options);

    // EÄŸer userId varsa investor view, yoksa normal list view
    const dtoArray = userId
      ? toPropertyInvestorViewDtoArray(result.data, userId)
      : toPropertyListDtoArray(result.data);

    return {
      data: dtoArray,
      pagination: result.pagination,
    };
  }

  // Property detayÄ±nÄ± getir
  // Property detayÄ±nÄ± getir
  async getPropertyById(propertyId, userId = null, isAdmin = false) {
    const property = await this.propertyRepository.findById(
      propertyId,
      "owner",
    );

    if (!property) {
      throw new Error("Property not found");
    }

    // PUBLIC endpoint gÃ¼venliÄŸi:
    // published deÄŸilse ve admin/owner deÄŸilse 404 ver
    const isOwner =
      userId &&
      property.owner &&
      property.owner.toString() === userId.toString();

    if (property.status !== "published" && !isAdmin && !isOwner) {
      // VarlÄ±ÄŸÄ± gizlemek iÃ§in 404
      throw new Error("Property not found");
    }

    // View count sadece published iÃ§in artsÄ±n
    if (property.status === "published") {
      await this.propertyRepository.incrementViewCount(propertyId);
    }

    // Role/kimlik durumuna gÃ¶re DTO seÃ§imi
    if (isAdmin) {
      return toPropertyAdminViewDto(property);
    } else if (userId) {
      return toPropertyInvestorViewDto(property, userId);
    } else {
      return toPropertyDetailDto(property);
    }
  }

  // Yeni property oluÅŸtur
  async createProperty(propertyData, ownerId) {
    const normalizedPropertyData = {
      ...propertyData,
      country: normalizePropertyCountryOrThrow(propertyData.country),
    };

    // Business logic validations
    if (normalizedPropertyData.requestedInvestment < 10000) {
      throw new Error("Minimum yatÄ±rÄ±m tutarÄ± 10,000 EUR olmalÄ±dÄ±r");
    }

    if (normalizedPropertyData.contractPeriodMonths < 12) {
      throw new Error("Minimum kontrat sÃ¼resi 12 ay olmalÄ±dÄ±r");
    }

    const locationPin = await this.validateAndGeocode(normalizedPropertyData);

    const newProperty = await this.propertyRepository.create({
      ...normalizedPropertyData,
      locationPin,
      owner: ownerId,
      status: "draft",
    });

    return toPropertyDetailDto(newProperty);
  }

  // Property gÃ¼ncelle
  async updateProperty(propertyId, updateData, ownerId, isAdmin = false) {
    const normalizedUpdateData = { ...updateData };
    const property = await this.propertyRepository.findById(propertyId);

    if (!property) {
      throw new Error("Property not found");
    }

    // Ownership kontrolÃ¼ (admin deÄŸilse)
    if (!isAdmin && property.owner.toString() !== ownerId.toString()) {
      throw new Error("Unauthorized to update this property");
    }

    // Status deÄŸiÅŸimi business logic
    if (normalizedUpdateData.status && !isAdmin) {
      delete normalizedUpdateData.status; // Sadece admin status deÄŸiÅŸtirebilir
    }

    if (
      Object.prototype.hasOwnProperty.call(normalizedUpdateData, "country")
    ) {
      normalizedUpdateData.country = normalizePropertyCountryOrThrow(
        normalizedUpdateData.country,
      );
    }

    const hasLocationInputs =
      Object.prototype.hasOwnProperty.call(normalizedUpdateData, "locationPin") ||
      Object.prototype.hasOwnProperty.call(normalizedUpdateData, "fullAddress") ||
      Object.prototype.hasOwnProperty.call(
        normalizedUpdateData,
        "mapSearchAddress",
      ) ||
      Object.prototype.hasOwnProperty.call(normalizedUpdateData, "city") ||
      Object.prototype.hasOwnProperty.call(normalizedUpdateData, "country");

    if (hasLocationInputs) {
      const mergedLocationData = {
        fullAddress: normalizedUpdateData.fullAddress ?? property.fullAddress,
        mapSearchAddress:
          normalizedUpdateData.mapSearchAddress ?? property.mapSearchAddress,
        city: normalizedUpdateData.city ?? property.city,
        country: normalizedUpdateData.country ?? property.country,
        locationPin:
          normalizedUpdateData.locationPin === null
            ? null
            : normalizedUpdateData.locationPin ?? property.locationPin,
      };

      normalizedUpdateData.locationPin =
        await this.validateAndGeocode(mergedLocationData);
    }

    const updatedProperty = await this.propertyRepository.update(
      propertyId,
      normalizedUpdateData,
    );
    return toPropertyDetailDto(updatedProperty);
  }

  // Property sil
  async deleteProperty(propertyId, ownerId, isAdmin = false) {
    const property = await this.propertyRepository.findById(propertyId);

    if (!property) {
      throw new Error("Property not found");
    }

    // Ownership kontrolÃ¼
    if (!isAdmin && property.owner.toString() !== ownerId.toString()) {
      throw new Error("Unauthorized to delete this property");
    }

    // Active veya in_contract durumundaki property silinemez
    if (["active", "in_contract"].includes(property.status)) {
      throw new Error("Cannot delete property with active contracts");
    }

    await this.propertyRepository.delete(propertyId);
    return { message: "Property deleted successfully" };
  }

  // Property'yi favorilere ekle/Ã§Ä±kar
  async toggleFavorite(propertyId, userId) {
    const property = await this.propertyRepository.findById(propertyId);

    if (!property) {
      throw new Error("Property not found");
    }

    // Sadece published property'ler favorilere eklenebilir
    if (property.status !== "published") {
      throw new Error("Only published properties can be added to favorites");
    }

    // Investor'Ä±n mevcut favorilerini kontrol et
    const Investor = require("../models/Investor");
    const investor =
      await Investor.findById(userId).select("favoriteProperties");

    const isFavorited =
      investor.favoriteProperties &&
      investor.favoriteProperties.some((fav) => fav.toString() === propertyId);

    if (isFavorited) {
      await this.propertyRepository.removeFromFavorites(propertyId, userId);
      return { favorited: false, message: "Removed from favorites" };
    } else {
      await this.propertyRepository.addToFavorites(propertyId, userId);
      return { favorited: true, message: "Added to favorites" };
    }
  }

  // Owner'Ä±n property'lerini getir - PAGINATION VE FÄ°LTRELEME EKLENDÄ°
  // Owner'Ä±n property'lerini getir - Owner View DTO ile
  async getPropertiesByOwner(ownerId, queryParams) {
    const options = {
      populate: "owner",
      allowedFilters: propertyFilters,
      allowedSortFields: propertySortFields,
      customFilters: { owner: ownerId },
    };

    const result = await this.propertyRepository.paginate(queryParams, options);

    return {
      data: toPropertyOwnerViewDtoArray(result.data),
      pagination: result.pagination,
    };
  }
  async getOwnerPropertyById(propertyId, ownerId, isAdmin = false) {
    let property;

    if (isAdmin) {
      // Admin: sahibine bakmadan kaydÄ± getir
      property = await this.propertyRepository.findById(propertyId, "owner");
    } else {
      // Owner: sadece kendine ait property'yi gÃ¶rebilir
      property = await this.propertyRepository.findOne({
        _id: propertyId,
        owner: ownerId,
      });
    }

    if (!property) {
      throw new Error("Property not found");
    }

    // Admin'e admin DTO, sahibi olana owner DTO
    return isAdmin
      ? toPropertyAdminViewDto(property)
      : toPropertyOwnerViewDto(property);
  }

  async checkOfficialPropertyData(propertyId) {
    const property = await this.propertyRepository.findById(propertyId, "owner");

    if (!property) {
      throw new Error("Property not found");
    }

    return this.officialPropertyDataService.checkProperty(property);
  }

  // Admin iÃ§in tÃ¼m property'ler - PAGINATION VE FÄ°LTRELEME EKLENDÄ°
  async getAllPropertiesForAdmin(queryParams) {
    const { statusMode, ...sanitizedQueryParams } = queryParams;
    const options = {
      populate: "owner",
      allowedFilters: { ...propertyFilters, status: "exact" },
      allowedSortFields: [...propertySortFields, "status"],
    };

    if (statusMode === "nonDraft" && !sanitizedQueryParams.status) {
      options.customFilters = {
        status: { $ne: "draft" },
      };
    }

    const result = await this.propertyRepository.paginate(
      sanitizedQueryParams,
      options,
    );
    return {
      data: result.data.map((p) => toPropertyAdminViewDto(p)),
      pagination: result.pagination,
    };
  }

  // Property durumunu deÄŸiÅŸtir (Admin only)
  async updatePropertyStatus(propertyId, newStatus, reviewNotes = "") {
    const validStatuses = [
      "draft",
      "pending_review",
      "published",
      "in_contract",
      "active",
      "completed",
      "on_resale",
      "rejected",
    ];

    if (!validStatuses.includes(newStatus)) {
      throw new Error("Invalid status");
    }

    const property = await this.propertyRepository.updateStatus(
      propertyId,
      newStatus,
    );

    if (reviewNotes) {
      await this.propertyRepository.update(propertyId, { reviewNotes });
    }

    return toPropertyAdminViewDto(property);
  }

  // Property'yi iÅŸaretle - Admin iÃ§in
  async flagProperty(propertyId, issues, action = "add") {
    const property = await this.propertyRepository.findById(propertyId);

    if (!property) {
      throw new Error("Property not found");
    }

    let updatedFlaggedIssues = property.flaggedIssues || [];

    if (action === "add") {
      // Yeni issue'larÄ± ekle (duplicate olmayanlarÄ±)
      issues.forEach((issue) => {
        if (!updatedFlaggedIssues.includes(issue)) {
          updatedFlaggedIssues.push(issue);
        }
      });
    } else if (action === "remove") {
      // Issue'larÄ± kaldÄ±r
      updatedFlaggedIssues = updatedFlaggedIssues.filter(
        (issue) => !issues.includes(issue),
      );
    }

    const updatedProperty = await this.propertyRepository.update(propertyId, {
      flaggedIssues: updatedFlaggedIssues,
    });

    return toPropertyAdminViewDto(updatedProperty);
  }

  // Ä°statistikleri getir
  async getPropertyStatistics(propertyId) {
    return await this.propertyRepository.getPropertyStatistics(propertyId);
  }

  // Owner'Ä±n tÃ¼m property'lerinin istatistiklerini getir
  async getOwnerPropertiesStatistics(ownerId) {
    const properties = await this.propertyRepository.findByOwner(ownerId);

    const statistics = properties.map((property) => ({
      propertyId: property._id,
      address: property.fullAddress,
      city: property.city,
      country: property.country,
      status: property.status,
      viewCount: property.viewCount || 0,
      favoriteCount: property.favoriteCount || 0,
      investmentOfferCount: property.investmentOfferCount || 0,
      createdAt: property.createdAt,
      // Performans gÃ¶stergeleri
      viewsPerDay:
        property.viewCount /
        Math.max(
          1,
          Math.floor((Date.now() - property.createdAt) / (1000 * 60 * 60 * 24)),
        ),
      conversionRate:
        property.investmentOfferCount > 0
          ? (
              ((property.status === "in_contract" ||
              property.status === "active"
                ? 1
                : 0) /
                property.investmentOfferCount) *
              100
            ).toFixed(2)
          : 0,
    }));

    // Ã–zet istatistikler
    const summary = {
      totalProperties: properties.length,
      totalViews: statistics.reduce((sum, stat) => sum + stat.viewCount, 0),
      totalFavorites: statistics.reduce(
        (sum, stat) => sum + stat.favoriteCount,
        0,
      ),
      totalOffers: statistics.reduce(
        (sum, stat) => sum + stat.investmentOfferCount,
        0,
      ),
      averageViewsPerProperty: (
        statistics.reduce((sum, stat) => sum + stat.viewCount, 0) /
        properties.length
      ).toFixed(2),
      propertiesByStatus: properties.reduce((acc, prop) => {
        acc[prop.status] = (acc[prop.status] || 0) + 1;
        return acc;
      }, {}),
    };

    return {
      properties: statistics,
      summary,
    };
  }

  // Harita iÃ§in property'leri getir - sadece lokasyon ve temel bilgiler
  async getPropertiesForMap(queryParams, userId = null) {
    const options = {
      select:
        "country city locationPin requestedInvestment annualYieldPercent propertyType status",
      allowedFilters: {
        country: "exact",
        city: "contains",
        propertyType: "exact",
        requestedInvestment: "numberRange",
        annualYieldPercent: "numberRange",
      },
      customFilters: { status: "published" },
    };

    const result = await this.propertyRepository.paginate(queryParams, options);

    // Harita iÃ§in basitleÅŸtirilmiÅŸ data
    const mapData = result.data.map((p) => ({
      id: p._id,
      location: {
        country: p.country,
        city: p.city,
        coordinates: p.locationPin,
      },
      basicInfo: {
        type: p.propertyType,
        investment: p.requestedInvestment,
        yield: p.annualYieldPercent,
      },
    }));

    return mapData;
  }

  // Ã–ne Ã§Ä±kan property'leri getir
  async getFeaturedProperties(queryParams = {}, userId = null) {
    const options = {
      populate: "owner",
      allowedFilters: propertyFilters,
      customFilters: {
        status: "published",
        isFeatured: true,
        featuredUntil: { $gte: new Date() }, // Ã–ne Ã§Ä±karma sÃ¼resi dolmamÄ±ÅŸ olanlar
      },
      allowedSortFields: ["featuredAt", "createdAt"],
    };

    // VarsayÄ±lan olarak Ã¶ne Ã§Ä±karÄ±ldÄ±ÄŸÄ± tarihe gÃ¶re sÄ±rala
    if (!queryParams.sortBy) {
      queryParams.sortBy = "featuredAt";
      queryParams.sortOrder = "desc";
    }

    const result = await this.propertyRepository.paginate(queryParams, options);

    const dtoArray = userId
      ? toPropertyInvestorViewDtoArray(result.data, userId)
      : toPropertyListDtoArray(result.data);

    return {
      data: dtoArray,
      pagination: result.pagination,
    };
  }

  // Property'yi Ã¶ne Ã§Ä±kar (Ã¼cretli Ã¶zellik)
  async featureProperty(propertyId, ownerId, durationWeeks = 1) {
    const property = await this.propertyRepository.findById(propertyId);

    if (!property) {
      throw new Error("Property not found");
    }

    // Ownership kontrolÃ¼
    if (property.owner.toString() !== ownerId.toString()) {
      throw new Error("Unauthorized to feature this property");
    }

    // Sadece published property'ler Ã¶ne Ã§Ä±karÄ±labilir
    if (property.status !== "published") {
      throw new Error("Only published properties can be featured");
    }

    // Ã–ne Ã§Ä±karma sÃ¼resi hesaplama
    const featuredUntil = new Date();
    featuredUntil.setDate(featuredUntil.getDate() + durationWeeks * 7);

    const updatedProperty = await this.propertyRepository.update(propertyId, {
      isFeatured: true,
      featuredAt: new Date(),
      featuredUntil: featuredUntil,
      featuredWeeks: durationWeeks,
    });

    return {
      property: toPropertyDetailDto(updatedProperty),
      featuredUntil: featuredUntil,
      price: durationWeeks * 49, // PDF'e gÃ¶re haftalÄ±k 49 EUR
    };
  }

  // Investor'Ä±n favori property'lerini getir
  async getFavoriteProperties(investorId, queryParams) {
    // Ã–nce investor'Ä±n favori property id'lerini bul
    const Investor = require("../models/Investor");
    const investor =
      await Investor.findById(investorId).select("favoriteProperties");

    if (
      !investor ||
      !investor.favoriteProperties ||
      investor.favoriteProperties.length === 0
    ) {
      return {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    // Favori property'leri getir
    const options = {
      populate: "owner",
      allowedFilters: propertyFilters,
      allowedSortFields: propertySortFields,
      customFilters: {
        _id: { $in: investor.favoriteProperties },
        // Favori listesinde olsa bile sadece published olanlarÄ± gÃ¶ster
        status: "published",
      },
    };

    const result = await this.propertyRepository.paginate(queryParams, options);

    // Investor view DTO'su ile dÃ¶n
    const dtoArray = toPropertyInvestorViewDtoArray(result.data, investorId);

    return {
      data: dtoArray,
      pagination: result.pagination,
    };
  }

  // ==================== GEOCODING & MAP FEATURES ====================

  /**
   * Property oluştururken veya güncellerken koordinat validasyonu ve fallback
   * Frontend'den koordinat gelmezse, adres üzerinden geocoding yap
   */
  async validateAndGeocode(propertyData) {
    const { locationPin, fullAddress, city, country, mapSearchAddress } =
      propertyData;
    const geocodeAddress = this.buildGeocodeInput(
      fullAddress,
      city,
      country,
      mapSearchAddress,
    );

    // Eğer koordinat varsa, validate et
    if (locationPin && locationPin.lat && locationPin.lng) {
      const isValid = geocodingService.validateCoordinates(
        locationPin.lat,
        locationPin.lng,
      );

      if (!isValid) {
        throw new Error(
          "Invalid coordinates provided. Latitude must be between -90 and 90, longitude between -180 and 180",
        );
      }

      // Türkiye sınırları kontrolü (isteğe bağlı - sadece uyarı)
      if (country === "TR" || country === "Turkey") {
        const inTurkey = geocodingService.isInTurkey(
          locationPin.lat,
          locationPin.lng,
        );
        if (!inTurkey) {
          console.warn(
            `⚠️ WARNING: Coordinates for Turkish property seem to be outside Turkey borders`,
          );
        }
      }

      return locationPin;
    }

    // Koordinat yoksa, adresten geocode et (FALLBACK)
    if (fullAddress) {
      try {
        const geocoded = await geocodingService.geocode(geocodeAddress);
        if (geocoded) {
          return {
            lat: geocoded.lat,
            lng: geocoded.lng,
          };
        }
      } catch (error) {
        console.warn("Geocoding fallback failed:", error.message);
      }
    }

    // Son çare: city + country ile geocode dene
    if (city && country) {
      try {
        const geocoded = await geocodingService.geocode({
          city,
          country,
        });
        if (geocoded) {
          return {
            lat: geocoded.lat,
            lng: geocoded.lng,
          };
        }
      } catch (error) {
        console.warn("City geocoding fallback failed:", error.message);
      }
    }

    // Hiçbir şekilde koordinat bulunamadı - null döndür
    return null;
  }

  /**
   * Reverse geocoding - Koordinatlardan adres bilgisi al
   * Admin veya owner için eksik adres bilgilerini doldurma
   */
  async fillAddressFromCoordinates(propertyId) {
    const property = await this.propertyRepository.findById(propertyId);

    if (!property) {
      throw new Error("Property not found");
    }

    if (!property.locationPin || !property.locationPin.lat) {
      throw new Error("Property does not have coordinates");
    }

    const addressData = await geocodingService.reverseGeocode(
      property.locationPin.lat,
      property.locationPin.lng,
    );

    if (!addressData) {
      throw new Error("Could not reverse geocode coordinates");
    }

    // Eksik bilgileri doldur
    const updates = {};
    if (!property.fullAddress && addressData.address) {
      updates.fullAddress = addressData.address;
    }
    if (!property.city && addressData.city) {
      updates.city = addressData.city;
    }
    if (!property.country && addressData.country) {
      updates.country = addressData.country;
    }

    if (Object.keys(updates).length > 0) {
      const updated = await this.propertyRepository.update(propertyId, updates);
      return toPropertyDetailDto(updated);
    }

    return toPropertyDetailDto(property);
  }

  /**
   * Yakındaki property'leri getir - Google Maps "Yakınımdakiler" özelliği
   */
  async getNearbyProperties(lat, lng, radiusKm = 50, filters = {}) {
    // Koordinat validasyonu
    if (!geocodingService.validateCoordinates(lat, lng)) {
      throw new Error("Invalid coordinates");
    }

    const additionalFilters = {
      status: "published",
      ...filters,
    };

    const nearbyProperties = await this.propertyRepository.findNearby(
      lat,
      lng,
      radiusKm,
      additionalFilters,
    );

    return nearbyProperties.map((property) => ({
      ...toPropertyListDto(property),
      distance: property.distanceKm,
      distanceUnit: "km",
    }));
  }

  /**
   * Harita bounds içindeki property'leri getir
   */
  async getPropertiesInBounds(bounds, filters = {}) {
    const { north, south, east, west } = bounds;

    // Bounds validasyonu
    if (
      !geocodingService.validateCoordinates(north, east) ||
      !geocodingService.validateCoordinates(south, west)
    ) {
      throw new Error("Invalid map bounds");
    }

    const additionalFilters = {
      status: "published",
      ...filters,
    };

    const properties = await this.propertyRepository.findWithinBounds(
      bounds,
      additionalFilters,
    );

    return toPropertyListDtoArray(properties);
  }

  /**
   * Koordinatı eksik olan property'leri geocode et (Admin task)
   */
  async geocodeMissingProperties() {
    const propertiesWithoutCoords =
      await this.propertyRepository.findMissingCoordinates();

    const results = {
      total: propertiesWithoutCoords.length,
      success: 0,
      failed: 0,
      details: [],
    };

    for (const property of propertiesWithoutCoords) {
      try {
        const address = property.fullAddress || `${city}, ${property.country}`;
        const geocoded = await geocodingService.geocode(address);

        if (geocoded) {
          await this.propertyRepository.update(property._id, {
            locationPin: {
              lat: geocoded.lat,
              lng: geocoded.lng,
            },
          });

          results.success++;
          results.details.push({
            propertyId: property._id,
            address: address,
            success: true,
            coordinates: { lat: geocoded.lat, lng: geocoded.lng },
          });
        } else {
          results.failed++;
          results.details.push({
            propertyId: property._id,
            address: address,
            success: false,
            error: "No results from geocoding",
          });
        }

        // Rate limiting
        await geocodingService.delay(200);
      } catch (error) {
        results.failed++;
        results.details.push({
          propertyId: property._id,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }
}

module.exports = PropertyService;
