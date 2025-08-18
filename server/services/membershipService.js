// server/services/membershipService.js

const Membership = require("../models/Membership");
const MembershipPlan = require("../models/MembershipPlan");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const Notification = require("../models/Notification");
const Property = require("../models/Property");
const PropertyOwner = require("../models/PropertyOwner");
const Investor = require("../models/Investor");
class MembershipService {
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
      const plan = await MembershipPlan.findOne({
        name: planName.toLowerCase(),
        isActive: true,
      });

      if (!plan) {
        throw new Error(`${planName} planı bulunamadı`);
      }

      // Basic plan için otomatik aktivasyon
      const isFreePlan = plan.pricing.monthly.amount === 0;

      const membership = new Membership({
        user: userId,
        plan: plan._id,
        planName: plan.name,
        status: isFreePlan ? "active" : "pending", // Ücretsiz plan direkt aktif
        features: plan.features,
        pricing: {
          amount: plan.pricing.monthly.amount,
          currency: plan.pricing.monthly.currency,
          interval: "monthly",
        },
        activatedAt: isFreePlan ? new Date() : null,
        expiresAt: null, // Süresiz
      });

      await membership.save();

      // User modelini güncelle
      await User.findByIdAndUpdate(userId, {
        membershipPlan: plan.name,
        membershipStatus: membership.status,
        membershipActivatedAt: membership.activatedAt,
        membershipExpiresAt: membership.expiresAt,
      });

      // Activity Log
      await this.logActivity(userId, "membership_activated", {
        plan: plan.name,
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
    membership.plan = plan._id;
    membership.planName = plan.name;
    membership.status = "active";
    membership.features = plan.features;
    membership.pricing = {
      amount: plan.pricing?.[interval]?.amount ?? plan.pricing?.monthly?.amount,
      currency:
        plan.pricing?.[interval]?.currency ?? plan.pricing?.monthly?.currency,
      interval,
    };
    membership.activatedAt = new Date();

    // Süre (ör: monthly = 30 gün, yearly = 365 gün)
    const expiryDate = new Date();
    const plusDays = interval === "yearly" ? 365 : 30;
    expiryDate.setDate(expiryDate.getDate() + plusDays);
    membership.expiresAt = expiryDate;
    membership.nextBillingDate = expiryDate;

    await membership.save();

    // User modelini güncelle
    const user = await User.findByIdAndUpdate(
      userId,
      {
        membershipStatus: membership.status,
        membershipActivatedAt: membership.activatedAt,
        membershipExpiresAt: membership.expiresAt,
        accountStatus: "active",
      },
      { new: true }
    );

    // Investor ise limit güncelle
    if (user?.role === "investor") {
      await Investor.findByIdAndUpdate(userId, {
        investmentLimit: plan.features?.investments?.maxActiveInvestments || 1,
      });
    }

    // Bildirim
    await this.createNotification(userId, user?.role ?? "investor", {
      type: "membership_upgraded",
      title: "Üyeliğiniz Aktifleştirildi",
      message: `${
        plan.displayName || plan.name
      } üyelik planınız başarıyla aktifleştirildi.`,
      priority: "high",
    });

    // Activity Log
    await this.logActivity(userId, "membership_activated", {
      plan: plan.name,
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
      const membership = await Membership.findOne({ user: userId }).populate(
        "plan"
      );
      if (!membership) throw new Error("Üyelik bulunamadı");

      const oldPlan = membership.plan;

      // 2) Yeni planı çek
      const newPlan = await MembershipPlan.findById(newPlanId);
      if (!newPlan || !newPlan.isActive)
        throw new Error("Plan bulunamadı veya aktif değil");

      // 3) Kullanıcıyı çek (bildirim ve role için gerekli)
      const user = await User.findById(userId);
      if (!user) throw new Error("Kullanıcı bulunamadı");

      // === Downgrade kontrolü (tier bazlı) ===
      const isDowngrade = (newPlan.tier || 0) < (oldPlan.tier || 0);
      if (isDowngrade) {
        // Investor limiti
        if (user.role === "investor") {
          const newMaxInv =
            newPlan.features?.investments?.maxActiveInvestments ?? 1;
          const currentActive = membership.usage?.currentActiveInvestments ?? 0;
          // ESKİ: if (newMaxInv !== -1 && currentActive > newMaxInv) {
          if (newMaxInv !== -1 && currentActive >= newMaxInv) {
            throw new Error(
              `Downgrade mümkün değil: Aktif yatırım sayınız (${currentActive}), ` +
                `yeni plan limitini (${newMaxInv}) aşıyor/dengeye geliyor.`
            );
          }
        }

        // PropertyOwner limiti
        if (user.role === "property_owner") {
          const newMaxProps =
            newPlan.features?.properties?.maxActiveListings ?? 1;
          const newMaxPublished =
            newPlan.features?.properties?.maxPublishedProperties ?? 1;
          const newMaxContracts =
            newPlan.features?.properties?.maxConcurrentContracts ?? 1;

          // Aktif ilan/mülk sayısı
          const activeStatuses = ["published", "in_contract", "active"];
          const activeProps = await Property.countDocuments({
            owner: userId,
            status: { $in: activeStatuses },
          });

          // Ongoing contracts (User -> PropertyOwner discriminator alanı)

          const ownerDoc = await PropertyOwner.findById(
            userId,
            "ongoingContracts"
          );
          const ongoing = ownerDoc?.ongoingContracts ?? 0;

          if (newMaxProps !== -1 && activeProps >= newMaxProps) {
            throw new Error(
              `Downgrade mümkün değil: Aktif mülk sayınız (${activeProps}) ` +
                `yeni plan limitini (${newMaxProps}) aşıyor/dengeye geliyor.`
            );
          }
          if (newMaxPublished !== -1 && activeProps >= newMaxPublished) {
            throw new Error(
              `Downgrade mümkün değil: Yayındaki ilan sayınız (${activeProps}) ` +
                `yeni plan limitini (${newMaxPublished}) aşıyor/dengeye geliyor.`
            );
          }
          if (newMaxContracts !== -1 && ongoing >= newMaxContracts) {
            throw new Error(
              `Downgrade mümkün değil: Aktif kontrat sayınız (${ongoing}) ` +
                `yeni plan limitini (${newMaxContracts}) aşıyor/dengeye geliyor.`
            );
          }
        }
      }

      // === Plan değişimini uygula (mevcut mantık) ===
      membership.plan = newPlan._id;
      membership.planName = newPlan.name;
      membership.features = newPlan.features;
      membership.pricing = {
        amount:
          newPlan.pricing?.[interval]?.amount ??
          newPlan.pricing?.monthly?.amount,
        currency:
          newPlan.pricing?.[interval]?.currency ??
          newPlan.pricing?.monthly?.currency,
        interval,
      };

      await membership.save();

      // User side güncellemeler (zaten mevcut)
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { membershipPlan: newPlan.name },
        { new: true }
      );

      // Investor ise limit güncellemesi (zaten vardı)
      if (updatedUser.role === "investor") {
        await Investor.findByIdAndUpdate(userId, {
          investmentLimit:
            newPlan.features?.investments?.maxActiveInvestments || 1,
        });
      }

      // Bildirim
      await this.createNotification(userId, user.role, {
        type: "membership_upgraded",
        title: "Plan Değiştirildi",
        message: `Üyeliğiniz ${newPlan.displayName} planına değiştirildi.`,
        priority: "medium",
      });

      // Activity Log
      await this.logActivity(userId, "membership_plan_changed", {
        oldPlan: oldPlan.name,
        newPlan: newPlan.name,
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
      const membership = await Membership.findOne({ user: userId });
      if (!membership) {
        throw new Error("Üyelik bulunamadı");
      }

      // Basic plana geç
      const basicPlan = await MembershipPlan.findOne({
        name: "basic",
        isActive: true,
      });

      membership.plan = basicPlan._id;
      membership.planName = basicPlan.name;
      membership.status = "active"; // Basic plan her zaman aktif
      membership.features = basicPlan.features;
      membership.pricing = {
        amount: 0,
        currency: "EUR",
        interval: "monthly",
      };

      await membership.save();

      // User modelini güncelle
      await User.findByIdAndUpdate(userId, {
        membershipPlan: "basic",
        membershipStatus: "active",
      });

      // Activity Log
      await this.logActivity(userId, "membership_cancelled", {
        reason,
      });

      return membership;
    } catch (error) {
      console.error("Cancel membership error:", error);
      throw error;
    }
  }

  /**
   * Üyeliği yenile (süre uzatma)
   */
  async renewMembership(userId, days = 30) {
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
      await User.findByIdAndUpdate(userId, {
        membershipExpiresAt: newExpiry,
        membershipStatus: "active",
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
        // Basic plana geç
        const basicPlan = await MembershipPlan.findOne({
          name: "basic",
          isActive: true,
        });

        membership.status = "expired";
        membership.plan = basicPlan._id;
        membership.planName = basicPlan.name;
        membership.features = basicPlan.features;
        await membership.save();

        await User.findByIdAndUpdate(membership.user, {
          membershipStatus: "expired",
          membershipPlan: "basic",
        });

        // Activity Log
        await this.logActivity(membership.user, "membership_expired", {
          expiredPlan: membership.planName,
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
      const membership = await Membership.findOne({ user: userId }).populate(
        "plan"
      );

      if (!membership) {
        return {
          hasMembership: false,
          plan: "none",
          status: "inactive",
        };
      }

      return {
        hasMembership: true,
        plan: membership.plan.displayName,
        planId: membership.plan._id,
        status: membership.status,
        isActive: membership.status === "active",
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
      const membership = await Membership.findOne({ user: userId }).populate(
        "plan"
      );

      if (!membership || membership.status !== "active") {
        return {
          canInvest: false,
          reason: "Aktif üyeliğiniz bulunmamaktadır",
        };
      }

      if (!membership.canMakeInvestment()) {
        return {
          canInvest: false,
          reason: `${membership.plan.displayName} planınızda maksimum ${
            membership.features.investments?.maxActiveInvestments || 1
          } aktif yatırım hakkınız var.`,
          currentPlan: membership.plan.displayName,
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
        throw new Error("Üyelik bulunamadı");
      }

      membership.usage.currentActiveInvestments += increment;
      if (increment > 0) {
        membership.usage.totalInvestmentsMade += increment;
      }
      membership.usage.lastActivityAt = new Date();

      await membership.save();

      return membership;
    } catch (error) {
      console.error("Update investment count error:", error);
      throw error;
    }
  }

  /**
   * Komisyon hesapla
   */
  calculateCommission(membership, baseAmount, commissionType = "platform") {
    if (!membership || membership.status !== "active") {
      return baseAmount; // İndirim yok
    }

    const discountField =
      commissionType === "rental"
        ? "rentalCommissionDiscount"
        : "platformCommissionDiscount";

    const discountRate = membership.features.commissions?.[discountField] || 0;
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
