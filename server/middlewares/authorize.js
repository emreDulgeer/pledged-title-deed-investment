// server/middlewares/authorize.js

const responseWrapper = require("../utils/responseWrapper");

/**
 * Role-based authorization middleware
 * @param {string|string[]} allowedRoles - İzin verilen rol(ler)
 * @param {Object} options - Ek kontrol seçenekleri
 */
const authorize = (allowedRoles, options = {}) => {
  return (req, res, next) => {
    // Auth middleware'den gelen user kontrolü
    if (!req.user) {
      return responseWrapper.unauthorized(res, "Authentication gerekli");
    }

    // String'i array'e çevir
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // Role mapping (route'larda daha okunabilir olması için)
    const roleMapping = {
      propertyOwner: "property_owner",
      localRepresentative: "local_representative",
      investor: "investor",
      admin: "admin",
    };

    // Map roles
    const mappedRoles = roles.map((role) => roleMapping[role] || role);

    // Admin her zaman yetkili
    if (req.user.role === "admin") {
      // Admin access level kontrolü (opsiyonel)
      if (options.adminLevel && req.userDetails) {
        const requiredLevels = Array.isArray(options.adminLevel)
          ? options.adminLevel
          : [options.adminLevel];

        if (!requiredLevels.includes(req.userDetails.accessLevel)) {
          return responseWrapper.forbidden(
            res,
            `Bu işlem için ${requiredLevels.join(
              " veya "
            )} admin yetkisi gerekli`
          );
        }
      }
      return next();
    }

    // Role kontrolü
    if (!mappedRoles.includes(req.user.role)) {
      return responseWrapper.forbidden(
        res,
        `Bu işlem için ${roles.join(" veya ")} yetkisi gerekli`
      );
    }

    // Membership plan kontrolü (opsiyonel)
    if (options.minMembershipPlan) {
      const planHierarchy = {
        Basic: 1,
        Pro: 2,
        Enterprise: 3,
      };

      const userPlanLevel = planHierarchy[req.user.membershipPlan] || 1;
      const requiredPlanLevel = planHierarchy[options.minMembershipPlan] || 1;

      if (userPlanLevel < requiredPlanLevel) {
        return responseWrapper.forbidden(
          res,
          `Bu işlem için minimum ${options.minMembershipPlan} üyelik gerekli`
        );
      }
    }

    // Investment limit kontrolü (investor için)
    if (options.checkInvestmentLimit && req.user.role === "investor") {
      // Bu kontrol service layer'da yapılmalı, burada sadece flag
      req.checkInvestmentLimit = true;
    }

    next();
  };
};

// Yardımcı middleware'ler
authorize.isOwner = (resourceType) => {
  return async (req, res, next) => {
    if (!req.user) {
      return responseWrapper.unauthorized(res, "Authentication gerekli");
    }

    // Admin her şeye erişebilir
    if (req.user.role === "admin") {
      return next();
    }

    try {
      let isOwner = false;

      switch (resourceType) {
        case "property":
          const Property = require("../models/Property");
          const property = await Property.findById(req.params.id);
          isOwner = property && property.owner.toString() === req.user.id;
          break;

        case "investment":
          const Investment = require("../models/Investment");
          const investment = await Investment.findById(req.params.id);
          isOwner =
            investment &&
            (investment.investor.toString() === req.user.id ||
              investment.propertyOwner.toString() === req.user.id);
          break;

        // Diğer resource'lar eklenebilir
      }

      if (!isOwner) {
        return responseWrapper.forbidden(res, "Bu kaynağa erişim yetkiniz yok");
      }

      next();
    } catch (error) {
      return responseWrapper.error(res, "Yetkilendirme hatası");
    }
  };
};

// Local representative için bölge kontrolü
authorize.checkRegion = () => {
  return async (req, res, next) => {
    if (!req.user || req.user.role !== "local_representative") {
      return next();
    }

    try {
      // Property'nin bölgesini kontrol et
      if (req.params.id) {
        const Property = require("../models/Property");
        const property = await Property.findById(req.params.id);

        if (property && req.userDetails.region !== property.country) {
          return responseWrapper.forbidden(
            res,
            "Bu bölgedeki mülklere erişim yetkiniz yok"
          );
        }
      }

      // Query'den gelen country filtresini kontrol et
      if (req.query.country && req.query.country !== req.userDetails.region) {
        return responseWrapper.forbidden(
          res,
          "Sadece kendi bölgenizdeki mülkleri görüntüleyebilirsiniz"
        );
      }

      // Local representative sadece kendi bölgesini görebilir
      req.query.country = req.userDetails.region;

      next();
    } catch (error) {
      return responseWrapper.error(res, "Bölge kontrolü hatası");
    }
  };
};

module.exports = authorize;
