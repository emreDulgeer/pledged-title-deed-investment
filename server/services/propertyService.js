// server/services/propertyService.js

const PropertyRepository = require("../repositories/propertyRepository");
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

class PropertyService {
  constructor() {
    this.propertyRepository = new PropertyRepository();
  }

  // Public listings için - TÜM FİLTRELER EKLENDI
  async getPublicProperties(queryParams, userId = null) {
    // PDF'e göre: country, city, propertyType, yield range, investment range, contract period filtrelemeleri
    const options = {
      populate: "owner",
      allowedFilters: propertyFilters,
      allowedSortFields: propertySortFields,
      customFilters: { status: "published" },
    };

    const result = await this.propertyRepository.paginate(queryParams, options);

    // Eğer userId varsa investor view, yoksa normal list view
    const dtoArray = userId
      ? toPropertyInvestorViewDtoArray(result.data, userId)
      : toPropertyListDtoArray(result.data);

    return {
      data: dtoArray,
      pagination: result.pagination,
    };
  }

  // Property detayını getir
  // Property detayını getir
  async getPropertyById(propertyId, userId = null, isAdmin = false) {
    const property = await this.propertyRepository.findById(
      propertyId,
      "owner"
    );

    if (!property) {
      throw new Error("Property not found");
    }

    // PUBLIC endpoint güvenliği:
    // published değilse ve admin/owner değilse 404 ver
    const isOwner =
      userId &&
      property.owner &&
      property.owner.toString() === userId.toString();

    if (property.status !== "published" && !isAdmin && !isOwner) {
      // Varlığı gizlemek için 404
      throw new Error("Property not found");
    }

    // View count sadece published için artsın
    if (property.status === "published") {
      await this.propertyRepository.incrementViewCount(propertyId);
    }

    // Role/kimlik durumuna göre DTO seçimi
    if (isAdmin) {
      return toPropertyAdminViewDto(property);
    } else if (userId) {
      return toPropertyInvestorViewDto(property, userId);
    } else {
      return toPropertyDetailDto(property);
    }
  }

  // Yeni property oluştur
  async createProperty(propertyData, ownerId) {
    // Business logic validations
    if (propertyData.requestedInvestment < 10000) {
      throw new Error("Minimum yatırım tutarı 10,000 EUR olmalıdır");
    }

    if (propertyData.contractPeriodMonths < 12) {
      throw new Error("Minimum kontrat süresi 12 ay olmalıdır");
    }

    const newProperty = await this.propertyRepository.create({
      ...propertyData,
      owner: ownerId,
      status: "draft",
    });

    return toPropertyDetailDto(newProperty);
  }

  // Property güncelle
  async updateProperty(propertyId, updateData, ownerId, isAdmin = false) {
    const property = await this.propertyRepository.findById(propertyId);

    if (!property) {
      throw new Error("Property not found");
    }

    // Ownership kontrolü (admin değilse)
    if (!isAdmin && property.owner.toString() !== ownerId.toString()) {
      throw new Error("Unauthorized to update this property");
    }

    // Status değişimi business logic
    if (updateData.status && !isAdmin) {
      delete updateData.status; // Sadece admin status değiştirebilir
    }

    const updatedProperty = await this.propertyRepository.update(
      propertyId,
      updateData
    );
    return toPropertyDetailDto(updatedProperty);
  }

  // Property sil
  async deleteProperty(propertyId, ownerId, isAdmin = false) {
    const property = await this.propertyRepository.findById(propertyId);

    if (!property) {
      throw new Error("Property not found");
    }

    // Ownership kontrolü
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

  // Property'yi favorilere ekle/çıkar
  async toggleFavorite(propertyId, userId) {
    const property = await this.propertyRepository.findById(propertyId);

    if (!property) {
      throw new Error("Property not found");
    }

    // Sadece published property'ler favorilere eklenebilir
    if (property.status !== "published") {
      throw new Error("Only published properties can be added to favorites");
    }

    // Investor'ın mevcut favorilerini kontrol et
    const Investor = require("../models/Investor");
    const investor = await Investor.findById(userId).select(
      "favoriteProperties"
    );

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

  // Owner'ın property'lerini getir - PAGINATION VE FİLTRELEME EKLENDİ
  // Owner'ın property'lerini getir - Owner View DTO ile
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
      // Admin: sahibine bakmadan kaydı getir
      property = await this.propertyRepository.findById(propertyId, "owner");
    } else {
      // Owner: sadece kendine ait property'yi görebilir
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

  // Admin için tüm property'ler - PAGINATION VE FİLTRELEME EKLENDİ
  async getAllPropertiesForAdmin(queryParams) {
    const options = {
      populate: "owner",
      allowedFilters: { ...propertyFilters, status: "exact" },
      allowedSortFields: [...propertySortFields, "status"],
    };

    const result = await this.propertyRepository.paginate(queryParams, options);
    return {
      data: result.data.map((p) => toPropertyAdminViewDto(p)),
      pagination: result.pagination,
    };
  }

  // Property durumunu değiştir (Admin only)
  async updatePropertyStatus(propertyId, newStatus, reviewNotes = "") {
    const validStatuses = [
      "draft",
      "pending_review",
      "published",
      "in_contract",
      "active",
      "completed",
      "on_resale",
    ];

    if (!validStatuses.includes(newStatus)) {
      throw new Error("Invalid status");
    }

    const property = await this.propertyRepository.updateStatus(
      propertyId,
      newStatus
    );

    if (reviewNotes) {
      await this.propertyRepository.update(propertyId, { reviewNotes });
    }

    return toPropertyAdminViewDto(property);
  }

  // Property'yi işaretle - Admin için
  async flagProperty(propertyId, issues, action = "add") {
    const property = await this.propertyRepository.findById(propertyId);

    if (!property) {
      throw new Error("Property not found");
    }

    let updatedFlaggedIssues = property.flaggedIssues || [];

    if (action === "add") {
      // Yeni issue'ları ekle (duplicate olmayanları)
      issues.forEach((issue) => {
        if (!updatedFlaggedIssues.includes(issue)) {
          updatedFlaggedIssues.push(issue);
        }
      });
    } else if (action === "remove") {
      // Issue'ları kaldır
      updatedFlaggedIssues = updatedFlaggedIssues.filter(
        (issue) => !issues.includes(issue)
      );
    }

    const updatedProperty = await this.propertyRepository.update(propertyId, {
      flaggedIssues: updatedFlaggedIssues,
    });

    return toPropertyAdminViewDto(updatedProperty);
  }

  // İstatistikleri getir
  async getPropertyStatistics(propertyId) {
    return await this.propertyRepository.getPropertyStatistics(propertyId);
  }

  // Owner'ın tüm property'lerinin istatistiklerini getir
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
      // Performans göstergeleri
      viewsPerDay:
        property.viewCount /
        Math.max(
          1,
          Math.floor((Date.now() - property.createdAt) / (1000 * 60 * 60 * 24))
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

    // Özet istatistikler
    const summary = {
      totalProperties: properties.length,
      totalViews: statistics.reduce((sum, stat) => sum + stat.viewCount, 0),
      totalFavorites: statistics.reduce(
        (sum, stat) => sum + stat.favoriteCount,
        0
      ),
      totalOffers: statistics.reduce(
        (sum, stat) => sum + stat.investmentOfferCount,
        0
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

  // Harita için property'leri getir - sadece lokasyon ve temel bilgiler
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

    // Harita için basitleştirilmiş data
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

  // Öne çıkan property'leri getir
  async getFeaturedProperties(queryParams = {}, userId = null) {
    const options = {
      populate: "owner",
      allowedFilters: propertyFilters,
      customFilters: {
        status: "published",
        isFeatured: true,
        featuredUntil: { $gte: new Date() }, // Öne çıkarma süresi dolmamış olanlar
      },
      allowedSortFields: ["featuredAt", "createdAt"],
    };

    // Varsayılan olarak öne çıkarıldığı tarihe göre sırala
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

  // Property'yi öne çıkar (ücretli özellik)
  async featureProperty(propertyId, ownerId, durationWeeks = 1) {
    const property = await this.propertyRepository.findById(propertyId);

    if (!property) {
      throw new Error("Property not found");
    }

    // Ownership kontrolü
    if (property.owner.toString() !== ownerId.toString()) {
      throw new Error("Unauthorized to feature this property");
    }

    // Sadece published property'ler öne çıkarılabilir
    if (property.status !== "published") {
      throw new Error("Only published properties can be featured");
    }

    // Öne çıkarma süresi hesaplama
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
      price: durationWeeks * 49, // PDF'e göre haftalık 49 EUR
    };
  }

  // Investor'ın favori property'lerini getir
  async getFavoriteProperties(investorId, queryParams) {
    // Önce investor'ın favori property id'lerini bul
    const Investor = require("../models/Investor");
    const investor = await Investor.findById(investorId).select(
      "favoriteProperties"
    );

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
        // Favori listesinde olsa bile sadece published olanları göster
        status: "published",
      },
    };

    const result = await this.propertyRepository.paginate(queryParams, options);

    // Investor view DTO'su ile dön
    const dtoArray = toPropertyInvestorViewDtoArray(result.data, investorId);

    return {
      data: dtoArray,
      pagination: result.pagination,
    };
  }
}

module.exports = PropertyService;
