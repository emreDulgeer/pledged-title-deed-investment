// server/controllers/propertyController.js

const PropertyService = require("../services/propertyService");
const responseWrapper = require("../utils/responseWrapper");

class PropertyController {
  constructor() {
    this.propertyService = new PropertyService();
  }

  // Public property listesi - PDF'e göre ülke bazlı kategorileme ve filtreleme
  getProperties = async (req, res) => {
    try {
      const userId = req.user?.id || null;

      // PDF'e göre varsayılan olarak kullanıcının tercih ettiği ülke gösterilebilir
      // Eğer user varsa ve country parametresi yoksa, user'ın ülkesini default yap
      if (userId && req.user.country && !req.query.country) {
        req.query.country = req.user.country;
      }

      const result = await this.propertyService.getPublicProperties(
        req.query,
        userId
      );

      return responseWrapper.paginated(
        res,
        result.data,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Properties fetched successfully"
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Harita üzerinde property'leri getir - PDF'e göre
  getPropertiesForMap = async (req, res) => {
    try {
      const userId = req.user?.id || null;

      // Harita için sadece lokasyon bilgileri ve temel bilgiler döndürülür
      const properties = await this.propertyService.getPropertiesForMap(
        req.query,
        userId
      );

      return responseWrapper.success(
        res,
        properties,
        "Properties for map fetched successfully"
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Öne çıkan property'leri getir - PDF'e göre featured listings
  getFeaturedProperties = async (req, res) => {
    try {
      const userId = req.user?.id || null;
      const featured = await this.propertyService.getFeaturedProperties(
        req.query,
        userId
      );

      return responseWrapper.success(
        res,
        featured,
        "Featured properties fetched successfully"
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Tek property detayı
  getPropertyById = async (req, res) => {
    try {
      const userId = req.user?.id || null;
      const isAdmin = req.user?.role === "admin";

      const property = await this.propertyService.getPropertyById(
        req.params.id,
        userId,
        isAdmin
      );

      return responseWrapper.success(res, property, "Property details fetched");
    } catch (error) {
      if (error.message === "Property not found") {
        return responseWrapper.notFound(res, "Property not found");
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Yeni property oluştur
  createProperty = async (req, res) => {
    try {
      const ownerId = req.user.id; // Auth middleware'den geliyor
      const property = await this.propertyService.createProperty(
        req.body,
        ownerId
      );

      return responseWrapper.created(
        res,
        property,
        "Property created successfully"
      );
    } catch (error) {
      if (error.message.includes("Minimum")) {
        return responseWrapper.badRequest(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Property güncelle
  updateProperty = async (req, res) => {
    try {
      const ownerId = req.user.id;
      const isAdmin = req.user.role === "admin";

      const property = await this.propertyService.updateProperty(
        req.params.id,
        req.body,
        ownerId,
        isAdmin
      );

      return responseWrapper.updated(
        res,
        property,
        "Property updated successfully"
      );
    } catch (error) {
      if (error.message === "Property not found") {
        return responseWrapper.notFound(res, "Property not found");
      }
      if (error.message.includes("Unauthorized")) {
        return responseWrapper.forbidden(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Property sil
  deleteProperty = async (req, res) => {
    try {
      const ownerId = req.user.id;
      const isAdmin = req.user.role === "admin";

      const result = await this.propertyService.deleteProperty(
        req.params.id,
        ownerId,
        isAdmin
      );

      return responseWrapper.deleted(res, result.message);
    } catch (error) {
      if (error.message === "Property not found") {
        return responseWrapper.notFound(res, "Property not found");
      }
      if (error.message.includes("Unauthorized")) {
        return responseWrapper.forbidden(res, error.message);
      }
      if (error.message.includes("Cannot delete")) {
        return responseWrapper.badRequest(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Favorilere ekle/çıkar
  toggleFavorite = async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await this.propertyService.toggleFavorite(
        req.params.id,
        userId
      );

      return responseWrapper.success(res, result, result.message);
    } catch (error) {
      if (error.message === "Property not found") {
        return responseWrapper.notFound(res, "Property not found");
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Investor'ın favori property'lerini getir
  getFavoriteProperties = async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await this.propertyService.getFavoriteProperties(
        userId,
        req.query
      );

      return responseWrapper.paginated(
        res,
        result.data,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Favorite properties fetched successfully"
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Owner'ın kendi property'leri - Pagination ve filtreleme destekli
  getMyProperties = async (req, res) => {
    try {
      const ownerId = req.user.id;
      const result = await this.propertyService.getPropertiesByOwner(
        ownerId,
        req.query
      );

      return responseWrapper.paginated(
        res,
        result.data,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Your properties fetched successfully"
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Owner'ın tek property detayı - Admin notları dahil
  getMyPropertyById = async (req, res) => {
    try {
      const ownerId = req.user.id;
      const isAdmin = req.user.role === "admin";

      const property = await this.propertyService.getOwnerPropertyById(
        req.params.id,
        ownerId,
        isAdmin
      );

      return responseWrapper.success(res, property, "Property details fetched");
    } catch (error) {
      if (error.message === "Property not found") {
        return responseWrapper.notFound(res, "Property not found");
      }
      if (error.message.includes("Unauthorized")) {
        return responseWrapper.forbidden(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Admin: Tüm property'ler - Pagination ve filtreleme destekli
  getAllProperties = async (req, res) => {
    try {
      const result = await this.propertyService.getAllPropertiesForAdmin(
        req.query
      );

      return responseWrapper.paginated(
        res,
        result.data,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "All properties fetched"
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Admin: Property durumunu değiştir
  updatePropertyStatus = async (req, res) => {
    try {
      const { status, reviewNotes } = req.body;
      const property = await this.propertyService.updatePropertyStatus(
        req.params.id,
        status,
        reviewNotes
      );

      return responseWrapper.success(res, property, "Property status updated");
    } catch (error) {
      if (error.message === "Invalid status") {
        return responseWrapper.badRequest(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Admin: Property'yi işaretle (flag)
  flagProperty = async (req, res) => {
    try {
      const { issues, action } = req.body; // issues: array, action: 'add' veya 'remove'
      const property = await this.propertyService.flagProperty(
        req.params.id,
        issues,
        action
      );

      return responseWrapper.success(
        res,
        property,
        "Property flagged successfully"
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Property istatistiklerini getir - PDF'e göre owner için
  getPropertyStatistics = async (req, res) => {
    try {
      const stats = await this.propertyService.getPropertyStatistics(
        req.params.id
      );

      return responseWrapper.success(res, stats, "Property statistics fetched");
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Owner'ın tüm property'lerinin istatistiklerini getir
  getMyPropertiesStatistics = async (req, res) => {
    try {
      const ownerId = req.user.id;
      const stats = await this.propertyService.getOwnerPropertiesStatistics(
        ownerId
      );

      return responseWrapper.success(
        res,
        stats,
        "Properties statistics fetched successfully"
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Property'yi öne çıkar - PDF'e göre featured listing
  featureProperty = async (req, res) => {
    try {
      const { duration } = req.body; // Hafta cinsinden süre
      const result = await this.propertyService.featureProperty(
        req.params.id,
        req.user.id,
        duration
      );

      return responseWrapper.success(
        res,
        result,
        "Property featured successfully"
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };
}

module.exports = new PropertyController();
