// server/services/membershipService.js

const Membership = require("../models/Membership");
const MembershipPlan = require("../models/MembershipPlan");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const Notification = require("../models/Notification");
const Investor = require("../models/Investor");
const {
  buildMembershipFeatureSnapshot,
  getCommissionDiscount,
  getMaxActiveInvestments,
} = require("../utils/membershipFeatures");

class MembershipService {
  getPlanDisplayName(plan) {
    return plan?.displayName || plan?.name || "Basic";
  }

  buildPricingSnapshot(plan, interval = "monthly") {
    return {
      amount: plan.pricing?.[interval]?.amount ?? plan.pricing?.monthly?.amount,
      currency:
        plan.pricing?.[interval]?.currency ?? plan.pricing?.monthly?.currency,
      interval,
    };
  }

  async getDefaultPlan() {
    const defaultPlan =
      (await MembershipPlan.findOne({ isDefault: true, isActive: true })) ||
      (await MembershipPlan.findOne({ name: "basic", isActive: true }));

    if (!defaultPlan) {
      throw new Error("Varsayılan ücretsiz plan bulunamadı");
    }

    return defaultPlan;
  }

  async findPlanByName(planName) {
    if (!planName) {
      return this.getDefaultPlan();
    }

    const normalizedName = String(planName).trim().toLowerCase();

    return (
      (await MembershipPlan.findOne({ name: normalizedName, isActive: true })) ||
      (await MembershipPlan.findOne({
        displayName: new RegExp(`^${normalizedName}$`, "i"),
        isActive: true,
      })) ||
      this.getDefaultPlan()
    );
  }

  async syncInvestorLimit(userId, role, plan) {
    if (role !== "investor") {
      return;
    }

    await Investor.findByIdAndUpdate(userId, {
      investmentLimit: getMaxActiveInvestments(plan.features),
    });
  }

  async syncUserMembershipState(
    userId,
    { plan, status = "active", activatedAt = null, expiresAt = null, accountStatus }
  ) {
    const updateData = {
      membershipPlan: this.getPlanDisplayName(plan),
      membershipStatus: status,
      membershipActivatedAt: activatedAt,
      membershipExpiresAt: expiresAt,
    };

    if (accountStatus) {
      updateData.accountStatus = accountStatus;
    }

    return User.findByIdAndUpdate(userId, updateData, { new: true });
  }

  async ensureDefaultMembershipForUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("Kullanıcı bulunamadı");
    }

    let membership = await Membership.findOne({ user: userId }).populate("plan");
    if (membership) {
      const plan =
        membership.plan || (await this.findPlanByName(membership.planName));
      const isFreePlan =
        plan?.pricing?.monthly?.amount === 0 || plan?.name === "basic";
      let shouldSave = false;

      if (
        membership.features?.maxActiveInvestments === undefined ||
        membership.features?.supportLevel === undefined
      ) {
        membership.features = buildMembershipFeatureSnapshot(plan);
        shouldSave = true;
      }

      if (isFreePlan && membership.status !== "active") {
        membership.status = "active";
        membership.activatedAt = membership.activatedAt || new Date();
        membership.expiresAt = null;
        membership.nextBillingDate = null;
        shouldSave = true;
      }

      if (shouldSave) {
        await membership.save();
      }

      await this.syncUserMembershipState(userId, {
        plan,
        status: membership.status || "active",
        activatedAt: membership.activatedAt || new Date(),
        expiresAt: membership.expiresAt || null,
      });
      await this.syncInvestorLimit(userId, user.role, plan);

      if (!membership.plan) {
        await membership.populate("plan");
      }

      return membership;
    }

    const defaultPlan = await this.getDefaultPlan();
    const activatedAt = new Date();

    membership = new Membership({
      user: userId,
      plan: defaultPlan._id,
      planName: defaultPlan.name,
      status: "active",
      features: buildMembershipFeatureSnapshot(defaultPlan),
      pricing: this.buildPricingSnapshot(defaultPlan, "monthly"),
      activatedAt,
      expiresAt: null,
      nextBillingDate: null,
      metadata: {
        source: "system",
      },
    });

    await membership.save();
    await membership.populate("plan");
    await this.syncUserMembershipState(userId, {
      plan: defaultPlan,
      status: "active",
      activatedAt,
      expiresAt: null,
    });
    await this.syncInvestorLimit(userId, user.role, defaultPlan);

    return membership;
  }

  async downgradeToDefaultPlan(
    userId,
    { reason = "system", previousPlanName = null } = {}
  ) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("Kullanıcı bulunamadı");
    }

    const defaultPlan = await this.getDefaultPlan();
    let membership = await Membership.findOne({ user: userId });

    if (!membership) {
      membership = new Membership({
        user: userId,
      });
    }

    const activatedAt = membership.activatedAt || new Date();

    membership.plan = defaultPlan._id;
    membership.planName = defaultPlan.name;
    membership.status = "active";
    membership.features = buildMembershipFeatureSnapshot(defaultPlan);
    membership.pricing = this.buildPricingSnapshot(defaultPlan, "monthly");
    membership.activatedAt = activatedAt;
    membership.expiresAt = null;
    membership.nextBillingDate = null;

    if (membership.subscription) {
      membership.subscription.currentPeriodEnd = null;
      membership.subscription.cancelAtPeriodEnd = false;
      membership.subscription.cancelledAt = null;
      membership.subscription.cancelReason = null;
    }

    await membership.save();
    await this.syncUserMembershipState(userId, {
      plan: defaultPlan,
      status: "active",
      activatedAt,
      expiresAt: null,
    });
    await this.syncInvestorLimit(userId, user.role, defaultPlan);

    const expiredPlanName =
      previousPlanName || user.membershipPlan || membership.planName;

    if (reason === "membership_expired") {
      await this.createNotification(userId, user.role, {
        type: "membership_expired",
        title: "Ücretli planınız sona erdi",
        message:
          "Plan süreniz dolduğu için hesabınız ücretsiz Basic plana geçirildi.",
        priority: "high",
      });

      await this.logActivity(userId, "membership_expired", {
        expiredPlan: expiredPlanName,
        fallbackPlan: defaultPlan.name,
      });
    }

    if (reason === "membership_cancelled") {
      await this.logActivity(userId, "membership_cancelled", {
        previousPlan: expiredPlanName,
      });
    }

    await membership.populate("plan");

    return membership;
  }

  /**
   * Yeni membership oluştur (ilk kayıt)
   */
  async createMembership(userId, planName = "basic") {
    try {
      // Mevcut membership kontrolü
      const existingMembership = await Membership.findOne({ user: userId });
      if (existingMembership) {
        throw new Error("Kullanıcı zaten bir üyeliğe sahip");
      }

      // Plan bilgisini getir
      const plan = await this.findPlanByName(planName);

      // Basic plan için otomatik aktivasyon
      const isFreePlan = plan.pricing.monthly.amount === 0;
      const activatedAt = isFreePlan ? new Date() : null;

      const membership = new Membership({
        user: userId,
        plan: plan._id,
        planName: plan.name,
        status: isFreePlan ? "active" : "inactive",
        features: buildMembershipFeatureSnapshot(plan),
        pricing: this.buildPricingSnapshot(plan, "monthly"),
        activatedAt,
        expiresAt: null, // Süresiz
      });

      await membership.save();

      // User modelini güncelle
      const user = await this.syncUserMembershipState(userId, {
        plan,
        status: membership.status,
        activatedAt,
        expiresAt: membership.expiresAt,
      });
      await this.syncInvestorLimit(userId, user?.role, plan);

      // Activity Log
      await this.logActivity(userId, "membership_activated", {
        plan: this.getPlanDisplayName(plan),
        status: membership.status,
      });

      return membership;
    } catch (error) {
      console.error("Create membership error:", error);
      throw error;
    }
  }

  /**
   * Membership'i aktifleştir (Admin onayı veya ödeme sonrası)
   */
  async activateMembership({
    userId,
    planId,
    interval = "monthly",
    promoCode,
    adminId,
  }) {
    // Plan bilgisini getir
    const plan = await MembershipPlan.findById(planId);
    if (!plan) throw new Error("Plan bulunamadı");

    // Membership’i bul veya oluştur
    let membership = await Membership.findOne({ user: userId });
    if (!membership) {
      membership = await this.createMembership(userId, plan.name);
    }

    // Membership’i güncelle
    const isFreePlan = plan.pricing?.monthly?.amount === 0;
    membership.plan = plan._id;
    membership.planName = plan.name;
    membership.status = "active";
    membership.features = buildMembershipFeatureSnapshot(plan);
    membership.pricing = this.buildPricingSnapshot(plan, interval);
    membership.activatedAt = new Date();

    // Süre (ör: monthly = 30 gün, yearly = 365 gün)
    let expiryDate = null;
    if (!isFreePlan) {
      expiryDate = new Date();
      const plusDays = interval === "yearly" ? 365 : 30;
      expiryDate.setDate(expiryDate.getDate() + plusDays);
    }

    membership.expiresAt = expiryDate;
    membership.nextBillingDate = expiryDate;

    await membership.save();

    // User modelini güncelle
    const user = await this.syncUserMembershipState(userId, {
      plan,
      status: membership.status,
      activatedAt: membership.activatedAt,
      expiresAt: membership.expiresAt,
      accountStatus: "active",
    });

    // Investor ise limit güncelle
    await this.syncInvestorLimit(userId, user?.role, plan);

    // Bildirim
    await this.createNotification(userId, user?.role ?? "investor", {
      type: "membership_upgraded",
      title: "Üyeliğiniz Aktifleştirildi",
      message: `${
        this.getPlanDisplayName(plan)
      } üyelik planınız başarıyla aktifleştirildi.`,
      priority: "high",
    });

    // Activity Log
    await this.logActivity(userId, "membership_activated", {
      plan: this.getPlanDisplayName(plan),
      activatedBy: adminId ? "admin" : "system",
      adminId,
      promoCode: promoCode || null,
    });

    return membership;
  }

  /**
   * Plan değiştir
   */
  async changePlan({
    userId,
    newPlanId,
    interval = "monthly",
    promoCode,
    adminId,
  }) {
    try {
      // 1) Kullanıcının mevcut membership’ini çek
      let membership = await Membership.findOne({ user: userId }).populate(
        "plan"
      );
      if (!membership) {
        membership = await this.ensureDefaultMembershipForUser(userId);
        await membership.populate("plan");
      }

      const oldPlan = membership.plan;

      // 2) Yeni planı çek
      const newPlan = await MembershipPlan.findById(newPlanId);
      if (!newPlan || !newPlan.isActive)
        throw new Error("Plan bulunamadı veya aktif değil");

      // 3) Kullanıcıyı çek (bildirim ve role için gerekli)
      const user = await User.findById(userId);
      if (!user) throw new Error("Kullanıcı bulunamadı");

      // === Plan değişimini uygula (mevcut mantık) ===
      const isFreePlan = newPlan.pricing?.monthly?.amount === 0;
      membership.plan = newPlan._id;
      membership.planName = newPlan.name;
      membership.status = "active";
      membership.features = buildMembershipFeatureSnapshot(newPlan);
      membership.pricing = this.buildPricingSnapshot(newPlan, interval);
      membership.activatedAt = membership.activatedAt || new Date();

      if (isFreePlan) {
        membership.expiresAt = null;
        membership.nextBillingDate = null;
      } else if (!membership.expiresAt || membership.expiresAt <= new Date()) {
        const expiryDate = new Date();
        const plusDays = interval === "yearly" ? 365 : 30;
        expiryDate.setDate(expiryDate.getDate() + plusDays);
        membership.expiresAt = expiryDate;
        membership.nextBillingDate = expiryDate;
      }

      await membership.save();

      // User side güncellemeler (zaten mevcut)
      const updatedUser = await this.syncUserMembershipState(userId, {
        plan: newPlan,
        status: membership.status,
        activatedAt: membership.activatedAt,
        expiresAt: membership.expiresAt,
      });

      // Investor ise limit güncellemesi (zaten vardı)
      await this.syncInvestorLimit(userId, updatedUser.role, newPlan);

      // Bildirim
      await this.createNotification(userId, user.role, {
        type: "membership_upgraded",
        title: "Plan Değiştirildi",
        message: `Üyeliğiniz ${this.getPlanDisplayName(newPlan)} planına değiştirildi.`,
        priority: "medium",
      });

      // Activity Log
      await this.logActivity(userId, "membership_plan_changed", {
        oldPlan: this.getPlanDisplayName(oldPlan),
        newPlan: this.getPlanDisplayName(newPlan),
        changedBy: adminId ? "admin" : "user",
        adminId,
      });

      return membership;
    } catch (error) {
      console.error("Change plan error:", error);
      throw error;
    }
  }

  /**
   * Üyeliği iptal et
   */
  async cancelMembership(userId, reason = null) {
    try {
      const membership = await Membership.findOne({ user: userId }).populate(
        "plan"
      );
      if (!membership) {
        throw new Error("Üyelik bulunamadı");
      }
      const previousPlan = membership.plan;

      return this.downgradeToDefaultPlan(userId, {
        reason: "membership_cancelled",
        previousPlanName: this.getPlanDisplayName(previousPlan),
      });
    } catch (error) {
      console.error("Cancel membership error:", error);
      throw error;
    }
  }

  /**
   * Üyeliği yenile (süre uzatma)
   */
  async renewMembership(userId, days = 30, adminId = null) {
    try {
      const membership = await Membership.findOne({ user: userId });
      if (!membership) {
        throw new Error("Üyelik bulunamadı");
      }

      // Yeni bitiş tarihi
      const currentExpiry = membership.expiresAt || new Date();
      const newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + days);

      membership.expiresAt = newExpiry;
      membership.renewalDate = new Date();
      membership.status = "active";

      await membership.save();

      // User modelini güncelle
      const plan =
        (await MembershipPlan.findById(membership.plan)) ||
        (await this.findPlanByName(membership.planName));
      await this.syncUserMembershipState(userId, {
        plan,
        status: "active",
        activatedAt: membership.activatedAt,
        expiresAt: newExpiry,
      });

      // Activity Log
      await this.logActivity(userId, "membership_renewed", {
        days,
        newExpiry,
        renewedBy: adminId ? "admin" : "system",
        adminId,
      });

      return membership;
    } catch (error) {
      console.error("Renew membership error:", error);
      throw error;
    }
  }

  /**
   * Süre dolmuş üyelikleri kontrol et (Cron job için)
   */
  async checkExpiredMemberships() {
    try {
      const now = new Date();

      // Süresi dolmuş üyelikler
      const expiredMemberships = await Membership.find({
        status: "active",
        expiresAt: { $lt: now },
        planName: { $ne: "basic" }, // Basic plan süresiz
      });

      for (const membership of expiredMemberships) {
        await this.downgradeToDefaultPlan(membership.user, {
          reason: "membership_expired",
          previousPlanName: membership.planName,
        });
      }

      // Yakında sona erecek üyelikler için hatırlatma (7 gün kala)
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 7);

      const expiringMemberships = await Membership.find({
        status: "active",
        expiresAt: { $lt: reminderDate, $gt: now },
        "notifications.lastReminderSentAt": {
          $lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Son 24 saatte gönderilmemiş
        },
      }).populate("user");

      for (const membership of expiringMemberships) {
        // Bildirim
        await this.createNotification(
          membership.user._id,
          membership.user.role,
          {
            type: "membership_expiring",
            title: "Üyeliğiniz Yakında Sona Erecek",
            message: `Üyeliğiniz ${new Date(
              membership.expiresAt
            ).toLocaleDateString()} tarihinde sona erecek.`,
            priority: "high",
          }
        );

        membership.notifications.lastReminderSentAt = new Date();
        await membership.save();
      }

      console.log(`Processed ${expiredMemberships.length} expired memberships`);
      console.log(`Sent ${expiringMemberships.length} expiry reminders`);
    } catch (error) {
      console.error("Check expired memberships error:", error);
      throw error;
    }
  }

  /**
   * Kullanıcının membership durumunu getir
   */
  async getMembershipStatus(userId) {
    try {
      const membership = await this.ensureDefaultMembershipForUser(userId);
      await membership.populate("plan");

      return {
        hasMembership: true,
        plan: this.getPlanDisplayName(membership.plan),
        planId: membership.plan._id,
        status: membership.status,
        isActive: membership.isActive,
        expiresAt: membership.expiresAt,
        features: membership.features,
        usage: membership.usage,
        canMakeInvestment: membership.canMakeInvestment(),
        remainingInvestments: membership.getRemainingInvestments(),
      };
    } catch (error) {
      console.error("Get membership status error:", error);
      throw error;
    }
  }

  /**
   * Yatırım yapabilir mi kontrolü
   */
  async canUserMakeInvestment(userId) {
    try {
      const membership = await this.ensureDefaultMembershipForUser(userId);
      await membership.populate("plan");

      if (!membership || !membership.isActive) {
        return {
          canInvest: false,
          reason: "Aktif üyeliğiniz bulunmamaktadır",
        };
      }

      if (!membership.canMakeInvestment()) {
        const maxActiveInvestments = getMaxActiveInvestments(membership.features);
        return {
          canInvest: false,
          reason: `${this.getPlanDisplayName(
            membership.plan
          )} planınızda maksimum ${maxActiveInvestments} aktif yatırım hakkınız var.`,
          currentPlan: this.getPlanDisplayName(membership.plan),
        };
      }

      return {
        canInvest: true,
        remainingInvestments: membership.getRemainingInvestments(),
      };
    } catch (error) {
      console.error("Can user make investment error:", error);
      throw error;
    }
  }

  /**
   * Yatırım sayısını güncelle
   */
  async updateInvestmentCount(userId, increment = 1) {
    try {
      const membership = await Membership.findOne({ user: userId });
      if (!membership) {
        await this.ensureDefaultMembershipForUser(userId);
      }

      const currentMembership =
        membership || (await Membership.findOne({ user: userId }));
      if (!currentMembership) {
        throw new Error("Üyelik bulunamadı");
      }

      currentMembership.usage.currentActiveInvestments += increment;
      if (increment > 0) {
        currentMembership.usage.totalInvestmentsMade += increment;
      }
      currentMembership.usage.lastActivityAt = new Date();

      await currentMembership.save();

      return currentMembership;
    } catch (error) {
      console.error("Update investment count error:", error);
      throw error;
    }
  }

  /**
   * Komisyon hesapla
   */
  calculateCommission(membership, baseAmount, commissionType = "platform") {
    if (!membership || !membership.isActive) {
      return baseAmount; // İndirim yok
    }

    const discountRate = getCommissionDiscount(
      membership.features,
      commissionType
    );
    return baseAmount * (1 - discountRate / 100);
  }

  /**
   * Activity Log kaydet
   */
  async logActivity(userId, action, details = {}) {
    try {
      await ActivityLog.create({
        user: userId,
        action,
        details,
        severity: this.getActionSeverity(action),
      });
    } catch (error) {
      console.error("Log activity error:", error);
    }
  }

  /**
   * Bildirim oluştur
   */
  async createNotification(userId, userRole, notificationData) {
    try {
      await Notification.create({
        recipient: userId,
        recipientRole: userRole,
        ...notificationData,
      });
    } catch (error) {
      console.error("Create notification error:", error);
    }
  }

  /**
   * Action severity belirle
   */
  getActionSeverity(action) {
    const highSeverityActions = ["membership_cancelled", "membership_expired"];
    const mediumSeverityActions = [
      "membership_plan_changed",
      "membership_renewed",
    ];

    if (highSeverityActions.includes(action)) return "high";
    if (mediumSeverityActions.includes(action)) return "medium";
    return "low";
  }
}

module.exports = new MembershipService();
