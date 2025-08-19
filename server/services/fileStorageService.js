// server/services/fileStorageService.js

const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const archiver = require("archiver");
const AdmZip = require("adm-zip");

class FileStorageService {
  constructor() {
    // Upload dizini - projenin kökünde uploads klasörü
    this.uploadDir = path.resolve(
      process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads")
    );
    this.maxFileSize = Number(process.env.MAX_FILE_SIZE) || 104857600;
    this.tempDir = path.join(this.uploadDir, "temp");

    // Magic Numbers - Dosya güvenlik kontrolü
    this.magicNumbers = {
      // Resimler
      jpg: {
        signatures: [["FF", "D8", "FF"]],
        mimeTypes: ["image/jpeg", "image/jpg"],
      },
      jpeg: { signatures: [["FF", "D8", "FF"]], mimeTypes: ["image/jpeg"] },
      png: {
        signatures: [["89", "50", "4E", "47", "0D", "0A", "1A", "0A"]],
        mimeTypes: ["image/png"],
      },
      xlsx: {
        signatures: [["50", "4B", "03", "04"]],
        mimeTypes: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
      },
      pptx: {
        signatures: [["50", "4B", "03", "04"]],
        mimeTypes: [
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ],
      },
      gif: {
        signatures: [["47", "49", "46", "38"]],
        mimeTypes: ["image/gif"],
      },

      // Dökümanlar
      pdf: {
        signatures: [["25", "50", "44", "46"]],
        mimeTypes: ["application/pdf"],
      },
      doc: {
        signatures: [["D0", "CF", "11", "E0"]],
        mimeTypes: ["application/msword"],
      },
      docx: {
        signatures: [["50", "4B", "03", "04"]],
        mimeTypes: [
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
      },
      txt: {
        signatures: [],
        mimeTypes: ["text/plain"],
      },

      // Arşivler
      zip: {
        signatures: [["50", "4B"]],
        mimeTypes: ["application/zip"],
      },
    };

    // Tehlikeli dosya imzaları
    this.blockedMagicNumbers = [
      ["4D", "5A"], // EXE, DLL
      ["7F", "45", "4C", "46"], // ELF (Linux executable)
      ["23", "21"], // Shebang (#!)
    ];

    this.initializeStorage();
  }

  async initializeStorage() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, "general"), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, "images"), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, "documents"), {
        recursive: true,
      });
      await fs.mkdir(path.join(this.uploadDir, "properties"), {
        recursive: true,
      }); // Tapu dökümanları için
      console.log("📁 Upload dizinleri oluşturuldu");
    } catch (error) {
      console.error("Dizin oluşturma hatası:", error);
    }
  }

  /**
   * Magic number kontrolü - Dosya güvenliği
   */
  async checkMagicNumber(filePath, expectedType) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const fileHeader = fileBuffer.slice(0, 20);

      // Tehlikeli dosya kontrolü
      for (const blockedSignature of this.blockedMagicNumbers) {
        if (this.matchesSignature(fileHeader, blockedSignature)) {
          throw new Error(
            "Güvenlik uyarısı: Yürütülebilir dosya tespit edildi!"
          );
        }
      }

      // Text dosyaları için özel kontrol
      if (expectedType === "txt" || expectedType === "csv") {
        const sample = fileBuffer.slice(0, Math.min(1000, fileBuffer.length));
        const textDecoder = new TextDecoder("utf-8", { fatal: true });
        try {
          textDecoder.decode(sample);
          return true;
        } catch {
          throw new Error("Dosya içeriği beklenen text formatında değil");
        }
      }

      // Beklenen tip kontrolü
      const expectedSignatures =
        this.magicNumbers[expectedType]?.signatures || [];

      if (expectedSignatures.length === 0) {
        return true;
      }

      for (const signature of expectedSignatures) {
        if (this.matchesSignature(fileHeader, signature)) {
          return true;
        }
      }

      throw new Error(`Dosya içeriği ${expectedType} formatıyla uyuşmuyor`);
    } catch (error) {
      throw new Error(`Dosya güvenlik kontrolü başarısız: ${error.message}`);
    }
  }

  matchesSignature(buffer, signature) {
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== parseInt(signature[i], 16)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Tek dosya yükleme
   */
  async uploadFile(file, options = {}) {
    const {
      subDirectory = "general",
      userId = null,
      relatedModel = null, // 'property', 'investment', etc.
      relatedId = null,
    } = options;

    try {
      // Validasyon
      await this.validateFile(file);

      const fileExtension = this.getFileExtension(
        file.originalname
      ).toLowerCase();

      // Geçici dosya oluştur ve magic number kontrolü
      const tempPath = path.join(
        this.tempDir,
        `temp_${Date.now()}_${file.originalname}`
      );
      await fs.writeFile(tempPath, file.buffer);

      try {
        await this.checkMagicNumber(tempPath, fileExtension);
      } catch (error) {
        await fs.unlink(tempPath);
        throw error;
      }

      // Benzersiz dosya adı
      const uniqueFileName = this.generateUniqueFileName(file.originalname);
      const targetDir = path.join(this.uploadDir, subDirectory);
      await fs.mkdir(targetDir, { recursive: true });

      const targetPath = path.join(targetDir, uniqueFileName);
      await fs.rename(tempPath, targetPath);

      // Metadata
      const metadata = {
        fileName: uniqueFileName,
        originalFileName: file.originalname,
        fileType: file.mimetype,
        size: file.size,
        uploadPath: `${subDirectory}/${uniqueFileName}`,
        uploadDate: new Date(),
        uploadedBy: userId,
        relatedModel,
        relatedId,
        checksum: await this.calculateChecksum(targetPath),
        url: `/uploads/${subDirectory}/${uniqueFileName}`, // Public URL
      };

      await this.saveMetadata(metadata);

      return {
        success: true,
        message: "Dosya başarıyla yüklendi",
        data: metadata,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Çoklu dosya yükleme
   */
  async uploadMultipleFiles(files, options = {}) {
    const results = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file, options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          originalFileName: file.originalname,
          message: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Property (Tapu) dökümanları için özel upload
   */
  async uploadPropertyDocument(file, propertyId, documentType, userId) {
    const validDocumentTypes = [
      "title_deed",
      "annotation",
      "valuation",
      "contract",
      "other",
    ];

    if (!validDocumentTypes.includes(documentType)) {
      throw new Error("Geçersiz döküman tipi");
    }

    return await this.uploadFile(file, {
      subDirectory: `properties/${propertyId}`,
      userId,
      relatedModel: "Property",
      relatedId: propertyId,
      documentType,
    });
  }

  /**
   * Dosya validasyonu
   */
  async validateFile(file) {
    if (!file || !file.buffer || file.size === 0) {
      throw new Error("Boş dosya yüklenemez");
    }

    if (file.size > this.maxFileSize) {
      throw new Error(
        `Dosya boyutu çok büyük. Maximum: ${this.formatFileSize(
          this.maxFileSize
        )}`
      );
    }

    const fileName = path.basename(file.originalname);

    // Path traversal kontrolü
    if (
      fileName.includes("..") ||
      fileName.includes("/") ||
      fileName.includes("\\")
    ) {
      throw new Error("Dosya adı geçersiz karakterler içeriyor");
    }

    // Çoklu uzantı kontrolü
    const extensions = fileName.split(".");
    if (extensions.length > 2) {
      const suspiciousExtensions = ["exe", "dll", "bat", "cmd", "sh", "ps1"];
      for (let i = extensions.length - 2; i < extensions.length; i++) {
        if (suspiciousExtensions.includes(extensions[i].toLowerCase())) {
          throw new Error(
            "Güvenlik uyarısı: Şüpheli dosya uzantısı tespit edildi"
          );
        }
      }
    }

    return true;
  }

  /**
   * Dosya indirme
   */
  async downloadFile(fileName, subDirectory = "general") {
    const filePath = path.join(this.uploadDir, subDirectory, fileName);

    try {
      await fs.access(filePath);

      // Download metadata güncelle
      const metadata = await this.getMetadata(fileName);
      if (metadata) {
        metadata.downloadCount = (metadata.downloadCount || 0) + 1;
        metadata.lastDownloadDate = new Date();
        await this.saveMetadata(metadata);
      }

      return {
        path: filePath,
        fileName,
        stats: await fs.stat(filePath),
      };
    } catch (error) {
      throw new Error(`Dosya bulunamadı: ${fileName}`);
    }
  }

  /**
   * Dosya silme
   */
  async deleteFile(fileName, subDirectory = "general", hardDelete = false) {
    const filePath = path.join(this.uploadDir, subDirectory, fileName);

    try {
      if (hardDelete) {
        await fs.unlink(filePath);
      } else {
        // Soft delete - trash'e taşı
        const trashDir = path.join(this.uploadDir, "trash");
        await fs.mkdir(trashDir, { recursive: true });
        const trashPath = path.join(trashDir, `${Date.now()}_${fileName}`);
        await fs.rename(filePath, trashPath);
      }

      // Metadata güncelle
      const metadataPath = path.join(
        this.uploadDir,
        ".metadata",
        `${fileName}.json`
      );
      try {
        await fs.unlink(metadataPath);
      } catch (e) {
        // Metadata yoksa devam et
      }

      return { success: true, message: "Dosya silindi" };
    } catch (error) {
      throw new Error(`Dosya silinemedi: ${error.message}`);
    }
  }

  /**
   * Helper metodlar
   */
  async calculateChecksum(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    const hash = crypto.createHash("sha256");
    hash.update(fileBuffer);
    return hash.digest("hex");
  }

  generateUniqueFileName(originalFileName) {
    const extension = this.getFileExtension(originalFileName);
    const baseName = originalFileName
      .substring(0, originalFileName.lastIndexOf("."))
      .replace(/[^a-zA-Z0-9-_]/g, "");

    const timestamp = Date.now();
    const randomString = crypto.randomBytes(4).toString("hex");

    return `${baseName}_${timestamp}_${randomString}.${extension}`;
  }

  getFileExtension(fileName) {
    const lastDot = fileName.lastIndexOf(".");
    if (lastDot === -1) return "";
    return fileName.substring(lastDot + 1);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  async saveMetadata(metadata) {
    const metadataDir = path.join(this.uploadDir, ".metadata");
    await fs.mkdir(metadataDir, { recursive: true });
    const metadataPath = path.join(metadataDir, `${metadata.fileName}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  async getMetadata(fileName) {
    try {
      const metadataPath = path.join(
        this.uploadDir,
        ".metadata",
        `${fileName}.json`
      );
      const data = await fs.readFile(metadataPath, "utf8");
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
}

module.exports = new FileStorageService();
