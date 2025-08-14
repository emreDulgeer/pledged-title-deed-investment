// server/controllers/planAdminController.js

const MembershipPlan = require("../models/MembershipPlan");
const Membership = require("../models/Membership");
const responseWrapper = require("../../utils/responseWrapper");
const ActivityLog = require("../../models/ActivityLog");

class PlanAdminController {
  /**
   * Tüm planları listele (Admin)
   */
  async getAllPlans(req, res) {
    try {
      const { includeInactive = false, includeStats = true } = req.query;

      const filter = includeInactive ? {} : { isActive: true };

      const plans = await MembershipPlan.find(filter)
        .sort({ order: 1 })
        .populate("metadata.createdBy", "fullName email")
        .populate("metadata.lastModifiedBy", "fullName email");

      // İstatistikleri güncelle
      if (includeStats) {
        for (const plan of plans) {
          const membershipCount = await Membership.countDocuments({
            plan: plan._id,
            status: "active",
          });
          plan.statistics.activeUsers = membershipCount;
        }
      }

      return responseWrapper.success(res, { plans }, "Planlar listelendi");
    } catch (error) {
      console.error("Get all plans error:", error);
      return responseWrapper.error(res, "Planlar getirilemedi");
    }
  }

  /**
   * Yeni plan oluştur
   */
  async createPlan(req, res) {
    try {
      const adminId = req.user.id;
      const planData = req.body;

      // <<< EKLE: basit sunucu-side doğrulama
      if (typeof planData.tier !== "number" || planData.tier < 1) {
        return responseWrapper.badRequest(
          res,
          "tier sayısal ve en az 1 olmalı"
        );
      }

      // name benzersiz mi (isteğe bağlı; şemada unique var ama erken dönmek güzel)
      const exists = await MembershipPlan.findOne({
        name: planData.name.trim().toLowerCase(),
      });
      if (exists) {
        return responseWrapper.badRequest(res, "Bu plan adı zaten mevcut");
      }

      // Plan oluştur
      const plan = new MembershipPlan({
        ...planData,
        metadata: {
          createdBy: adminId,
          lastModifiedBy: adminId,
          changeLog: [
            {
              date: new Date(),
              changedBy: adminId,
              changes: "Plan oluşturuldu",
            },
          ],
        },
      });

      await plan.save();

      // Activity Log
      await ActivityLog.create({
        user: adminId,
        action: "admin_action_performed",
        details: {
          action: "create_membership_plan",
          planName: plan.name,
          planId: plan._id,
        },
        severity: "high",
        isAdminAction: true,
      });

      return responseWrapper.success(
        res,
        { plan },
        "Plan başarıyla oluşturuldu"
      );
    } catch (error) {
      console.error("Create plan error:", error);
      return responseWrapper.error(res, "Plan oluşturulamadı");
    }
  }

  /**
   * Plan güncelle
   */
  async updatePlan(req, res) {
    try {
      const { planId } = req.params;
      const adminId = req.user.id;
      const updates = req.body;

      const plan = await MembershipPlan.findById(planId);

      if (!plan) {
        return responseWrapper.notFound(res, "Plan bulunamadı");
      }

      // Change log ekle
      if (!updates.metadata) updates.metadata = {};
      updates.metadata.lastModifiedBy = adminId;
      updates.metadata.version = (plan.metadata.version || 1) + 1;

      const changeLog = {
        date: new Date(),
        changedBy: adminId,
        changes: JSON.stringify({
          before: plan.toObject(),
          after: updates,
        }),
      };

      // Plan güncelle
      const updatedPlan = await MembershipPlan.findByIdAndUpdate(
        planId,
        {
          ...updates,
          $push: { "metadata.changeLog": changeLog },
        },
        { new: true }
      );

      // Activity Log
      await ActivityLog.create({
        user: adminId,
        action: "admin_action_performed",
        details: {
          action: "update_membership_plan",
          planName: plan.name,
          planId: plan._id,
          changes: Object.keys(updates),
        },
        severity: "high",
        isAdminAction: true,
      });

      return responseWrapper.success(
        res,
        { plan: updatedPlan },
        "Plan başarıyla güncellendi"
      );
    } catch (error) {
      console.error("Update plan error:", error);
      return responseWrapper.error(res, "Plan güncellenemedi");
    }
  }

  /**
   * Plan sil (soft delete)
   */
  async deletePlan(req, res) {
    try {
      const { planId } = req.params;
      const adminId = req.user.id;

      const plan = await MembershipPlan.findById(planId);

      if (!plan) {
        return responseWrapper.notFound(res, "Plan bulunamadı");
      }

      // Aktif kullanıcı kontrolü
      const activeUsers = await Membership.countDocuments({
        plan: planId,
        status: "active",
      });

      if (activeUsers > 0) {
        return responseWrapper.badRequest(
          res,
          `Bu planda ${activeUsers} aktif kullanıcı var. Önce kullanıcıları başka plana taşıyın.`
        );
      }

      // Soft delete
      plan.isActive = false;
      plan.isVisible = false;
      plan.metadata.lastModifiedBy = adminId;
      await plan.save();

      // Activity Log
      await ActivityLog.create({
        user: adminId,
        action: "admin_action_performed",
        details: {
          action: "delete_membership_plan",
          planName: plan.name,
          planId: plan._id,
        },
        severity: "critical",
        isAdminAction: true,
      });

      return responseWrapper.success(res, null, "Plan başarıyla silindi");
    } catch (error) {
      console.error("Delete plan error:", error);
      return responseWrapper.error(res, "Plan silinemedi");
    }
  }

  /**
   * Plan sıralamasını güncelle
   */
  async updatePlanOrder(req, res) {
    try {
      const { plans } = req.body; // [{planId, order}, ...]

      const bulkOps = plans.map((item) => ({
        updateOne: {
          filter: { _id: item.planId },
          update: { order: item.order },
        },
      }));

      await MembershipPlan.bulkWrite(bulkOps);

      return responseWrapper.success(res, null, "Plan sıralaması güncellendi");
    } catch (error) {
      console.error("Update plan order error:", error);
      return responseWrapper.error(res, "Plan sıralaması güncellenemedi");
    }
  }

  /**
   * Plan kopyala (yeni plan oluşturmak için)
   */
  async clonePlan(req, res) {
    try {
      const { planId } = req.params;
      const { name, displayName } = req.body;
      const adminId = req.user.id;

      const originalPlan = await MembershipPlan.findById(planId);

      if (!originalPlan) {
        return responseWrapper.notFound(res, "Kaynak plan bulunamadı");
      }

      // Yeni plan oluştur
      const planData = originalPlan.toObject();
      delete planData._id;
      delete planData.createdAt;
      delete planData.updatedAt;

      planData.name = name;
      planData.displayName = displayName;
      planData.statistics = {
        totalUsers: 0,
        activeUsers: 0,
        monthlyRevenue: 0,
        totalRevenue: 0,
      };
      planData.metadata = {
        createdBy: adminId,
        lastModifiedBy: adminId,
        changeLog: [
          {
            date: new Date(),
            changedBy: adminId,
            changes: `${originalPlan.name} planından kopyalandı`,
          },
        ],
      };

      const newPlan = new MembershipPlan(planData);
      await newPlan.save();

      return responseWrapper.success(
        res,
        { plan: newPlan },
        "Plan başarıyla kopyalandı"
      );
    } catch (error) {
      console.error("Clone plan error:", error);
      return responseWrapper.error(res, "Plan kopyalanamadı");
    }
  }

  /**
   * Kullanıcıları başka plana taşı
   */
  async migratePlanUsers(req, res) {
    try {
      const { sourcePlanId, targetPlanId, userIds } = req.body;
      const adminId = req.user.id;

      const sourcePlan = await MembershipPlan.findById(sourcePlanId);
      const targetPlan = await MembershipPlan.findById(targetPlanId);

      if (!sourcePlan || !targetPlan) {
        return responseWrapper.notFound(res, "Plan bulunamadı");
      }

      // Kullanıcıları taşı
      const filter = { plan: sourcePlanId };
      if (userIds && userIds.length > 0) {
        filter.user = { $in: userIds };
      }

      const result = await Membership.updateMany(filter, {
        plan: targetPlanId,
        planName: targetPlan.name,
        features: targetPlan.features,
        "metadata.migratedFrom": sourcePlanId,
        "metadata.migratedAt": new Date(),
        "metadata.migratedBy": adminId,
      });

      // İstatistikleri güncelle
      sourcePlan.statistics.activeUsers = await Membership.countDocuments({
        plan: sourcePlanId,
        status: "active",
      });
      await sourcePlan.save();

      targetPlan.statistics.activeUsers = await Membership.countDocuments({
        plan: targetPlanId,
        status: "active",
      });
      await targetPlan.save();

      // Activity Log
      await ActivityLog.create({
        user: adminId,
        action: "admin_action_performed",
        details: {
          action: "migrate_plan_users",
          sourcePlan: sourcePlan.name,
          targetPlan: targetPlan.name,
          userCount: result.modifiedCount,
        },
        severity: "high",
        isAdminAction: true,
      });

      return responseWrapper.success(
        res,
        {
          migratedCount: result.modifiedCount,
          sourcePlan: sourcePlan.name,
          targetPlan: targetPlan.name,
        },
        `${result.modifiedCount} kullanıcı başarıyla taşındı`
      );
    } catch (error) {
      console.error("Migrate plan users error:", error);
      return responseWrapper.error(res, "Kullanıcılar taşınamadı");
    }
  }

  /**
   * Plan promosyonu oluştur/güncelle
   */
  async managePlanPromotion(req, res) {
    try {
      const { planId } = req.params;
      const promotionData = req.body;
      const adminId = req.user.id;

      const plan = await MembershipPlan.findById(planId);

      if (!plan) {
        return responseWrapper.notFound(res, "Plan bulunamadı");
      }

      plan.promotions = promotionData;
      await plan.save();

      return responseWrapper.success(
        res,
        { promotion: plan.promotions },
        "Promosyon başarıyla güncellendi"
      );
    } catch (error) {
      console.error("Manage plan promotion error:", error);
      return responseWrapper.error(res, "Promosyon yönetilemedi");
    }
  }

  /**
   * Plan özelliklerini toplu güncelle
   */
  async bulkUpdateFeatures(req, res) {
    try {
      const { planId } = req.params;
      const { features } = req.body;
      const adminId = req.user.id;

      const plan = await MembershipPlan.findById(planId);

      if (!plan) {
        return responseWrapper.notFound(res, "Plan bulunamadı");
      }

      // Deep merge features
      const mergeFeatures = (target, source) => {
        for (const key in source) {
          if (typeof source[key] === "object" && !Array.isArray(source[key])) {
            if (!target[key]) target[key] = {};
            mergeFeatures(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        }
      };

      mergeFeatures(plan.features, features);

      plan.metadata.lastModifiedBy = adminId;
      plan.metadata.changeLog.push({
        date: new Date(),
        changedBy: adminId,
        changes: "Özellikler toplu güncellendi",
      });

      await plan.save();

      // Mevcut kullanıcıların özelliklerini güncelle
      await Membership.updateMany(
        { plan: planId },
        { features: plan.features }
      );

      return responseWrapper.success(
        res,
        { features: plan.features },
        "Özellikler başarıyla güncellendi"
      );
    } catch (error) {
      console.error("Bulk update features error:", error);
      return responseWrapper.error(res, "Özellikler güncellenemedi");
    }
  }

  /**
   * Plan karşılaştırması
   */
  async comparePlans(req, res) {
    try {
      const { planIds } = req.query; // comma separated

      if (!planIds) {
        return responseWrapper.badRequest(res, "Plan ID'leri gerekli");
      }

      const ids = planIds.split(",");
      const plans = await MembershipPlan.find({
        _id: { $in: ids },
        isActive: true,
      });

      if (plans.length < 2) {
        return responseWrapper.badRequest(res, "En az 2 plan seçilmeli");
      }

      // Karşılaştırma tablosu oluştur
      const comparison = {
        plans: plans.map((p) => ({
          id: p._id,
          name: p.displayName,
          price: p.pricing.monthly.amount,
        })),
        features: {},
      };

      // Tüm özellikleri topla
      const allFeatures = new Set();

      const collectFeatures = (obj, prefix = "") => {
        for (const key in obj) {
          const path = prefix ? `${prefix}.${key}` : key;

          if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
            collectFeatures(obj[key], path);
          } else {
            allFeatures.add(path);
          }
        }
      };

      plans.forEach((plan) => collectFeatures(plan.features));

      // Her özellik için karşılaştırma
      allFeatures.forEach((feature) => {
        comparison.features[feature] = plans.map((plan) => {
          const keys = feature.split(".");
          let value = plan.features;

          for (const key of keys) {
            value = value?.[key];
          }

          return value;
        });
      });

      return responseWrapper.success(res, comparison, "Plan karşılaştırması");
    } catch (error) {
      console.error("Compare plans error:", error);
      return responseWrapper.error(res, "Planlar karşılaştırılamadı");
    }
  }

  /**
   * Plan istatistikleri
   */
  async getPlanStatistics(req, res) {
    try {
      const { planId } = req.params;
      const { startDate, endDate } = req.query;

      const plan = await MembershipPlan.findById(planId);

      if (!plan) {
        return responseWrapper.notFound(res, "Plan bulunamadı");
      }

      // Aktif kullanıcılar
      const activeUsers = await Membership.countDocuments({
        plan: planId,
        status: "active",
      });

      // Toplam kullanıcılar
      const totalUsers = await Membership.countDocuments({
        plan: planId,
      });

      // Aylık gelir hesaplama
      const activeMonthly = await Membership.countDocuments({
        plan: planId,
        status: "active",
        "pricing.interval": "monthly",
      });

      const activeYearly = await Membership.countDocuments({
        plan: planId,
        status: "active",
        "pricing.interval": "yearly",
      });

      const monthlyRevenue =
        activeMonthly * plan.pricing.monthly.amount +
        (activeYearly * plan.pricing.yearly.amount) / 12;

      // Churn rate (son 30 gün)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const cancelledLast30Days = await Membership.countDocuments({
        plan: planId,
        status: "cancelled",
        "subscription.cancelledAt": { $gte: thirtyDaysAgo },
      });

      const churnRate =
        activeUsers > 0
          ? ((cancelledLast30Days / activeUsers) * 100).toFixed(2)
          : 0;

      // Büyüme oranı
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const newUsersLast30Days = await Membership.countDocuments({
        plan: planId,
        createdAt: { $gte: thirtyDaysAgo },
      });

      const usersMonth2Ago = await Membership.countDocuments({
        plan: planId,
        createdAt: { $lt: thirtyDaysAgo, $gte: sixtyDaysAgo },
      });

      const growthRate =
        usersMonth2Ago > 0
          ? (
              ((newUsersLast30Days - usersMonth2Ago) / usersMonth2Ago) *
              100
            ).toFixed(2)
          : 0;

      const statistics = {
        activeUsers,
        totalUsers,
        monthlyRevenue,
        yearlyRevenue: monthlyRevenue * 12,
        churnRate: `${churnRate}%`,
        growthRate: `${growthRate}%`,
        newUsersLast30Days,
        cancelledLast30Days,
        averageLifetimeValue: (
          plan.statistics.totalRevenue / totalUsers
        ).toFixed(2),
      };

      // Plan istatistiklerini güncelle
      plan.statistics = {
        ...plan.statistics,
        activeUsers,
        totalUsers,
        monthlyRevenue,
        churnRate: parseFloat(churnRate),
      };
      await plan.save();

      return responseWrapper.success(res, statistics, "Plan istatistikleri");
    } catch (error) {
      console.error("Get plan statistics error:", error);
      return responseWrapper.error(res, "İstatistikler getirilemedi");
    }
  }
}

module.exports = new PlanAdminController();
