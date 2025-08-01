const Property = require("../models/Property");
const BaseRepository = require("./baseRepository");

class PropertyRepository extends BaseRepository {
  constructor() {
    super(Property);
  }

  // Property'ye özel sorgular
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
      { new: true }
    );
  }

  async incrementViewCount(id) {
    return await this.model.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );
  }

  async addToFavorites(propertyId, userId) {
    // Property'nin favorites array'ine user'ı ekle
    await this.model.findByIdAndUpdate(
      propertyId,
      {
        $addToSet: { favorites: userId },
        $inc: { favoriteCount: 1 },
      },
      { new: true }
    );

    // Investor'ın favoriteProperties array'ine property'yi ekle
    const Investor = require("../models/Investor");
    await Investor.findByIdAndUpdate(
      userId,
      { $addToSet: { favoriteProperties: propertyId } },
      { new: true }
    );

    return true;
  }

  async removeFromFavorites(propertyId, userId) {
    // Property'nin favorites array'inden user'ı çıkar
    await this.model.findByIdAndUpdate(
      propertyId,
      {
        $pull: { favorites: userId },
        $inc: { favoriteCount: -1 },
      },
      { new: true }
    );

    // Investor'ın favoriteProperties array'inden property'yi çıkar
    const Investor = require("../models/Investor");
    await Investor.findByIdAndUpdate(
      userId,
      { $pull: { favoriteProperties: propertyId } },
      { new: true }
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
}
module.exports = PropertyRepository;
