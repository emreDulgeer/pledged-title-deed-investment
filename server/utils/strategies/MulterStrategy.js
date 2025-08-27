// server/utils/strategies/MulterStrategy.js

const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

class MulterStrategy {
  constructor(config) {
    this.config = config;
    this.upload = this.configureMulter();
  }

  /**
   * Multer yapılandırması
   */
  configureMulter() {
    const storage = multer.memoryStorage();

    const fileFilter = (req, file, cb) => {
      // Ön güvenlik kontrolleri
      const filename = file.originalname;

      // Path traversal kontrolü
      if (
        filename.includes("..") ||
        filename.includes("/") ||
        filename.includes("\\")
      ) {
        return cb(new Error("Güvensiz dosya adı"), false);
      }

      // Uzantı kontrolü
      const ext = path.extname(filename).toLowerCase().slice(1);
      if (
        this.config.blockedExtensions &&
        this.config.blockedExtensions.includes(ext)
      ) {
        return cb(
          new Error(`${ext} uzantılı dosyalar kabul edilmemektedir`),
          false
        );
      }

      // MIME type kontrolü
      if (
        this.config.allowedMimeTypes &&
        this.config.allowedMimeTypes.length > 0
      ) {
        const allowed = this.config.allowedMimeTypes.some((type) => {
          if (type.includes("*")) {
            const baseType = type.split("/")[0];
            return file.mimetype.startsWith(baseType);
          }
          return file.mimetype === type;
        });

        if (!allowed) {
          return cb(
            new Error(`${file.mimetype} tipi kabul edilmemektedir`),
            false
          );
        }
      }

      cb(null, true);
    };

    return multer({
      storage: storage,
      fileFilter: fileFilter,
      limits: {
        fileSize: this.config.maxFileSize || 100 * 1024 * 1024, // 100MB default
        files: this.config.maxFiles || 10,
        fields: 50,
        fieldNameSize: 100,
        fieldSize: 10 * 1024 * 1024, // 10MB
        headerPairs: 100,
      },
    });
  }

  /**
   * Request'ten dosyaları çıkar
   */
  async extractFiles(req) {
    return new Promise((resolve, reject) => {
      // Single file
      if (req.file) {
        resolve([this.normalizeFile(req.file)]);
        return;
      }

      // Multiple files
      if (req.files) {
        // Array of files
        if (Array.isArray(req.files)) {
          resolve(req.files.map((file) => this.normalizeFile(file)));
          return;
        }

        // Fields with files
        const files = [];
        for (const fieldName in req.files) {
          const fieldFiles = req.files[fieldName];
          if (Array.isArray(fieldFiles)) {
            files.push(...fieldFiles.map((file) => this.normalizeFile(file)));
          } else {
            files.push(this.normalizeFile(fieldFiles));
          }
        }
        resolve(files);
        return;
      }

      resolve([]);
    });
  }

  /**
   * Dosya nesnesini normalize et
   */
  normalizeFile(file) {
    return {
      originalname: file.originalname,
      name: file.originalname,
      mimetype: file.mimetype,
      type: file.mimetype,
      size: file.size,
      buffer: file.buffer,
      encoding: file.encoding,
      fieldname: file.fieldname,
      // Ek bilgiler
      uploadedAt: new Date(),
      uniqueId: this.generateUniqueId(),
    };
  }

  /**
   * Middleware döndür
   */
  getMiddleware(fieldConfig) {
    if (!fieldConfig) {
      return this.upload.any();
    }

    if (fieldConfig.single) {
      return this.upload.single(fieldConfig.fieldName || "file");
    }

    if (fieldConfig.array) {
      return this.upload.array(
        fieldConfig.fieldName || "files",
        fieldConfig.maxCount || 10
      );
    }

    if (fieldConfig.fields) {
      return this.upload.fields(fieldConfig.fields);
    }

    return this.upload.any();
  }

  /**
   * Benzersiz ID oluştur
   */
  generateUniqueId() {
    return crypto.randomBytes(16).toString("hex");
  }
}

module.exports = MulterStrategy;
