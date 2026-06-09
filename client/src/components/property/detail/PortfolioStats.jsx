import React from "react";
import { Star } from "lucide-react";

const Tile = ({ label, value }) => (
  <div className="shell-subtle-surface px-4 py-4 text-center">
    <p className="text-2xl font-bold text-day-text dark:text-night-text">
      {value}
    </p>
    <p className="mt-1 text-sm text-day-muted dark:text-night-muted">{label}</p>
  </div>
);

const PortfolioStats = ({ owner = {}, t }) => (
  <div className="shell-surface px-6 py-6 sm:px-7">
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
      Owner portfolio
    </p>
    <h3 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
      {t("properties.owner_info")}
    </h3>

    <div className="mt-6 grid grid-cols-2 gap-4">
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
      <div className="shell-subtle-surface px-4 py-4 text-center">
        <p className="text-2xl font-bold text-day-text dark:text-night-text">
          <Star className="inline h-5 w-5 text-day-accent dark:text-night-accent" />{" "}
          {owner.trustScore || 0}
        </p>
        <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
          {t("properties.trust_score")}
        </p>
      </div>
    </div>
  </div>
);

export default PortfolioStats;
