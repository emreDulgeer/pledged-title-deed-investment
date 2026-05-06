import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import PropertyController from "../../controllers/propertyController";
import InvestmentPropertyPanel from "../../components/investments/InvestmentPropertyPanel";
import { HeaderBar } from "../../components/property/detail";
import {
  getPrimaryPropertyImage,
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";

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
      <div className="min-h-screen grid place-items-center bg-day-background dark:bg-night-background">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-day-accent dark:border-night-accent" />
          <p className="mt-4 text-sm text-day-text/60 dark:text-night-text/60">
            Loading property details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-day-background dark:bg-night-background">
        <HeaderBar
          title="Property"
          onBack={() => navigate(-1)}
        />
        <div className="container mx-auto px-4 py-6">
          <div className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
            <h2 className="text-xl font-semibold text-day-text dark:text-night-text">
              Property unavailable
            </h2>
            <p className="mt-2 text-day-text/60 dark:text-night-text/60">
              {error || "This property could not be loaded."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-day-background dark:bg-night-background">
      <HeaderBar
        title={`${property.city}, ${property.country}`}
        onBack={() => navigate(-1)}
      />

      <div className="container mx-auto px-4 py-6 space-y-6">
        <section className="rounded-3xl overflow-hidden border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface">
          <div className="grid gap-3 p-3 md:grid-cols-[2fr_1fr]">
            <div className="h-80 rounded-2xl overflow-hidden bg-day-background dark:bg-night-background">
              {images[0] ? (
                <img
                  src={getPropertyImageUrl(images[0])}
                  alt={`${property.city}, ${property.country}`}
                  className="w-full h-full object-cover"
                  style={getPropertyImageStyle(images[0])}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl text-day-text/20 dark:text-night-text/20">
                  🏠
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
              {images.slice(1, 3).map((image, index) => (
                <div
                  key={`${getPropertyImageUrl(image)}-${index}`}
                  className="h-[154px] rounded-2xl overflow-hidden bg-day-background dark:bg-night-background"
                >
                  <img
                    src={getPropertyImageUrl(image)}
                    alt={`Property gallery ${index + 2}`}
                    className="w-full h-full object-cover"
                    style={getPropertyImageStyle(image)}
                  />
                </div>
              ))}

              {images.length <= 1 &&
                Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[154px] rounded-2xl border border-dashed border-day-border dark:border-night-border flex items-center justify-center text-sm text-day-text/35 dark:text-night-text/35"
                  >
                    Additional gallery image
                  </div>
                ))}
            </div>
          </div>
        </section>

        <InvestmentPropertyPanel property={property} owner={property.owner} t={t} />
      </div>
    </div>
  );
};

export default AccessiblePropertyDetail;
