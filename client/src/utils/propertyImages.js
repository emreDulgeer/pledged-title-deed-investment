import { resolveFileUrl } from "../components/property/detail/_utils";

export const PROPERTY_IMAGE_MAX_COUNT = 10;
export const PROPERTY_CROP_PRESETS = [
  { label: "16:9", value: "16:9", ratio: 16 / 9 },
  { label: "16:10", value: "16:10", ratio: 16 / 10 },
  { label: "4:3", value: "4:3", ratio: 4 / 3 },
];
export const PROPERTY_DEFAULT_CROP_PRESET = PROPERTY_CROP_PRESETS[0].value;

export const clampPercentage = (value, fallback = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, parsed));
};

const formatMegabytes = (bytes = 0) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
const formatPercent = (value) => `${Math.round(value)}%`;

export const getCropPresetConfig = (cropPreset) =>
  PROPERTY_CROP_PRESETS.find((preset) => preset.value === cropPreset) ||
  PROPERTY_CROP_PRESETS[0];

export const normalizePropertyCropPreset = (cropPreset) =>
  getCropPresetConfig(cropPreset).value;

export const getCropAspectRatio = (cropPreset) =>
  getCropPresetConfig(cropPreset).ratio;

export const getImageAspectRatio = (width, height) => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || height <= 0) {
    return null;
  }

  return width / height;
};

export const getCropDimensions = ({ width, height, cropPreset }) => {
  const imageAspectRatio = getImageAspectRatio(width, height);
  const cropAspectRatio = getCropAspectRatio(cropPreset);

  if (!imageAspectRatio || !cropAspectRatio) {
    return null;
  }

  const useFullHeight = imageAspectRatio > cropAspectRatio;
  const cropWidth = useFullHeight ? Math.round(height * cropAspectRatio) : width;
  const cropHeight = useFullHeight ? height : Math.round(width / cropAspectRatio);
  const originalArea = width * height;
  const cropArea = cropWidth * cropHeight;
  const croppedAreaPercent =
    originalArea > 0 ? ((originalArea - cropArea) / originalArea) * 100 : 0;

  return {
    width: cropWidth,
    height: cropHeight,
    aspectRatio: cropAspectRatio,
    croppedAreaPercent,
    coveragePercent: 100 - croppedAreaPercent,
  };
};

export const getPropertyImageUrl = (image) => {
  if (!image) return "";
  if (typeof image === "string") return resolveFileUrl(image);
  return resolveFileUrl(image.url || image.path || image.thumbnail || "");
};

export const getPropertyImageObjectPosition = (image) => {
  const focusX = clampPercentage(image?.presentation?.focusX, 50);
  const focusY = clampPercentage(image?.presentation?.focusY, 50);
  return `${focusX}% ${focusY}%`;
};

export const getPropertyImageStyle = (image) => ({
  objectPosition: getPropertyImageObjectPosition(image),
});

export const getPrimaryPropertyImage = (property) => {
  if (Array.isArray(property?.images) && property.images.length > 0) {
    return property.images.find((image) => image?.isPrimary) || property.images[0];
  }

  if (property?.thumbnail) {
    return property.thumbnail;
  }

  return null;
};

export const buildImageWarnings = ({ width, height, size }) => {
  const warnings = [];
  const aspectRatio = getImageAspectRatio(width, height);

  if (!aspectRatio) {
    return warnings;
  }

  if (aspectRatio < 0.8) {
    warnings.push(
      "This photo is quite vertical, so cover crops will be tighter than usual.",
    );
  }

  if (aspectRatio >= 0.95 && aspectRatio <= 1.05) {
    warnings.push(
      "This photo is close to square, so the cover crop should be checked carefully.",
    );
  }

  if (aspectRatio > 2.4) {
    warnings.push(
      "This image is very wide, so important details may be cropped on mobile cards.",
    );
  }

  if (size > 8 * 1024 * 1024) {
    warnings.push(
      "Large file size detected. Upload will work, but optimization may take longer.",
    );
  }

  return warnings;
};

export const buildCoverWarnings = ({ width, height, cropPreset }) => {
  const warnings = [];
  const cropMetrics = getCropDimensions({ width, height, cropPreset });
  const cropConfig = getCropPresetConfig(cropPreset);
  const imageAspectRatio = getImageAspectRatio(width, height);

  if (!cropMetrics || !imageAspectRatio) {
    return warnings;
  }

  if (cropMetrics.croppedAreaPercent >= 35) {
    warnings.push(
      `This ${cropConfig.label} crop trims ${formatPercent(
        cropMetrics.croppedAreaPercent,
      )} of the original frame.`,
    );
  }

  if (imageAspectRatio < cropMetrics.aspectRatio * 0.72) {
    warnings.push(
      `This image is more vertical than ${cropConfig.label}, so top and bottom framing matter more.`,
    );
  }

  if (imageAspectRatio > cropMetrics.aspectRatio * 1.55) {
    warnings.push(
      `This image is much wider than ${cropConfig.label}, so the side edges will be trimmed.`,
    );
  }

  return warnings;
};

export const loadImageDimensions = (file) =>
  new Promise((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      resolve({
        previewUrl,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error(`Image preview could not be created for ${file.name}`));
    };

    image.src = previewUrl;
  });

export const createPropertyImageEntry = async (file) => {
  const { previewUrl, width, height } = await loadImageDimensions(file);
  const warnings = buildImageWarnings({ width, height, size: file.size });
  const coverWarnings = buildCoverWarnings({
    width,
    height,
    cropPreset: PROPERTY_DEFAULT_CROP_PRESET,
  });

  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    previewUrl,
    width,
    height,
    aspectRatio: Number((width / height).toFixed(3)),
    sizeLabel: formatMegabytes(file.size),
    warnings,
    coverWarnings,
    isCover: false,
    presentation: {
      focusX: 50,
      focusY: 50,
      cropPreset: PROPERTY_DEFAULT_CROP_PRESET,
      role: "gallery",
    },
  };
};
