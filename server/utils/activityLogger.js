// server/utils/activityLogger.js

const ActivityLog = require("../models/ActivityLog");

/**
 * Log user activity
 */
const logActivity = async ({
  user,
  action,
  details = {},
  ip = null,
  userAgent = null,
  severity = "low",
  isAdminAction = false,
  performedBy = null,
}) => {
  try {
    const activityLog = new ActivityLog({
      user,
      action,
      details,
      ip,
      userAgent,
      severity,
      isAdminAction,
      performedBy: performedBy || user,
    });

    await activityLog.save();
    return activityLog;
  } catch (error) {
    console.error("Activity logging error:", error);
    // Activity log hataları uygulamayı durdurmamalı
    return null;
  }
};

/**
 * Log multiple activities
 */
const logBulkActivities = async (activities) => {
  try {
    return await ActivityLog.insertMany(activities);
  } catch (error) {
    console.error("Bulk activity logging error:", error);
    return [];
  }
};

/**
 * Get user activities
 */
const getUserActivities = async (userId, options = {}) => {
  const {
    limit = 50,
    skip = 0,
    startDate,
    endDate,
    action,
    severity,
  } = options;

  const query = { user: userId };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  if (action) {
    query.action = action;
  }

  if (severity) {
    query.severity = severity;
  }

  return await ActivityLog.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

/**
 * Get suspicious activities
 */
const getSuspiciousActivities = async (options = {}) => {
  const {
    limit = 100,
    skip = 0,
    startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // Son 24 saat
  } = options;

  return await ActivityLog.find({
    severity: { $in: ["high", "critical"] },
    createdAt: { $gte: startDate },
  })
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Clean old activity logs
 */
const cleanOldActivities = async (daysToKeep = 730) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await ActivityLog.deleteMany({
    createdAt: { $lt: cutoffDate },
    severity: { $in: ["low", "medium"] }, // Yüksek önemli logları sakla
  });

  return result.deletedCount;
};

module.exports = {
  logActivity,
  logBulkActivities,
  getUserActivities,
  getSuspiciousActivities,
  cleanOldActivities,
};
