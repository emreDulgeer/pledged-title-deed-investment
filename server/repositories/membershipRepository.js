// server/repositories/membershipRepository.js

const Membership = require("../models/Membership");

class MembershipRepository {
  /**
   * Kullanıcı ID ile membership getir
   */
  async findByUserId(userId) {
    return await Membership.findOne({ user: userId }).populate(
      "plan",
      "name displayName tier features pricing"
    );
  }

  /**
   * ID ile membership getir
   */
  async findById(id) {
    return await Membership.findById(id)
      .populate("plan")
      .populate("user", "name email");
  }

  /**
   * Tüm membership'leri getir (Admin)
   */
  async findAll(filter = {}, options = {}) {
    const query = Membership.find(filter);

    if (options.populate) {
      query.populate(options.populate);
    }

    if (options.sort) {
      query.sort(options.sort);
    }

    if (options.limit) {
      query.limit(options.limit);
    }

    if (options.skip) {
      query.skip(options.skip);
    }

    return await query.exec();
  }

  /**
   * Yeni membership oluştur
   */
  async create(membershipData) {
    const membership = new Membership(membershipData);
    return await membership.save();
  }

  /**
   * Membership güncelle
   */
  async update(id, updateData) {
    return await Membership.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  }

  /**
   * Kullanıcı ID ile membership güncelle
   */
  async updateByUserId(userId, updateData) {
    return await Membership.findOneAndUpdate({ user: userId }, updateData, {
      new: true,
      runValidators: true,
    });
  }

  /**
   * Membership sil
   */
  async delete(id) {
    return await Membership.findByIdAndDelete(id);
  }

  /**
   * Referans kodu ile membership getir
   */
  async findByReferralCode(code) {
    return await Membership.findOne({ "referral.referralCode": code });
  }

  /**
   * Plan ID ile aktif membership'leri getir
   */
  async findActiveByPlanId(planId) {
    return await Membership.find({
      plan: planId,
      status: "active",
    });
  }

  /**
   * Süresi dolmak üzere olan membership'leri getir
   */
  async findExpiringSoon(days = 7) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return await Membership.find({
      status: "active",
      expiresAt: { $lte: expiryDate, $gte: new Date() },
      "subscription.cancelAtPeriodEnd": false,
    }).populate("user", "name email");
  }

  /**
   * Kullanım istatistiklerini güncelle
   */
  async updateUsageStats(userId, statType, value = 1) {
    const updateField = `usage.${statType}`;

    return await Membership.findOneAndUpdate(
      { user: userId },
      {
        $inc: { [updateField]: value },
      },
      { new: true }
    );
  }

  /**
   * Ödeme kaydı ekle
   */
  async addPaymentRecord(membershipId, paymentData) {
    return await Membership.findByIdAndUpdate(
      membershipId,
      {
        $push: { payments: paymentData },
        lastPaymentDate: new Date(),
      },
      { new: true }
    );
  }

  /**
   * Referans ekle
   */
  async addReferral(referrerCode, referredUserId) {
    return await Membership.findOneAndUpdate(
      { "promotions.referralCode": referrerCode },
      {
        $push: {
          "referral.referredUsers": {
            user: referredUserId,
            registeredAt: new Date(),
            status: "pending",
          },
        },
        $inc: {
          "usage.totalReferrals": 1,
          "promotions.referralCount": 1,
        },
      },
      { new: true }
    );
  }

  /**
   * Plan değişiklik geçmişi ekle
   */
  async addPlanChangeHistory(membershipId, changeData) {
    return await Membership.findByIdAndUpdate(
      membershipId,
      {
        $push: { planHistory: changeData },
      },
      { new: true }
    );
  }

  /**
   * Kullanıcının aktif yatırım sayısını güncelle
   */
  async updateActiveInvestmentCount(userId, increment = 1) {
    return await Membership.findOneAndUpdate(
      { user: userId },
      {
        $inc: {
          "usage.currentActiveInvestments": increment,
          "usage.totalInvestments": increment > 0 ? increment : 0,
        },
      },
      { new: true }
    );
  }

  /**
   * Grace period'da olan membership'leri getir
   */
  async findInGracePeriod() {
    return await Membership.find({
      status: "past_due",
      gracePeriodEnd: { $gt: new Date() },
    }).populate("user", "name email");
  }

  /**
   * Aktif membership istatistikleri
   */
  async getActiveStatistics() {
    return await Membership.aggregate([
      {
        $match: { status: "active" },
      },
      {
        $group: {
          _id: "$plan",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$pricing.amount" },
          avgAmount: { $avg: "$pricing.amount" },
        },
      },
      {
        $lookup: {
          from: "membershipplans",
          localField: "_id",
          foreignField: "_id",
          as: "planDetails",
        },
      },
      {
        $unwind: "$planDetails",
      },
      {
        $project: {
          planName: "$planDetails.displayName",
          planTier: "$planDetails.tier",
          count: 1,
          totalRevenue: 1,
          avgAmount: 1,
        },
      },
      {
        $sort: { planTier: 1 },
      },
    ]);
  }

  /**
   * Süresi dolmuş membership'leri getir
   */
  async findExpired() {
    return await Membership.find({
      status: "active",
      expiresAt: { $lt: new Date() },
    }).populate("user", "name email");
  }

  /**
   * Bulk güncelleme
   */
  async bulkUpdate(updates) {
    const bulkOps = updates.map((update) => ({
      updateOne: {
        filter: { _id: update.id },
        update: update.data,
      },
    }));

    return await Membership.bulkWrite(bulkOps);
  }

  /**
   * Plan değiştirme geçmişini getir
   */
  async getPlanChangeHistory(userId) {
    const membership = await Membership.findOne({ user: userId })
      .select("planHistory")
      .sort({ "planHistory.changedAt": -1 });

    return membership ? membership.planHistory : [];
  }

  /**
   * Ödeme geçmişini getir
   */
  async getPaymentHistory(userId, limit = 10, skip = 0) {
    const membership = await Membership.findOne({ user: userId })
      .select("paymentHistory")
      .slice("paymentHistory", [skip, limit]);

    return membership ? membership.paymentHistory : [];
  }

  /**
   * Subscription durumunu güncelle
   */
  async updateSubscriptionStatus(userId, subscriptionData) {
    return await Membership.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          "subscription.status": subscriptionData.status,
          "subscription.currentPeriodStart":
            subscriptionData.currentPeriodStart,
          "subscription.currentPeriodEnd": subscriptionData.currentPeriodEnd,
          "subscription.cancelAtPeriodEnd": subscriptionData.cancelAtPeriodEnd,
        },
      },
      { new: true }
    );
  }

  /**
   * Kullanım limitlerini kontrol et
   */
  async checkUsageLimits(userId) {
    const membership = await Membership.findOne({ user: userId }).populate(
      "plan",
      "features"
    );

    if (!membership) {
      return null;
    }

    const { usage, plan } = membership;
    const { features } = plan;

    return {
      investments: {
        current: usage.currentActiveInvestments || 0,
        limit: features.maxActiveInvestments || 0,
        canAdd:
          (usage.currentActiveInvestments || 0) <
          (features.maxActiveInvestments || 0),
      },
      properties: {
        current: usage.currentProperties || 0,
        limit: features.maxProperties || 0,
        canAdd: (usage.currentProperties || 0) < (features.maxProperties || 0),
      },
      transactions: {
        current: usage.monthlyTransactions || 0,
        limit: features.maxMonthlyTransactions || 0,
        canAdd:
          (usage.monthlyTransactions || 0) <
          (features.maxMonthlyTransactions || 0),
      },
    };
  }

  /**
   * Üyelik durum sayıları
   */
  async getMembershipCounts() {
    return await Membership.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);
  }

  /**
   * Aylık gelir raporu
   */
  async getMonthlyRevenue(year = new Date().getFullYear()) {
    return await Membership.aggregate([
      {
        $match: {
          "paymentHistory.processedAt": {
            $gte: new Date(`${year}-01-01`),
            $lt: new Date(`${year + 1}-01-01`),
          },
        },
      },
      {
        $unwind: "$paymentHistory",
      },
      {
        $match: {
          "paymentHistory.status": "succeeded",
          "paymentHistory.processedAt": {
            $gte: new Date(`${year}-01-01`),
            $lt: new Date(`${year + 1}-01-01`),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$paymentHistory.processedAt" },
            month: { $month: "$paymentHistory.processedAt" },
          },
          totalRevenue: { $sum: "$paymentHistory.amount" },
          transactionCount: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);
  }

  /**
   * En çok tercih edilen planlar
   */
  async getPopularPlans(limit = 10) {
    return await Membership.aggregate([
      {
        $group: {
          _id: "$plan",
          memberCount: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "membershipplans",
          localField: "_id",
          foreignField: "_id",
          as: "planDetails",
        },
      },
      {
        $unwind: "$planDetails",
      },
      {
        $project: {
          planName: "$planDetails.displayName",
          memberCount: 1,
          activeCount: 1,
          conversionRate: {
            $multiply: [{ $divide: ["$activeCount", "$memberCount"] }, 100],
          },
        },
      },
      {
        $sort: { memberCount: -1 },
      },
      {
        $limit: limit,
      },
    ]);
  }

  /**
   * Kullanıcının mevcut membership'ini iptal et
   */
  async cancelMembership(userId, reason = null) {
    const updateData = {
      status: "cancelled",
      cancelledAt: new Date(),
      "subscription.cancelAtPeriodEnd": true,
    };

    if (reason) {
      updateData.cancellationReason = reason;
    }

    return await Membership.findOneAndUpdate({ user: userId }, updateData, {
      new: true,
    });
  }

  /**
   * Membership'i yeniden aktifleştir
   */
  async reactivateMembership(userId) {
    return await Membership.findOneAndUpdate(
      { user: userId },
      {
        status: "active",
        reactivatedAt: new Date(),
        "subscription.cancelAtPeriodEnd": false,
        $unset: {
          cancelledAt: "",
          cancellationReason: "",
        },
      },
      { new: true }
    );
  }
}

module.exports = new MembershipRepository();
