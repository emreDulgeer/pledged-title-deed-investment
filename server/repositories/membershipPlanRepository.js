// server/repositories/membershipPlanRepository.js

const MembershipPlan = require("../models/MembershipPlan");
const Membership = require("../models/Membership");

class MembershipPlanRepository {
  /**
   * Tüm planları getir
   */
  async findAll(filter = {}, options = {}) {
    const query = MembershipPlan.find(filter);

    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort("order");
    }

    if (options.select) {
      query.select(options.select);
    }

    if (options.lean) {
      query.lean();
    }

    return await query.exec();
  }

  /**
   * Aktif ve görünür planları getir (Public)
   */
  async findVisiblePlans() {
    return await MembershipPlan.find({
      isActive: true,
      isVisible: true,
    })
      .sort("order")
      .lean();
  }

  /**
   * ID ile plan getir
   */
  async findById(id, options = {}) {
    const query = MembershipPlan.findById(id);

    if (options.select) {
      query.select(options.select);
    }

    if (options.lean) {
      query.lean();
    }

    return await query.exec();
  }

  /**
   * İsim ile plan getir
   */
  async findByName(name) {
    return await MembershipPlan.findOne({
      name: name.toLowerCase(),
      isActive: true,
    });
  }

  /**
   * Tier ile plan getir
   */
  async findByTier(tier) {
    return await MembershipPlan.findOne({
      tier: tier,
      isActive: true,
    });
  }

  /**
   * Varsayılan planı getir
   */
  async findDefaultPlan() {
    return await MembershipPlan.findOne({
      isDefault: true,
      isActive: true,
    });
  }

  /**
   * Öne çıkan planları getir
   */
  async findFeaturedPlans() {
    return await MembershipPlan.find({
      isActive: true,
      isVisible: true,
      isFeatured: true,
    }).sort("order");
  }

  /**
   * Yeni plan oluştur
   */
  async create(planData) {
    const plan = new MembershipPlan(planData);
    return await plan.save();
  }

  /**
   * Plan güncelle
   */
  async update(id, updateData) {
    return await MembershipPlan.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  }

  /**
   * Plan sil (Soft delete - isActive = false)
   */
  async softDelete(id) {
    return await MembershipPlan.findByIdAndUpdate(
      id,
      {
        isActive: false,
        isVisible: false,
      },
      { new: true }
    );
  }

  /**
   * Plan sil (Hard delete)
   */
  async delete(id) {
    return await MembershipPlan.findByIdAndDelete(id);
  }

  /**
   * Plan sırasını güncelle
   */
  async updateOrder(id, newOrder) {
    return await MembershipPlan.findByIdAndUpdate(
      id,
      { order: newOrder },
      { new: true }
    );
  }

  /**
   * Promosyon ekle/güncelle
   */
  async updatePromotion(id, promotionData) {
    return await MembershipPlan.findByIdAndUpdate(
      id,
      {
        "promotions.currentPromotion": promotionData,
      },
      { new: true }
    );
  }

  /**
   * İstatistikleri güncelle
   */
  async updateStatistics(id, stats) {
    return await MembershipPlan.findByIdAndUpdate(
      id,
      {
        $inc: stats,
      },
      { new: true }
    );
  }

  /**
   * Kullanıcı için uygun planları getir
   */
  async findPlansForUser(user) {
    const plans = await this.findVisiblePlans();

    // Her planın kullanıcı için uygunluğunu kontrol et
    const availablePlans = [];

    for (const plan of plans) {
      // Plan modelindeki isAvailableForUser metodunu kullan
      const planDoc = await MembershipPlan.findById(plan._id);
      if (planDoc.isAvailableForUser(user)) {
        availablePlans.push(plan);
      }
    }

    return availablePlans;
  }

  /**
   * Plan karşılaştırması için birden fazla plan getir
   */
  async findPlansForComparison(planIds) {
    return await MembershipPlan.find({
      _id: { $in: planIds },
      isActive: true,
    }).sort("tier");
  }

  /**
   * Fiyat aralığına göre planları getir
   */
  async findByPriceRange(minPrice, maxPrice, interval = "monthly") {
    const priceField = `pricing.${interval}.amount`;

    return await MembershipPlan.find({
      isActive: true,
      isVisible: true,
      [priceField]: {
        $gte: minPrice,
        $lte: maxPrice,
      },
    }).sort(priceField);
  }

  /**
   * Deneme süresi olan planları getir
   */
  async findPlansWithTrial() {
    return await MembershipPlan.find({
      isActive: true,
      isVisible: true,
      "pricing.trial.enabled": true,
    }).sort("order");
  }

  /**
   * Belirli bir özelliğe sahip planları getir
   */
  async findPlansWithFeature(featurePath, minValue = true) {
    const query = {
      isActive: true,
      isVisible: true,
    };

    // Örnek: "features.api.hasAccess" = true
    if (typeof minValue === "boolean") {
      query[featurePath] = minValue;
    } else {
      query[featurePath] = { $gte: minValue };
    }

    return await MembershipPlan.find(query).sort("tier");
  }

  /**
   * Plan kullanım istatistiklerini getir
   */
  async getPlanStatistics(id) {
    const plan = await MembershipPlan.findById(id).select("statistics");
    return plan?.statistics || null;
  }

  /**
   * Toplam aktif kullanıcı sayısını güncelle
   */
  async incrementActiveUsers(id, count = 1) {
    return await MembershipPlan.findByIdAndUpdate(
      id,
      {
        $inc: {
          "statistics.activeUsers": count,
        },
      },
      { new: true }
    );
  }

  /**
   * Promosyon kullanım sayısını artır
   */
  async incrementPromoUsage(id) {
    return await MembershipPlan.findByIdAndUpdate(
      id,
      {
        $inc: {
          "promotions.currentPromotion.usedCount": 1,
        },
      },
      { new: true }
    );
  }

  /**
   * Bulk işlemler için birden fazla plan güncelle
   */
  async bulkUpdate(updates) {
    const bulkOps = updates.map((update) => ({
      updateOne: {
        filter: { _id: update.id },
        update: update.data,
      },
    }));

    return await MembershipPlan.bulkWrite(bulkOps);
  }

  /**
   * Plan özelliklerini güncelle
   */
  async updateFeatures(id, features) {
    return await MembershipPlan.findByIdAndUpdate(
      id,
      {
        features: features,
      },
      { new: true, runValidators: true }
    );
  }

  /**
   * Plan fiyatlandırmasını güncelle
   */
  async updatePricing(id, pricing) {
    return await MembershipPlan.findByIdAndUpdate(
      id,
      {
        pricing: pricing,
      },
      { new: true, runValidators: true }
    );
  }

  /**
   * Plan kısıtlamalarını güncelle
   */
  async updateRestrictions(id, restrictions) {
    return await MembershipPlan.findByIdAndUpdate(
      id,
      {
        restrictions: restrictions,
      },
      { new: true, runValidators: true }
    );
  }

  /**
   * Planın aktif membership sayısını getir
   */
  async getActiveMembershipCount(planId) {
    return await Membership.countDocuments({
      plan: planId,
      status: "active",
    });
  }

  /**
   * Plan gelir raporunu hesapla
   */
  async calculatePlanRevenue(planId, startDate, endDate) {
    const result = await Membership.aggregate([
      {
        $match: {
          plan: planId,
          status: "active",
          activatedAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$pricing.amount" },
          count: { $sum: 1 },
          avgRevenue: { $avg: "$pricing.amount" },
        },
      },
    ]);

    return result[0] || { totalRevenue: 0, count: 0, avgRevenue: 0 };
  }
  async getActiveMembershipCount(planId) {
    return Membership.countDocuments({
      plan: planId,
      status: "active",
    });
  }
  async incrementPromoUsage(planId) {
    // Şemanındaki promosyon path’i farklıysa buna göre değiştir
    return MembershipPlan.findByIdAndUpdate(
      planId,
      { $inc: { "promotions.currentPromotion.usedCount": 1 } },
      { new: true }
    );
  }
}

module.exports = new MembershipPlanRepository();
