// server/repositories/banRepository.js

const Ban = require("../models/Ban");
const BaseRepository = require("./baseRepository");

class BanRepository extends BaseRepository {
  constructor() {
    super(Ban);
  }

  /**
   * Kullanıcının aktif banını getir
   */
  async findActiveBan(userId) {
    return await Ban.findActiveBan(userId);
  }

  /**
   * Kullanıcının ban geçmişini getir
   */
  async findUserBanHistory(userId, limit = 10) {
    return await this.model
      .find({ user: userId })
      .populate("bannedBy", "fullName email role")
      .populate("liftedBy", "fullName email role")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Tüm banları getir (Admin - pagination ile)
   */
  async findAllWithFilters(options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      status = null,
      banType = null,
      category = null,
      userId = null,
    } = options;

    // Query oluştur
    const query = {};

    if (status) query.status = status;
    if (banType) query.banType = banType;
    if (category) query.category = category;
    if (userId) query.user = userId;

    // Pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    // Execute query
    const [bans, total] = await Promise.all([
      this.model
        .find(query)
        .populate("user", "fullName email role country")
        .populate("bannedBy", "fullName email role")
        .populate("liftedBy", "fullName email")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments(query),
    ]);

    return {
      bans,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Aktif banları getir
   */
  async findActiveBans(options = {}) {
    return await this.findAllWithFilters({
      ...options,
      status: "active",
    });
  }

  /**
   * Süresi dolan banları getir
   */
  async findExpiredBans() {
    const now = new Date();

    return await this.model
      .find({
        banType: "temporary",
        status: "active",
        expiresAt: { $lte: now },
      })
      .lean();
  }

  /**
   * Süresi dolan banları expire et
   */
  async expireOldBans() {
    return await Ban.expireOldBans();
  }

  /**
   * Ban oluştur
   */
  async createBan(banData) {
    const ban = new this.model(banData);
    return await ban.save();
  }

  /**
   * Banı kaldır (lift)
   */
  async liftBan(banId, adminId, reason) {
    const ban = await this.findById(banId);
    if (!ban) {
      throw new Error("Ban not found");
    }

    return await ban.lift(adminId, reason);
  }

  /**
   * Kullanıcının ban sayısını getir
   */
  async countUserBans(userId) {
    return await this.model.countDocuments({ user: userId });
  }

  /**
   * Ban istatistikleri
   */
  async getBanStatistics() {
    const [
      totalBans,
      activeBans,
      permanentBans,
      temporaryBans,
      expiredBans,
      liftedBans,
      byCategory,
    ] = await Promise.all([
      this.model.countDocuments(),
      this.model.countDocuments({ status: "active" }),
      this.model.countDocuments({ banType: "permanent", status: "active" }),
      this.model.countDocuments({ banType: "temporary", status: "active" }),
      this.model.countDocuments({ status: "expired" }),
      this.model.countDocuments({ status: "lifted" }),
      this.model.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      total: totalBans,
      active: activeBans,
      permanent: permanentBans,
      temporary: temporaryBans,
      expired: expiredBans,
      lifted: liftedBans,
      byCategory: byCategory.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }

  /**
   * Yakında süresi dolacak banları getir (uyarı için)
   */
  async findExpiringSoon(days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await this.model
      .find({
        banType: "temporary",
        status: "active",
        expiresAt: { $lte: futureDate, $gte: new Date() },
      })
      .populate("user", "fullName email")
      .lean();
  }
}

module.exports = new BanRepository();
