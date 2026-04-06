// server/controllers/banController.js

const banService = require("../services/banService");
const responseWrapper = require("../utils/responseWrapper");

class BanController {
  /**
   * Kullanıcıyı banla (Admin)
   * POST /api/bans/user/:userId
   */
  async banUser(req, res) {
    try {
      const { userId } = req.params;
      const adminId = req.user.id;

      const banData = {
        banType: req.body.banType,
        reason: req.body.reason,
        category: req.body.category,
        expiresAt: req.body.expiresAt,
        adminNotes: req.body.adminNotes,
        relatedReport: req.body.relatedReport,
        ipAddress: req.ip,
      };

      const result = await banService.banUser(userId, banData, adminId);

      return responseWrapper.success(
        res,
        result,
        "Kullanıcı başarıyla banlandı"
      );
    } catch (error) {
      console.error("Ban user error:", error);

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
   * Banı kaldır (Admin)
   * POST /api/bans/:banId/lift
   */
  async unbanUser(req, res) {
    try {
      const { userId } = req.params;
      const adminId = req.user.id;

      const liftData = {
        reason: req.body.reason,
      };

      const result = await banService.unbanUser(userId, liftData, adminId);

      return responseWrapper.success(res, result, "Ban başarıyla kaldırıldı");
    } catch (error) {
      console.error("Unban user error:", error);

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
   * Tüm banları getir (Admin)
   * GET /api/bans
   */
  async getAllBans(req, res) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || "createdAt",
        sortOrder: req.query.sortOrder || "desc",
        status: req.query.status,
        banType: req.query.banType,
        category: req.query.category,
        userId: req.query.userId,
      };

      const result = await banService.getAllBans(options);

      return responseWrapper.success(res, result, "Banlar başarıyla getirildi");
    } catch (error) {
      console.error("Get all bans error:", error);
      return responseWrapper.error(res, error.message, error.statusCode);
    }
  }

  /**
   * Ban detayı getir (Admin)
   * GET /api/bans/:banId
   */
  async getBanById(req, res) {
    try {
      const { banId } = req.params;

      const ban = await banService.getBanById(banId);

      return responseWrapper.success(
        res,
        ban,
        "Ban detayı başarıyla getirildi"
      );
    } catch (error) {
      console.error("Get ban by id error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }

      return responseWrapper.error(res, error.message, error.statusCode);
    }
  }

  /**
   * Kullanıcının ban geçmişi
   * GET /api/bans/user/:userId/history
   */
  async getUserBanHistory(req, res) {
    try {
      const { userId } = req.params;
      const isAdmin = req.user.role === "admin";

      const bans = await banService.getUserBanHistory(userId, isAdmin);

      return responseWrapper.success(
        res,
        bans,
        "Ban geçmişi başarıyla getirildi"
      );
    } catch (error) {
      console.error("Get ban history error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }

      return responseWrapper.error(res, error.message, error.statusCode);
    }
  }

  /**
   * Ban istatistikleri (Admin)
   * GET /api/bans/statistics
   */
  async getBanStatistics(req, res) {
    try {
      const stats = await banService.getBanStatistics();

      return responseWrapper.success(
        res,
        stats,
        "İstatistikler başarıyla getirildi"
      );
    } catch (error) {
      console.error("Get ban statistics error:", error);
      return responseWrapper.error(res, error.message, error.statusCode);
    }
  }

  /**
   * Kullanıcının ban durumunu kontrol et
   * GET /api/bans/user/:userId/status
   */
  async checkBanStatus(req, res) {
    try {
      const { userId } = req.params;

      const status = await banService.checkUserBanStatus(userId);

      return responseWrapper.success(
        res,
        status,
        "Ban durumu başarıyla kontrol edildi"
      );
    } catch (error) {
      console.error("Check ban status error:", error);

      if (error.statusCode === 404) {
        return responseWrapper.notFound(res, error.message);
      }

      return responseWrapper.error(res, error.message, error.statusCode);
    }
  }
}

module.exports = new BanController();
