import React from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const ImageModal = ({
  images = [],
  currentIndex,
  setCurrentIndex,
  onClose,
}) => {
  if (!images.length) return null;
  const next = () => setCurrentIndex((p) => (p + 1) % images.length);
  const prev = () =>
    setCurrentIndex((p) => (p - 1 + images.length) % images.length);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      <img
        src={images[currentIndex]}
        alt={`Property ${currentIndex + 1}`}
        className="max-w-full max-h-[90vh] object-contain"
      />

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}
    </div>
  );
};

export default ImageModal;
