// server/utils/providers/LocalStorageProvider.js

const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");

class LocalStorageProvider {
  constructor(config) {
    this.config = config;
    this.uploadDir = config.localPath || "./uploads";
    this.tempDir = path.join(this.uploadDir, "temp");
    this.initializeDirectories();
  }

  /**
   * Dizinleri oluştur
   */
  async initializeDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, "quarantine"), {
        recursive: true,
      });

      // Alt dizinler
      const subdirs = [
        "images",
        "documents",
        "properties",
        "profiles",
        "general",
      ];
      for (const dir of subdirs) {
        await fs.mkdir(path.join(this.uploadDir, dir), { recursive: true });
      }
    } catch (error) {
      console.error("Directory initialization error:", error);
    }
  }

  /**
   * Dosyayı yükle
   */
  async upload(file, metadata) {
    try {
      // Dizin belirle
      const directory = this.determineDirectory(file, metadata);
      const targetDir = path.join(this.uploadDir, directory);
      await fs.mkdir(targetDir, { recursive: true });

      // Benzersiz dosya adı oluştur
      const uniqueFilename = this.generateUniqueFilename(
        file.originalname || file.name,
        metadata.hash
      );

      const targetPath = path.join(targetDir, uniqueFilename);

      // Buffer'ı dosyaya yaz
      const buffer = file.buffer || file.data;
      await fs.writeFile(targetPath, buffer);

      // Dosya bilgilerini döndür
      return {
        success: true,
        id: metadata.hash || this.generateId(),
        filename: uniqueFilename,
        originalname: file.originalname || file.name,
        path: targetPath,
        url: `/uploads/${directory}/${uniqueFilename}`,
        size: buffer.length,
        directory: directory,
        uploadedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Dosyayı indir
   */
  async download(filename, directory = "general") {
    try {
      const filePath = path.join(this.uploadDir, directory, filename);

      // Dosya varlığını kontrol et
      await fs.access(filePath);

      // Dosyayı oku
      const buffer = await fs.readFile(filePath);

      return {
        buffer: buffer,
        path: filePath,
        filename: filename,
        directory: directory,
      };
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error("Dosya bulunamadı");
      }
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  /**
   * Dosyayı sil
   */
  async delete(filename, directory = "general", options = {}) {
    const hard = options?.hard === true;
    try {
      const filePath = path.join(this.uploadDir, directory, filename);

      // Dosya varlığını kontrol et
      await fs.access(filePath);

      if (hard) {
        // Kalıcı sil
        await fs.unlink(filePath);
        return { success: true, message: "Dosya kalıcı olarak silindi" };
      } else {
        // Soft delete - trash klasörüne taşı
        const trashDir = path.join(this.uploadDir, ".trash", directory);
        await fs.mkdir(trashDir, { recursive: true });
        const timestamp = Date.now();
        const trashPath = path.join(trashDir, `${timestamp}_${filename}`);
        await fs.rename(filePath, trashPath);
        const metadataPath = path.join(
          trashDir,
          `${timestamp}_${filename}.meta.json`
        );
        await fs.writeFile(
          metadataPath,
          JSON.stringify(
            {
              originalPath: filePath,
              deletedAt: new Date(),
              filename,
              directory,
            },
            null,
            2
          )
        );
        return {
          success: true,
          message: "Dosya başarıyla silindi",
          trashedAt: trashPath,
        };
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error("Dosya bulunamadı");
      }
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Dosyaları listele
   */
  async list(directory = "general", options = {}) {
    try {
      const dirPath = path.join(this.uploadDir, directory);
      const files = await fs.readdir(dirPath);

      const fileList = [];

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          fileList.push({
            filename: file,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            directory: directory,
            url: `/uploads/${directory}/${file}`,
          });
        }
      }

      // Sıralama
      if (options.sortBy) {
        fileList.sort((a, b) => {
          switch (options.sortBy) {
            case "size":
              return options.sortOrder === "desc"
                ? b.size - a.size
                : a.size - b.size;
            case "date":
              return options.sortOrder === "desc"
                ? b.createdAt - a.createdAt
                : a.createdAt - b.createdAt;
            case "name":
              return options.sortOrder === "desc"
                ? b.filename.localeCompare(a.filename)
                : a.filename.localeCompare(b.filename);
            default:
              return 0;
          }
        });
      }

      // Pagination
      const page = options.page || 1;
      const limit = options.limit || 20;
      const start = (page - 1) * limit;
      const end = start + limit;

      return {
        files: fileList.slice(start, end),
        total: fileList.length,
        page: page,
        limit: limit,
        totalPages: Math.ceil(fileList.length / limit),
      };
    } catch (error) {
      if (error.code === "ENOENT") {
        return { files: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      }
      throw new Error(`List failed: ${error.message}`);
    }
  }

  /**
   * Dosya var mı kontrol et
   */
  async exists(filename, directory = "general") {
    try {
      const filePath = path.join(this.uploadDir, directory, filename);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Dosya bilgilerini al
   */
  async getInfo(filename, directory = "general") {
    try {
      const filePath = path.join(this.uploadDir, directory, filename);
      const stats = await fs.stat(filePath);

      return {
        filename: filename,
        directory: directory,
        path: filePath,
        url: `/uploads/${directory}/${filename}`,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error("Dosya bulunamadı");
      }
      throw new Error(`Get info failed: ${error.message}`);
    }
  }

  /**
   * Dosyayı taşı
   */
  async move(filename, fromDir, toDir) {
    try {
      const sourcePath = path.join(this.uploadDir, fromDir, filename);
      const targetDir = path.join(this.uploadDir, toDir);
      const targetPath = path.join(targetDir, filename);

      // Hedef dizini oluştur
      await fs.mkdir(targetDir, { recursive: true });

      // Dosyayı taşı
      await fs.rename(sourcePath, targetPath);

      return {
        success: true,
        newPath: targetPath,
        newUrl: `/uploads/${toDir}/${filename}`,
      };
    } catch (error) {
      throw new Error(`Move failed: ${error.message}`);
    }
  }

  /**
   * Dosyayı kopyala
   */
  async copy(filename, fromDir, toDir, newFilename = null) {
    try {
      const sourcePath = path.join(this.uploadDir, fromDir, filename);
      const targetDir = path.join(this.uploadDir, toDir);
      const targetFilename = newFilename || this.generateCopyFilename(filename);
      const targetPath = path.join(targetDir, targetFilename);

      // Hedef dizini oluştur
      await fs.mkdir(targetDir, { recursive: true });

      // Dosyayı kopyala
      await fs.copyFile(sourcePath, targetPath);

      return {
        success: true,
        newFilename: targetFilename,
        newPath: targetPath,
        newUrl: `/uploads/${toDir}/${targetFilename}`,
      };
    } catch (error) {
      throw new Error(`Copy failed: ${error.message}`);
    }
  }

  /**
   * Dizin belirle
   */
  determineDirectory(file, metadata) {
    // Metadata'dan dizin bilgisi
    if (metadata.directory) {
      return metadata.directory;
    }

    // MIME type'a göre
    const mimeType = file.mimetype || file.type || "";

    if (mimeType.startsWith("image/")) {
      return "images";
    }

    if (
      mimeType === "application/pdf" ||
      mimeType.includes("document") ||
      mimeType.includes("msword") ||
      mimeType.includes("spreadsheet")
    ) {
      return "documents";
    }

    // Model tipine göre
    if (metadata.relatedModel === "Property") {
      return "properties";
    }

    if (metadata.relatedModel === "User") {
      return "profiles";
    }

    return "general";
  }

  /**
   * Benzersiz dosya adı oluştur
   */
  generateUniqueFilename(originalName, hash = null) {
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(originalName);
    const basename = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .substring(0, 50);

    if (hash) {
      return `${basename}_${hash.substring(0, 8)}_${timestamp}${ext}`;
    }

    return `${basename}_${randomStr}_${timestamp}${ext}`;
  }

  /**
   * Kopya dosya adı oluştur
   */
  generateCopyFilename(filename) {
    const timestamp = Date.now();
    const ext = path.extname(filename);
    const basename = path.basename(filename, ext);

    return `${basename}_copy_${timestamp}${ext}`;
  }

  /**
   * ID oluştur
   */
  generateId() {
    return crypto.randomBytes(16).toString("hex");
  }

  /**
   * Depolama istatistikleri
   */
  async getStats() {
    try {
      const stats = {
        totalSize: 0,
        fileCount: 0,
        directories: {},
      };

      const dirs = await fs.readdir(this.uploadDir);

      for (const dir of dirs) {
        if (dir.startsWith(".")) continue; // Hidden folders

        const dirPath = path.join(this.uploadDir, dir);
        const dirStat = await fs.stat(dirPath);

        if (dirStat.isDirectory()) {
          const files = await fs.readdir(dirPath);
          let dirSize = 0;
          let fileCount = 0;

          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const fileStat = await fs.stat(filePath);

            if (fileStat.isFile()) {
              dirSize += fileStat.size;
              fileCount++;
            }
          }

          stats.directories[dir] = {
            size: dirSize,
            fileCount: fileCount,
          };

          stats.totalSize += dirSize;
          stats.fileCount += fileCount;
        }
      }

      return stats;
    } catch (error) {
      throw new Error(`Get stats failed: ${error.message}`);
    }
  }

  /**
   * Temizlik işlemi - eski geçici dosyaları sil
   */
  async cleanup(olderThanHours = 24) {
    try {
      const tempFiles = await fs.readdir(this.tempDir);
      const now = Date.now();
      const maxAge = olderThanHours * 60 * 60 * 1000;

      let cleanedCount = 0;

      for (const file of tempFiles) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }

      // Trash temizliği (30 gün)
      const trashDir = path.join(this.uploadDir, ".trash");
      try {
        await this.cleanupTrash(trashDir, 30 * 24);
      } catch (error) {
        console.error("Trash cleanup error:", error);
      }

      return {
        success: true,
        cleanedFiles: cleanedCount,
      };
    } catch (error) {
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }

  /**
   * Trash temizliği
   */
  async cleanupTrash(trashDir, olderThanHours = 720) {
    const dirs = await fs.readdir(trashDir);
    const now = Date.now();
    const maxAge = olderThanHours * 60 * 60 * 1000;

    for (const dir of dirs) {
      const dirPath = path.join(trashDir, dir);
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
        }
      }
    }
  }
}

module.exports = LocalStorageProvider;
