// server/routes/fileRoutesV2.js

const express = require("express");
const router = express.Router();
const fileController = require("../controllers/fileControllerV2");
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const rateLimiter = require("../middlewares/rateLimiter");
const { uploadLimiter, downloadLimiter } = rateLimiter;
// ===== RATE LIMITERS =====

// Upload için özel rate limiter
// const uploadLimiter = rateLimiter.create({
//   windowMs: 15 * 60 * 1000, // 15 dakika
//   max: 50, // Maksimum 50 upload
//   message: "Çok fazla dosya yükleme isteği. Lütfen daha sonra tekrar deneyin.",
// });

// // Download için rate limiter
// const downloadLimiter = rateLimiter.create({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: "Çok fazla indirme isteği. Lütfen daha sonra tekrar deneyin.",
// });

// ===== PUBLIC ROUTES =====

// Dosya önizleme (Public veya paylaşılan dosyalar için)
router.get("/preview/:fileId", rateLimiter.light, fileController.preview);

// ===== AUTHENTICATED ROUTES =====

// Tek dosya yükleme
router.post("/upload", auth, uploadLimiter, fileController.uploadSingle);

// Çoklu dosya yükleme
router.post(
  "/upload-multiple",
  auth,
  uploadLimiter,
  fileController.uploadMultiple
);

// Property dökümanı yükleme
router.post(
  "/property-document",
  auth,
  authorize(["property_owner", "admin"]),
  uploadLimiter,
  fileController.uploadPropertyDocument
);

// Dosya indirme
router.get("/download/:fileId", auth, downloadLimiter, fileController.download);

// Dosya silme
router.delete(
  "/:fileId",
  auth,
  rateLimiter.moderate,
  fileController.deleteFile
);

// Dosya listesi
router.get("/list", auth, rateLimiter.light, fileController.listFiles);

// Depolama istatistikleri
router.get("/stats", auth, rateLimiter.light, fileController.getStats);

// ===== ADMIN ROUTES =====

// Upload stratejisini değiştir
router.post(
  "/admin/switch-strategy",
  auth,
  authorize(["admin"]),
  rateLimiter.strict,
  fileController.switchStrategy
);

// Tüm dosyaları listele (Admin)
router.get(
  "/admin/all",
  auth,
  authorize(["admin"]),
  rateLimiter.light,
  async (req, res) => {
    // Admin için özel listeleme
    req.query.includeDeleted = true;
    return fileController.listFiles(req, res);
  }
);

// Dosya güvenlik taraması (Admin)
router.post(
  "/admin/scan/:fileId",
  auth,
  authorize(["admin"]),
  rateLimiter.moderate,
  async (req, res) => {
    try {
      const { fileId } = req.params;
      const FileMetadata = require("../models/FileMetadata");
      const FileUploadManager = require("../services/FileUploadManager");

      const metadata = await FileMetadata.findById(fileId);
      if (!metadata) {
        return res
          .status(404)
          .json({ success: false, message: "Dosya bulunamadı" });
      }

      // Güvenlik taraması yap
      const manager = new FileUploadManager({
        enableVirusScan: true,
        enableMagicNumberCheck: true,
        enableContentValidation: true,
      });

      const LocalProvider = require("../utils/providers/LocalStorageProvider");
      const provider = new LocalProvider({ localPath: "./uploads" });
      const fileData = await provider.download(
        metadata.filename,
        metadata.directory
      );

      const SecurityValidator = require("../utils/security/SecurityValidator");
      const validator = new SecurityValidator(manager.config);

      const result = await validator.validate({
        buffer: fileData.buffer,
        originalname: metadata.originalName,
        mimetype: metadata.mimeType,
        size: metadata.size,
      });

      // Sonucu güncelle
      metadata.securityScore = result.score;
      metadata.virusScanStatus = result.safe ? "clean" : "infected";
      metadata.virusScanDate = new Date();

      if (!result.safe) {
        metadata.notes = `Security issues: ${result.errors.join(", ")}`;
      }

      await metadata.save();

      return res.json({
        success: true,
        data: {
          fileId: fileId,
          safe: result.safe,
          score: result.score,
          warnings: result.warnings,
          errors: result.errors,
        },
      });
    } catch (error) {
      console.error("Scan error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Karantina dosyaları (Admin)
router.get(
  "/admin/quarantine",
  auth,
  authorize(["admin"]),
  rateLimiter.light,
  async (req, res) => {
    try {
      const fs = require("fs").promises;
      const path = require("path");

      const quarantineDir = "./uploads/quarantine";
      const files = await fs.readdir(quarantineDir);

      const quarantineFiles = [];
      for (const file of files) {
        const filePath = path.join(quarantineDir, file);
        const stats = await fs.stat(filePath);

        // Log dosyasını oku
        const logPath = path.join(quarantineDir, "quarantine.log");
        let logEntry = null;

        try {
          const logContent = await fs.readFile(logPath, "utf8");
          const logs = logContent.split("\n").filter((l) => l);

          for (const log of logs) {
            const entry = JSON.parse(log);
            if (entry.quarantinePath && entry.quarantinePath.includes(file)) {
              logEntry = entry;
              break;
            }
          }
        } catch (error) {
          console.error("Log read error:", error);
        }

        quarantineFiles.push({
          filename: file,
          size: stats.size,
          quarantinedAt: stats.mtime,
          reason: logEntry?.reason || "Unknown",
          originalName: logEntry?.filename || file,
        });
      }

      return res.json({
        success: true,
        data: quarantineFiles,
        total: quarantineFiles.length,
      });
    } catch (error) {
      console.error("Quarantine list error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Temizlik işlemi (Admin)
router.post(
  "/admin/cleanup",
  auth,
  authorize(["admin"]),
  rateLimiter.strict,
  async (req, res) => {
    try {
      const { olderThanDays = 30, type = "soft-deleted" } = req.body;

      const FileMetadata = require("../models/FileMetadata");
      const LocalProvider = require("../utils/providers/LocalStorageProvider");

      let result;

      if (type === "soft-deleted") {
        // Soft silinmiş dosyaları temizle
        result = await FileMetadata.cleanupOldFiles(olderThanDays);
      } else if (type === "temp") {
        // Geçici dosyaları temizle
        const provider = new LocalProvider({ localPath: "./uploads" });
        result = await provider.cleanup(olderThanDays * 24);
      }

      return res.json({
        success: true,
        message: "Temizlik işlemi tamamlandı",
        result: result,
      });
    } catch (error) {
      console.error("Cleanup error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ===== SHARING ROUTES =====

// Dosya paylaş
router.post("/:fileId/share", auth, rateLimiter.moderate, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId, isPublic } = req.body;

    const FileMetadata = require("../models/FileMetadata");
    const metadata = await FileMetadata.findById(fileId);

    if (!metadata) {
      return res
        .status(404)
        .json({ success: false, message: "Dosya bulunamadı" });
    }

    // Yetki kontrolü
    if (
      metadata.uploadedBy.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Yetkiniz yok" });
    }

    if (isPublic !== undefined) {
      metadata.isPublic = isPublic;
    }

    if (userId) {
      await metadata.shareWith(userId, req.user);
    }

    await metadata.save();

    return res.json({
      success: true,
      message: "Dosya paylaşıldı",
      data: {
        fileId: metadata._id,
        isPublic: metadata.isPublic,
        sharedWith: metadata.sharedWith,
      },
    });
  } catch (error) {
    console.error("Share error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Paylaşımı kaldır
router.delete(
  "/:fileId/share/:userId",
  auth,
  rateLimiter.moderate,
  async (req, res) => {
    try {
      const { fileId, userId } = req.params;

      const FileMetadata = require("../models/FileMetadata");
      const metadata = await FileMetadata.findById(fileId);

      if (!metadata) {
        return res
          .status(404)
          .json({ success: false, message: "Dosya bulunamadı" });
      }

      // Yetki kontrolü
      if (
        metadata.uploadedBy.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ success: false, message: "Yetkiniz yok" });
      }

      await metadata.unshareWith(userId, req.user);

      return res.json({
        success: true,
        message: "Paylaşım kaldırıldı",
      });
    } catch (error) {
      console.error("Unshare error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
