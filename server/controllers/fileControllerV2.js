// server/controllers/fileControllerV2.js

const FileUploadManager = require("../services/FileUploadManager");
const responseWrapper = require("../utils/responseWrapper");
const FileMetadata = require("../models/FileMetadata");

class FileControllerV2 {
  constructor() {
    // Farklı senaryolar için farklı manager konfigürasyonları
    this.managers = {
      // Genel dosya yükleme
      general: new FileUploadManager({
        maxFileSize: 100 * 1024 * 1024, // 100MB
        enableVirusScan: process.env.ENABLE_VIRUS_SCAN === "true",
        enableMagicNumberCheck: true,
        enableContentValidation: true,
        uploadStrategy: "multer", // Default
        storageType: "local",
      }),

      // Görsel yükleme
      image: new FileUploadManager({
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
        ],
        enableMagicNumberCheck: true,
        generateThumbnails: true,
        uploadStrategy: "multer",
        storageType: "local",
      }),

      // Döküman yükleme
      document: new FileUploadManager({
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedMimeTypes: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        enableVirusScan: true,
        enableContentValidation: true,
        uploadStrategy: "express-fileupload", // Farklı strateji
        storageType: "local",
      }),

      // Property dökümanları (kritik)
      property: new FileUploadManager({
        maxFileSize: 50 * 1024 * 1024,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
        enableVirusScan: true,
        enableMagicNumberCheck: true,
        enableContentValidation: true,
        uploadStrategy: "multer",
        storageType: process.env.STORAGE_TYPE || "local",
      }),
    };

    // Varsayılan manager
    this.defaultManager = this.managers.general;
  }

  /**
   * Tek dosya yükleme
   */
  uploadSingle = async (req, res) => {
    try {
      const uploadType =
        req.query.uploadType ||
        req.headers["x-upload-type"] ||
        (req.body && req.body.uploadType) ||
        "general";
      const manager = this.managers[uploadType] || this.defaultManager;

      // Manager'ın middleware'ini kullan
      const middleware = manager.middleware({
        directory:
          req.query.directory ||
          req.headers["x-directory"] ||
          (req.body && req.body.directory) ||
          uploadType,
      });

      // Middleware'i çalıştır
      await new Promise((resolve, reject) => {
        middleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Upload sonuçlarını kontrol et
      if (!req.uploadResults || req.uploadResults.length === 0) {
        return responseWrapper.badRequest(res, "Dosya yüklenemedi");
      }

      const result = req.uploadResults[0];

      if (!result.success) {
        return responseWrapper.badRequest(res, result.error);
      }
      if (!req.user || !req.user._id) {
        return responseWrapper.unauthorized(
          res,
          "Giriş gerekli (uploadedBy için user yok)"
        );
      }
      // Veritabanına kaydet
      const fileMetadata = await this.saveFileMetadata(result.data, req.user);

      return responseWrapper.created(
        res,
        {
          file: fileMetadata,
          url: result.data.url,
        },
        "Dosya başarıyla yüklendi"
      );
    } catch (error) {
      console.error("Upload error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  /**
   * Çoklu dosya yükleme
   */
  uploadMultiple = async (req, res) => {
    try {
      const uploadType =
        req.query.uploadType ||
        req.headers["x-upload-type"] ||
        (req.body && req.body.uploadType) ||
        "general";
      const manager = this.managers[uploadType] || this.defaultManager;

      // Manager'ın middleware'ini kullan
      const middleware = manager.middleware({
        directory:
          req.query.directory ||
          req.headers["x-directory"] ||
          (req.body && req.body.directory) ||
          uploadType,
      });
      // Middleware'i çalıştır
      await new Promise((resolve, reject) => {
        middleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Upload sonuçlarını kontrol et
      if (!req.uploadResults || req.uploadResults.length === 0) {
        return responseWrapper.badRequest(res, "Dosyalar yüklenemedi");
      }

      const successful = [];
      const failed = [];

      for (const result of req.uploadResults) {
        if (result.success) {
          const metadata = await this.saveFileMetadata(result.data, req.user);
          successful.push(metadata);
        } else {
          failed.push({
            filename: result.filename,
            error: result.error,
          });
        }
      }

      return responseWrapper.success(
        res,
        {
          successful: successful,
          failed: failed,
          summary: {
            total: req.uploadResults.length,
            success: successful.length,
            failure: failed.length,
          },
        },
        `${successful.length} dosya yüklendi, ${failed.length} başarısız`
      );
    } catch (error) {
      console.error("Multiple upload error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  /**
   * Property dökümanı yükleme
   */
  uploadPropertyDocument = async (req, res) => {
    try {
      const { propertyId, documentType } = req.body;

      if (!propertyId || !documentType) {
        return responseWrapper.badRequest(
          res,
          "Property ID ve döküman tipi gerekli"
        );
      }

      // Property kontrolü
      const Property = require("../models/Property");
      const property = await Property.findById(propertyId);

      if (!property) {
        return responseWrapper.notFound(res, "Property bulunamadı");
      }

      // Yetki kontrolü
      if (
        req.user.role !== "admin" &&
        property.owner.toString() !== req.user._id.toString()
      ) {
        return responseWrapper.forbidden(res, "Bu işlem için yetkiniz yok");
      }

      // Property manager'ını kullan
      const manager = this.managers.property;

      const middleware = manager.middleware({
        directory: `properties/${propertyId}`,
        metadata: {
          relatedModel: "Property",
          relatedId: propertyId,
          documentType: documentType,
        },
      });

      // Upload işlemi
      await new Promise((resolve, reject) => {
        middleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      if (!req.uploadResults || req.uploadResults[0]?.success !== true) {
        return responseWrapper.badRequest(
          res,
          req.uploadResults?.[0]?.error || "Döküman yüklenemedi"
        );
      }

      const uploadData = req.uploadResults[0].data;

      // Property'yi güncelle
      property.documents = property.documents || [];
      property.documents.push({
        type: documentType,
        url: uploadData.url,
        fileName: uploadData.filename,
        uploadedAt: new Date(),
        uploadedBy: req.user._id,
      });

      if (documentType === "title_deed") {
        property.titleDeedUrl = uploadData.url;
      } else if (documentType === "annotation") {
        property.annotationDocumentUrl = uploadData.url;
        property.hasAnnotation = true;
      }

      await property.save();

      // Metadata kaydet
      const metadata = await this.saveFileMetadata(
        {
          ...uploadData,
          relatedModel: "Property",
          relatedId: propertyId,
          documentType: documentType,
        },
        req.user
      );

      return responseWrapper.created(
        res,
        {
          file: metadata,
          property: {
            id: property._id,
            documents: property.documents,
          },
        },
        "Property dökümanı başarıyla yüklendi"
      );
    } catch (error) {
      console.error("Property document upload error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  /**
   * Dosya indirme
   */
  download = async (req, res) => {
    try {
      const { fileId } = req.params;

      // Metadata'yı bul
      const metadata = await FileMetadata.findById(fileId);

      if (!metadata) {
        return responseWrapper.notFound(res, "Dosya bulunamadı");
      }

      // Yetki kontrolü
      if (!this.canAccessFile(metadata, req.user)) {
        return responseWrapper.forbidden(res, "Bu dosyaya erişim yetkiniz yok");
      }

      // Storage provider'dan dosyayı al
      const manager = this.getManagerForFile(metadata);
      // 1) Directory fallback: önce metadata.directory, olmazsa URL'den çıkar
      let directory = metadata.directory || "general";
      try {
        const exists = await manager.storageProvider.exists(
          metadata.filename,
          directory
        );
        if (!exists && metadata.url) {
          const m = metadata.url.match(/\/uploads\/([^/]+)\//);
          if (m) directory = m[1];
        }
      } catch (_) {
        /* exists zaten true/false döner; hata durumunu yutuyoruz */
      }
      const fileData = await manager.storageProvider.download(
        metadata.filename,
        directory
      );

      // Download log
      await this.logFileAccess(metadata, req.user, "download");

      // Dosyayı gönder
      res.setHeader("Content-Type", metadata.mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${metadata.originalName}"`
      );
      res.setHeader("Content-Length", fileData.buffer.length);
      res.setHeader("X-Content-Type-Options", "nosniff");

      res.send(fileData.buffer);
    } catch (error) {
      if (String(e.message).includes("Dosya bulunamadı")) {
        return responseWrapper.notFound(res, "Dosya bulunamadı");
      }
      console.error("Download error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  /**
   * Dosya önizleme
   */
  preview = async (req, res) => {
    try {
      const { fileId } = req.params;

      // Metadata'yı bul
      const metadata = await FileMetadata.findById(fileId);

      if (!metadata) {
        return responseWrapper.notFound(res, "Dosya bulunamadı");
      }

      // Public değilse yetki kontrolü
      if (!metadata.isPublic && !this.canAccessFile(metadata, req.user)) {
        return responseWrapper.forbidden(res, "Bu dosyaya erişim yetkiniz yok");
      }

      // Güvenli önizleme tipleri
      const safePreviewTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "text/plain",
      ];

      if (!safePreviewTypes.includes(metadata.mimeType)) {
        return responseWrapper.badRequest(res, "Bu dosya türü önizlenemez");
      }

      // Storage provider'dan dosyayı al
      const manager = this.getManagerForFile(metadata);
      const fileData = await manager.storageProvider.download(
        metadata.filename,
        metadata.directory
      );

      // Preview log
      await this.logFileAccess(metadata, req.user, "preview");

      // Dosyayı gönder
      res.setHeader("Content-Type", metadata.mimeType);
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Content-Length", fileData.buffer.length);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; style-src 'unsafe-inline'; sandbox"
      );

      res.send(fileData.buffer);
    } catch (error) {
      console.error("Preview error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  /**
   * Dosya silme
   */
  deleteFile = async (req, res) => {
    try {
      const { fileId } = req.params;
      const hardDelete = req.query.hard === "true";
      console.log("[FILES] incoming fileId =", fileId);

      // 1) Metadata
      const metadata = await FileMetadata.findById(fileId);
      if (!metadata) {
        return responseWrapper.notFound(res, "Dosya bulunamadı");
      }

      // 2) Yetki
      if (
        req.user.role !== "admin" &&
        metadata.uploadedBy.toString() !== req.user._id.toString()
      ) {
        return responseWrapper.forbidden(res, "Bu dosyayı silme yetkiniz yok");
      }

      // 3) Doğru klasörü baştan çöz
      const manager = this.getManagerForFile(metadata);
      let directory = metadata.directory || "general";

      try {
        const existsInMetaDir = await manager.storageProvider.exists(
          metadata.filename,
          directory
        );
        if (!existsInMetaDir && metadata.url) {
          const m = metadata.url.match(/\/uploads\/([^/]+)\//);
          if (m) directory = m[1];
        }
      } catch (e) {
        // exists() hata verirse klasörü URL'den çözmeyi dene
        if (metadata.url) {
          const m = metadata.url.match(/\/uploads\/([^/]+)\//);
          if (m) directory = m[1];
        }
      }

      // 4) Fiziksel sil (hata ENOENT ise yola devam)
      let physicallyDeleted = false;
      try {
        await manager.storageProvider.delete(metadata.filename, directory, {
          hard: hardDelete,
        });
        physicallyDeleted = true;
      } catch (e) {
        const msg = String(e && e.message);
        if (msg.includes("Dosya bulunamadı")) {
          console.warn("[FILES] Physical file already missing:", {
            filename: metadata.filename,
            directory,
          });
          // Burada 404 DÖNME!
        } else {
          // Beklenmeyen hata: yine de metadata silme/işaretlemeye geçmeden önce logla ve hatayı balonlama
          console.error("[FILES] delete failed:", e);
          return responseWrapper.error(res, "Silme sırasında hata oluştu");
        }
      }

      // 5) Metadata hard/soft delete
      if (hardDelete) {
        await metadata.deleteOne();
      } else {
        metadata.isDeleted = true;
        metadata.deletedAt = new Date();
        metadata.deletedBy = req.user._id;
        await metadata.save();
      }

      const note = physicallyDeleted
        ? ""
        : " (Not: fiziksel dosya zaten mevcut değildi)";
      return responseWrapper.success(
        res,
        null,
        "Dosya başarıyla silindi" + note
      );
    } catch (error) {
      console.error("Delete error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  /**
   * Dosya listesi
   */
  listFiles = async (req, res) => {
    try {
      const {
        directory = "general",
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
        mimeType,
        relatedModel,
        relatedId,
      } = req.query;

      // Query oluştur
      const query = { isDeleted: false };

      // Yetki bazlı filtreleme
      if (req.user.role !== "admin") {
        query.$or = [
          { uploadedBy: req.user._id },
          { isPublic: true },
          { sharedWith: req.user._id },
        ];
      }

      if (directory !== "all") {
        query.directory = directory;
      }

      if (mimeType) {
        query.mimeType = new RegExp(mimeType, "i");
      }

      if (relatedModel) {
        query.relatedModel = relatedModel;
      }

      if (relatedId) {
        query.relatedId = relatedId;
      }

      // Veritabanından sorgula
      const files = await FileMetadata.find(query)
        .populate("uploadedBy", "fullName email")
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await FileMetadata.countDocuments(query);

      return responseWrapper.paginated(
        res,
        files,
        page,
        limit,
        total,
        "Dosyalar başarıyla listelendi"
      );
    } catch (error) {
      console.error("List files error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  /**
   * Strategy değiştirme endpoint'i
   * Runtime'da upload stratejisini değiştirme imkanı
   */
  switchStrategy = async (req, res) => {
    try {
      const { uploadType, newStrategy } = req.body;

      if (!this.managers[uploadType]) {
        return responseWrapper.badRequest(res, "Geçersiz upload tipi");
      }

      const validStrategies = ["multer", "express-fileupload", "formidable"];
      if (!validStrategies.includes(newStrategy)) {
        return responseWrapper.badRequest(res, "Geçersiz strateji");
      }

      // Yeni manager oluştur
      const currentConfig = this.managers[uploadType].config;
      this.managers[uploadType] = new FileUploadManager({
        ...currentConfig,
        uploadStrategy: newStrategy,
      });

      return responseWrapper.success(
        res,
        {
          uploadType: uploadType,
          newStrategy: newStrategy,
        },
        "Upload stratejisi başarıyla değiştirildi"
      );
    } catch (error) {
      console.error("Switch strategy error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  /**
   * Depolama istatistikleri
   */
  getStats = async (req, res) => {
    try {
      // Veritabanı istatistikleri
      const dbStats = await FileMetadata.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            totalFiles: { $sum: 1 },
            totalSize: { $sum: "$size" },
            avgSize: { $avg: "$size" },
          },
        },
      ]);

      // Manager'dan storage istatistikleri
      const storageStats = await this.defaultManager.storageProvider.getStats();

      // Kullanıcı bazlı istatistikler
      const userStats = await FileMetadata.aggregate([
        { $match: { isDeleted: false, uploadedBy: req.user._id } },
        {
          $group: {
            _id: "$directory",
            count: { $sum: 1 },
            totalSize: { $sum: "$size" },
          },
        },
      ]);

      return responseWrapper.success(
        res,
        {
          database: dbStats[0] || { totalFiles: 0, totalSize: 0, avgSize: 0 },
          storage: storageStats,
          userUsage: userStats,
        },
        "İstatistikler başarıyla alındı"
      );
    } catch (error) {
      console.error("Get stats error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  // === Yardımcı Metodlar ===

  /**
   * Dosya metadata'sını kaydet
   */
  async saveFileMetadata(fileData, user) {
    const metadata = new FileMetadata({
      filename: fileData.filename,
      originalName: fileData.originalName || fileData.filename,
      mimeType: fileData.mimeType,
      size: fileData.size,
      directory: fileData.directory || "general",
      url: fileData.url,
      hash: fileData.hash,
      uploadedBy: user._id,
      relatedModel: fileData.relatedModel,
      relatedId: fileData.relatedId,
      documentType: fileData.documentType,
      metadata: fileData.metadata,
      isPublic: false,
      isDeleted: false,
    });

    await metadata.save();
    return metadata;
  }

  /**
   * Dosya erişim yetkisi kontrolü
   */
  canAccessFile(metadata, user) {
    if (!user) return metadata.isPublic;
    if (user.role === "admin") return true;
    if (metadata.uploadedBy.toString() === user._id.toString()) return true;
    if (metadata.sharedWith && metadata.sharedWith.includes(user._id))
      return true;
    return metadata.isPublic;
  }

  /**
   * Dosya için uygun manager'ı seç
   */
  getManagerForFile(metadata) {
    if (metadata.relatedModel === "Property") {
      return this.managers.property;
    }

    if (metadata.mimeType && metadata.mimeType.startsWith("image/")) {
      return this.managers.image;
    }

    if (
      metadata.mimeType &&
      (metadata.mimeType === "application/pdf" ||
        metadata.mimeType.includes("document") ||
        metadata.mimeType.includes("msword") ||
        metadata.mimeType.includes("spreadsheet"))
    ) {
      return this.managers.document;
    }

    return this.defaultManager;
  }

  /**
   * Dosya erişim logla
   */
  async logFileAccess(metadata, user, action) {
    try {
      const ActivityLog = require("../models/ActivityLog");

      await ActivityLog.create({
        user: user?._id,
        action: `file_${action}`,
        details: {
          fileId: metadata._id,
          filename: metadata.filename,
          originalName: metadata.originalName,
          action: action,
        },
        ip: user?.lastLoginIP,
        severity: "low",
      });
    } catch (error) {
      console.error("Log error:", error);
    }
  }
}

module.exports = new FileControllerV2();
