import React from "react";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { getStatusConfig } from "./_utils";

const ImageGallery = ({
  images = [],
  status,
  onOpenModal,
  currentIndex,
  setCurrentIndex,
  t,
}) => {
  const next = () => setCurrentIndex((p) => (p + 1) % images.length);
  const prev = () =>
    setCurrentIndex((p) => (p - 1 + images.length) % images.length);
  const { color, icon: StatusIcon, label } = getStatusConfig(status, t);

  return (
    <div className="bg-day-surface dark:bg-night-surface rounded-lg shadow-lg overflow-hidden">
      {images.length ? (
        <div className="relative group">
          <img
            src={images[currentIndex]}
            alt={`Property ${currentIndex + 1}`}
            className="w-full h-96 object-cover cursor-pointer"
            onClick={onOpenModal}
          />

          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full
                           bg-black/50 text-white opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full
                           bg-black/50 text-white opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-2 h-2 rounded-full ${
                      i === currentIndex ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          <div className="absolute top-4 right-4">
            {/* color => getStatusConfig’ten geliyor; day/night uyumlu hale getirildiğini varsayıyoruz */}
            <span
              className={`px-3 py-1 rounded-full flex items-center gap-2 ${color}`}
            >
              <StatusIcon className="w-4 h-4" /> {label}
            </span>
          </div>
        </div>
      ) : (
        <div className="w-full h-96 bg-day-background dark:bg-night-dashboard flex items-center justify-center">
          <div className="text-center">
            <Home className="w-12 h-12 text-day-text/40 dark:text-night-text/40 mx-auto mb-2" />
            <p className="text-day-text/70 dark:text-night-text/70">
              {t("properties.no_images")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
