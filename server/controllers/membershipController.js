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

  /**
   * Plan değişikliği talebi (Admin onayı gerekir)
   */
  async requestPlanChange(req, res) {
    try {
      const { planId, reason } = req.body;
      const userId = req.user.id;

      // Plan kontrolü
      const plan = await MembershipPlan.findById(planId);
      if (!plan || !plan.isActive) {
        return responseWrapper.badRequest(
          res,
          "Geçersiz veya aktif olmayan plan"
        );
      }

      // Mevcut membership kontrolü
      const membership = await Membership.findOne({ user: userId }).populate(
        "plan"
      );

      if (!membership) {
        // İlk kez membership oluşturuluyor
        const newMembership = await membershipService.createMembership(
          userId,
          plan.name
        );
        return responseWrapper.success(
          res,
          { membership: newMembership },
          "Üyelik oluşturuldu. Admin onayı bekleniyor."
        );
      }

      if (membership.plan._id.toString() === planId) {
        return responseWrapper.badRequest(
          res,
          "Zaten bu planda üyeliğiniz var"
        );
      }

      // Plan değişiklik talebini kaydet
      membership.metadata.planChangeRequest = {
        requestedPlan: planId,
        requestedAt: new Date(),
        reason: reason || "Plan değişikliği talebi",
        status: "pending",
      };

      await membership.save();

      return responseWrapper.success(
        res,
        {
          currentPlan: membership.plan.displayName,
          requestedPlan: plan.displayName,
          status: "pending",
        },
        "Plan değişiklik talebiniz alındı. Admin onayı bekleniyor."
      );
    } catch (error) {
      console.error("Request plan change error:", error);
      return responseWrapper.error(
        res,
        "Plan değişiklik talebi oluşturulamadı"
      );
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
   * Admin: Kullanıcıya üyelik ver/değiştir
   */
  async grantMembership(req, res) {
    try {
      const { userId, planId, duration = 30, reason } = req.body;
      const adminId = req.user.id;

      // Kullanıcı kontrolü
      const User = require("../models/User");
      const user = await User.findById(userId);
      if (!user) {
        return responseWrapper.notFound(res, "Kullanıcı bulunamadı");
      }

      // Plan kontrolü
      const plan = await MembershipPlan.findById(planId);
      if (!plan || !plan.isActive) {
        return responseWrapper.badRequest(
          res,
          "Geçersiz veya aktif olmayan plan"
        );
      }

      // Membership var mı kontrol et
      let membership = await Membership.findOne({ user: userId });

      if (membership) {
        // Plan değiştir
        membership = await membershipService.changePlan(
          userId,
          planId,
          adminId
        );
      } else {
        // Yeni membership oluştur ve aktifleştir
        await membershipService.createMembership(userId, plan.name);
        membership = await membershipService.activateMembership(
          userId,
          planId,
          adminId
        );
      }

      // Süre ekle
      if (duration > 0) {
        membership = await membershipService.renewMembership(
          userId,
          duration,
          adminId
        );
      }

      await membership.populate("plan");

      return responseWrapper.success(
        res,
        {
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
          },
          membership: {
            plan: membership.plan.displayName,
            status: membership.status,
            expiresAt: membership.expiresAt,
          },
        },
        "Üyelik başarıyla verildi/güncellendi"
      );
    } catch (error) {
      console.error("Grant membership error:", error);
      return responseWrapper.error(res, "Üyelik verilemedi");
    }
  }

  /**
   * Admin: Plan değişiklik taleplerini listele
   */
  async getPlanChangeRequests(req, res) {
    try {
      const pendingRequests = await Membership.find({
        "metadata.planChangeRequest.status": "pending",
      })
        .populate("user", "fullName email")
        .populate("plan")
        .populate("metadata.planChangeRequest.requestedPlan");

      const requests = pendingRequests.map((membership) => ({
        id: membership._id,
        user: {
          id: membership.user._id,
          fullName: membership.user.fullName,
          email: membership.user.email,
        },
        currentPlan: membership.plan.displayName,
        requestedPlan: membership.metadata.planChangeRequest.requestedPlan,
        reason: membership.metadata.planChangeRequest.reason,
        requestedAt: membership.metadata.planChangeRequest.requestedAt,
      }));

      return responseWrapper.success(
        res,
        { requests },
        "Plan değişiklik talepleri"
      );
    } catch (error) {
      console.error("Get plan change requests error:", error);
      return responseWrapper.error(res, "Talepler getirilemedi");
    }
  }

  /**
   * Admin: Plan değişiklik talebini onayla
   */
  async approvePlanChange(req, res) {
    try {
      const { membershipId } = req.params;
      const adminId = req.user.id;

      const membership = await Membership.findById(membershipId);
      if (!membership) {
        return responseWrapper.notFound(res, "Üyelik bulunamadı");
      }

      if (
        !membership.metadata.planChangeRequest ||
        membership.metadata.planChangeRequest.status !== "pending"
      ) {
        return responseWrapper.badRequest(
          res,
          "Bekleyen plan değişiklik talebi yok"
        );
      }

      const requestedPlanId =
        membership.metadata.planChangeRequest.requestedPlan;

      // Plan değiştir
      await membershipService.changePlan(
        membership.user,
        requestedPlanId,
        adminId
      );

      // Talebi güncelle
      membership.metadata.planChangeRequest.status = "approved";
      membership.metadata.planChangeRequest.approvedBy = adminId;
      membership.metadata.planChangeRequest.approvedAt = new Date();
      await membership.save();

      return responseWrapper.success(res, null, "Plan değişikliği onaylandı");
    } catch (error) {
      console.error("Approve plan change error:", error);
      return responseWrapper.error(res, "Plan değişikliği onaylanamadı");
    }
  }

  /**
   * Admin: Plan değişiklik talebini reddet
   */
  async rejectPlanChange(req, res) {
    try {
      const { membershipId } = req.params;
      const { rejectionReason } = req.body;
      const adminId = req.user.id;

      const membership = await Membership.findById(membershipId);
      if (!membership) {
        return responseWrapper.notFound(res, "Üyelik bulunamadı");
      }

      if (
        !membership.metadata.planChangeRequest ||
        membership.metadata.planChangeRequest.status !== "pending"
      ) {
        return responseWrapper.badRequest(
          res,
          "Bekleyen plan değişiklik talebi yok"
        );
      }

      // Talebi reddet
      membership.metadata.planChangeRequest.status = "rejected";
      membership.metadata.planChangeRequest.rejectedBy = adminId;
      membership.metadata.planChangeRequest.rejectedAt = new Date();
      membership.metadata.planChangeRequest.rejectionReason = rejectionReason;
      await membership.save();

      return responseWrapper.success(
        res,
        null,
        "Plan değişiklik talebi reddedildi"
      );
    } catch (error) {
      console.error("Reject plan change error:", error);
      return responseWrapper.error(res, "Plan değişiklik talebi reddedilemedi");
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
