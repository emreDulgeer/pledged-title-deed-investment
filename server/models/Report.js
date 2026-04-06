// server/models/Report.js

const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
  {
    // Kim rapor etti
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Kim rapor edildi
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Rapor kategorisi
    category: {
      type: String,
      enum: [
        "spam",
        "harassment",
        "fraud",
        "inappropriate_content",
        "fake_listing",
        "scam",
        "impersonation",
        "other",
      ],
      required: true,
    },

    // Rapor açıklaması
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },

    // Rapor durumu
    status: {
      type: String,
      enum: [
        "pending",
        "under_review",
        "resolved",
        "dismissed",
        "action_taken",
      ],
      default: "pending",
      index: true,
    },

    // Öncelik
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },

    // İlgili içerik (opsiyonel)
    relatedContent: {
      type: {
        type: String,
        enum: ["property", "investment", "message", "profile", "other"],
      },
      id: mongoose.Schema.Types.ObjectId,
      url: String,
    },

    // Kanıt dosyaları
    evidence: [
      {
        fileId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FileMetadata",
        },
        url: String,
        description: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Admin yanıtı
    adminResponse: {
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reviewedAt: Date,
      decision: String,
      internalNotes: String,
      actionTaken: {
        type: String,
        enum: [
          "warning_sent",
          "user_banned",
          "content_removed",
          "no_action",
          "other",
        ],
      },
      banId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ban",
      },
    },

    // Reporter'a gönderilen yanıt
    reporterFeedback: {
      message: String,
      sentAt: Date,
    },

    // Otomatik işaretleme
    autoFlagged: {
      type: Boolean,
      default: false,
    },
    autoFlagReason: String,

    // Spam kontrolü
    isSpam: {
      type: Boolean,
      default: false,
    },

    // Duplicate report kontrolü
    isDuplicate: {
      type: Boolean,
      default: false,
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ReportSchema.index({ reporter: 1, reportedUser: 1 });
ReportSchema.index({ status: 1, priority: -1, createdAt: -1 });
ReportSchema.index({ reportedUser: 1, status: 1 });
ReportSchema.index({ "adminResponse.reviewedBy": 1 });

// Virtual: Rapor yaşı (gün olarak)
ReportSchema.virtual("ageInDays").get(function () {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Static: Kullanıcı hakkındaki aktif raporları getir
ReportSchema.statics.findActiveReportsForUser = async function (userId) {
  return await this.find({
    reportedUser: userId,
    status: { $in: ["pending", "under_review"] },
  })
    .populate("reporter", "fullName email role")
    .sort({ createdAt: -1 });
};

// Static: Duplicate rapor kontrolü
ReportSchema.statics.checkDuplicate = async function (
  reporterId,
  reportedUserId,
  hoursWindow = 24
) {
  const timeAgo = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);

  return await this.findOne({
    reporter: reporterId,
    reportedUser: reportedUserId,
    createdAt: { $gte: timeAgo },
  });
};

// Static: Spam kontrolü
ReportSchema.statics.checkSpamReporting = async function (
  reporterId,
  hoursWindow = 24,
  maxReports = 10
) {
  const timeAgo = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);

  const count = await this.countDocuments({
    reporter: reporterId,
    createdAt: { $gte: timeAgo },
  });

  return count >= maxReports;
};

module.exports = mongoose.model("Report", ReportSchema);
