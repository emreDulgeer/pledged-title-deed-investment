// server/utils/strategies/ExpressFileuploadStrategy.js

const fileUpload = require("express-fileupload");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs").promises;

class ExpressFileuploadStrategy {
  constructor(config) {
    this.config = config;
    this.middleware = this.configureExpressFileupload();
  }

  /**
   * Express-fileupload yapılandırması
   */
  configureExpressFileupload() {
    return fileUpload({
      limits: {
        fileSize: this.config.maxFileSize || 100 * 1024 * 1024, // 100MB
        files: this.config.maxFiles || 10,
        fields: 50,
        fieldNameSize: 100,
        fieldSize: 10 * 1024 * 1024,
      },

      // Güvenlik ayarları
      safeFileNames: true, // Dosya adlarını sanitize et
      preserveExtension: true, // Uzantıyı koru
      abortOnLimit: true, // Limit aşımında iptal et
      responseOnLimit: "Dosya boyutu limiti aşıldı",

      // Upload ayarları
      useTempFiles: true, // Geçici dosya kullan (büyük dosyalar için)
      tempFileDir: "/tmp/",

      // Parse ayarları
      parseNested: true,

      // Debug
      debug: process.env.NODE_ENV === "development",

      // Upload handler
      uploadTimeout: 60000, // 60 saniye

      // Dosya filtreleme
      fileFilter: (file) => {
        return this.validateFile(file);
      },
    });
  }

  /**
   * Dosya validasyonu
   */
  validateFile(file) {
    const filename = file.name;

    // Path traversal kontrolü
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      throw new Error("Güvensiz dosya adı");
    }

    // Null byte kontrolü
    if (filename.includes("\x00")) {
      throw new Error("Null byte tespit edildi");
    }

    // Uzantı kontrolü
    const ext = path.extname(filename).toLowerCase().slice(1);
    if (
      this.config.blockedExtensions &&
      this.config.blockedExtensions.includes(ext)
    ) {
      throw new Error(`${ext} uzantılı dosyalar kabul edilmemektedir`);
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
        throw new Error(`${file.mimetype} tipi kabul edilmemektedir`);
      }
    }

    return true;
  }

  /**
   * Request'ten dosyaları çıkar
   */
  async extractFiles(req) {
    const files = [];

    if (!req.files) {
      return files;
    }

    // Tek dosya veya dosya dizisi olabilir
    for (const fieldName in req.files) {
      const file = req.files[fieldName];

      if (Array.isArray(file)) {
        // Çoklu dosya
        for (const f of file) {
          files.push(await this.normalizeFile(f));
        }
      } else {
        // Tek dosya
        files.push(await this.normalizeFile(file));
      }
    }

    return files;
  }

  /**
   * Dosya nesnesini normalize et
   */
  async normalizeFile(file) {
    // Buffer'ı al
    let buffer;
    if (file.tempFilePath) {
      // Geçici dosyadan oku
      buffer = await fs.readFile(file.tempFilePath);

      // Geçici dosyayı temizle
      try {
        await fs.unlink(file.tempFilePath);
      } catch (error) {
        console.error("Temp file cleanup error:", error);
      }
    } else {
      // Direkt data'dan al
      buffer = file.data;
    }

    return {
      originalname: file.name,
      name: file.name,
      mimetype: file.mimetype,
      type: file.mimetype,
      size: file.size,
      buffer: buffer,
      data: buffer, // Express-fileupload uyumluluğu
      encoding: file.encoding || "7bit",
      md5: file.md5 || this.calculateMD5(buffer),
      truncated: file.truncated || false,
      // Ek bilgiler
      uploadedAt: new Date(),
      uniqueId: this.generateUniqueId(),
    };
  }

  /**
   * Middleware döndür
   */
  getMiddleware() {
    return this.middleware;
  }

  /**
   * MD5 hesapla
   */
  calculateMD5(buffer) {
    return crypto.createHash("md5").update(buffer).digest("hex");
  }

  /**
   * Benzersiz ID oluştur
   */
  generateUniqueId() {
    return crypto.randomBytes(16).toString("hex");
  }

  /**
   * Özel middleware wrapper - hata yönetimi için
   */
  createMiddleware() {
    const baseMiddleware = this.middleware;

    return async (req, res, next) => {
      try {
        // Base middleware'i çalıştır
        baseMiddleware(req, res, async (err) => {
          if (err) {
            return next(err);
          }

          // Dosyaları validate et
          if (req.files) {
            for (const fieldName in req.files) {
              const file = req.files[fieldName];

              if (Array.isArray(file)) {
                for (const f of file) {
                  try {
                    this.validateFile(f);
                  } catch (error) {
                    return next(error);
                  }
                }
              } else {
                try {
                  this.validateFile(file);
                } catch (error) {
                  return next(error);
                }
              }
            }
          }

          next();
        });
      } catch (error) {
        next(error);
      }
    };
  }
}

module.exports = ExpressFileuploadStrategy;
