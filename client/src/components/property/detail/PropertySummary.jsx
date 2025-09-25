import React from "react";
import { MapPin } from "lucide-react";
import { propertyTypeLabel } from "./_utils";

const Box = ({ label, children }) => (
  <div className="p-3 rounded-lg bg-day-background dark:bg-night-dashboard">
    <p className="text-sm text-day-text/70 dark:text-night-text/70">{label}</p>
    <p className="text-lg font-semibold text-day-text dark:text-night-text">
      {children}
    </p>
  </div>
);

const PropertySummary = ({ property, t }) => (
  <div className="bg-day-surface dark:bg-night-surface rounded-lg shadow-lg p-6">
    <h2 className="text-2xl font-bold text-day-text dark:text-night-text mb-4">
      {propertyTypeLabel(t, property.propertyType)} - {property.city},{" "}
      {property.country}
    </h2>

    <div className="flex items-center gap-2 text-day-text/70 dark:text-night-text/70 mb-4">
      <MapPin className="w-5 h-5" />
      <span>{property.fullAddress}</span>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Box label={t("properties.size")}>{property.size} m²</Box>
      <Box label={t("properties.rooms")}>{property.rooms}</Box>
      <Box label={t("properties.trust_score")}>{property.trustScore}/100</Box>
      <Box label={t("properties.total_views")}>
        {property.metadata?.totalViews || 0}
      </Box>
    </div>
  </div>
);

export default PropertySummary;
