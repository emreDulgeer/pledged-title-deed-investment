// server/controllers/reportController.js

const reportService = require("../services/reportService");
const responseWrapper = require("../utils/responseWrapper");

class ReportController {
  /**
   * Kullanıcıyı rapor et
   * POST /api/reports/user/:userId
   */
  async reportUser(req, res) {
    try {
      const { userId } = req.params;
      const reporterId = req.user.id;

      const reportData = {
        category: req.body.category,
        description: req.body.description,
        relatedContent: req.body.relatedContent,
        evidence: req.body.evidence,
      };

      const result = await reportService.reportUser(
        userId,
        reportData,
        reporterId
      );

      return responseWrapper.success(res, result, "Rapor başarıyla gönderildi");
    } catch (error) {
      console.error("Report user error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }
      if (error.statusCode === 400) {
        return responseWrapper.badRequest(res, error.message);
      }
      if (error.statusCode === 429) {
        return responseWrapper.error(res, error.message, 429);
      }

      return responseWrapper.error(res, error.message, error.statusCode);
    }
  }

  /**
   * Tüm raporları getir (Admin)
   * GET /api/reports
   */
  async getAllReports(req, res) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || "createdAt",
        sortOrder: req.query.sortOrder || "desc",
        status: req.query.status,
        priority: req.query.priority,
        category: req.query.category,
        reporterId: req.query.reporterId,
        reportedUserId: req.query.reportedUserId,
      };

      const result = await reportService.getAllReports(options);

      return responseWrapper.success(
        res,
        result,
        "Raporlar başarıyla getirildi"
      );
    } catch (error) {
      console.error("Get all reports error:", error);
      return responseWrapper.error(res, error.message, error.statusCode);
    }
  }

  /**
   * Rapor detayı getir (Admin)
   * GET /api/reports/:reportId
   */
  async getReportById(req, res) {
    try {
      const { reportId } = req.params;

      const report = await reportService.getReportById(reportId);

      return responseWrapper.success(
        res,
        report,
        "Rapor detayı başarıyla getirildi"
      );
    } catch (error) {
      console.error("Get report by id error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }

      return responseWrapper.error(res, error.message, error.statusCode);
    }
  }

  /**
   * Raporu çöz (Admin)
   * POST /api/reports/:reportId/resolve
   */
  async resolveReport(req, res) {
    try {
      const { reportId } = req.params;
      const adminId = req.user.id;

      const resolutionData = {
        decision: req.body.decision,
        actionTaken: req.body.actionTaken,
        internalNotes: req.body.internalNotes,
        shouldBan: req.body.shouldBan,
        banType: req.body.banType,
        banReason: req.body.banReason,
        banExpiresAt: req.body.banExpiresAt,
      };

      const result = await reportService.resolveReport(
        reportId,
        resolutionData,
        adminId
      );

      return responseWrapper.success(res, result, "Rapor başarıyla çözüldü");
    } catch (error) {
      console.error("Resolve report error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }
      if (error.statusCode === 400) {
        return responseWrapper.badRequest(res, error.message);
      }

      return responseWrapper.error(res, error.message, error.statusCode);
    }
  }

  /**
   * Raporu reddet (Admin)
   * POST /api/reports/:reportId/dismiss
   */
  async dismissReport(req, res) {
    try {
      const { reportId } = req.params;
      const adminId = req.user.id;
      const { reason } = req.body;

      const result = await reportService.dismissReport(
        reportId,
        reason,
        adminId
      );

      return responseWrapper.success(res, result, "Rapor reddedildi");
    } catch (error) {
      console.error("Dismiss report error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }
      if (error.statusCode === 400) {
        return responseWrapper.badRequest(res, error.message);
      }

      return responseWrapper.error(res, error.message, error.statusCode);
    }
  }

  /**
   * Raporu incelemeye al (Admin)
   * POST /api/reports/:reportId/review
   */
  async reviewReport(req, res) {
    try {
      const { reportId } = req.params;
      const adminId = req.user.id;

      const result = await reportService.reviewReport(reportId, adminId);

      return responseWrapper.success(res, result, "Rapor incelemeye alındı");
    } catch (error) {
      console.error("Review report error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }
      if (error.statusCode === 400) {
        return responseWrapper.badRequest(res, error.message);
      }

      return responseWrapper.error(res, error.message, error.statusCode);
    }
  }

  /**
   * Kullanıcı hakkındaki raporları getir (Admin)
   * GET /api/reports/user/:userId
   */
  async getReportsForUser(req, res) {
    try {
      const { userId } = req.params;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
      };

      const result = await reportService.getReportsForUser(userId, options);

      return responseWrapper.success(
        res,
        result,
        "Kullanıcı raporları başarıyla getirildi"
      );
    } catch (error) {
      console.error("Get reports for user error:", error);
      return responseWrapper.error(res, error.message, error.statusCode);
    }
  }

  /**
   * Kullanıcının yaptığı raporları getir
   * GET /api/reports/by-user/:userId
   */
  async getReportsByUser(req, res) {
    try {
      const { userId } = req.params;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
      };

      const result = await reportService.getReportsByUser(userId, options);

      return responseWrapper.success(
        res,
        result,
        "Kullanıcı raporları başarıyla getirildi"
      );
    } catch (error) {
      console.error("Get reports by user error:", error);
      return responseWrapper.error(res, error.message, error.statusCode);
    }
  }

  /**
   * Report istatistikleri (Admin)
   * GET /api/reports/statistics
   */
  async getReportStatistics(req, res) {
    try {
      const stats = await reportService.getReportStatistics();

      return responseWrapper.success(
        res,
        stats,
        "İstatistikler başarıyla getirildi"
      );
    } catch (error) {
      console.error("Get report statistics error:", error);
      return responseWrapper.error(res, error.message, error.statusCode);
    }
  }
}

module.exports = new ReportController();
