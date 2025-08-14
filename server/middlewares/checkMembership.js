// server/middlewares/checkMembership.js

const membershipService = require("../services/membershipService");
const Membership = require("../models/Membership");
const responseWrapper = require("../../utils/responseWrapper");

/**
 * Üyelik durumunu kontrol eden middleware
 * @param {Object} options - Kontrol seçenekleri
 * @param {string[]} options.requiredPlans - Gerekli planlar
 * @param {string} options.minPlan - Minimum plan seviyesi
 * @param {boolean} options.checkActive - Aktif üyelik kontrolü
 * @param {string} options.feature - Gerekli özellik kontrolü
 */
const checkMembership = (options = {}) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return responseWrapper.unauthorized(res, "Kimlik doğrulama gerekli");
      }

      // Admin her zaman geçer
      if (req.user.role === "admin") {
        return next();
      }

      const membership = await Membership.findOne({ user: userId });

      // Üyelik yoksa veya inaktifse
      if (!membership || membership.status !== "active") {
        return responseWrapper.forbidden(
          res,
          "Bu işlem için aktif üyelik gereklidir. Lütfen üyelik planı satın alın."
        );
      }

      // Süre kontrolü
      if (membership.expiresAt && membership.expiresAt < new Date()) {
        return responseWrapper.forbidden(
          res,
          "Üyeliğinizin süresi dolmuş. Lütfen yenileyin."
        );
      }

      // Belirli planlar gerekiyorsa
      if (options.requiredPlans && options.requiredPlans.length > 0) {
        if (!options.requiredPlans.includes(membership.plan)) {
          return responseWrapper.forbidden(
            res,
            `Bu işlem için ${options.requiredPlans.join(
              " veya "
            )} üyelik planı gereklidir.`
          );
        }
      }

      // Minimum plan seviyesi kontrolü
      if (options.minPlan) {
        // Plan bilgilerini getir
        const MembershipPlan = require("../models/MembershipPlan");
        const userPlan = await MembershipPlan.findById(membership.plan);

        if (!userPlan) {
          return responseWrapper.error(res, "Plan bilgisi bulunamadı");
        }

        // minPlan string ise plan objesine çevir
        let requiredPlan;
        if (typeof options.minPlan === "string") {
          requiredPlan = await MembershipPlan.findOne({
            name: options.minPlan.toLowerCase(),
            isActive: true,
          });
        } else {
          requiredPlan = await MembershipPlan.findById(options.minPlan);
        }

        if (!requiredPlan) {
          return responseWrapper.error(res, "Gerekli plan bilgisi bulunamadı");
        }

        // Fiyat bazlı karşılaştırma
        const userPlanPrice = userPlan.pricing.monthly.amount;
        const requiredPlanPrice = requiredPlan.pricing.monthly.amount;

        if (userPlanPrice < requiredPlanPrice) {
          return responseWrapper.forbidden(
            res,
            `Bu işlem için minimum ${requiredPlan.displayName} üyelik planı gereklidir. ` +
              `Planınızı yükseltmeyi düşünebilirsiniz.`
          );
        }
      }

      // Özellik kontrolü
      if (options.feature) {
        if (!membership.features[options.feature]) {
          return responseWrapper.forbidden(
            res,
            `Bu özellik ${membership.plan} planında kullanılamaz. ` +
              `Lütfen planınızı yükseltin.`
          );
        }
      }

      // Membership bilgilerini request'e ekle
      req.membership = {
        id: membership._id,
        plan: membership.plan,
        status: membership.status,
        features: membership.features,
        usage: membership.usage,
        expiresAt: membership.expiresAt,
      };

      next();
    } catch (error) {
      console.error("Check membership error:", error);
      return responseWrapper.error(
        res,
        "Üyelik kontrolü sırasında hata oluştu"
      );
    }
  };
};

/**
 * Yatırım limiti kontrolü
 */
const checkInvestmentLimit = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return responseWrapper.unauthorized(res, "Kimlik doğrulama gerekli");
    }

    // Admin kontrolü
    if (req.user.role === "admin") {
      return next();
    }

    const result = await membershipService.canUserMakeInvestment(userId);

    if (!result.canInvest) {
      // Upgrade önerisi ile birlikte ret
      const response = {
        message: result.reason,
        currentPlan: result.currentPlan,
        suggestedPlan: result.suggestedPlan,
        upgradeUrl: "/membership/plans",
      };

      return responseWrapper.forbidden(res, response);
    }

    // Kalan yatırım hakkını request'e ekle
    req.remainingInvestments = result.remainingInvestments;

    next();
  } catch (error) {
    console.error("Check investment limit error:", error);
    return responseWrapper.error(
      res,
      "Yatırım limiti kontrolü sırasında hata oluştu"
    );
  }
};

/**
 * Servis satın alma kontrolü
 */
const checkServicePurchase = (serviceName) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return responseWrapper.unauthorized(res, "Kimlik doğrulama gerekli");
      }

      const membership = await Membership.findOne({ user: userId });

      if (!membership || membership.status !== "active") {
        return responseWrapper.forbidden(
          res,
          "Servis satın almak için aktif üyelik gereklidir"
        );
      }

      // Enterprise üyeliklerde bazı servisler ücretsiz
      const isFreeService =
        membership.plan === "Enterprise" &&
        membership.features.includedServices.includes(serviceName);

      // İndirim oranını hesapla
      const discountRate = isFreeService
        ? 100
        : membership.features.serviceDiscountRate || 0;

      // Request'e indirim bilgisi ekle
      req.serviceDiscount = {
        rate: discountRate,
        isFree: isFreeService,
        plan: membership.plan,
      };

      next();
    } catch (error) {
      console.error("Check service purchase error:", error);
      return responseWrapper.error(
        res,
        "Servis kontrolü sırasında hata oluştu"
      );
    }
  };
};

/**
 * API erişim kontrolü
 */
const checkApiAccess = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return responseWrapper.unauthorized(res, "Kimlik doğrulama gerekli");
    }

    const membership = await Membership.findOne({ user: userId });

    if (!membership || !membership.features.hasApiAccess) {
      return responseWrapper.forbidden(
        res,
        "API erişimi için Enterprise üyelik planı gereklidir"
      );
    }

    next();
  } catch (error) {
    console.error("Check API access error:", error);
    return responseWrapper.error(
      res,
      "API erişim kontrolü sırasında hata oluştu"
    );
  }
};

/**
 * Komisyon hesaplama middleware'i
 */
const applyCommissionDiscount = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next(); // Giriş yapmamış kullanıcılar için normal komisyon
    }

    const membership = await Membership.findOne({ user: userId });

    if (!membership || membership.status !== "active") {
      req.commissionDiscount = 0;
      return next();
    }

    // Platform komisyon indirimi
    const platformDiscount =
      membership.features.platformCommissionDiscount || 0;
    const rentalDiscount = membership.features.rentalCommissionDiscount || 0;

    req.commissionDiscount = {
      platform: platformDiscount,
      rental: rentalDiscount,
      plan: membership.plan,
    };

    next();
  } catch (error) {
    console.error("Apply commission discount error:", error);
    req.commissionDiscount = 0; // Hata durumunda indirim uygulanmaz
    next();
  }
};

module.exports = {
  checkMembership,
  checkInvestmentLimit,
  checkServicePurchase,
  checkApiAccess,
  applyCommissionDiscount,
};
