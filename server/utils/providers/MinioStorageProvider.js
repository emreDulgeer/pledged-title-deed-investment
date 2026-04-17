const { Client } = require("minio");
const path = require("path");
const crypto = require("crypto");
const { resolveStorageDirectory } = require("../fileStoragePath");

class MinioStorageProvider {
  constructor(config = {}) {
    this.config = config;
    this.bucket = config.bucket || process.env.MINIO_BUCKET || "uploads";
    this.publicBaseUrl =
      config.publicBaseUrl ||
      process.env.MINIO_PUBLIC_URL ||
      process.env.MINIO_ENDPOINT ||
      "http://localhost:9000";

    this.client = new Client({
      endPoint: config.endPoint || process.env.MINIO_ENDPOINT || "localhost",
      port: Number(config.port || process.env.MINIO_PORT || 9000),
      useSSL:
        String(config.useSSL || process.env.MINIO_USE_SSL || "false") ===
        "true",
      accessKey: config.accessKey || process.env.MINIO_ACCESS_KEY,
      secretKey: config.secretKey || process.env.MINIO_SECRET_KEY,
    });
  }

  async ensureBucket() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket, "us-east-1");
    }
  }

  async upload(file, metadata) {
    await this.ensureBucket();

    const directory = this.determineDirectory(file, metadata);
    const uniqueFilename = this.generateUniqueFilename(
      file.originalname || file.name,
      metadata.hash,
    );
    const objectName = `${directory}/${uniqueFilename}`;
    const buffer = file.buffer || file.data;

    await this.client.putObject(this.bucket, objectName, buffer, buffer.length, {
      "Content-Type": metadata.mimeType,
    });

    return {
      success: true,
      id: metadata.hash || this.generateId(),
      filename: uniqueFilename,
      originalName: file.originalname || file.name,
      originalname: file.originalname || file.name,
      path: objectName,
      url: `${this.publicBaseUrl.replace(/\/$/, "")}/${this.bucket}/${objectName}`,
      size: buffer.length,
      directory,
      bucket: this.bucket,
      uploadedAt: new Date(),
    };
  }

  async download(filename, directory = "general") {
    const objectName = this.resolveObjectName(filename, directory);
    const stream = await this.client.getObject(this.bucket, objectName);
    const chunks = [];

    await new Promise((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    return {
      buffer: Buffer.concat(chunks),
      path: objectName,
      filename,
      directory,
    };
  }

  async delete(filename, directory = "general") {
    const objectName = this.resolveObjectName(filename, directory);
    await this.client.removeObject(this.bucket, objectName);
    return { success: true };
  }

  async exists(filename, directory = "general") {
    try {
      await this.client.statObject(
        this.bucket,
        this.resolveObjectName(filename, directory),
      );
      return true;
    } catch {
      return false;
    }
  }

  resolveObjectName(filename, directory = "general") {
    if (!filename) {
      return directory || "general";
    }

    if (filename.includes("/") && !directory) {
      return filename.replace(/^\/+/, "");
    }

    if (filename.includes("/") && filename.startsWith(`${directory}/`)) {
      return filename.replace(/^\/+/, "");
    }

    return `${directory}/${filename}`.replace(/^\/+/, "");
  }

  determineDirectory(file, metadata) {
    return resolveStorageDirectory({
      directory: metadata?.directory,
      relatedModel: metadata?.relatedModel,
      relatedId: metadata?.relatedId,
      mimeType: metadata?.mimeType || file.mimetype || file.type,
    });
  }

  generateUniqueFilename(originalName, hash = "") {
    const ext = path.extname(originalName || "");
    const base = hash || crypto.randomBytes(12).toString("hex");
    return `${base}${ext}`;
  }

  generateId() {
    return crypto.randomBytes(16).toString("hex");
  }
}

module.exports = MinioStorageProvider;
