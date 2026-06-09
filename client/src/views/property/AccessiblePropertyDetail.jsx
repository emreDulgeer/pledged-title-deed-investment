import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, Building2, Loader2, MapPin, Sparkles } from "lucide-react";

import PropertyController from "../../controllers/propertyController";
import InvestmentPropertyPanel from "../../components/investments/InvestmentPropertyPanel";
import { HeaderBar } from "../../components/property/detail";
import {
  getPrimaryPropertyImage,
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";

const formatStatus = (value = "") =>
  String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Published";

const AccessiblePropertyDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProperty = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await PropertyController.getById(id);
        if (response?.success) {
          setProperty(response.data);
          return;
        }

        setError("Property details could not be loaded.");
      } catch (loadError) {
        console.error("Accessible property detail error:", loadError);
        setError(loadError.message || "Property details could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [id]);

  const images = useMemo(() => {
    if (!property) {
      return [];
    }

    if (Array.isArray(property.images) && property.images.length > 0) {
      return property.images;
    }

    const primaryImage = getPrimaryPropertyImage(property);
    return primaryImage ? [primaryImage] : [];
  }, [property]);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-day-background p-4 dark:bg-night-background">
        <div className="shell-surface px-8 py-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-day-primary dark:text-night-primary" />
          <p className="mt-4 text-sm text-day-muted dark:text-night-muted">
            Loading property details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-day-background dark:bg-night-background">
        <HeaderBar title="Property" onBack={() => navigate(-1)} />
        <div className="mx-auto max-w-shell px-4 py-6 sm:px-6 xl:px-8">
          <div className="shell-surface px-8 py-8">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-200">
                <AlertCircle className="h-6 w-6" strokeWidth={2.1} />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-day-text dark:text-night-text">
              Property unavailable
                </h2>
                <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
              {error || "This property could not be loaded."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-day-background dark:bg-night-background">
      <HeaderBar title={`${property.city}, ${property.country}`} onBack={() => navigate(-1)} />

      <div className="mx-auto max-w-shell space-y-6 px-4 py-6 sm:px-6 xl:px-8">
        <section className="shell-surface overflow-hidden">
          <div className="relative px-6 py-7 sm:px-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-day-primary/10 via-day-panel to-day-accent/10 dark:from-night-primary/10 dark:via-night-panel/40 dark:to-night-accent/10" />
            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:border-night-border/70 dark:bg-night-surface dark:text-night-muted">
                      Public property
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
                      <Sparkles className="h-3.5 w-3.5" strokeWidth={2.1} />
                      {formatStatus(property.status)}
                    </span>
                  </div>
                  <h2 className="mt-5 text-3xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-4xl">
                    {property.city}, {property.country}
                  </h2>
                  <div className="mt-3 flex items-start gap-2 text-day-muted dark:text-night-muted">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.1} />
                    <span>
                      {property.fullAddress ||
                        property.mapSearchAddress ||
                        "Address not provided"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="h-80 overflow-hidden rounded-[24px] bg-day-panel dark:bg-night-panel md:h-[420px]">
              {images[0] ? (
                <img
                  src={getPropertyImageUrl(images[0])}
                  alt={`${property.city}, ${property.country}`}
                      className="h-full w-full object-cover"
                  style={getPropertyImageStyle(images[0])}
                />
              ) : (
                    <div className="flex h-full w-full items-center justify-center text-day-muted dark:text-night-muted">
                      <Building2 className="h-12 w-12" strokeWidth={1.8} />
                </div>
              )}
            </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                  {images.slice(1, 3).map((image, index) => (
                  <div
                      key={`${getPropertyImageUrl(image)}-${index}`}
                      className="h-[154px] overflow-hidden rounded-[22px] bg-day-panel dark:bg-night-panel"
                  >
                    <img
                      src={getPropertyImageUrl(image)}
                      alt={`Property gallery ${index + 2}`}
                      className="h-full w-full object-cover"
                      style={getPropertyImageStyle(image)}
                    />
                  </div>
                  ))}

                  {images.length <= 1 &&
                    Array.from({ length: 2 }).map((_, index) => (
                      <div
                        key={index}
                        className="flex h-[154px] items-center justify-center rounded-[22px] border border-dashed border-day-border/80 text-sm text-day-muted dark:border-night-border/80 dark:text-night-muted"
                      >
                        Additional gallery image
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <InvestmentPropertyPanel property={property} owner={property.owner} t={t} />
      </div>
    </div>
  );
};

export default AccessiblePropertyDetail;
