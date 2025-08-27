// server/models/FileMetadata.js

const mongoose = require("mongoose");

const FileMetadataSchema = new mongoose.Schema(
  {
    // Temel dosya bilgileri
    filename: {
      type: String,
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      index: true,
    },
    size: {
      type: Number,
      required: true,
    },

    // Depolama bilgileri
    directory: {
      type: String,
      default: "general",
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    path: String,
    storageType: {
      type: String,
      enum: ["local", "s3", "gcs", "minio"],
      default: "local",
    },
    bucket: String, // Cloud storage için

    // Güvenlik
    hash: {
      type: String,
      required: true,
      index: true,
    },
    virusScanStatus: {
      type: String,
      enum: ["pending", "clean", "infected", "error"],
      default: "pending",
    },
    virusScanDate: Date,
    virusName: String,
    securityScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    // İlişkiler
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    relatedModel: {
      type: String,
      enum: ["Property", "Investment", "User", "Notification", null],
      index: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    documentType: {
      type: String,
      enum: [
        "title_deed",
        "annotation",
        "contract",
        "payment_receipt",
        "kyc_document",
        "profile_photo",
        "property_image",
        "other",
        "rental_receipt",
      ],
    },

    // Erişim kontrolü
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    sharedWith: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    accessCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: Date,
    lastAccessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Versiyonlama
    version: {
      type: Number,
      default: 1,
    },
    previousVersions: [
      {
        filename: String,
        url: String,
        size: Number,
        hash: String,
        uploadedAt: Date,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    // Metadata
    metadata: {
      // Image metadata
      dimensions: {
        width: Number,
        height: Number,
      },
      format: String,
      colorSpace: String,

      // PDF metadata
      pages: Number,
      author: String,
      title: String,
      subject: String,
      keywords: [String],
      creationDate: Date,
      modificationDate: Date,

      // Video metadata
      duration: Number,
      codec: String,
      bitrate: Number,
      frameRate: Number,

      // Genel
      exifData: mongoose.Schema.Types.Mixed,
      customData: mongoose.Schema.Types.Mixed,
    },

    // Thumbnail
    thumbnail: {
      filename: String,
      url: String,
      size: Number,
    },

    // Etiketler
    tags: [
      {
        type: String,
        index: true,
      },
    ],

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // İşlem logları
    activities: [
      {
        action: {
          type: String,
          enum: [
            "upload",
            "download",
            "preview",
            "share",
            "update",
            "delete",
            "restore",
          ],
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        performedAt: {
          type: Date,
          default: Date.now,
        },
        ip: String,
        userAgent: String,
        details: mongoose.Schema.Types.Mixed,
      },
    ],

    // Süre kontrolü
    expiresAt: {
      type: Date,
      index: true,
    },

    // Açıklamalar
    description: String,
    notes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
FileMetadataSchema.index({ uploadedBy: 1, createdAt: -1 });
FileMetadataSchema.index({ relatedModel: 1, relatedId: 1 });
FileMetadataSchema.index({ hash: 1 });
FileMetadataSchema.index({ tags: 1 });
FileMetadataSchema.index({ isDeleted: 1, isPublic: 1 });
FileMetadataSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual: İnsan okunabilir boyut
FileMetadataSchema.virtual("sizeFormatted").get(function () {
  const bytes = this.size;
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
});

// Virtual: Dosya uzantısı
FileMetadataSchema.virtual("extension").get(function () {
  const path = require("path");
  return path.extname(this.originalName).toLowerCase().slice(1);
});

// Methods

/**
 * Dosyaya erişimi logla
 */
FileMetadataSchema.methods.logAccess = async function (
  user,
  action = "download"
) {
  this.accessCount += 1;
  this.lastAccessedAt = new Date();
  this.lastAccessedBy = user._id;

  this.activities.push({
    action: action,
    performedBy: user._id,
    performedAt: new Date(),
    ip: user.lastLoginIP,
  });

  // Maksimum 100 aktivite tut
  if (this.activities.length > 100) {
    this.activities = this.activities.slice(-100);
  }

  await this.save();
};

/**
 * Dosyayı paylaş
 */
FileMetadataSchema.methods.shareWith = async function (userId, sharedBy) {
  if (!this.sharedWith.includes(userId)) {
    this.sharedWith.push(userId);

    this.activities.push({
      action: "share",
      performedBy: sharedBy._id,
      performedAt: new Date(),
      details: { sharedWith: userId },
    });

    await this.save();
  }
};

/**
 * Paylaşımı kaldır
 */
FileMetadataSchema.methods.unshareWith = async function (userId, unsharedBy) {
  const index = this.sharedWith.indexOf(userId);
  if (index > -1) {
    this.sharedWith.splice(index, 1);

    this.activities.push({
      action: "unshare",
      performedBy: unsharedBy._id,
      performedAt: new Date(),
      details: { unsharedWith: userId },
    });

    await this.save();
  }
};

/**
 * Soft delete
 */
FileMetadataSchema.methods.softDelete = async function (deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy._id;

  this.activities.push({
    action: "delete",
    performedBy: deletedBy._id,
    performedAt: new Date(),
  });

  await this.save();
};

/**
 * Restore
 */
FileMetadataSchema.methods.restore = async function (restoredBy) {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;

  this.activities.push({
    action: "restore",
    performedBy: restoredBy._id,
    performedAt: new Date(),
  });

  await this.save();
};

// Statics

/**
 * Kullanıcının dosyalarını bul
 */
FileMetadataSchema.statics.findByUser = function (userId, options = {}) {
  const query = {
    uploadedBy: userId,
    isDeleted: false,
  };

  if (options.directory) {
    query.directory = options.directory;
  }

  if (options.mimeType) {
    query.mimeType = new RegExp(options.mimeType, "i");
  }

  return this.find(query).sort({ createdAt: -1 });
};

/**
 * İlişkili dosyaları bul
 */
FileMetadataSchema.statics.findRelated = function (model, id) {
  return this.find({
    relatedModel: model,
    relatedId: id,
    isDeleted: false,
  }).sort({ createdAt: -1 });
};

/**
 * Hash ile dosya bul
 */
FileMetadataSchema.statics.findByHash = function (hash) {
  return this.findOne({ hash: hash, isDeleted: false });
};

/**
 * Kullanıcı disk kullanımı
 */
FileMetadataSchema.statics.getUserDiskUsage = async function (userId) {
  const result = await this.aggregate([
    { $match: { uploadedBy: userId, isDeleted: false } },
    {
      $group: {
        _id: null,
        totalSize: { $sum: "$size" },
        fileCount: { $sum: 1 },
      },
    },
  ]);

  return result[0] || { totalSize: 0, fileCount: 0 };
};

/**
 * Temizlik - eski dosyaları sil
 */
FileMetadataSchema.statics.cleanupOldFiles = async function (daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return await this.updateMany(
    {
      isDeleted: true,
      deletedAt: { $lt: cutoffDate },
    },
    {
      $set: {
        isDeleted: true,
        permanentlyDeleted: true,
        permanentlyDeletedAt: new Date(),
      },
    }
  );
};

// Middleware

// Yeni dosya eklendiğinde ilgili modeli güncelle
FileMetadataSchema.post("save", async function (doc) {
  if (doc.relatedModel === "Property") return;

  if (!doc.relatedModel || !doc.relatedId || doc.isDeleted) return;

  try {
    const Model = mongoose.model(doc.relatedModel);
    const relatedDoc = await Model.findById(doc.relatedId);
    if (!relatedDoc) return;

    // Buraya Property DIŞINDA bir şey yapmak istersen ekle.
    // Şu an için boş bırakabilirsin.
  } catch (error) {
    console.error("Related model update error:", error);
  }
});

module.exports = mongoose.model("FileMetadata", FileMetadataSchema);
