// server/controllers/membershipPlanController.js

const membershipPlanService = require("../services/membershipPlanService");
const responseWrapper = require("../utils/responseWrapper");
const { validateRequest } = require("../utils/validator");

class MembershipPlanController {
  /**
   * Tüm planları getir (Admin)
   * GET /api/admin/membership-plans
   */
  async getAllPlans(req, res) {
    try {
      const { includeInactive } = req.query;

      const plans = await membershipPlanService.getAllPlans(
        includeInactive === "true"
      );

      return responseWrapper.success(res, plans, "Planlar başarıyla getirildi");
    } catch (error) {
      console.error("Get all plans error:", error);
      return responseWrapper.error(res, error.message);
    }
  }

  /**
   * Public planları getir
   * GET /api/membership-plans
   */
  async getPublicPlans(req, res) {
    try {
      const userId = req.user?.id || null;

      const plans = await membershipPlanService.getPublicPlans(userId);

      return responseWrapper.success(res, plans, "Planlar başarıyla getirildi");
    } catch (error) {
      console.error("Get public plans error:", error);
      return responseWrapper.error(res, error.message);
    }
  }

  /**
   * Plan detayını getir
   * GET /api/membership-plans/:id
   */
  async getPlanById(req, res) {
    try {
      const { id } = req.params;
      const isAdmin = req.user?.role === "admin";

      const plan = await membershipPlanService.getPlanById(id, isAdmin);

      return responseWrapper.success(
        res,
        plan,
        "Plan detayı başarıyla getirildi"
      );
    } catch (error) {
      console.error("Get plan by id error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }

      return responseWrapper.error(res, error.message);
    }
  }

  /**
   * Yeni plan oluştur (Admin)
   * POST /api/admin/membership-plans
   */
  async createPlan(req, res) {
    try {
      // Validasyon
      const validationRules = {
        name: "required|string|min:2|max:50",
        displayName: "required|string|min:2|max:100",
        description: "required|string|min:10|max:500",
        tier: "required|integer|min:1",
        "pricing.monthly.amount": "required|numeric|min:0",
        "pricing.yearly.amount": "required|numeric|min:0",
      };

      const validation = validateRequest(req.body, validationRules);
      if (!validation.isValid) {
        return responseWrapper.badRequest(res, validation.errors);
      }

      const plan = await membershipPlanService.createPlan(
        req.body,
        req.user.id
      );

      return responseWrapper.created(res, plan, "Plan başarıyla oluşturuldu");
    } catch (error) {
      console.error("Create plan error:", error);

      if (error.statusCode === 400) {
        return responseWrapper.badRequest(res, error.message);
      }

      return responseWrapper.error(res, error.message);
    }
  }

  /**
   * Plan güncelle (Admin)
   * PUT /api/admin/membership-plans/:id
   */
  async updatePlan(req, res) {
    try {
      const { id } = req.params;

      // Boş body kontrolü
      if (!req.body || Object.keys(req.body).length === 0) {
        return responseWrapper.badRequest(res, "Güncellenecek veri bulunamadı");
      }

      const updatedPlan = await membershipPlanService.updatePlan(
        id,
        req.body,
        req.user.id
      );

      return responseWrapper.success(
        res,
        updatedPlan,
        "Plan başarıyla güncellendi"
      );
    } catch (error) {
      console.error("Update plan error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }

      if (error.statusCode === 400) {
        return responseWrapper.badRequest(res, error.message);
      }

      return responseWrapper.error(res, error.message);
    }
  }

  /**
   * Plan sil (Admin)
   * DELETE /api/admin/membership-plans/:id
   */
  async deletePlan(req, res) {
    try {
      const { id } = req.params;

      const result = await membershipPlanService.deletePlan(id, req.user.id);

      return responseWrapper.success(res, result, result.message);
    } catch (error) {
      console.error("Delete plan error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }

      if (error.statusCode === 400) {
        return responseWrapper.badRequest(res, error.message);
      }

      return responseWrapper.error(res, error.message);
    }
  }

  /**
   * Planları karşılaştır
   * POST /api/membership-plans/compare
   */
  async comparePlans(req, res) {
    try {
      const { planIds } = req.body;

      if (!planIds || !Array.isArray(planIds)) {
        return responseWrapper.badRequest(res, "Plan ID listesi gereklidir");
      }

      const comparison = await membershipPlanService.comparePlans(planIds);

      return responseWrapper.success(
        res,
        comparison,
        "Karşılaştırma başarıyla oluşturuldu"
      );
    } catch (error) {
      console.error("Compare plans error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }

      return responseWrapper.error(res, error.message);
    }
  }

  /**
   * Plan fiyatını hesapla
   * POST /api/membership-plans/:id/calculate-price
   */
  async calculatePrice(req, res) {
    try {
      const { id } = req.params;
      const { interval = "monthly", promoCode } = req.body;

      const price = await membershipPlanService.calculatePlanPrice(
        id,
        interval,
        promoCode
      );

      return responseWrapper.success(res, price, "Fiyat başarıyla hesaplandı");
    } catch (error) {
      console.error("Calculate price error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }

      return responseWrapper.error(res, error.message);
    }
  }

  /**
   * Promosyon ekle/güncelle (Admin)
   * POST /api/admin/membership-plans/:id/promotion
   */
  async updatePromotion(req, res) {
    try {
      const { id } = req.params;

      // Validasyon
      const validationRules = {
        code: "required|string|min:3|max:20",
        discountPercentage: "required|numeric|min:1|max:100",
        validUntil: "required|date",
        maxUses: "required|integer|min:1",
      };

      const validation = validateRequest(req.body, validationRules);
      if (!validation.isValid) {
        return responseWrapper.badRequest(res, validation.errors);
      }

      const updatedPlan = await membershipPlanService.updatePromotion(
        id,
        req.body,
        req.user.id
      );

      return responseWrapper.success(
        res,
        updatedPlan,
        "Promosyon başarıyla güncellendi"
      );
    } catch (error) {
      console.error("Update promotion error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }

      return responseWrapper.error(res, error.message);
    }
  }

  /**
   * Plan sıralamasını güncelle (Admin)
   * PUT /api/admin/membership-plans/order
   */
  async updatePlanOrder(req, res) {
    try {
      const { orders } = req.body;

      if (!orders || !Array.isArray(orders)) {
        return responseWrapper.badRequest(res, "Sıralama listesi gereklidir");
      }

      const result = await membershipPlanService.updatePlanOrder(
        orders,
        req.user.id
      );

      return responseWrapper.success(res, result, result.message);
    } catch (error) {
      console.error("Update plan order error:", error);
      return responseWrapper.error(res, error.message);
    }
  }

  /**
   * Plan istatistikleri (Admin)
   * GET /api/admin/membership-plans/:id/statistics
   */
  async getPlanStatistics(req, res) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const dateRange = {};
      if (startDate) dateRange.startDate = new Date(startDate);
      if (endDate) dateRange.endDate = new Date(endDate);

      const statistics = await membershipPlanService.getPlanStatistics(
        id,
        dateRange
      );

      return responseWrapper.success(
        res,
        statistics,
        "İstatistikler başarıyla getirildi"
      );
    } catch (error) {
      console.error("Get plan statistics error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }

      return responseWrapper.error(res, error.message);
    }
  }

  /**
   * Deneme süresi olan planları getir
   * GET /api/membership-plans/trial
   */
  async getTrialPlans(req, res) {
    try {
      const plans = await membershipPlanService.getTrialPlans();

      return responseWrapper.success(
        res,
        plans,
        "Deneme planları başarıyla getirildi"
      );
    } catch (error) {
      console.error("Get trial plans error:", error);
      return responseWrapper.error(res, error.message);
    }
  }

  /**
   * Özelliğe göre planları filtrele
   * GET /api/membership-plans/by-feature
   */
  async getPlansByFeature(req, res) {
    try {
      const { feature, value = true } = req.query;

      if (!feature) {
        return responseWrapper.badRequest(
          res,
          "Özellik parametresi gereklidir"
        );
      }

      const plans = await membershipPlanService.getPlansByFeature(
        feature,
        value
      );

      return responseWrapper.success(
        res,
        plans,
        "Planlar başarıyla filtrelendi"
      );
    } catch (error) {
      console.error("Get plans by feature error:", error);
      return responseWrapper.error(res, error.message);
    }
  }

  /**
   * Kullanıcı için upgrade önerileri
   * GET /api/membership-plans/recommendations
   */
  async getUpgradeRecommendations(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return responseWrapper.unauthorized(res, "Kimlik doğrulaması gerekli");
      }

      const recommendations =
        await membershipPlanService.getUpgradeRecommendations(userId);

      return responseWrapper.success(
        res,
        recommendations,
        "Öneriler başarıyla oluşturuldu"
      );
    } catch (error) {
      console.error("Get upgrade recommendations error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }

      return responseWrapper.error(res, error.message);
    }
  }

  /**
   * Plan özelliklerini güncelle (Admin)
   * PATCH /api/admin/membership-plans/:id/features
   */
  async updatePlanFeatures(req, res) {
    try {
      const { id } = req.params;
      const { features } = req.body;

      if (!features || typeof features !== "object") {
        return responseWrapper.badRequest(
          res,
          "Geçerli özellik listesi gereklidir"
        );
      }

      const updatedPlan = await membershipPlanService.updatePlan(
        id,
        { features },
        req.user.id
      );

      return responseWrapper.success(
        res,
        updatedPlan,
        "Özellikler başarıyla güncellendi"
      );
    } catch (error) {
      console.error("Update plan features error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }

      return responseWrapper.error(res, error.message);
    }
  }

  /**
   * Plan fiyatlandırmasını güncelle (Admin)
   * PATCH /api/admin/membership-plans/:id/pricing
   */
  async updatePlanPricing(req, res) {
    try {
      const { id } = req.params;
      const { pricing } = req.body;

      if (!pricing || typeof pricing !== "object") {
        return responseWrapper.badRequest(
          res,
          "Geçerli fiyatlandırma bilgisi gereklidir"
        );
      }

      const updatedPlan = await membershipPlanService.updatePlan(
        id,
        { pricing },
        req.user.id
      );

      return responseWrapper.success(
        res,
        updatedPlan,
        "Fiyatlandırma başarıyla güncellendi"
      );
    } catch (error) {
      console.error("Update plan pricing error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }

      return responseWrapper.error(res, error.message);
    }
  }

  /**
   * Öne çıkan planları getir
   * GET /api/membership-plans/featured
   */
  async getFeaturedPlans(req, res) {
    try {
      const plans = await membershipPlanService.getPlansByFeature(
        "isFeatured",
        true
      );

      return responseWrapper.success(
        res,
        plans,
        "Öne çıkan planlar başarıyla getirildi"
      );
    } catch (error) {
      console.error("Get featured plans error:", error);
      return responseWrapper.error(res, error.message);
    }
  }
}

module.exports = new MembershipPlanController();
