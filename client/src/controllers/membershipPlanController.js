// src/controllers/membershipPlanController.js
import api from "../api/client";

const membershipPlanController = {
  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Get all visible membership plans (Public)
   * GET /api/membership-plans
   */
  async getPublicPlans() {
    return api.get("/membership-plans");
  },

  /**
   * Get featured plans
   * GET /api/membership-plans/featured
   */
  async getFeaturedPlans() {
    return api.get("/membership-plans/featured");
  },

  /**
   * Get trial plans
   * GET /api/membership-plans/trial
   */
  async getTrialPlans() {
    return api.get("/membership-plans/trial");
  },

  /**
   * Get plan by ID
   * GET /api/membership-plans/:id
   */
  async getPlanById(id) {
    return api.get(`/membership-plans/${id}`);
  },

  /**
   * Compare multiple plans
   * POST /api/membership-plans/compare
   */
  async comparePlans(planIds) {
    return api.post("/membership-plans/compare", { planIds });
  },

  /**
   * Calculate plan price with promo
   * POST /api/membership-plans/:id/calculate-price
   */
  async calculatePrice(planId, interval = "monthly", promoCode = null) {
    return api.post(`/membership-plans/${planId}/calculate-price`, {
      interval,
      promoCode,
    });
  },

  /**
   * Get plans by feature
   * GET /api/membership-plans/by-feature
   */
  async getPlansByFeature(feature, value = true) {
    return api.get("/membership-plans/by-feature", {
      params: { feature, value },
    });
  },

  /**
   * Get upgrade recommendations
   * GET /api/membership-plans/recommendations
   */
  async getUpgradeRecommendations() {
    return api.get("/membership-plans/recommendations");
  },

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get all plans including inactive (Admin)
   * GET /api/membership-plans/admin/all
   */
  async getAllPlans(includeInactive = false) {
    return api.get("/membership-plans/admin/all", {
      params: { includeInactive },
    });
  },

  /**
   * Create new plan (Admin)
   * POST /api/membership-plans/admin/create
   */
  async createPlan(planData) {
    return api.post("/membership-plans/admin/create", planData);
  },

  /**
   * Update existing plan (Admin)
   * PUT /api/membership-plans/admin/:id
   */
  async updatePlan(id, updateData) {
    return api.put(`/membership-plans/admin/${id}`, updateData);
  },

  /**
   * Delete plan (Admin)
   * DELETE /api/membership-plans/admin/:id
   */
  async deletePlan(id) {
    return api.delete(`/membership-plans/admin/${id}`);
  },

  /**
   * Update plan features (Admin)
   * PATCH /api/membership-plans/admin/:id/features
   */
  async updatePlanFeatures(id, features) {
    return api.patch(`/membership-plans/admin/${id}/features`, { features });
  },

  /**
   * Update plan pricing (Admin)
   * PATCH /api/membership-plans/admin/:id/pricing
   */
  async updatePlanPricing(id, pricing) {
    return api.patch(`/membership-plans/admin/${id}/pricing`, { pricing });
  },

  /**
   * Add/Update promotion (Admin)
   * POST /api/membership-plans/admin/:id/promotion
   */
  async updatePromotion(id, promotionData) {
    return api.post(`/membership-plans/admin/${id}/promotion`, promotionData);
  },

  /**
   * Update plans order (Admin)
   * PUT /api/membership-plans/admin/order
   */
  async updatePlanOrder(orders) {
    return api.put("/membership-plans/admin/order", { orders });
  },

  /**
   * Get plan statistics (Admin)
   * GET /api/membership-plans/admin/:id/statistics
   */
  async getPlanStatistics(id, startDate, endDate) {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    return api.get(`/membership-plans/admin/${id}/statistics`, { params });
  },
};

export default membershipPlanController;
