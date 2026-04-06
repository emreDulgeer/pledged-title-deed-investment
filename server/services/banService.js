// server/services/banService.js

const banRepository = require("../repositories/banRepository");
const User = require("../models/User");
const CustomError = require("../utils/CustomError");

class BanService {
  /**
   * Kullanıcıyı banla
   */
  async banUser(userId, banData, adminId) {
    try {
      // Kullanıcı var mı kontrol et
      const user = await User.findById(userId);
      if (!user) {
        throw new CustomError("Kullanıcı bulunamadı", 404);
      }

      // Zaten banlı mı kontrol et
      if (user.isBanned) {
        throw new CustomError("Kullanıcı zaten banlı", 400);
      }

      // Ban oluştur
      const ban = await banRepository.createBan({
        user: userId,
        banType: banData.banType,
        reason: banData.reason,
        category: banData.category,
        bannedBy: adminId,
        expiresAt: banData.expiresAt,
        adminNotes: banData.adminNotes,
        ipAddress: banData.ipAddress,
        relatedReport: banData.relatedReport,
      });

      // User'ı güncelle
      user.isBanned = true;
      user.currentBan = ban._id;
      user.accountStatus = "banned";
      user.totalBanCount += 1;

      // Ban history'ye ekle (User modelinde yok, ban repository'de tutuluyor)

      await user.save();
      await user.updateTrustScore();

      // Notification gönder (opsiyonel - gelecekte eklenebilir)
      // await notificationService.notifyUserBanned(userId, ban);

      return {
        success: true,
        message: "Kullanıcı başarıyla banlandı",
        ban: {
          id: ban._id,
          banType: ban.banType,
          reason: ban.reason,
          expiresAt: ban.expiresAt,
        },
      };
    } catch (error) {
      if (error.statusCode) throw error;
      throw new CustomError("Ban işlemi başarısız", 500);
    }
  }

  /**
   * Banı kaldır
   */
  async unbanUser(userId, liftData, adminId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new CustomError("Kullanıcı bulunamadı", 404);
      }

      if (!user.isBanned) {
        throw new CustomError("Kullanıcı zaten banlı değil", 400);
      }

      // Aktif banı getir
      const activeBan = await banRepository.findActiveBan(userId);
      if (!activeBan) {
        // Ban zaten süresi dolmuş, user'ı güncelle
        user.isBanned = false;
        user.currentBan = null;
        user.accountStatus = "active";
        await user.save();
        throw new CustomError("Aktif ban bulunamadı", 404);
      }

      // Banı kaldır
      await banRepository.liftBan(activeBan._id, adminId, liftData.reason);

      // User'ı güncelle
      user.isBanned = false;
      user.currentBan = null;
      user.accountStatus = "active";
      await user.save();

      return {
        success: true,
        message: "Ban başarıyla kaldırıldı",
      };
    } catch (error) {
      if (error.statusCode) throw error;
      throw new CustomError("Ban kaldırma işlemi başarısız", 500);
    }
  }

  /**
   * Kullanıcının ban geçmişini getir
   */
  async getUserBanHistory(userId, isAdmin = false) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new CustomError("Kullanıcı bulunamadı", 404);
      }

      const bans = await banRepository.findUserBanHistory(userId, 20);

      // Admin değilse bazı bilgileri filtrele
      if (!isAdmin) {
        return bans.map((ban) => ({
          id: ban._id,
          banType: ban.banType,
          reason: ban.reason,
          status: ban.status,
          expiresAt: ban.expiresAt,
          createdAt: ban.createdAt,
          liftedAt: ban.liftedAt,
        }));
      }

      return bans;
    } catch (error) {
      if (error.statusCode) throw error;
      throw new CustomError("Ban geçmişi getirilemedi", 500);
    }
  }

  /**
   * Tüm banları getir (Admin)
   */
  async getAllBans(options = {}) {
    try {
      return await banRepository.findAllWithFilters(options);
    } catch (error) {
      throw new CustomError("Banlar getirilemedi", 500);
    }
  }

  /**
   * Tek ban detayı getir (Admin)
   */
  async getBanById(banId) {
    try {
      const ban = await banRepository.findById(banId);

      if (!ban) {
        throw new CustomError("Ban bulunamadı", 404);
      }

      // Populate ile detaylı getir
      await ban.populate("user", "fullName email role country");
      await ban.populate("bannedBy", "fullName email role");
      if (ban.liftedBy) {
        await ban.populate("liftedBy", "fullName email");
      }

      return ban;
    } catch (error) {
      if (error.statusCode) throw error;
      throw new CustomError("Ban detayı getirilemedi", 500);
    }
  }

  /**
   * Ban istatistikleri (Admin)
   */
  async getBanStatistics() {
    try {
      return await banRepository.getBanStatistics();
    } catch (error) {
      throw new CustomError("İstatistikler getirilemedi", 500);
    }
  }

  /**
   * Süresi dolan banları güncelle (Cron job için)
   */
  async expireOldBans() {
    try {
      const expiredCount = await banRepository.expireOldBans();

      // Kullanıcıları güncelle
      const expiredBans = await banRepository.findExpiredBans();

      for (const ban of expiredBans) {
        const user = await User.findById(ban.user);
        if (
          user &&
          user.isBanned &&
          user.currentBan?.toString() === ban._id.toString()
        ) {
          user.isBanned = false;
          user.currentBan = null;
          user.accountStatus = "active";
          await user.save();
        }
      }

      return { expiredCount };
    } catch (error) {
      throw new CustomError("Ban süre kontrolü başarısız", 500);
    }
  }

  /**
   * Kullanıcının ban durumunu kontrol et
   */
  async checkUserBanStatus(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new CustomError("Kullanıcı bulunamadı", 404);
      }

      if (!user.isBanned) {
        return { isBanned: false };
      }

      const activeBan = await banRepository.findActiveBan(userId);

      if (!activeBan) {
        // Ban süresi dolmuş
        user.isBanned = false;
        user.currentBan = null;
        user.accountStatus = "active";
        await user.save();
        return { isBanned: false };
      }

      return {
        isBanned: true,
        ban: {
          id: activeBan._id,
          banType: activeBan.banType,
          reason: activeBan.reason,
          expiresAt: activeBan.expiresAt,
          bannedAt: activeBan.createdAt,
        },
      };
    } catch (error) {
      if (error.statusCode) throw error;
      throw new CustomError("Ban durumu kontrol edilemedi", 500);
    }
  }
}

module.exports = new BanService();
