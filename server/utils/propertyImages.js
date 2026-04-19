const SUPPORTED_PROPERTY_CROP_PRESETS = ["16:9", "16:10", "4:3"];

const clampPercentage = (value, fallback = 50) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, parsed));
};

const normalizePropertyCropPreset = (value, fallback = "16:9") =>
  SUPPORTED_PROPERTY_CROP_PRESETS.includes(value) ? value : fallback;

const getPrimaryPropertyImage = (property) => {
  if (!Array.isArray(property?.images) || property.images.length === 0) {
    return null;
  }

  return property.images.find((image) => image?.isPrimary) || property.images[0];
};

const normalizePropertyImagePresentation = (image = {}, overrides = {}) => ({
  role: overrides.role || (image.isPrimary ? "cover" : "gallery"),
  focusX: clampPercentage(overrides.focusX ?? image?.presentation?.focusX, 50),
  focusY: clampPercentage(overrides.focusY ?? image?.presentation?.focusY, 50),
  cropPreset: normalizePropertyCropPreset(
    overrides.cropPreset ?? image?.presentation?.cropPreset,
    "16:9",
  ),
});

module.exports = {
  clampPercentage,
  getPrimaryPropertyImage,
  normalizePropertyCropPreset,
  normalizePropertyImagePresentation,
  SUPPORTED_PROPERTY_CROP_PRESETS,
};
