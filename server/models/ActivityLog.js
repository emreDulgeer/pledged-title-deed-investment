const mongoose = require("mongoose");

const ActivityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        // Auth actions
        "user_registration",
        "user_login",
        "user_logout",
        "password_changed",
        "password_reset_requested",
        "password_reset_completed",
        "email_verified",
        "phone_verified",
        "2fa_enabled",
        "2fa_disabled",
        "2fa_method_changed",
        "account_locked",
        "account_unlocked",
        "account_deletion_requested",
        "account_deletion_cancelled",
        "account_deleted",
        "membership_activated",
        "membership_upgraded",
        "membership_downgraded",
        "membership_cancelled",
        "revoke_all_sessions",
        "sessions_invalidated",

        // Security actions
        "suspicious_login_attempt",
        "concurrent_sessions_detected",
        "ip_address_changed",
        "unusual_activity_detected",
        "2fa_error",

        // Property actions
        "property_created",
        "property_updated",
        "property_deleted",
        "property_approved",
        "property_rejected",
        "property_featured",

        // Investment actions
        "investment_offer_sent",
        "investment_offer_accepted",
        "investment_offer_rejected",
        "contract_signed",
        "title_deed_registered",
        "rent_payment_made",
        "rent_payment_received",
        "investment_refunded",
        "property_transferred",

        // Admin actions
        "admin_action_performed",
        "user_role_changed",
        "user_suspended",
        "user_unsuspended",
        "system_settings_changed",

        // KYC actions
        "kyc_documents_uploaded",
        "kyc_approved",
        "kyc_rejected",
        "kyc_verification_requested",
      ],
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: String,
    userAgent: String,
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },
    isAdminAction: {
      type: Boolean,
      default: false,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
ActivityLogSchema.index({ user: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });
ActivityLogSchema.index({ severity: 1, createdAt: -1 });
ActivityLogSchema.index({ ip: 1 });

// TTL index - keep logs for 2 years
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);
