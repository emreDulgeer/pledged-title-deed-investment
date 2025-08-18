// server/controllers/membershipController.js

const membershipService = require("../services/membershipService");
const Membership = require("../models/Membership");
const MembershipPlan = require("../models/MembershipPlan");
const responseWrapper = require("../utils/responseWrapper");

class MembershipController {
  /**
   * Mevcut üyelik durumunu getir
   */
  async getStatus(req, res) {
    try {
      const userId = req.user.id;
      const status = await membershipService.getMembershipStatus(userId);

      return responseWrapper.success(res, status, "Üyelik durumu getirildi");
    } catch (error) {
      console.error("Get membership status error:", error);
      return responseWrapper.error(res, "Üyelik durumu getirilemedi");
    }
  }

  /**
   * Kullanılabilir planları listele
   */
  async getPlans(req, res) {
    try {
      // Aktif ve görünür planları getir
      const plans = await MembershipPlan.find({
        isActive: true,
        isVisible: true,
      }).sort({ order: 1 });

      // Kullanıcının mevcut planını işaretle
      let userMembership = null;
      if (req.user) {
        userMembership = await Membership.findOne({
          user: req.user.id,
        }).populate("plan");
      }

      const plansData = plans.map((plan) => ({
        id: plan._id,
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description,
        pricing: {
          monthly: plan.pricing.monthly,
          yearly: plan.pricing.yearly,
        },
        features: plan.features,
        isHighlighted: plan.isHighlighted,
        isCurrent: userMembership?.plan?._id.toString() === plan._id.toString(),
      }));

      return responseWrapper.success(
        res,
        { plans: plansData },
        "Planlar listelendi"
      );
    } catch (error) {
      console.error("Get plans error:", error);
      return responseWrapper.error(res, "Planlar getirilemedi");
    }
  }
  async activateNow(req, res, next) {
    try {
      const { planId, interval = "monthly", promoCode } = req.body;
      const membership = await membershipService.activateMembership({
        userId: req.user.id,
        planId,
        interval,
        promoCode,
      });
      res.json({
        success: true,
        data: membership,
        message: "Membership activated",
      });
    } catch (err) {
      next(err);
    }
  }
  async changePlanNow(req, res, next) {
    try {
      const { planId, interval = "monthly", promoCode } = req.body;

      const result = await membershipService.changePlan({
        userId: req.user.id, // <- JWT’den
        newPlanId: planId, // <- body’deki planId’i service’in beklediği newPlanId’e map’liyoruz
        interval,
        promoCode,
        // adminId: req.user.role === 'admin' ? req.user.id : undefined, // (opsiyonel)
      });
      res.json({ success: true, data: result, message: "Plan changed" });
    } catch (err) {
      next(err);
    }
  }
  /**
   * Üyeliği iptal et (Basic plana geç)
   */
  async cancel(req, res) {
    try {
      const { reason } = req.body;
      const userId = req.user.id;

      const membership = await membershipService.cancelMembership(
        userId,
        reason
      );

      return responseWrapper.success(
        res,
        {
          status: membership.status,
          plan: "Basic",
        },
        "Üyeliğiniz iptal edildi. Basic plana geçiş yapıldı."
      );
    } catch (error) {
      console.error("Cancel membership error:", error);
      return responseWrapper.error(res, "Üyelik iptal edilemedi");
    }
  }

  /**
   * Admin: Üyelik süresini uzat
   */
  async extendMembership(req, res) {
    try {
      const { userId, days = 30, reason } = req.body;
      const adminId = req.user.id;

      const membership = await membershipService.renewMembership(
        userId,
        days,
        adminId
      );
      await membership.populate("plan");

      return responseWrapper.success(
        res,
        {
          plan: membership.plan.displayName,
          newExpiryDate: membership.expiresAt,
          extendedDays: days,
        },
        `Üyelik süresi ${days} gün uzatıldı`
      );
    } catch (error) {
      console.error("Extend membership error:", error);
      return responseWrapper.error(res, "Üyelik süresi uzatılamadı");
    }
  }

  /**
   * Admin: Üyelik istatistikleri
   */
  async getStatistics(req, res) {
    try {
      const stats = await Membership.aggregate([
        {
          $lookup: {
            from: "membershipplans",
            localField: "plan",
            foreignField: "_id",
            as: "planInfo",
          },
        },
        {
          $unwind: "$planInfo",
        },
        {
          $group: {
            _id: "$planInfo.name",
            displayName: { $first: "$planInfo.displayName" },
            count: { $sum: 1 },
            activeCount: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
            pendingCount: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
            },
            expiredCount: {
              $sum: { $cond: [{ $eq: ["$status", "expired"] }, 1, 0] },
            },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      const totalStats = {
        totalMembers: stats.reduce((acc, s) => acc + s.count, 0),
        activeMembers: stats.reduce((acc, s) => acc + s.activeCount, 0),
        pendingMembers: stats.reduce((acc, s) => acc + s.pendingCount, 0),
        expiredMembers: stats.reduce((acc, s) => acc + s.expiredCount, 0),
        byPlan: stats,
      };

      return responseWrapper.success(
        res,
        totalStats,
        "İstatistikler getirildi"
      );
    } catch (error) {
      console.error("Get statistics error:", error);
      return responseWrapper.error(res, "İstatistikler getirilemedi");
    }
  }
}

module.exports = new MembershipController();
