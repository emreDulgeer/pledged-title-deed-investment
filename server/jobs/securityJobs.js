// server/jobs/securityJobs.js

const cron = require("node-cron");
const User = require("../models/User");
const Token = require("../models/Token");
const AccountDeletionRequest = require("../models/AccountDeletionRequest");
const ActivityLog = require("../models/ActivityLog");
const authService = require("../services/authService");

class SecurityJobs {
  /**
   * Initialize all security-related cron jobs
   */
  init() {
    this.cleanupExpiredTokens();
    this.processAccountDeletions();
    this.checkSuspiciousActivities();
    this.expireMemberships();
    this.sendSecurityReports();
  }

  /**
   * Clean expired tokens every hour
   */
  cleanupExpiredTokens() {
    cron.schedule("0 * * * *", async () => {
      try {
        console.log("Cleaning expired tokens...");
        await authService.cleanExpiredTokens();
        console.log("Expired tokens cleaned");
      } catch (error) {
        console.error("Error cleaning expired tokens:", error);
      }
    });
  }

  /**
   * Process scheduled account deletions daily
   */
  processAccountDeletions() {
    cron.schedule("0 0 * * *", async () => {
      try {
        console.log("Processing scheduled account deletions...");

        const deletionsToProcess = await AccountDeletionRequest.find({
          status: "approved",
          scheduledDeletionDate: { $lte: new Date() },
        }).populate("user");

        for (const request of deletionsToProcess) {
          // Soft delete the user
          const user = request.user;
          user.accountStatus = "deleted";
          user.email = `deleted_${user._id}@deleted.com`;
          user.password = crypto.randomBytes(32).toString("hex");
          user.personalData = {};
          await user.save();

          // Update deletion request
          request.status = "completed";
          request.completedAt = new Date();
          await request.save();

          // Log the deletion
          await ActivityLog.create({
            user: user._id,
            action: "account_deleted",
            details: {
              reason: request.reason,
              requestId: request._id,
            },
            severity: "high",
          });

          console.log(`Account ${user._id} deleted`);
        }

        console.log(`Processed ${deletionsToProcess.length} account deletions`);
      } catch (error) {
        console.error("Error processing account deletions:", error);
      }
    });
  }

  /**
   * Check for suspicious activities every 30 minutes
   */
  checkSuspiciousActivities() {
    cron.schedule("*/30 * * * *", async () => {
      try {
        console.log("Checking for suspicious activities...");

        // Check for multiple failed login attempts
        const recentLogs = await ActivityLog.find({
          action: "suspicious_login_attempt",
          createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
        }).distinct("ip");

        // Block IPs with too many suspicious attempts
        for (const ip of recentLogs) {
          const count = await ActivityLog.countDocuments({
            ip,
            action: "suspicious_login_attempt",
            createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
          });

          if (count > 10) {
            // Add to IP blacklist (implement IP blocking mechanism)
            console.log(`Suspicious IP detected: ${ip} with ${count} attempts`);
          }
        }

        console.log("Suspicious activity check completed");
      } catch (error) {
        console.error("Error checking suspicious activities:", error);
      }
    });
  }

  /**
   * Check and expire memberships daily
   */
  expireMemberships() {
    cron.schedule("0 1 * * *", async () => {
      try {
        console.log("Checking membership expirations...");

        const expiredMemberships = await User.find({
          membershipStatus: "active",
          membershipExpiresAt: { $lte: new Date() },
        });

        for (const user of expiredMemberships) {
          user.membershipStatus = "expired";
          user.membershipPlan = "Basic";
          await user.save();

          // Send expiration notification
          const notificationService = require("../services/notificationService");
          await notificationService.createNotification({
            recipient: user._id,
            type: "membership_expired",
            title: "Üyeliğiniz Sona Erdi",
            message:
              "Premium üyeliğinizin süresi doldu. Yenileme için ödeme sayfasını ziyaret edin.",
            priority: "high",
          });
        }

        console.log(`Expired ${expiredMemberships.length} memberships`);
      } catch (error) {
        console.error("Error expiring memberships:", error);
      }
    });
  }

  /**
   * Send security reports to admins weekly
   */
  sendSecurityReports() {
    cron.schedule("0 9 * * 1", async () => {
      try {
        console.log("Generating security report...");

        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Gather statistics
        const stats = {
          totalLogins: await ActivityLog.countDocuments({
            action: "user_login",
            createdAt: { $gte: weekAgo },
          }),
          failedLogins: await ActivityLog.countDocuments({
            action: "suspicious_login_attempt",
            createdAt: { $gte: weekAgo },
          }),
          newRegistrations: await ActivityLog.countDocuments({
            action: "user_registration",
            createdAt: { $gte: weekAgo },
          }),
          securityAlerts: await ActivityLog.countDocuments({
            severity: { $in: ["high", "critical"] },
            createdAt: { $gte: weekAgo },
          }),
        };

        // Send report to admins
        const admins = await User.find({ role: "admin" });
        const emailService = require("../services/emailService");

        for (const admin of admins) {
          await emailService.sendSecurityReport(admin.email, stats);
        }

        console.log("Security report sent to admins");
      } catch (error) {
        console.error("Error sending security report:", error);
      }
    });
  }
}

module.exports = new SecurityJobs();
