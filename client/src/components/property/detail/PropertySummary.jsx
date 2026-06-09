import React from "react";
import { Home, MapPin, Ruler, ShieldCheck, Users } from "lucide-react";
import { propertyTypeLabel } from "./_utils";

const Box = ({ label, value, icon }) => (
  <div className="shell-subtle-surface px-4 py-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-day-muted dark:text-night-muted">
          {label}
        </p>
        <p className="mt-3 text-lg font-semibold text-day-text dark:text-night-text">
          {value}
        </p>
      </div>
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-day-surface text-day-primary dark:bg-night-surface dark:text-night-primary">
        {React.createElement(icon, {
          className: "h-4 w-4",
          strokeWidth: 2.1,
        })}
      </div>
    </div>
  </div>
);

const PropertySummary = ({ property, t }) => {
  const address =
    property.fullAddress ||
    property.mapSearchAddress ||
    [property.city, property.country].filter(Boolean).join(", ") ||
    "-";

  return (
    <div className="shell-surface px-6 py-6 sm:px-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
            Property overview
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text sm:text-3xl">
            {propertyTypeLabel(t, property.propertyType)} - {property.city},{" "}
            {property.country}
          </h2>
          <div className="mt-3 flex items-start gap-2 text-day-muted dark:text-night-muted">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.1} />
            <span>{address}</span>
          </div>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-day-border bg-day-panel px-3 py-2 text-sm font-semibold text-day-text dark:border-night-border dark:bg-night-panel dark:text-night-text">
          <Home className="h-4 w-4 text-day-primary dark:text-night-primary" strokeWidth={2.1} />
          {property.status || "Status pending"}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Box
          label={t("properties.size")}
          value={`${property.size || "-"} m²`}
          icon={Ruler}
        />
        <Box
          label={t("properties.rooms")}
          value={property.rooms || "-"}
          icon={Home}
        />
        <Box
          label={t("properties.trust_score")}
          value={
            property.trustScore != null ? `${property.trustScore}/100` : "—"
          }
          icon={ShieldCheck}
        />
        <Box
          label={t("properties.total_views")}
          value={property.metadata?.totalViews || 0}
          icon={Users}
        />
      </div>
    </div>
  );
};

export default PropertySummary;
