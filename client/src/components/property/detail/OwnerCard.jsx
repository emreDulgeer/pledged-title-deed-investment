import React from "react";
import { Link } from "react-router-dom";
import { User } from "lucide-react";

const OwnerCard = ({ owner = {}, profilePath = null, t }) => (
  <div className="shell-surface px-6 py-6 sm:px-7">
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
      Sponsor
    </p>
    <h3 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
      {t("properties.owner_info")}
    </h3>

    <div className="mt-6 space-y-5">
      <div className="flex items-center gap-3">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary"
        >
          <User className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-day-text dark:text-night-text">
            {owner.fullName}
          </p>
          <p className="text-sm text-day-muted dark:text-night-muted">
            {owner.email}
          </p>
          {profilePath && (
            <Link
              to={profilePath}
              className="mt-3 inline-flex items-center rounded-full border border-day-border dark:border-night-border px-3 py-1 text-xs font-medium text-day-primary transition-colors hover:bg-day-panel/60 dark:text-night-primary dark:hover:bg-night-panel/60"
            >
              View profile
            </Link>
          )}
        </div>
      </div>

      <div className="border-t border-day-border/70 pt-4 dark:border-night-border/70 space-y-3">
        <div className="flex justify-between gap-4">
          <span className="text-day-muted dark:text-night-muted">
            {t("common.phone")}
          </span>
          <span className="text-day-text dark:text-night-text">
            {owner.phone || "—"}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-day-muted dark:text-night-muted">
            {t("common.country")}
          </span>
          <span className="text-day-text dark:text-night-text">
            {owner.country || "—"}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-day-muted dark:text-night-muted">
            {t("properties.trust_score")}
          </span>
          <span className="text-day-text dark:text-night-text">
            {owner.trustScore != null ? `${owner.trustScore}/100` : "—"}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-day-muted dark:text-night-muted">
            {t("properties.verification_status")}
          </span>
          <span
            className={`font-semibold ${
              owner.verificationStatus === "Approved"
                ? "text-day-primary dark:text-night-primary"
                : "text-day-accent dark:text-night-accent"
            }`}
          >
            {owner.verificationStatus || "Pending"}
          </span>
        </div>
      </div>
    </div>
  </div>
);

export default OwnerCard;
