import React from "react";
import { Star } from "lucide-react";

const Tile = ({ label, value }) => (
  <div
    className="text-center p-3 rounded-lg
                  bg-day-background dark:bg-night-dashboard"
  >
    <p className="text-2xl font-bold text-day-text dark:text-night-text">
      {value}
    </p>
    <p className="text-sm text-day-text/70 dark:text-night-text/70">{label}</p>
  </div>
);

const PortfolioStats = ({ owner = {}, t }) => (
  <div className="bg-day-surface dark:bg-night-surface rounded-lg shadow-lg p-6">
    <h3 className="text-lg font-semibold text-day-text dark:text-night-text mb-4">
      {t("properties.owner_info")}
    </h3>

    <div className="grid grid-cols-2 gap-4">
      <Tile
        label={t("properties.total_properties")}
        value={owner.totalProperties || 0}
      />
      <Tile
        label={t("properties.completed_contracts")}
        value={owner.completedContracts || 0}
      />
      <Tile
        label={t("properties.ongoing_contracts")}
        value={owner.ongoingContracts || 0}
      />
      <div className="text-center p-3 rounded-lg bg-day-background dark:bg-night-dashboard">
        <p className="text-2xl font-bold text-day-text dark:text-night-text">
          <Star className="w-5 h-5 inline text-day-accent dark:text-night-accent" />{" "}
          {owner.trustScore || 0}
        </p>
        <p className="text-sm text-day-text/70 dark:text-night-text/70">
          {t("properties.trust_score")}
        </p>
      </div>
    </div>
  </div>
);

export default PortfolioStats;
