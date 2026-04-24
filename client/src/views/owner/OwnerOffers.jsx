import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OffersTab } from "./OwnerProperties";

const OwnerOffers = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="p-6 min-h-screen bg-day-dashboard dark:bg-night-dashboard text-day-text dark:text-night-text">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-day-text dark:text-night-text">
            {t("owner.tabs.offers") || "Offers"}
          </h1>
          <p className="text-sm text-day-text/60 dark:text-night-text/60 mt-0.5">
            Review investor offers for your properties and respond from one place.
          </p>
        </div>

        <button
          onClick={() => navigate("/owner/properties")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-day-border dark:border-night-border text-sm font-medium hover:bg-day-surface dark:hover:bg-night-surface transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t("navigation.properties") || "Properties"}
        </button>
      </div>

      <OffersTab />
    </div>
  );
};

export default OwnerOffers;
