// server/services/FileUploadManager.js

const path = require("path");
const fs = require("fs").promises;
const crypto = require("crypto");
const { fileTypeFromBuffer } = require("file-type");
const sharp = require("sharp");
const pdfParse = require("pdf-parse");

/**
 * Modüler File Upload Manager
 * Farklı kütüphaneleri entegre edebilen merkezi yönetici
 */
class FileUploadManager {
  constructor(config = {}) {
    this.config = {
      // Genel ayarlar
      maxFileSize: config.maxFileSize || 100 * 1024 * 1024, // 100MB
      allowedMimeTypes: config.allowedMimeTypes || [],
      blockedExtensions:
        config.blockedExtensions || this.getDefaultBlockedExtensions(),

      // Güvenlik ayarları
      enableVirusScan: config.enableVirusScan || false,
      enableMagicNumberCheck: config.enableMagicNumberCheck || true,
      enableContentValidation: config.enableContentValidation || true,
      quarantineDir: config.quarantineDir || "./uploads/quarantine",

      // Storage ayarları
      storageType: config.storageType || "local", // local, s3, gcs, minio
      localPath: config.localPath || "./uploads",
      cloudConfig: config.cloudConfig || {},

      // Upload stratejisi
      uploadStrategy: config.uploadStrategy || "multer", // multer, express-fileupload, formidable
      chunkSize: config.chunkSize || 1024 * 1024, // 1MB chunks for streaming

      // Metadata
      generateThumbnails: config.generateThumbnails || true,
      extractMetadata: config.extractMetadata || true,
      hashAlgorithm: config.hashAlgorithm || "sha256",
    };

    // Storage provider'ı başlat
    this.initializeStorageProvider();

    // Upload strategy'yi başlat
    this.initializeUploadStrategy();

    // Güvenlik modüllerini başlat
    this.initializeSecurityModules();
  }

  /**
   * Storage provider'ı başlat
   */
  initializeStorageProvider() {
    switch (this.config.storageType) {
      case "s3":
        const S3Provider = require("../utils/providers/S3StorageProvider");
        this.storageProvider = new S3Provider(this.config.cloudConfig);
        break;
      case "gcs":
        const GCSProvider = require("../utils/providers/GCSStorageProvider");
        this.storageProvider = new GCSProvider(this.config.cloudConfig);
        break;
      case "minio":
        const MinioProvider = require("../utils/providers/MinioStorageProvider");
        this.storageProvider = new MinioProvider(this.config.cloudConfig);
        break;
      default:
        const LocalProvider = require("../utils/providers/LocalStorageProvider");
        this.storageProvider = new LocalProvider(this.config);
    }
  }

  /**
   * Upload strategy'yi başlat
   */
  initializeUploadStrategy() {
    switch (this.config.uploadStrategy) {
      case "express-fileupload":
        const ExpressFileuploadStrategy = require("../utils/strategies/ExpressFileuploadStrategy");
        this.uploadStrategy = new ExpressFileuploadStrategy(this.config);
        break;
      case "formidable":
        const FormidableStrategy = require("../utils/strategies/FormidableStrategy");
        this.uploadStrategy = new FormidableStrategy(this.config);
        break;
      default:
        const MulterStrategy = require("../utils/strategies/MulterStrategy");
        this.uploadStrategy = new MulterStrategy(this.config);
    }
  }

  /**
   * Güvenlik modüllerini başlat
   */
  initializeSecurityModules() {
    const SecurityValidator = require("../utils/security/SecurityValidator");
    this.securityValidator = new SecurityValidator(this.config);

    // if (this.config.enableVirusScan) {
    //   const VirusScanner = require("./security/VirusScanner");
    //   this.virusScanner = new VirusScanner();
    // }
    console.log("Security modules initialized");
  }

  /**
   * Varsayılan engellenmiş uzantılar
   */
  getDefaultBlockedExtensions() {
    return [
      // Executable files
      "exe",
      "dll",
      "bat",
      "cmd",
      "sh",
      "ps1",
      "vbs",
      "jar",
      "app",
      "deb",
      "rpm",
      "msi",
      "com",
      "scr",
      "hta",
      "cpl",
      "msc",

      // Script files
      "js",
      "jse",
      "ws",
      "wsf",
      "scf",
      "lnk",
      "inf",
      "reg",

      // System files
      "sys",
      "drv",
      "vxd",
      "cpl",
      "ocx",

      // Potentially dangerous
      "pif",
      "gadget",
      "msi",
      "msp",
      "msc",
      "vb",
      "vbe",
      "jse",
      "ws",
      "wsf",
      "wsc",
      "wsh",
      "ps1",
      "ps1xml",
      "ps2",
      "ps2xml",
      "psc1",
      "psc2",
      "msh",
      "msh1",
      "msh2",
      "mshxml",
      "msh1xml",
      "msh2xml",
      "scf",
      "lnk",
      "inf",

      // Archive bombs potansiyeli
      "zip",
      "rar",
      "7z",
      "tar",
      "gz",
      "bz2",
      "xz",
    ];
  }

  /**
   * Dosyayı yükle - Ana method
   */
  async upload(file, options = {}) {
    try {
      // 1. Ön validasyon
      await this.validatePreUpload(file);

      // 2. Güvenlik kontrolleri
      const securityResult = await this.performSecurityChecks(file);
      if (!securityResult.safe) {
        await this.quarantineFile(file, securityResult.reason);
        throw new Error(
          `Güvenlik ihlali: ${securityResult.reason || "belirlenemedi"}`
        );
      }

      // 3. İçerik validasyonu
      if (this.config.enableContentValidation) {
        await this.validateContent(file);
      }

      // 4. Virus taraması
      if (this.config.enableVirusScan) {
        // const virusResult = await this.virusScanner.scan(file);
        // if (virusResult.infected) {
        //   await this.quarantineFile(
        //     file,
        //     `Virus detected: ${virusResult.virus}`
        //   );
        //   throw new Error("Dosyada virüs tespit edildi");
        // }
        console.log("Virus Scan File Upload Manager");
      }

      // 5. Dosya işleme (thumbnail, optimization vs.)
      const processedFile = await this.processFile(file, options);

      // 6. Metadata oluştur
      const metadata = await this.generateMetadata(processedFile);

      // 7. Storage'a yükle
      const uploadResult = await this.storageProvider.upload(
        processedFile,
        metadata
      );

      // 8. Veritabanına kaydet
      await this.saveToDatabase(uploadResult, metadata);

      return {
        success: true,
        data: {
          id: uploadResult.id,
          filename: uploadResult.filename,
          url: uploadResult.url,
          size: metadata.size,
          directory: uploadResult.directory,
          mimeType: metadata.mimeType,
          hash: metadata.hash,
          metadata: metadata,
        },
      };
    } catch (error) {
      console.error("Upload error:", error);

      // Hata durumunda temizlik
      await this.cleanup(file);

      throw error;
    }
  }

  /**
   * Ön validasyon
   */
  async validatePreUpload(file) {
    // Dosya boyutu kontrolü
    if (file.size > this.config.maxFileSize) {
      throw new Error(
        `Dosya boyutu ${this.formatBytes(
          this.config.maxFileSize
        )} sınırını aşıyor`
      );
    }

    // Dosya adı güvenlik kontrolü
    const filename = file.originalname || file.name;
    if (this.isFilenameUnsafe(filename)) {
      throw new Error("Güvensiz dosya adı tespit edildi");
    }

    // Uzantı kontrolü
    const ext = path.extname(filename).toLowerCase().slice(1);
    if (this.config.blockedExtensions.includes(ext)) {
      throw new Error(`${ext} uzantılı dosyalar engellenmiştir`);
    }
  }

  /**
   * Güvenlik kontrolleri
   */
  async performSecurityChecks(file) {
    // Güvenlik modülü yoksa (dev) güvenli kabul et
    if (!this.securityValidator) return { safe: true };

    const result = await this.securityValidator.validate(file);

    if (!result.safe) {
      const reason =
        result.reason ||
        (Array.isArray(result.errors) && result.errors[0]) ||
        "bilinmeyen güvenlik gerekçesi";
      return { safe: false, reason };
    }
    return { safe: true };
  }

  /**
   * İçerik validasyonu
   */
  async validateContent(file) {
    const buffer = await this.getFileBuffer(file);

    // Magic number kontrolü
    if (this.config.enableMagicNumberCheck) {
      const fileType = await fileTypeFromBuffer(buffer);

      if (!fileType) {
        throw new Error("Dosya tipi belirlenemedi");
      }

      // MIME type uyuşma kontrolü
      const declaredMime = file.mimetype || file.type;
      if (declaredMime && !this.mimeTypesMatch(declaredMime, fileType.mime)) {
        throw new Error("Dosya içeriği ile belirtilen tip uyuşmuyor");
      }

      // Double extension kontrolü
      const filename = file.originalname || file.name;
      if (this.hasDoubleExtension(filename)) {
        throw new Error("Çift uzantılı dosyalar kabul edilmemektedir");
      }
    }

    // PDF kontrolü
    if (file.mimetype === "application/pdf") {
      await this.validatePDF(buffer);
    }

    // Image kontrolü
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      await this.validateImage(buffer);
    }
  }

  /**
   * PDF validasyonu
   */
  async validatePDF(buffer) {
    try {
      const data = await pdfParse(buffer);

      // JavaScript içeriği kontrolü
      if (data.text && data.text.includes("/JavaScript")) {
        throw new Error("PDF dosyasında JavaScript tespit edildi");
      }

      // Form kontrolü
      if (data.info && data.info.IsAcroFormPresent) {
        console.warn("PDF dosyasında form alanları mevcut");
      }
    } catch (error) {
      if (error.message.includes("JavaScript")) {
        throw error;
      }
      throw new Error("PDF dosyası okunamadı veya bozuk");
    }
  }

  /**
   * Image validasyonu
   */
  async validateImage(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();

      // Boyut kontrolü
      if (metadata.width > 10000 || metadata.height > 10000) {
        throw new Error("Görsel boyutları çok büyük");
      }

      // Renk derinliği kontrolü (potansiyel stego)
      if (metadata.depth && metadata.depth > 16) {
        console.warn("Yüksek renk derinliği tespit edildi");
      }
    } catch (error) {
      if (error.message.includes("büyük")) {
        throw error;
      }
      throw new Error("Görsel dosyası işlenemedi");
    }
  }

  /**
   * Dosyayı işle
   */
  async processFile(file, options) {
    const processedFile = { ...file };

    // Image optimization
    if (
      file.mimetype &&
      file.mimetype.startsWith("image/") &&
      options.optimize
    ) {
      processedFile.buffer = await this.optimizeImage(file);
    }

    // Thumbnail oluştur
    if (this.config.generateThumbnails && this.isImageFile(file)) {
      processedFile.thumbnail = await this.generateThumbnail(file);
    }

    return processedFile;
  }

  /**
   * Metadata oluştur
   */
  async generateMetadata(file) {
    const buffer = await this.getFileBuffer(file);

    const metadata = {
      originalName: file.originalname || file.name,
      size: file.size || buffer.length,
      mimeType: file.mimetype || file.type,
      uploadDate: new Date(),
      hash: await this.calculateHash(buffer),
    };

    // Dosya tipine göre ek metadata
    if (this.isImageFile(file)) {
      const imageMetadata = await sharp(buffer).metadata();
      metadata.dimensions = {
        width: imageMetadata.width,
        height: imageMetadata.height,
      };
      metadata.format = imageMetadata.format;
    }

    if (file.mimetype === "application/pdf") {
      try {
        const pdfData = await pdfParse(buffer);
        metadata.pages = pdfData.numpages;
        metadata.info = pdfData.info;
      } catch (error) {
        console.error("PDF metadata extraction failed:", error);
      }
    }

    return metadata;
  }

  /**
   * Dosyayı karantinaya al
   */
  async quarantineFile(file, reason) {
    const quarantineDir = this.config.quarantineDir;
    await fs.mkdir(quarantineDir, { recursive: true });

    const timestamp = Date.now();
    const filename = `${timestamp}_${file.originalname || file.name}`;
    const quarantinePath = path.join(quarantineDir, filename);

    const buffer = await this.getFileBuffer(file);
    await fs.writeFile(quarantinePath, buffer);

    // Log karantina
    const logEntry = {
      timestamp: new Date(),
      filename: file.originalname || file.name,
      reason: reason,
      size: file.size,
      mimeType: file.mimetype || file.type,
      quarantinePath: quarantinePath,
    };

    await this.logQuarantine(logEntry);
  }

  /**
   * Veritabanına kaydet
   */
  async saveToDatabase(uploadResult, metadata) {
    // Bu kısım proje yapınıza göre implement edilecek
    // Örnek:
    // const FileModel = require('../models/File');
    // await FileModel.create({ ...uploadResult, ...metadata });
  }

  /**
   * Temizlik işlemleri
   */
  async cleanup(file) {
    // Geçici dosyaları temizle
    if (file.tempPath) {
      try {
        await fs.unlink(file.tempPath);
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    }
  }

  // === Yardımcı Metodlar ===

  isFilenameUnsafe(filename) {
    const unsafePatterns = [
      /\.\./g, // Directory traversal
      /[<>:"|?*]/g, // Windows invalid chars
      /[\x00-\x1f\x80-\x9f]/g, // Control characters
      /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i, // Windows reserved
    ];

    return unsafePatterns.some((pattern) => pattern.test(filename));
  }

  hasDoubleExtension(filename) {
    const parts = filename.split(".");
    if (parts.length < 3) return false;

    const suspiciousExtensions = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "pdf",
      "doc",
      "docx",
    ];
    const lastExt = parts[parts.length - 1].toLowerCase();
    const secondLastExt = parts[parts.length - 2].toLowerCase();

    return (
      suspiciousExtensions.includes(secondLastExt) &&
      this.config.blockedExtensions.includes(lastExt)
    );
  }

  mimeTypesMatch(declared, detected) {
    // Bazı MIME type'lar için esnek eşleştirme
    const mimeMap = {
      "image/jpg": "image/jpeg",
      "text/xml": "application/xml",
    };

    const normalizedDeclared = mimeMap[declared] || declared;
    const normalizedDetected = mimeMap[detected] || detected;

    return normalizedDeclared === normalizedDetected;
  }

  isImageFile(file) {
    const imageMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
    ];
    return imageMimes.includes(file.mimetype || file.type);
  }

  async getFileBuffer(file) {
    // Multer
    if (file.buffer) return file.buffer;

    // Express-fileupload
    if (file.data) return file.data;

    // Formidable veya path varsa
    if (file.path || file.filepath) {
      return await fs.readFile(file.path || file.filepath);
    }

    throw new Error("File buffer could not be retrieved");
  }

  async calculateHash(buffer) {
    return crypto
      .createHash(this.config.hashAlgorithm)
      .update(buffer)
      .digest("hex");
  }

  async optimizeImage(file) {
    const buffer = await this.getFileBuffer(file);

    return await sharp(buffer)
      .resize(2048, 2048, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
  }

  async generateThumbnail(file) {
    const buffer = await this.getFileBuffer(file);

    return await sharp(buffer)
      .resize(300, 300, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  async logQuarantine(entry) {
    const logFile = path.join(this.config.quarantineDir, "quarantine.log");
    const logEntry = JSON.stringify(entry) + "\n";
    await fs.appendFile(logFile, logEntry);
  }

  /**
   * Middleware factory - Express için
   */
  middleware(options = {}) {
    return async (req, res, next) => {
      try {
        // Upload strategy'ye göre dosyaları al
        // 1) Strateji parser'ını çalıştır (multer / express-fileupload ...)
        const parseMw =
          this.uploadStrategy.getMiddleware?.(options.fieldConfig) ||
          this.uploadStrategy.getMiddleware?.() ||
          this.uploadStrategy.middleware; // express-fileupload
        if (parseMw) {
          await new Promise((resolve, reject) => {
            parseMw(req, res, (err) => (err ? reject(err) : resolve()));
          });
        }

        // 2) Dosyaları al
        const files = await this.uploadStrategy.extractFiles(req);

        if (!files || files.length === 0) {
          return next();
        }

        const uploadResults = [];

        for (const file of files) {
          try {
            const result = await this.upload(file, options);
            uploadResults.push(result);
          } catch (error) {
            uploadResults.push({
              success: false,
              error: error.message,
              filename: file.originalname || file.name,
            });
          }
        }

        req.uploadResults = uploadResults;
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

module.exports = FileUploadManager;
