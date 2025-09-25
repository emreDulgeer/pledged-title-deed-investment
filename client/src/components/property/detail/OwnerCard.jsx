import React from "react";
import { User } from "lucide-react";

const OwnerCard = ({ owner = {}, t }) => (
  <div className="bg-day-surface dark:bg-night-surface rounded-lg shadow-lg p-6">
    <h3 className="text-lg font-semibold text-day-text dark:text-night-text mb-4">
      {t("properties.owner_info")}
    </h3>

    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center
                        bg-day-background dark:bg-night-dashboard"
        >
          <User className="w-6 h-6 text-day-text/80 dark:text-night-text/80" />
        </div>
        <div>
          <p className="font-semibold text-day-text dark:text-night-text">
            {owner.fullName}
          </p>
          <p className="text-sm text-day-text/70 dark:text-night-text/70">
            {owner.email}
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-day-border dark:border-night-border space-y-3">
        <div className="flex justify-between">
          <span className="text-day-text/70 dark:text-night-text/70">
            {t("common.phone")}
          </span>
          <span className="text-day-text dark:text-night-text">
            {owner.phone}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-day-text/70 dark:text-night-text/70">
            {t("common.country")}
          </span>
          <span className="text-day-text dark:text-night-text">
            {owner.country}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-day-text/70 dark:text-night-text/70">
            {t("properties.trust_score")}
          </span>
          <span className="text-day-text dark:text-night-text">
            {owner.trustScore}/100
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-day-text/70 dark:text-night-text/70">
            {t("properties.verification_status")}
          </span>
          <span
            className={`font-semibold ${
              owner.verificationStatus === "Approved"
                ? "text-day-primary dark:text-night-primary"
                : "text-day-accent dark:text-night-accent"
            }`}
          >
            {owner.verificationStatus}
          </span>
        </div>
      </div>
    </div>
  </div>
);

export default OwnerCard;
