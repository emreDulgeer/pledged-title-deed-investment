// server/services/reportService.js

const reportRepository = require("../repositories/reportRepository");
const banService = require("./banService");
const User = require("../models/User");
const CustomError = require("../utils/CustomError");

class ReportService {
  /**
   * Kullanıcıyı rapor et
   */
  async reportUser(reportedUserId, reportData, reporterId) {
    try {
      // Kendini rapor edemez
      if (reportedUserId === reporterId) {
        throw new CustomError("Kendinizi raporlayamazsınız", 400);
      }

      // Kullanıcı var mı kontrol et
      const reportedUser = await User.findById(reportedUserId);
      if (!reportedUser) {
        throw new CustomError("Rapor edilecek kullanıcı bulunamadı", 404);
      }

      // Duplicate check
      const duplicate = await reportRepository.checkDuplicate(
        reporterId,
        reportedUserId,
        24
      );
      if (duplicate) {
        throw new CustomError(
          "Bu kullanıcıyı son 24 saat içinde zaten raporladınız",
          400
        );
      }

      // Spam check
      const isSpamming = await reportRepository.checkSpamReporting(
        reporterId,
        24,
        10
      );
      if (isSpamming) {
        throw new CustomError(
          "Çok fazla rapor gönderdiniz. Lütfen daha sonra tekrar deneyin",
          429
        );
      }

      // Report oluştur
      const report = await reportRepository.create({
        reporter: reporterId,
        reportedUser: reportedUserId,
        category: reportData.category,
        description: reportData.description,
        relatedContent: reportData.relatedContent,
        evidence: reportData.evidence || [],
      });

      // Report sayılarını artır
      reportedUser.reportedCount += 1;
      await reportedUser.save();
      await reportedUser.updateTrustScore();

      const reporter = await User.findById(reporterId);
      if (reporter) {
        reporter.reportsMadeCount += 1;
        await reporter.save();
      }

      return {
        success: true,
        message: "Rapor başarıyla gönderildi",
        report: {
          id: report._id,
          status: report.status,
          createdAt: report.createdAt,
        },
      };
    } catch (error) {
      if (error.statusCode) throw error;
      console.error("Report user service error:", error);
      throw new CustomError("Rapor gönderilemedi", 500);
    }
  }

  /**
   * Tüm raporları getir (Admin)
   */
  async getAllReports(options = {}) {
    try {
      return await reportRepository.findAllWithFilters(options);
    } catch (error) {
      console.error("Get all reports service error:", error);
      throw new CustomError("Raporlar getirilemedi", 500);
    }
  }

  /**
   * Tek rapor detayı (Admin)
   */
  async getReportById(reportId) {
    try {
      const report = await reportRepository.findById(
        reportId,
        "reporter reportedUser adminResponse.reviewedBy adminResponse.banId"
      );

      if (!report) {
        throw new CustomError("Rapor bulunamadı", 404);
      }

      return report;
    } catch (error) {
      if (error.statusCode) throw error;
      console.error("Get report by id service error:", error);
      throw new CustomError("Rapor getirilemedi", 500);
    }
  }

  /**
   * Raporu çöz (Admin)
   */
  async resolveReport(reportId, resolutionData, adminId) {
    try {
      const report = await reportRepository.findById(reportId);
      if (!report) {
        throw new CustomError("Rapor bulunamadı", 404);
      }

      if (report.status !== "pending" && report.status !== "under_review") {
        throw new CustomError("Bu rapor zaten çözüldü veya reddedildi", 400);
      }

      // Raporu çöz
      await reportRepository.resolveReport(
        reportId,
        adminId,
        resolutionData.decision,
        resolutionData.actionTaken,
        resolutionData.internalNotes
      );

      // Eğer ban kararı verildiyse
      if (resolutionData.shouldBan) {
        const banResult = await banService.banUser(
          report.reportedUser,
          {
            banType: resolutionData.banType,
            reason: resolutionData.banReason || report.description,
            category: report.category,
            expiresAt: resolutionData.banExpiresAt,
            relatedReport: reportId,
          },
          adminId
        );

        // Ban ID'yi report'a ekle
        await reportRepository.addBanToReport(reportId, banResult.ban.id);
      }

      return {
        success: true,
        message: "Rapor başarıyla çözüldü",
      };
    } catch (error) {
      if (error.statusCode) throw error;
      console.error("Resolve report service error:", error);
      throw new CustomError("Rapor çözülemedi", 500);
    }
  }

  /**
   * Raporu reddet (Admin)
   */
  async dismissReport(reportId, reason, adminId) {
    try {
      const report = await reportRepository.findById(reportId);
      if (!report) {
        throw new CustomError("Rapor bulunamadı", 404);
      }

      if (report.status !== "pending" && report.status !== "under_review") {
        throw new CustomError("Bu rapor zaten çözüldü veya reddedildi", 400);
      }

      await reportRepository.dismissReport(reportId, adminId, reason);

      return {
        success: true,
        message: "Rapor reddedildi",
      };
    } catch (error) {
      if (error.statusCode) throw error;
      console.error("Dismiss report service error:", error);
      throw new CustomError("Rapor reddedilemedi", 500);
    }
  }

  /**
   * Raporu incelemeye al (Admin)
   */
  async reviewReport(reportId, adminId) {
    try {
      const report = await reportRepository.findById(reportId);
      if (!report) {
        throw new CustomError("Rapor bulunamadı", 404);
      }

      if (report.status !== "pending") {
        throw new CustomError("Bu rapor zaten inceleme altında", 400);
      }

      await reportRepository.update(reportId, {
        status: "under_review",
        "adminResponse.reviewedBy": adminId,
        "adminResponse.reviewedAt": new Date(),
      });

      return {
        success: true,
        message: "Rapor incelemeye alındı",
      };
    } catch (error) {
      if (error.statusCode) throw error;
      console.error("Review report service error:", error);
      throw new CustomError("Rapor incelemeye alınamadı", 500);
    }
  }

  /**
   * Kullanıcı hakkındaki raporları getir (Admin)
   */
  async getReportsForUser(userId, options = {}) {
    try {
      return await reportRepository.findAllWithFilters({
        ...options,
        reportedUserId: userId,
      });
    } catch (error) {
      console.error("Get reports for user service error:", error);
      throw new CustomError("Kullanıcı raporları getirilemedi", 500);
    }
  }

  /**
   * Kullanıcının yaptığı raporları getir
   */
  async getReportsByUser(userId, options = {}) {
    try {
      return await reportRepository.findAllWithFilters({
        ...options,
        reporterId: userId,
      });
    } catch (error) {
      console.error("Get reports by user service error:", error);
      throw new CustomError("Kullanıcı raporları getirilemedi", 500);
    }
  }

  /**
   * Report istatistikleri (Admin)
   */
  async getReportStatistics() {
    try {
      return await reportRepository.getReportStatistics();
    } catch (error) {
      console.error("Get report statistics service error:", error);
      throw new CustomError("İstatistikler getirilemedi", 500);
    }
  }
}

module.exports = new ReportService();
