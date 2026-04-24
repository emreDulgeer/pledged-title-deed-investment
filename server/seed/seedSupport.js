const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const mime = require("mime-types");
const pdfParse = require("pdf-parse");
const sharp = require("sharp");
const mongoose = require("mongoose");
const LocalStorageProvider = require("../utils/providers/LocalStorageProvider");
const MinioStorageProvider = require("../utils/providers/MinioStorageProvider");
const FileMetadata = require("../models/FileMetadata");

const ENV_PATH = path.resolve(__dirname, "../.env");
require("dotenv").config({ path: ENV_PATH });

const PREVIEW_ROUTE = "/api/v1/files/preview";

function getMongoUri() {
  return (
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    "mongodb://localhost:27021/pledged_platform"
  );
}

function getStorageType() {
  return process.env.STORAGE_TYPE || "local";
}

function createStorageProvider() {
  if (getStorageType() === "minio") {
    return new MinioStorageProvider({
      endPoint: process.env.MINIO_ENDPOINT,
      port: process.env.MINIO_PORT,
      useSSL: process.env.MINIO_USE_SSL,
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
      bucket: process.env.MINIO_BUCKET,
      publicBaseUrl: process.env.MINIO_PUBLIC_URL,
    });
  }

  return new LocalStorageProvider({
    localPath: path.resolve(__dirname, "../../uploads"),
  });
}

async function connectToDatabase() {
  await mongoose.connect(getMongoUri());
  return mongoose.connection;
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

async function listMinioObjects(client, bucket) {
  return new Promise((resolve, reject) => {
    const objects = [];
    const stream = client.listObjectsV2(bucket, "", true);

    stream.on("data", (item) => {
      if (item?.name) {
        objects.push(item.name);
      }
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(objects));
  });
}

async function resetStorage() {
  const storageType = getStorageType();

  if (storageType !== "minio") {
    return {
      storageType,
      clearedObjects: 0,
      bucket: null,
    };
  }

  const provider = createStorageProvider();
  await provider.ensureBucket();

  const objectNames = await listMinioObjects(provider.client, provider.bucket);
  if (objectNames.length > 0) {
    await provider.client.removeObjects(provider.bucket, objectNames);
  }

  return {
    storageType,
    clearedObjects: objectNames.length,
    bucket: provider.bucket,
  };
}

async function resetDatabaseAndStorage({ clearStorage = true } = {}) {
  if (!mongoose.connection.db) {
    throw new Error("Database connection is not ready");
  }

  await mongoose.connection.db.dropDatabase();
  const storage = clearStorage
    ? await resetStorage()
    : { storageType: getStorageType(), clearedObjects: 0, bucket: null };

  return { storage };
}

function buildPreviewUrl(fileId) {
  return `${PREVIEW_ROUTE}/${fileId}`;
}

function buildInvestmentDownloadUrl(investmentId, fileId) {
  return `/api/v1/investments/${investmentId}/documents/${fileId}/download`;
}

function createObjectId() {
  return new mongoose.Types.ObjectId();
}

function addDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

function addMonths(baseDate, months) {
  const date = new Date(baseDate);
  date.setMonth(date.getMonth() + months);
  return date;
}

function startOfMonthOffset(baseDate, monthOffset) {
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() + monthOffset,
    1,
    12,
    0,
    0,
    0,
  );
}

function normalizeSupportLevel(level) {
  switch (level) {
    case "priority":
      return "priority";
    case "dedicated":
    case "vip":
      return "dedicated";
    default:
      return "basic";
  }
}

function buildMembershipFeatures(plan) {
  const serviceDiscounts = Object.values(
    plan.features?.services?.serviceDiscounts || {},
  ).filter((value) => Number.isFinite(value));

  return {
    maxActiveInvestments:
      plan.features?.investments?.maxActiveInvestments ?? 1,
    platformCommissionDiscount:
      plan.features?.commissions?.platformCommissionDiscount ?? 0,
    rentalCommissionDiscount:
      plan.features?.commissions?.rentalCommissionDiscount ?? 0,
    supportLevel: normalizeSupportLevel(plan.features?.support?.level),
    includedServices: plan.features?.services?.includedServices || [],
    serviceDiscountRate:
      serviceDiscounts.length > 0 ? Math.max(...serviceDiscounts) : 0,
    hasAnalyticsAccess: Boolean(
      plan.features?.analytics?.hasBasicAnalytics ||
        plan.features?.analytics?.hasAdvancedAnalytics,
    ),
    hasApiAccess: Boolean(plan.features?.api?.enabled),
    hasCustomReports: Boolean(plan.features?.analytics?.hasCustomReports),
    hasPriorityListings: Boolean(plan.features?.properties?.priorityListing),
  };
}

function toValidDate(value) {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.valueOf()) ? undefined : value;
  }

  const directDate = new Date(value);
  if (!Number.isNaN(directDate.valueOf())) {
    return directDate;
  }

  const match = String(value).match(/(\d{4})(\d{2})(\d{2})/);
  if (!match) {
    return undefined;
  }

  const [, year, month, day] = match;
  const fallbackDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    12,
    0,
    0,
    0,
  );

  return Number.isNaN(fallbackDate.valueOf()) ? undefined : fallbackDate;
}

async function extractMetadataFromBuffer(buffer, mimeType, customData = {}) {
  const metadata = { customData };

  if (String(mimeType).startsWith("image/")) {
    try {
      const image = await sharp(buffer).metadata();
      metadata.dimensions = {
        width: image.width,
        height: image.height,
      };
      metadata.format = image.format;
      metadata.colorSpace = image.space;
    } catch (error) {
      metadata.customData.imageMetadataError = error.message;
    }
  }

  if (mimeType === "application/pdf") {
    try {
      const pdf = await pdfParse(buffer);
      metadata.pages = pdf.numpages;
      metadata.author = pdf.info?.Author;
      metadata.title = pdf.info?.Title;
      metadata.subject = pdf.info?.Subject;
      metadata.creationDate = toValidDate(pdf.info?.CreationDate);
      metadata.modificationDate = toValidDate(pdf.info?.ModDate);
    } catch (error) {
      metadata.customData.pdfMetadataError = error.message;
    }
  }

  return metadata;
}

async function uploadSeedAsset({
  provider,
  sourcePath,
  seedKey,
  uploadedBy,
  relatedModel = null,
  relatedId = null,
  documentType = "other",
  directory,
  originalName,
  isPublic = false,
  description,
  notes,
  tags = [],
  customData = {},
  virusScanStatus = "clean",
}) {
  const buffer = await fs.readFile(sourcePath);
  const resolvedOriginalName = originalName || path.basename(sourcePath);
  const mimeType =
    mime.lookup(resolvedOriginalName) ||
    mime.lookup(sourcePath) ||
    "application/octet-stream";
  const hash = crypto
    .createHash("sha256")
    .update(String(seedKey))
    .update(buffer)
    .digest("hex");

  const file = {
    buffer,
    size: buffer.length,
    originalname: resolvedOriginalName,
    mimetype: mimeType,
    name: resolvedOriginalName,
  };

  const uploadMetadata = {
    hash,
    mimeType,
    relatedModel,
    relatedId,
    directory,
  };

  const uploadResult = await provider.upload(file, uploadMetadata);
  const extractedMetadata = await extractMetadataFromBuffer(
    buffer,
    mimeType,
    customData,
  );

  return FileMetadata.create({
    filename: uploadResult.filename,
    originalName: resolvedOriginalName,
    mimeType,
    size: buffer.length,
    directory: uploadResult.directory || directory,
    url: uploadResult.url,
    path: uploadResult.path,
    storageType: getStorageType() === "minio" ? "minio" : "local",
    bucket: uploadResult.bucket,
    hash,
    uploadedBy,
    relatedModel,
    relatedId,
    documentType,
    isPublic,
    virusScanStatus,
    securityScore: 100,
    metadata: extractedMetadata,
    description,
    notes,
    tags,
    activities: [
      {
        action: "upload",
        performedBy: uploadedBy,
        details: {
          seedKey,
          sourcePath,
        },
      },
    ],
  });
}

module.exports = {
  ENV_PATH,
  addDays,
  addMonths,
  buildInvestmentDownloadUrl,
  buildMembershipFeatures,
  buildPreviewUrl,
  connectToDatabase,
  createObjectId,
  createStorageProvider,
  disconnectDatabase,
  getMongoUri,
  getStorageType,
  resetDatabaseAndStorage,
  startOfMonthOffset,
  uploadSeedAsset,
};
