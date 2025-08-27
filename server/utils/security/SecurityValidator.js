// server/services/security/SecurityValidator.js

const crypto = require("crypto");
const { fileTypeFromBuffer } = require("file-type");
const path = require("path");

class SecurityValidator {
  constructor(config) {
    this.config = config;

    // Tehlikeli pattern'ler
    this.dangerousPatterns = [
      // PHP shells
      /eval\s*\(/gi,
      /system\s*\(/gi,
      /exec\s*\(/gi,
      /shell_exec\s*\(/gi,
      /passthru\s*\(/gi,
      /\$_POST\[/gi,
      /\$_GET\[/gi,

      // JavaScript injections
      /<script[^>]*>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,

      // SQL Injections
      /union\s+select/gi,
      /drop\s+table/gi,
      /insert\s+into/gi,
      /select\s+\*\s+from/gi,

      // XML External Entity
      /<!DOCTYPE[^>]*\[/gi,
      /<!ENTITY/gi,
      /SYSTEM\s+"file:/gi,

      // Server-side includes
      /<!--#include/gi,
      /<!--#exec/gi,

      // Path traversal
      /\.\.[\/\\]/g,
      /%2e%2e[\/\\]/gi,
      /\x00/g, // Null byte
    ];

    // Polyglot dosya imzaları (birden fazla format olarak yorumlanabilir)
    this.polyglotSignatures = [
      Buffer.from([0xff, 0xd8, 0xff, 0x3c]), // JPEG + HTML
      Buffer.from([0x47, 0x49, 0x46, 0x38, 0x3c]), // GIF + HTML
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x3c]), // PNG + HTML
    ];

    // Bilinen kötücül dosya hash'leri (örnek - gerçek sistemde veritabanından gelir)
    this.maliciousHashes = new Set([
      "d4c3b2a1e5f6789012345678901234567890abcd",
      "a1b2c3d4e5f6789012345678901234567890efgh",
    ]);

    // MIME type mapping
    this.trustedMimeTypes = {
      jpg: ["image/jpeg"],
      jpeg: ["image/jpeg"],
      png: ["image/png"],
      gif: ["image/gif"],
      pdf: ["application/pdf"],
      doc: ["application/msword"],
      docx: [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      xls: ["application/vnd.ms-excel"],
      xlsx: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
      txt: ["text/plain"],
      csv: ["text/csv", "application/csv"],
    };
  }

  /**
   * Ana validasyon metodu
   */
  async validate(file) {
    const results = {
      safe: true,
      warnings: [],
      errors: [],
      score: 100, // Güvenlik skoru
    };

    try {
      // 1. Dosya adı güvenlik kontrolü
      const filenameCheck = this.validateFilename(file);
      if (!filenameCheck.safe) {
        results.safe = false;
        results.errors.push(filenameCheck.reason);
        results.score -= 30;
      }

      // 2. Buffer al
      const buffer = await this.getFileBuffer(file);

      // 3. Hash kontrolü
      const hash = this.calculateHash(buffer);
      if (this.maliciousHashes.has(hash)) {
        results.safe = false;
        results.errors.push("Bilinen kötücül dosya tespit edildi");
        results.score = 0;
        return results;
      }

      // 4. Magic number kontrolü
      const magicCheck = await this.checkMagicNumber(buffer, file);
      if (!magicCheck.safe) {
        results.safe = false;
        results.errors.push(magicCheck.reason);
        results.score -= 40;
      }

      // 5. İçerik analizi
      const contentCheck = await this.analyzeContent(buffer, file);
      if (!contentCheck.safe) {
        results.safe = false;
        results.errors.push(contentCheck.reason);
        results.score -= 50;
      } else if (contentCheck.warnings.length > 0) {
        results.warnings.push(...contentCheck.warnings);
        results.score -= contentCheck.warnings.length * 5;
      }

      // 6. Polyglot kontrolü
      if (this.isPolyglot(buffer)) {
        results.safe = false;
        results.errors.push("Polyglot dosya tespit edildi");
        results.score = 0;
      }

      // 7. Entropy analizi (şifrelenmiş/sıkıştırılmış içerik)
      const entropy = this.calculateEntropy(buffer);
      if (entropy > 7.5) {
        results.warnings.push(
          "Yüksek entropy tespit edildi - şifrelenmiş/sıkıştırılmış olabilir"
        );
        results.score -= 10;
      }

      // 8. Boyut anomali kontrolü
      const sizeCheck = this.checkSizeAnomaly(buffer, file);
      if (!sizeCheck.normal) {
        results.warnings.push(sizeCheck.reason);
        results.score -= 5;
      }

      // Final skor değerlendirmesi
      results.score = Math.max(0, results.score);
      if (results.score < 30) {
        results.safe = false;
        results.reason = "Güvenlik skoru çok düşük";
      }
    } catch (error) {
      results.safe = false;
      results.errors.push(`Validasyon hatası: ${error.message}`);
      results.score = 0;
    }

    return results;
  }

  /**
   * Dosya adı güvenlik kontrolü
   */
  validateFilename(file) {
    const filename = file.originalname || file.name || "";

    // Null byte kontrolü
    if (filename.includes("\x00")) {
      return { safe: false, reason: "Null byte tespit edildi" };
    }

    // Directory traversal kontrolü
    if (
      filename.includes("..") ||
      filename.includes("//") ||
      filename.includes("\\\\")
    ) {
      return { safe: false, reason: "Directory traversal girişimi" };
    }

    // Unicode kontrol karakterleri
    if (/[\u0000-\u001F\u007F-\u009F]/.test(filename)) {
      return { safe: false, reason: "Kontrol karakterleri tespit edildi" };
    }

    // Çift uzantı kontrolü
    const parts = filename.split(".");
    if (parts.length > 2) {
      const extensions = parts.slice(1).map((ext) => ext.toLowerCase());
      const suspiciousCombo = [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "pdf",
        "doc",
        "docx",
      ];

      for (let i = 0; i < extensions.length - 1; i++) {
        if (
          suspiciousCombo.includes(extensions[i]) &&
          this.config.blockedExtensions.includes(extensions[i + 1])
        ) {
          return { safe: false, reason: "Şüpheli çift uzantı tespit edildi" };
        }
      }
    }

    // RLO (Right-to-Left Override) karakteri kontrolü
    if (filename.includes("\u202E")) {
      return { safe: false, reason: "RLO karakteri tespit edildi" };
    }

    // Homograph saldırısı kontrolü (benzer görünen karakterler)
    const homographs = /[а-яА-Я]|[αβγδεζηθικλμνξοπρστυφχψω]/;
    if (homographs.test(filename)) {
      return { safe: false, reason: "Homograph karakterler tespit edildi" };
    }

    return { safe: true };
  }

  /**
   * Magic number kontrolü
   */
  async checkMagicNumber(buffer, file) {
    try {
      const fileType = await fileTypeFromBuffer(buffer);

      if (!fileType) {
        return { safe: false, reason: "Dosya tipi belirlenemedi" };
      }

      // Uzantı al
      const filename = file.originalname || file.name || "";
      const ext = path.extname(filename).toLowerCase().slice(1);

      // Bilinen güvenli MIME type kontrolü
      if (ext && this.trustedMimeTypes[ext]) {
        if (!this.trustedMimeTypes[ext].includes(fileType.mime)) {
          return {
            safe: false,
            reason: `Dosya içeriği (${fileType.mime}) uzantı ile (${ext}) uyuşmuyor`,
          };
        }
      }

      // MIME type spoofing kontrolü
      const declaredMime = file.mimetype || file.type;
      if (declaredMime && declaredMime !== fileType.mime) {
        // Bazı istisnalar (tarayıcıların yanlış MIME type göndermesi)
        const exceptions = [
          { declared: "image/jpg", actual: "image/jpeg" },
          { declared: "text/xml", actual: "application/xml" },
        ];

        const isException = exceptions.some(
          (e) => e.declared === declaredMime && e.actual === fileType.mime
        );

        if (!isException) {
          return {
            safe: false,
            reason: `MIME type uyuşmazlığı: ${declaredMime} != ${fileType.mime}`,
          };
        }
      }

      return { safe: true };
    } catch (error) {
      return {
        safe: false,
        reason: `Magic number kontrolü başarısız: ${error.message}`,
      };
    }
  }

  /**
   * İçerik analizi
   */
  async analyzeContent(buffer, file) {
    const result = {
      safe: true,
      warnings: [],
      reason: null,
    };

    // Text tabanlı dosyalar için içerik kontrolü
    const textMimes = [
      "text/plain",
      "text/html",
      "text/css",
      "text/javascript",
      "application/json",
      "application/xml",
      "text/csv",
    ];
    const mimeType = file.mimetype || file.type || "";

    if (textMimes.includes(mimeType) || this.isTextFile(buffer)) {
      const text = buffer.toString("utf8");

      // Tehlikeli pattern kontrolü
      for (const pattern of this.dangerousPatterns) {
        if (pattern.test(text)) {
          result.safe = false;
          result.reason = `Tehlikeli içerik tespit edildi: ${pattern.source}`;
          return result;
        }
      }

      // Embedded executable kontrolü
      if (this.hasEmbeddedExecutable(text)) {
        result.safe = false;
        result.reason = "Gömülü çalıştırılabilir kod tespit edildi";
        return result;
      }
    }

    // PDF özel kontrolleri
    if (mimeType === "application/pdf") {
      const pdfCheck = this.analyzePDF(buffer);
      if (!pdfCheck.safe) {
        return pdfCheck;
      }
      if (pdfCheck.warnings.length > 0) {
        result.warnings.push(...pdfCheck.warnings);
      }
    }

    // Office dosyaları için macro kontrolü
    if (this.isOfficeFile(mimeType)) {
      const officeCheck = this.analyzeOfficeFile(buffer);
      if (!officeCheck.safe) {
        return officeCheck;
      }
    }

    return result;
  }

  /**
   * Polyglot dosya kontrolü
   */
  isPolyglot(buffer) {
    for (const signature of this.polyglotSignatures) {
      if (buffer.slice(0, signature.length).equals(signature)) {
        return true;
      }
    }

    // GIF89a ve script kontrolü
    if (buffer.slice(0, 6).toString() === "GIF89a") {
      const content = buffer.toString();
      if (content.includes("<script") || content.includes("<?php")) {
        return true;
      }
    }

    return false;
  }

  /**
   * Entropy hesaplama
   */
  calculateEntropy(buffer) {
    const freq = {};
    const len = buffer.length;

    // Frekans hesapla
    for (let i = 0; i < len; i++) {
      const byte = buffer[i];
      freq[byte] = (freq[byte] || 0) + 1;
    }

    // Shannon entropy
    let entropy = 0;
    for (const byte in freq) {
      const p = freq[byte] / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  /**
   * Boyut anomali kontrolü
   */
  checkSizeAnomaly(buffer, file) {
    const actualSize = buffer.length;
    const declaredSize = file.size;

    if (declaredSize && Math.abs(actualSize - declaredSize) > 1024) {
      return {
        normal: false,
        reason: `Boyut uyuşmazlığı: ${actualSize} != ${declaredSize}`,
      };
    }

    // Sıfır boyut kontrolü
    if (actualSize === 0) {
      return {
        normal: false,
        reason: "Boş dosya",
      };
    }

    // Anormal büyük header (zip bomb potansiyeli)
    if (this.hasAbnormalCompression(buffer)) {
      return {
        normal: false,
        reason: "Anormal sıkıştırma oranı tespit edildi",
      };
    }

    return { normal: true };
  }

  /**
   * PDF analizi
   */
  analyzePDF(buffer) {
    const content = buffer.toString("utf8", 0, Math.min(buffer.length, 10000));
    const result = {
      safe: true,
      warnings: [],
      reason: null,
    };

    // JavaScript kontrolü
    if (/\/JavaScript|\/JS/i.test(content)) {
      result.safe = false;
      result.reason = "PDF içinde JavaScript tespit edildi";
      return result;
    }

    // Launch action kontrolü
    if (/\/Launch|\/OpenAction/i.test(content)) {
      result.warnings.push("PDF içinde Launch action tespit edildi");
    }

    // Embedded file kontrolü
    if (/\/EmbeddedFile/i.test(content)) {
      result.warnings.push("PDF içinde gömülü dosya tespit edildi");
    }

    // Form kontrolü
    if (/\/AcroForm/i.test(content)) {
      result.warnings.push("PDF içinde form alanları tespit edildi");
    }

    return result;
  }

  /**
   * Office dosya analizi
   */
  analyzeOfficeFile(buffer) {
    // ZIP signature kontrolü (Office dosyaları ZIP formatında)
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
      const content = buffer.toString("utf8", 0, Math.min(buffer.length, 5000));

      // Macro kontrolü
      if (/vbaProject|macros|VBProject/i.test(content)) {
        return {
          safe: false,
          reason: "Office dosyasında macro tespit edildi",
        };
      }

      // External reference kontrolü
      if (/externalLink|oleObject/i.test(content)) {
        return {
          safe: false,
          reason: "Office dosyasında harici referans tespit edildi",
        };
      }
    }

    return { safe: true };
  }

  // === Yardımcı metodlar ===

  async getFileBuffer(file) {
    if (file.buffer) return file.buffer;
    if (file.data) return file.data;

    const fs = require("fs").promises;
    if (file.path || file.filepath) {
      return await fs.readFile(file.path || file.filepath);
    }

    throw new Error("File buffer alınamadı");
  }

  calculateHash(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  isTextFile(buffer) {
    // İlk 1000 byte'ı kontrol et
    const sample = buffer.slice(0, Math.min(1000, buffer.length));
    let textChars = 0;
    let nonTextChars = 0;

    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      if (
        (byte >= 32 && byte <= 126) ||
        byte === 9 ||
        byte === 10 ||
        byte === 13
      ) {
        textChars++;
      } else if (byte === 0) {
        return false; // Binary dosya
      }
    }

    return true;
  }

  hasEmbeddedExecutable(text) {
    // Base64 encoded executable patterns
    const execPatterns = [
      "TVqQAAMAAAAEAAAA", // MZ header (DOS/PE executable)
      "UEsDBA", // ZIP header
      "0M8R4KGxGuE", // .class file
      "IyEvYmluL", // #!/bin/ shebang
    ];

    for (const pattern of execPatterns) {
      if (text.includes(pattern)) {
        return true;
      }
    }

    return false;
  }

  isOfficeFile(mimeType) {
    const officeMimes = [
      "application/msword",
      "application/vnd.ms-excel",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument",
    ];

    return officeMimes.some((mime) => mimeType.includes(mime));
  }

  hasAbnormalCompression(buffer) {
    // ZIP bomb detection basit kontrolü
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
      // ZIP dosyası - header'daki sıkıştırılmış/sıkıştırılmamış boyut oranını kontrol et
      // Bu basit bir örnektir, gerçek implementasyon daha karmaşık olmalı
      return false;
    }

    return false;
  }
}

module.exports = SecurityValidator;
