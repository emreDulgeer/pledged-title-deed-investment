const Property = require("../models/Property");
const BaseRepository = require("./baseRepository");

class PropertyRepository extends BaseRepository {
  constructor() {
    super(Property);
  }

  // Property'ye Ã¶zel sorgular
  async findByCountry(country) {
    return await this.model
      .find({ country, status: "published" })
      .populate("owner");
  }

  async findByOwner(ownerId) {
    return await this.model.find({ owner: ownerId }).populate("owner");
  }

  async findPublished(filters = {}) {
    return await this.model
      .find({ ...filters, status: "published" })
      .populate("owner");
  }

  async findByPriceRange(minPrice, maxPrice) {
    return await this.model
      .find({
        requestedInvestment: { $gte: minPrice, $lte: maxPrice },
        status: "published",
      })
      .populate("owner");
  }

  async findByYieldRange(minYield, maxYield) {
    return await this.model
      .find({
        annualYieldPercent: { $gte: minYield, $lte: maxYield },
        status: "published",
      })
      .populate("owner");
  }

  async updateStatus(id, status) {
    return await this.model.findByIdAndUpdate(
      id,
      { status, lastStatusChange: new Date() },
      { new: true },
    );
  }

  async incrementViewCount(id) {
    return await this.model.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: true },
    );
  }

  async addToFavorites(propertyId, userId) {
    // Property'nin favorites array'ine user'Ä± ekle
    await this.model.findByIdAndUpdate(
      propertyId,
      {
        $addToSet: { favorites: userId },
        $inc: { favoriteCount: 1 },
      },
      { new: true },
    );

    // Investor'Ä±n favoriteProperties array'ine property'yi ekle
    const Investor = require("../models/Investor");
    await Investor.findByIdAndUpdate(
      userId,
      { $addToSet: { favoriteProperties: propertyId } },
      { new: true },
    );

    return true;
  }

  async removeFromFavorites(propertyId, userId) {
    // Property'nin favorites array'inden user'Ä± Ã§Ä±kar
    await this.model.findByIdAndUpdate(
      propertyId,
      {
        $pull: { favorites: userId },
        $inc: { favoriteCount: -1 },
      },
      { new: true },
    );

    // Investor'Ä±n favoriteProperties array'inden property'yi Ã§Ä±kar
    const Investor = require("../models/Investor");
    await Investor.findByIdAndUpdate(
      userId,
      { $pull: { favoriteProperties: propertyId } },
      { new: true },
    );

    return true;
  }

  async getPropertyStatistics(propertyId) {
    const property = await this.model.findById(propertyId);
    if (!property) return null;

    return {
      viewCount: property.viewCount || 0,
      favoriteCount: property.favoriteCount || 0,
      investmentOfferCount: property.investmentOfferCount || 0,
    };
  }

  /**
   * Belirli bir koordinattan belirli mesafe içindeki property'leri getir
   * @param {number} lat - Merkez latitude
   * @param {number} lng - Merkez longitude
   * @param {number} maxDistanceKm - Maximum mesafe (km)
   * @param {object} additionalFilters - Ek filtreler (status, propertyType vb.)
   * @returns {Promise<Array>} Property'ler ve mesafeleri
   */
  async findNearby(lat, lng, maxDistanceKm = 50, additionalFilters = {}) {
    const maxDistanceMeters = maxDistanceKm * 1000;

    return await this.model.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [lng, lat], // GeoJSON formatı [longitude, latitude]
          },
          distanceField: "distance",
          maxDistance: maxDistanceMeters,
          spherical: true,
          query: {
            "locationPin.lat": { $exists: true },
            "locationPin.lng": { $exists: true },
            ...additionalFilters,
          },
        },
      },
      {
        $addFields: {
          distanceKm: { $round: [{ $divide: ["$distance", 1000] }, 2] },
        },
      },
      {
        $sort: { distance: 1 },
      },
    ]);
  }

  /**
   * Belirli bir alan (bbox) içindeki property'leri getir
   * @param {object} bounds - { north, south, east, west }
   * @returns {Promise<Array>}
   */
  async findWithinBounds(bounds, additionalFilters = {}) {
    const { north, south, east, west } = bounds;

    return await this.model.find({
      "locationPin.lat": { $gte: south, $lte: north },
      "locationPin.lng": { $gte: west, $lte: east },
      ...additionalFilters,
    });
  }

  /**
   * Koordinatları eksik olan property'leri getir (geocoding için)
   * @returns {Promise<Array>}
   */
  async findMissingCoordinates() {
    return await this.model.find({
      $or: [
        { "locationPin.lat": { $exists: false } },
        { "locationPin.lng": { $exists: false } },
        { locationPin: null },
      ],
      fullAddress: { $exists: true, $ne: "" },
    });
  }
}
module.exports = PropertyRepository;
