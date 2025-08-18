// server/services/membershipPlanService.js

const membershipPlanRepository = require("../repositories/membershipPlanRepository");
const membershipRepository = require("../repositories/membershipRepository");
const CustomError = require("../utils/CustomError");
const { logActivity } = require("../utils/activityLogger");

class MembershipPlanService {
  /**
   * Tüm planları getir (Admin)
   */
  async getAllPlans(includeInactive = false) {
    try {
      const filter = includeInactive ? {} : { isActive: true };
      const plans = await membershipPlanRepository.findAll(filter);

      // Her plan için aktif kullanıcı sayısını getir
      const plansWithStats = await Promise.all(
        plans.map(async (plan) => {
          const activeCount =
            await membershipPlanRepository.getActiveMembershipCount(plan._id);
          return {
            ...plan.toObject(),
            activeUserCount: activeCount,
          };
        })
      );

      return plansWithStats;
    } catch (error) {
      throw new CustomError("Planlar getirilirken hata oluştu", 500);
    }
  }

  /**
   * Public planları getir (Müşteriler için)
   */
  async getPublicPlans(userId = null) {
    try {
      let plans;

      if (userId) {
        // Kullanıcıya özel planları getir
        const user = await this._getUserById(userId);
        plans = await membershipPlanRepository.findPlansForUser(user);
      } else {
        // Genel görünür planları getir
        plans = await membershipPlanRepository.findVisiblePlans();
      }

      // Hassas bilgileri filtrele
      return plans.map((plan) => this._sanitizePlanForPublic(plan));
    } catch (error) {
      throw new CustomError("Planlar getirilirken hata oluştu", 500);
    }
  }

  /**
   * Plan detayını getir
   */
  async getPlanById(id, isAdmin = false) {
    try {
      const plan = await membershipPlanRepository.findById(id);

      if (!plan) {
        throw new CustomError("Plan bulunamadı", 404);
      }

      if (!isAdmin && (!plan.isActive || !plan.isVisible)) {
        throw new CustomError("Bu plan şu anda kullanılamıyor", 403);
      }

      const planData = plan.toObject();

      // Admin değilse hassas bilgileri filtrele
      if (!isAdmin) {
        return this._sanitizePlanForPublic(planData);
      }

      // Admin için ek istatistikler ekle
      planData.activeUserCount =
        await membershipPlanRepository.getActiveMembershipCount(id);
      planData.revenue = await this.calculatePlanRevenue(id);

      return planData;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError("Plan detayı getirilirken hata oluştu", 500);
    }
  }

  /**
   * Plan oluştur (Admin)
   */
  async createPlan(planData, adminId) {
    try {
      // İsim kontrolü
      const existingPlan = await membershipPlanRepository.findByName(
        planData.name
      );
      if (existingPlan) {
        throw new CustomError("Bu isimde bir plan zaten mevcut", 400);
      }

      // Tier kontrolü
      if (planData.tier) {
        const tierPlan = await membershipPlanRepository.findByTier(
          planData.tier
        );
        if (tierPlan) {
          throw new CustomError(
            "Bu tier seviyesinde bir plan zaten mevcut",
            400
          );
        }
      }

      // Varsayılan plan kontrolü
      if (planData.isDefault) {
        await this._clearDefaultPlans();
      }

      const plan = await membershipPlanRepository.create(planData);

      // Admin aktivitesini logla
      await logActivity({
        user: adminId,
        action: "admin_action_performed",
        details: {
          action: "create_membership_plan",
          planId: plan._id,
          planName: plan.name,
        },
        isAdminAction: true,
      });

      return plan;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError("Plan oluşturulurken hata oluştu", 500);
    }
  }

  /**
   * Plan güncelle (Admin)
   */
  async updatePlan(id, updateData, adminId) {
    try {
      const existingPlan = await membershipPlanRepository.findById(id);

      if (!existingPlan) {
        throw new CustomError("Plan bulunamadı", 404);
      }

      // İsim değişikliği kontrolü
      if (updateData.name && updateData.name !== existingPlan.name) {
        const namePlan = await membershipPlanRepository.findByName(
          updateData.name
        );
        if (namePlan) {
          throw new CustomError("Bu isimde bir plan zaten mevcut", 400);
        }
      }

      // Tier değişikliği kontrolü
      if (updateData.tier && updateData.tier !== existingPlan.tier) {
        const tierPlan = await membershipPlanRepository.findByTier(
          updateData.tier
        );
        if (tierPlan) {
          throw new CustomError(
            "Bu tier seviyesinde bir plan zaten mevcut",
            400
          );
        }
      }

      // Varsayılan plan kontrolü
      if (updateData.isDefault && !existingPlan.isDefault) {
        await this._clearDefaultPlans();
      }

      const updatedPlan = await membershipPlanRepository.update(id, updateData);

      // Aktif üyelikleri güncelle (özellikler değiştiyse)
      if (updateData.features) {
        await this._updateActiveMembershipsFeatures(id, updateData.features);
      }

      // Admin aktivitesini logla
      await logActivity({
        user: adminId,
        action: "admin_action_performed",
        details: {
          action: "update_membership_plan",
          planId: id,
          changes: Object.keys(updateData),
        },
        isAdminAction: true,
      });

      return updatedPlan;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError("Plan güncellenirken hata oluştu", 500);
    }
  }

  /**
   * Plan sil (Soft delete)
   */
  async deletePlan(id, adminId) {
    try {
      const plan = await membershipPlanRepository.findById(id);

      if (!plan) {
        throw new CustomError("Plan bulunamadı", 404);
      }

      // Aktif üyelik kontrolü
      const activeCount =
        await membershipPlanRepository.getActiveMembershipCount(id);
      if (activeCount > 0) {
        throw new CustomError(
          `Bu planda ${activeCount} aktif üyelik bulunuyor. Plan silinemez.`,
          400
        );
      }

      // Varsayılan plan kontrolü
      if (plan.isDefault) {
        throw new CustomError("Varsayılan plan silinemez", 400);
      }

      await membershipPlanRepository.softDelete(id);

      // Admin aktivitesini logla
      await logActivity({
        user: adminId,
        action: "admin_action_performed",
        details: {
          action: "delete_membership_plan",
          planId: id,
          planName: plan.name,
        },
        isAdminAction: true,
      });

      return { message: "Plan başarıyla silindi" };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError("Plan silinirken hata oluştu", 500);
    }
  }

  /**
   * Plan karşılaştırması
   */
  async comparePlans(planIds) {
    try {
      if (!Array.isArray(planIds) || planIds.length < 2) {
        throw new CustomError("En az 2 plan ID'si gereklidir", 400);
      }

      const plans = await membershipPlanRepository.findPlansForComparison(
        planIds
      );

      if (plans.length !== planIds.length) {
        throw new CustomError("Bazı planlar bulunamadı", 404);
      }

      // Karşılaştırma tablosu oluştur
      const comparison = {
        plans: plans.map((p) => this._sanitizePlanForPublic(p.toObject())),
        features: this._extractComparisonFeatures(plans),
      };

      return comparison;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError("Plan karşılaştırması yapılırken hata oluştu", 500);
    }
  }

  /**
   * Plan fiyat hesaplama (promosyon dahil)
   */
  async calculatePlanPrice(planId, interval = "monthly", promoCode = null) {
    try {
      const plan = await membershipPlanRepository.findById(planId);

      if (!plan) {
        throw new CustomError("Plan bulunamadı", 404);
      }

      if (!plan.isActive) {
        throw new CustomError("Bu plan şu anda aktif değil", 400);
      }

      const price = plan.calculatePrice(interval, promoCode);

      // Promosyon kullanıldıysa sayacı artır
      if (promoCode && price.amount < price.originalAmount) {
        await membershipPlanRepository.incrementPromoUsage(planId);
      }

      return price;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError("Fiyat hesaplanırken hata oluştu", 500);
    }
  }

  /**
   * Promosyon ekle/güncelle
   */
  async updatePromotion(planId, promotionData, adminId) {
    try {
      const plan = await membershipPlanRepository.findById(planId);

      if (!plan) {
        throw new CustomError("Plan bulunamadı", 404);
      }

      // Promosyon verilerini doğrula
      if (
        promotionData.validUntil &&
        new Date(promotionData.validUntil) < new Date()
      ) {
        throw new CustomError("Promosyon bitiş tarihi geçmiş olamaz", 400);
      }

      const updatedPlan = await membershipPlanRepository.updatePromotion(
        planId,
        {
          ...promotionData,
          usedCount: 0,
        }
      );

      // Admin aktivitesini logla
      await logActivity({
        user: adminId,
        action: "admin_action_performed",
        details: {
          action: "update_plan_promotion",
          planId: planId,
          promoCode: promotionData.code,
        },
        isAdminAction: true,
      });

      return updatedPlan;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError("Promosyon güncellenirken hata oluştu", 500);
    }
  }

  /**
   * Plan sıralamasını güncelle
   */
  async updatePlanOrder(orderUpdates, adminId) {
    try {
      const updates = orderUpdates.map((update) => ({
        id: update.planId,
        data: { order: update.order },
      }));

      await membershipPlanRepository.bulkUpdate(updates);

      // Admin aktivitesini logla
      await logActivity({
        user: adminId,
        action: "admin_action_performed",
        details: {
          action: "update_plan_order",
          updates: orderUpdates,
        },
        isAdminAction: true,
      });

      return { message: "Plan sıralaması güncellendi" };
    } catch (error) {
      throw new CustomError("Plan sıralaması güncellenirken hata oluştu", 500);
    }
  }

  /**
   * Plan istatistiklerini getir
   */
  async getPlanStatistics(planId, dateRange = {}) {
    try {
      const plan = await membershipPlanRepository.findById(planId);

      if (!plan) {
        throw new CustomError("Plan bulunamadı", 404);
      }

      const startDate =
        dateRange.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange.endDate || new Date();

      const [activeUsers, revenue, churnRate] = await Promise.all([
        membershipPlanRepository.getActiveMembershipCount(planId),
        membershipPlanRepository.calculatePlanRevenue(
          planId,
          startDate,
          endDate
        ),
        this._calculateChurnRate(planId, startDate, endDate),
      ]);

      return {
        plan: {
          id: plan._id,
          name: plan.displayName,
          tier: plan.tier,
        },
        statistics: {
          activeUsers,
          revenue,
          churnRate,
          conversionRate: plan.statistics.conversionRate,
          averageLifetime: plan.statistics.averageLifetime,
        },
        dateRange: {
          startDate,
          endDate,
        },
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError("İstatistikler getirilirken hata oluştu", 500);
    }
  }

  /**
   * Deneme süresi olan planları getir
   */
  async getTrialPlans() {
    try {
      const plans = await membershipPlanRepository.findPlansWithTrial();
      return plans.map((plan) => this._sanitizePlanForPublic(plan));
    } catch (error) {
      throw new CustomError("Deneme planları getirilirken hata oluştu", 500);
    }
  }

  /**
   * Özelliğe göre planları filtrele
   */
  async getPlansByFeature(feature, value = true) {
    try {
      const featurePath = `features.${feature}`;
      const plans = await membershipPlanRepository.findPlansWithFeature(
        featurePath,
        value
      );
      return plans.map((plan) => this._sanitizePlanForPublic(plan));
    } catch (error) {
      throw new CustomError("Planlar filtrelenirken hata oluştu", 500);
    }
  }

  /**
   * Plan upgrade önerileri
   */
  async getUpgradeRecommendations(userId) {
    try {
      const membership = await membershipRepository.findByUserId(userId);

      if (!membership) {
        // Üyeliği olmayan kullanıcı için Basic plan öner
        const basicPlan = await membershipPlanRepository.findDefaultPlan();
        return {
          currentPlan: null,
          recommendations: basicPlan
            ? [this._sanitizePlanForPublic(basicPlan)]
            : [],
        };
      }

      const currentPlan = await membershipPlanRepository.findById(
        membership.plan
      );

      if (!currentPlan) {
        throw new CustomError("Mevcut plan bulunamadı", 404);
      }

      // Daha yüksek tier'daki planları getir
      const higherPlans = await membershipPlanRepository.findAll({
        tier: { $gt: currentPlan.tier },
        isActive: true,
        isVisible: true,
      });

      // Kullanım verilerine göre öneri yap
      const recommendations = this._analyzeUsageAndRecommend(
        membership,
        higherPlans
      );

      return {
        currentPlan: this._sanitizePlanForPublic(currentPlan),
        recommendations,
        usageAnalysis: {
          investmentUsage: `${membership.usage.currentActiveInvestments}/${membership.features.investments.maxActiveInvestments}`,
          nearLimit:
            membership.usage.currentActiveInvestments >=
            membership.features.investments.maxActiveInvestments * 0.8,
        },
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError("Öneri hesaplanırken hata oluştu", 500);
    }
  }
  async getFeaturedPlans() {
    return membershipPlanRepository.findFeaturedPlans();
  }
  async getPlansWithTrial() {
    return membershipPlanRepository.findPlansWithTrial();
  }

  // Yardımcı metodlar

  async _getUserById(userId) {
    const User = require("../models/User");
    return await User.findById(userId);
  }

  async _clearDefaultPlans() {
    const MembershipPlan = require("../models/MembershipPlan");
    await MembershipPlan.updateMany({ isDefault: true }, { isDefault: false });
  }

  async _updateActiveMembershipsFeatures(planId, newFeatures) {
    const Membership = require("../models/Membership");
    await Membership.updateMany(
      { plan: planId, status: "active" },
      { features: newFeatures }
    );
  }

  _sanitizePlanForPublic(plan) {
    const { statistics, restrictions, automation, ...publicData } = plan;

    return publicData;
  }

  _extractComparisonFeatures(plans) {
    const features = {};

    // Tüm özellikleri topla
    const featurePaths = [
      "features.investments.maxActiveInvestments",
      "features.commissions.platformCommissionDiscount",
      "features.support.level",
      "features.services.includedServices",
      "features.analytics.hasAdvancedAnalytics",
      "features.api.hasAccess",
      // Diğer önemli özellikler...
    ];

    featurePaths.forEach((path) => {
      features[path] = plans.map((plan) => {
        const value = path.split(".").reduce((obj, key) => obj?.[key], plan);
        return value;
      });
    });

    return features;
  }

  async _calculateChurnRate(planId, startDate, endDate) {
    const Membership = require("../models/Membership");

    const [cancelled, total] = await Promise.all([
      Membership.countDocuments({
        plan: planId,
        status: "cancelled",
        "subscription.cancelledAt": {
          $gte: startDate,
          $lte: endDate,
        },
      }),
      Membership.countDocuments({
        plan: planId,
        activatedAt: {
          $lte: startDate,
        },
      }),
    ]);

    return total > 0 ? (cancelled / total) * 100 : 0;
  }

  _analyzeUsageAndRecommend(membership, availablePlans) {
    const recommendations = [];

    availablePlans.forEach((plan) => {
      let score = 0;
      let reasons = [];

      // Yatırım limiti kontrolü
      if (
        membership.usage.currentActiveInvestments >=
        membership.features.investments.maxActiveInvestments * 0.8
      ) {
        score += 10;
        reasons.push("Yatırım limitinize yaklaşıyorsunuz");
      }

      // API kullanımı kontrolü
      if (
        membership.usage.apiCallsThisMonth > 0 &&
        !membership.features.api.hasAccess
      ) {
        score += 5;
        reasons.push("API erişimine ihtiyacınız var");
      }

      // Referans kazancı potansiyeli
      if (membership.usage.totalReferrals > 5) {
        const potentialBonus =
          plan.features.referral.commissionRate -
          membership.features.referral.commissionRate;
        if (potentialBonus > 0) {
          score += 8;
          reasons.push(`Referans komisyonunuz %${potentialBonus} artacak`);
        }
      }

      // Destek seviyesi
      if (
        plan.features.support.level === "dedicated" &&
        membership.features.support.level !== "dedicated"
      ) {
        score += 3;
        reasons.push("Özel müşteri temsilcisi");
      }

      if (score > 0) {
        recommendations.push({
          plan: this._sanitizePlanForPublic(plan),
          score,
          reasons,
        });
      }
    });

    // Skora göre sırala
    return recommendations.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  async calculatePlanRevenue(planId) {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date();
    return await membershipPlanRepository.calculatePlanRevenue(
      planId,
      startDate,
      endDate
    );
  }
}

module.exports = new MembershipPlanService();
