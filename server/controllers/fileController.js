// server/controllers/fileController.js

const fileStorageService = require("../services/fileStorageService");
const responseWrapper = require("../utils/responseWrapper");
const path = require("path");
const mime = require("mime-types");

const SAFE_DIRECTORIES = new Set([
  "general",
  "images",
  "documents",
  "properties",
]);
/**
 * Tek dosya yükleme
 */
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return responseWrapper.badRequest(res, "Dosya bulunamadı");
    }

    const directory = SAFE_DIRECTORIES.has(req.body.directory)
      ? req.body.directory
      : "general";
    const userId = req.user?._id || null;

    const result = await fileStorageService.uploadFile(req.file, {
      subDirectory: directory,
      userId,
      relatedModel: req.body.relatedModel,
      relatedId: req.body.relatedId,
    });

    return responseWrapper.success(res, result.message, result.data);
  } catch (error) {
    console.error("Upload error:", error);
    return responseWrapper.error(res, error.message);
  }
};

/**
 * Çoklu dosya yükleme
 */
exports.uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return responseWrapper.badRequest(res, "Dosya bulunamadı");
    }

    if (req.files.length > 10) {
      return responseWrapper.badRequest(res, "En fazla 10 dosya yüklenebilir");
    }

    const directory = req.body.directory || "general";
    const userId = req.user?._id || null;

    const results = await fileStorageService.uploadMultipleFiles(req.files, {
      subDirectory: directory,
      userId,
      relatedModel: req.body.relatedModel,
      relatedId: req.body.relatedId,
    });

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return responseWrapper.success(
      res,
      `${successCount} dosya yüklendi, ${failCount} başarısız`,
      results
    );
  } catch (error) {
    console.error("Multiple upload error:", error);
    return responseWrapper.error(res, error.message);
  }
};

/**
 * Property (Tapu) dökümanı yükleme
 */
exports.uploadPropertyDocument = async (req, res) => {
  try {
    if (!req.file) {
      return responseWrapper.badRequest(res, "Dosya bulunamadı");
    }

    const { propertyId, documentType } = req.body;

    if (!propertyId || !documentType) {
      return responseWrapper.badRequest(
        res,
        "Property ID ve döküman tipi gerekli"
      );
    }

    // Property ownership kontrolü
    const Property = require("../models/Property");
    const property = await Property.findById(propertyId);

    if (!property) {
      return responseWrapper.notFound(res, "Property bulunamadı");
    }

    // Yetki kontrolü - sadece property owner veya admin
    const role = req.user?.role;
    const userId =
      req.user?._id || req.user?.id || req.user?.userId || req.user?.sub;
    if (!userId) {
      return responseWrapper.badRequest(res, "Kullanıcı bilgisi eksik");
    }
    // owner hem ObjectId hem populate edilmiş obje (owner._id) olabilir
    const ownerId =
      property.owner && property.owner._id
        ? property.owner._id
        : property.owner;
    if (role !== "admin") {
      if (!ownerId) {
        return responseWrapper.forbidden(
          res,
          "Bu property için owner atanmadı"
        );
      }
      if (String(ownerId) !== String(userId)) {
        console.log(ownerId);
        return responseWrapper.forbidden(res, "Bu işlem için yetkiniz yok");
      }
    }

    const result = await fileStorageService.uploadPropertyDocument(
      req.file,
      propertyId,
      documentType,
      req.user._id
    );

    // Property modelini güncelle
    if (documentType === "title_deed") {
      property.titleDeedUrl = result.data.url;
    } else if (documentType === "annotation") {
      property.annotationDocumentUrl = result.data.url;
      property.hasAnnotation = true;
    }

    property.documents = property.documents || [];
    property.documents.push({
      type: documentType,
      url: result.data.url,
      fileName: result.data.fileName,
      uploadDate: new Date(),
    });

    await property.save();

    return responseWrapper.success(
      res,
      "Döküman başarıyla yüklendi",
      result.data
    );
  } catch (error) {
    console.error("Property document upload error:", error);
    return responseWrapper.error(res, error.message);
  }
};

/**
 * Dosya indirme
 */
exports.downloadFile = async (req, res) => {
  try {
    const { fileName } = req.params;
    const directory = req.query.directory || "general";

    const fileData = await fileStorageService.downloadFile(fileName, directory);
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Dosyayı gönder
    res.download(fileData.path, fileName, (err) => {
      if (err) {
        console.error("Download error:", err);
        if (!res.headersSent) {
          return responseWrapper.error(res, "Dosya indirme hatası");
        }
      }
    });
  } catch (error) {
    console.error("Download error:", error);
    return responseWrapper.notFound(res, error.message);
  }
};

/**
 * Dosya önizleme (inline)
 */
exports.previewFile = async (req, res) => {
  try {
    const { fileName } = req.params;
    const directory = req.query.directory || "general";

    const fileData = await fileStorageService.downloadFile(fileName, directory);
    const mimeType = mime.lookup(fileName) || "application/octet-stream";

    // Güvenli önizleme tipleri
    const safePreviewTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
    ];

    const disposition = safePreviewTypes.includes(mimeType)
      ? "inline"
      : "attachment";

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", mimeType);
    if (mimeType === "application/pdf") {
      res.setHeader("Content-Security-Policy", "sandbox");
    }
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${fileName}"`
    );

    const fs = require("fs");
    const stream = fs.createReadStream(fileData.path);
    stream.pipe(res);
  } catch (error) {
    console.error("Preview error:", error);
    return responseWrapper.notFound(res, error.message);
  }
};

/**
 * Dosya silme
 */
exports.deleteFile = async (req, res) => {
  try {
    const { fileName } = req.params;
    const directory = req.query.directory || "general";
    const hardDelete = req.query.hard === "true";

    // Dosya metadata kontrolü
    const metadata = await fileStorageService.getMetadata(fileName);

    if (metadata) {
      // Yetki kontrolü - sadece yükleyen veya admin silebilir
      if (
        req.user.role !== "admin" &&
        metadata.uploadedBy !== req.user._id.toString()
      ) {
        return responseWrapper.forbidden(res, "Bu dosyayı silme yetkiniz yok");
      }
    }

    const result = await fileStorageService.deleteFile(
      fileName,
      directory,
      hardDelete
    );

    return responseWrapper.success(res, result.message);
  } catch (error) {
    console.error("Delete error:", error);
    return responseWrapper.error(res, error.message);
  }
};

/**
 * Dosyaları listeleme
 */
exports.listFiles = async (req, res) => {
  try {
    const directory = req.query.directory || "general";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // TODO: Implement listing with pagination
    const uploadDir = path.join(
      require("../services/fileStorageService").uploadDir,
      directory
    );
    const fs = require("fs").promises;

    try {
      const files = await fs.readdir(uploadDir);
      const fileList = [];

      for (const file of files) {
        const filePath = path.join(uploadDir, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          const metadata = await fileStorageService.getMetadata(file);
          fileList.push({
            fileName: file,
            originalName: metadata?.originalFileName || file,
            size: stats.size,
            sizeFormatted: fileStorageService.formatFileSize(stats.size),
            createdAt: stats.birthtime,
            uploadedBy: metadata?.uploadedBy,
            url: `/uploads/${directory}/${file}`,
          });
        }
      }

      // Pagination
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedFiles = fileList.slice(start, end);

      return responseWrapper.paginated(res, {
        files: paginatedFiles,
        total: fileList.length,
        page,
        limit,
        totalPages: Math.ceil(fileList.length / limit),
      });
    } catch (error) {
      if (error.code === "ENOENT") {
        return responseWrapper.success(res, "Dizin boş", []);
      }
      throw error;
    }
  } catch (error) {
    console.error("List error:", error);
    return responseWrapper.error(res, error.message);
  }
};

/**
 * Dosya bilgisi alma
 */
exports.getFileInfo = async (req, res) => {
  try {
    const { fileName } = req.params;
    const metadata = await fileStorageService.getMetadata(fileName);

    if (!metadata) {
      return responseWrapper.notFound(res, "Dosya bilgisi bulunamadı");
    }

    return responseWrapper.success(res, "Dosya bilgisi", metadata);
  } catch (error) {
    console.error("File info error:", error);
    return responseWrapper.error(res, error.message);
  }
};
