import React from "react";
import { Eye, Heart, Users, Calendar, Clock } from "lucide-react";

const Row = ({ icon, label, value }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      {icon &&
        React.createElement(icon, {
          className: "w-4 h-4 text-day-text/60 dark:text-night-text/60",
        })}
      <span className="text-day-text/70 dark:text-night-text/70">{label}</span>
    </div>
    <span className="font-semibold text-day-text dark:text-night-text">
      {value}
    </span>
  </div>
);

const StatsCard = ({ metadata = {}, createdAt, updatedAt, t }) => (
  <div className="bg-day-surface dark:bg-night-surface rounded-lg shadow-lg p-6">
    <h3 className="text-lg font-semibold text-day-text dark:text-night-text mb-4">
      {t("dashboard.quick_stats")}
    </h3>

    <div className="space-y-4">
      <Row
        icon={Eye}
        label={t("properties.total_views")}
        value={metadata.totalViews || 0}
      />
      <Row
        icon={Heart}
        label={t("properties.total_favorites")}
        value={metadata.totalFavorites || 0}
      />
      <Row
        icon={Users}
        label={t("properties.total_offers")}
        value={metadata.totalOffers || 0}
      />
      <Row
        icon={Calendar}
        label={t("common.created_date")}
        value={new Date(createdAt).toLocaleDateString()}
      />
      <Row
        icon={Clock}
        label={t("common.updated_date")}
        value={new Date(updatedAt).toLocaleDateString()}
      />
    </div>
  </div>
);

export default StatsCard;
