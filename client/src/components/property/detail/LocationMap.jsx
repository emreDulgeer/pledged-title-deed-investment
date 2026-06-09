import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation } from "lucide-react";

const LocationMap = ({ property, t }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const translate = t || ((key, fallback) => fallback || key);

  const lat = Number(property?.locationPin?.lat);
  const lng = Number(property?.locationPin?.lng);

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
    if (!containerRef.current || mapRef.current) return undefined;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    markerRef.current = L.circleMarker([lat, lng], {
      radius: 8,
      color: "#ffffff",
      weight: 3,
      fillColor: "#14b8a6",
      fillOpacity: 1,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [lat, lng]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 15));
  }, [lat, lng]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const displayAddress =
    property?.mapSearchAddress || property?.fullAddress || `${lat}, ${lng}`;
  const externalMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

  return (
    <div className="shell-surface px-6 py-6 sm:px-7">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
            Location context
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
            {translate("properties.location", "Location")}
          </h3>
          <div className="mt-3 flex items-start gap-2 text-day-muted dark:text-night-muted">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{displayAddress}</span>
          </div>
        </div>

        <a
          href={externalMapUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-2xl border border-day-border dark:border-night-border px-3 py-2 text-sm text-day-primary transition-colors hover:bg-day-panel/60 dark:text-night-primary dark:hover:bg-night-panel/60"
        >
          <Navigation className="w-4 h-4" />
          {translate("properties.open_in_map", "Open map")}
        </a>
      </div>

      <div
        ref={containerRef}
        className="relative z-0 h-80 w-full overflow-hidden rounded-[24px] border border-day-border/80 dark:border-night-border/80"
      />

      <div className="mt-3 text-xs text-day-muted dark:text-night-muted">
        {lat.toFixed(6)}, {lng.toFixed(6)}
      </div>
    </div>
  );
};

export default LocationMap;
