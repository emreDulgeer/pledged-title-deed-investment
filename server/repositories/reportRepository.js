// server/repositories/reportRepository.js

const Report = require("../models/Report");
const BaseRepository = require("./baseRepository");

class ReportRepository extends BaseRepository {
  constructor() {
    super(Report);
  }

  /**
   * Kullanıcı hakkındaki aktif raporları getir
   */
  async findActiveReportsForUser(userId) {
    return await this.model
      .find({
        reportedUser: userId,
        status: { $in: ["pending", "under_review"] },
      })
      .populate("reporter", "fullName email role")
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Kullanıcının yaptığı raporları getir
   */
  async findReportsByUser(userId) {
    return await this.model
      .find({ reporter: userId })
      .populate("reportedUser", "fullName email role")
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Duplicate rapor kontrolü
   */
  async checkDuplicate(reporterId, reportedUserId, hoursWindow = 24) {
    const timeAgo = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);

    return await this.findOne({
      reporter: reporterId,
      reportedUser: reportedUserId,
      createdAt: { $gte: timeAgo },
    });
  }

  /**
   * Spam kontrolü - kullanıcı çok fazla rapor yapıyor mu
   */
  async checkSpamReporting(reporterId, hoursWindow = 24, maxReports = 10) {
    const timeAgo = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);

    const count = await this.count({
      reporter: reporterId,
      createdAt: { $gte: timeAgo },
    });

    return count >= maxReports;
  }

  /**
   * Tüm raporları getir (Admin - pagination ile)
   */
  async findAllWithFilters(options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      status = null,
      priority = null,
      category = null,
      reporterId = null,
      reportedUserId = null,
    } = options;

    // Query oluştur
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (reporterId) query.reporter = reporterId;
    if (reportedUserId) query.reportedUser = reportedUserId;

    // Pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    // Execute query
    const [reports, total] = await Promise.all([
      this.model
        .find(query)
        .populate("reporter", "fullName email role")
        .populate("reportedUser", "fullName email role")
        .populate("adminResponse.reviewedBy", "fullName email")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.count(query),
    ]);

    return {
      reports,
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
   * Pending raporları getir
   */
  async findPendingReports(options = {}) {
    return await this.findAllWithFilters({
      ...options,
      status: "pending",
    });
  }

  /**
   * Priority'ye göre raporları getir
   */
  async findReportsByPriority(priority, options = {}) {
    return await this.findAllWithFilters({
      ...options,
      priority,
    });
  }

  /**
   * Raporu çöz (resolve)
   */
  async resolveReport(reportId, adminId, decision, actionTaken, internalNotes) {
    return await this.update(reportId, {
      status: "resolved",
      adminResponse: {
        reviewedBy: adminId,
        reviewedAt: new Date(),
        decision,
        actionTaken,
        internalNotes,
      },
    });
  }

  /**
   * Raporu reddet (dismiss)
   */
  async dismissReport(reportId, adminId, reason) {
    return await this.update(reportId, {
      status: "dismissed",
      adminResponse: {
        reviewedBy: adminId,
        reviewedAt: new Date(),
        decision: reason,
        actionTaken: "no_action",
      },
    });
  }

  /**
   * Report'a ban ID ekle
   */
  async addBanToReport(reportId, banId) {
    const report = await this.findById(reportId);
    if (!report) return null;

    if (!report.adminResponse) {
      report.adminResponse = {};
    }
    report.adminResponse.banId = banId;

    return await report.save();
  }

  /**
   * Report istatistikleri
   */
  async getReportStatistics() {
    const [
      totalReports,
      pendingReports,
      underReviewReports,
      resolvedReports,
      dismissedReports,
      byCategory,
      byPriority,
    ] = await Promise.all([
      this.count(),
      this.count({ status: "pending" }),
      this.count({ status: "under_review" }),
      this.count({ status: "resolved" }),
      this.count({ status: "dismissed" }),
      this.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
      ]),
      this.aggregate([
        {
          $group: {
            _id: "$priority",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      total: totalReports,
      pending: pendingReports,
      underReview: underReviewReports,
      resolved: resolvedReports,
      dismissed: dismissedReports,
      byCategory: byCategory.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }

  /**
   * Kullanıcı hakkındaki toplam rapor sayısı
   */
  async countReportsForUser(userId) {
    return await this.count({ reportedUser: userId });
  }

  /**
   * Kullanıcının yaptığı toplam rapor sayısı
   */
  async countReportsByUser(userId) {
    return await this.count({ reporter: userId });
  }

  /**
   * Eski raporları getir (belirli günden eski)
   */
  async findOldReports(days = 30) {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - days);

    return await this.findAll({
      createdAt: { $lte: oldDate },
      status: "pending",
    });
  }
}

module.exports = new ReportRepository();
