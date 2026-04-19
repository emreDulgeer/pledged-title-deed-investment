import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildCoverWarnings,
  clampPercentage,
  getCropAspectRatio,
  getCropDimensions,
  getCropPresetConfig,
  getImageAspectRatio,
  normalizePropertyCropPreset,
  PROPERTY_CROP_PRESETS,
} from "../../../utils/propertyImages";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getRenderedImageMetrics = ({
  containerWidth,
  containerHeight,
  imageWidth,
  imageHeight,
}) => {
  if (!containerWidth || !containerHeight || !imageWidth || !imageHeight) {
    return {
      overflowX: 0,
      overflowY: 0,
    };
  }

  const imageAspectRatio = imageWidth / imageHeight;
  const containerAspectRatio = containerWidth / containerHeight;

  if (imageAspectRatio > containerAspectRatio) {
    const renderedHeight = containerHeight;
    const renderedWidth = renderedHeight * imageAspectRatio;

    return {
      overflowX: Math.max(0, renderedWidth - containerWidth),
      overflowY: 0,
    };
  }

  const renderedWidth = containerWidth;
  const renderedHeight = renderedWidth / imageAspectRatio;

  return {
    overflowX: 0,
    overflowY: Math.max(0, renderedHeight - containerHeight),
  };
};

const formatRatio = (ratio) => {
  if (!Number.isFinite(ratio)) return "-";
  return ratio.toFixed(2).replace(/\.00$/, "");
};

const CoverImageEditorModal = ({ imageEntry, onClose, onSave }) => {
  const previewRef = useRef(null);
  const [focusX, setFocusX] = useState(
    clampPercentage(imageEntry?.presentation?.focusX, 50),
  );
  const [focusY, setFocusY] = useState(
    clampPercentage(imageEntry?.presentation?.focusY, 50),
  );
  const [cropPreset, setCropPreset] = useState(
    normalizePropertyCropPreset(imageEntry?.presentation?.cropPreset),
  );
  const [dragState, setDragState] = useState(null);

  useEffect(() => {
    if (!imageEntry) return;

    setFocusX(clampPercentage(imageEntry.presentation?.focusX, 50));
    setFocusY(clampPercentage(imageEntry.presentation?.focusY, 50));
    setCropPreset(normalizePropertyCropPreset(imageEntry.presentation?.cropPreset));
  }, [imageEntry]);

  useEffect(() => {
    if (!dragState || !imageEntry) return undefined;

    const handlePointerMove = (event) => {
      if (event.pointerId !== dragState.pointerId || !previewRef.current) {
        return;
      }

      const bounds = previewRef.current.getBoundingClientRect();
      const { overflowX, overflowY } = getRenderedImageMetrics({
        containerWidth: bounds.width,
        containerHeight: bounds.height,
        imageWidth: imageEntry.width,
        imageHeight: imageEntry.height,
      });
      const deltaX = event.clientX - dragState.startClientX;
      const deltaY = event.clientY - dragState.startClientY;

      if (overflowX > 0) {
        const startOffsetX = -((overflowX * dragState.startFocusX) / 100);
        const nextOffsetX = clamp(startOffsetX + deltaX, -overflowX, 0);
        setFocusX((-nextOffsetX / overflowX) * 100);
      } else {
        setFocusX(50);
      }

      if (overflowY > 0) {
        const startOffsetY = -((overflowY * dragState.startFocusY) / 100);
        const nextOffsetY = clamp(startOffsetY + deltaY, -overflowY, 0);
        setFocusY((-nextOffsetY / overflowY) * 100);
      } else {
        setFocusY(50);
      }
    };

    const handlePointerUp = (event) => {
      if (event.pointerId === dragState.pointerId) {
        setDragState(null);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, imageEntry]);

  const cropConfig = useMemo(
    () => getCropPresetConfig(cropPreset),
    [cropPreset],
  );
  const cropMetrics = useMemo(
    () =>
      getCropDimensions({
        width: imageEntry?.width,
        height: imageEntry?.height,
        cropPreset,
      }),
    [cropPreset, imageEntry?.height, imageEntry?.width],
  );
  const coverWarnings = useMemo(
    () =>
      buildCoverWarnings({
        width: imageEntry?.width,
        height: imageEntry?.height,
        cropPreset,
      }),
    [cropPreset, imageEntry?.height, imageEntry?.width],
  );
  const imageAspectRatio = useMemo(
    () => getImageAspectRatio(imageEntry?.width, imageEntry?.height),
    [imageEntry?.height, imageEntry?.width],
  );
  const previewWidthStyle = useMemo(
    () =>
      `min(100%, calc(min(48vh, 420px) * ${getCropAspectRatio(cropPreset)}))`,
    [cropPreset],
  );

  if (!imageEntry) return null;

  const handlePointerDown = (event) => {
    if (!previewRef.current) return;

    event.preventDefault();
    setDragState({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startFocusX: focusX,
      startFocusY: focusY,
    });
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center sm:p-4">
      <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-day-border bg-day-surface shadow-2xl dark:border-night-border dark:bg-night-surface sm:max-h-[calc(100vh-2rem)]">
        <div className="flex items-start justify-between gap-4 border-b border-day-border/70 px-4 py-4 dark:border-night-border/70 sm:px-6">
          <div>
            <h3 className="text-xl font-semibold text-day-text dark:text-night-text">
              Adjust Cover Crop
            </h3>
            <p className="mt-1 text-sm text-day-text/65 dark:text-night-text/65">
              Drag the photo inside the frame, choose a crop ratio, and keep the
              main subject inside the visible area.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-2 text-sm text-day-text/70 transition-colors hover:bg-day-border/20 hover:text-day-text dark:text-night-text/70 dark:hover:bg-night-border/20 dark:hover:text-night-text"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {PROPERTY_CROP_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setCropPreset(preset.value)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
                      cropPreset === preset.value
                        ? "bg-day-primary text-white dark:bg-night-primary"
                        : "border border-day-border text-day-text hover:bg-day-border/10 dark:border-night-border dark:text-night-text dark:hover:bg-night-border/10"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex justify-center">
                <div
                  ref={previewRef}
                  onPointerDown={handlePointerDown}
                  className={`relative overflow-hidden rounded-3xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background select-none touch-none ${
                    dragState ? "cursor-grabbing" : "cursor-grab"
                  }`}
                  style={{
                    aspectRatio: getCropAspectRatio(cropPreset),
                    width: previewWidthStyle,
                  }}
                >
                  <img
                    src={imageEntry.previewUrl}
                    alt={`${imageEntry.file.name} crop preview`}
                    draggable={false}
                    className="h-full w-full object-cover pointer-events-none"
                    style={{ objectPosition: `${focusX}% ${focusY}%` }}
                  />
                  <div className="absolute inset-0 border border-white/25" />
                  <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/45 to-transparent px-4 py-3 text-[11px] font-medium text-white sm:text-xs">
                    Drag the image to reframe the crop
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-4 py-3 text-[11px] text-white/90 sm:text-xs">
                    Live crop: {cropMetrics?.width ?? "-"} × {cropMetrics?.height ?? "-"} px
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-day-border dark:border-night-border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                  Original image
                </p>
                <p className="mt-2 text-sm font-medium text-day-text dark:text-night-text break-all">
                  {imageEntry.file.name}
                </p>
                <p className="mt-1 text-xs text-day-text/60 dark:text-night-text/60">
                  {imageEntry.width} × {imageEntry.height} px
                </p>
                <p className="mt-1 text-xs text-day-text/60 dark:text-night-text/60">
                  Original ratio: {formatRatio(imageAspectRatio)}:1
                </p>
              </div>

              <div className="rounded-2xl border border-day-border dark:border-night-border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                  Active crop
                </p>
                <p className="mt-2 text-sm font-medium text-day-text dark:text-night-text">
                  {cropConfig.label}
                </p>
                <p className="mt-1 text-xs text-day-text/60 dark:text-night-text/60">
                  Visible crop: {cropMetrics?.width ?? "-"} × {cropMetrics?.height ?? "-"} px
                </p>
                <p className="mt-1 text-xs text-day-text/60 dark:text-night-text/60">
                  Visible area keeps about {Math.round(cropMetrics?.coveragePercent ?? 0)}%
                  of the original photo
                </p>
              </div>

              {coverWarnings.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                  {coverWarnings.join(" ")}
                </div>
              )}

              <div className="rounded-2xl border border-day-border dark:border-night-border p-4 text-xs text-day-text/60 dark:text-night-text/60">
                Changing the ratio does not resize the original file. It only
                decides which crop frame the user sees for the cover.
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-2xl border border-day-border px-4 py-3 text-sm font-semibold text-day-text transition-colors hover:bg-day-border/10 dark:border-night-border dark:text-night-text dark:hover:bg-night-border/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSave({
                      focusX: clampPercentage(focusX, 50),
                      focusY: clampPercentage(focusY, 50),
                      cropPreset,
                    })
                  }
                  className="flex-1 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-night-primary"
                >
                  Save crop
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverImageEditorModal;
