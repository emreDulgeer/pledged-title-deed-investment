import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import bridge from "../../controllers/bridge";
import CoverImageEditorModal from "../../components/property/modals/CoverImageEditorModal";
import {
  SUPPORTED_PROPERTY_COUNTRIES,
  SUPPORTED_PROPERTY_COUNTRY_NAMES,
  getSupportedPropertyCountryCode,
  normalizeSupportedPropertyCountry,
} from "../../constants/propertyCountries";
import {
  buildCoverWarnings,
  getCropAspectRatio,
  getCropDimensions,
  getCropPresetConfig,
  PROPERTY_IMAGE_MAX_COUNT,
  PROPERTY_CROP_PRESETS,
  createPropertyImageEntry,
} from "../../utils/propertyImages";

const INITIAL_FORM = {
  country: "",
  city: "",
  fullAddress: "",
  mapSearchAddress: "",
  propertyType: "apartment",
  description: "",
  size: "",
  rooms: "",
  estimatedValue: "",
  requestedInvestment: "",
  rentOffered: "",
  annualYieldPercent: "",
  currency: "EUR",
  contractPeriodMonths: "12",
  locationPin: {
    lat: "",
    lng: "",
  },
};

const PROPERTY_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const PROPERTY_DOCUMENT_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"];
const PROPERTY_DOCUMENT_TYPES = [
  { value: "title_deed", label: "Title Deed" },
  { value: "annotation", label: "Annotation" },
  { value: "valuation_report", label: "Valuation Report" },
  { value: "tax_document", label: "Tax Document" },
  { value: "floor_plan", label: "Floor Plan" },
  { value: "other", label: "Other" },
];

const SUPPORTED_PROPERTY_COUNTRIES_LABEL =
  SUPPORTED_PROPERTY_COUNTRY_NAMES.join(", ");
const SUPPORTED_PROPERTY_COUNTRIES_ERROR =
  `Property yalnizca su ulkelerde olusturulabilir: ${SUPPORTED_PROPERTY_COUNTRIES_LABEL}.`;

const providerKeyFromInfo = (providerInfo) => {
  const name = providerInfo?.name?.toLowerCase?.() || "";
  return name.includes("google") ? "google" : "openstreetmap";
};

const toNumberOrUndefined = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const buildPayload = (form) => ({
  country: normalizeSupportedPropertyCountry(form.country) || form.country.trim(),
  city: form.city.trim(),
  fullAddress: form.fullAddress.trim(),
  mapSearchAddress: form.mapSearchAddress.trim(),
  propertyType: form.propertyType,
  description: form.description.trim(),
  size: toNumberOrUndefined(form.size),
  rooms: toNumberOrUndefined(form.rooms),
  estimatedValue: toNumberOrUndefined(form.estimatedValue),
  requestedInvestment: toNumberOrUndefined(form.requestedInvestment),
  rentOffered: toNumberOrUndefined(form.rentOffered),
  annualYieldPercent: toNumberOrUndefined(form.annualYieldPercent),
  currency: form.currency,
  contractPeriodMonths: toNumberOrUndefined(form.contractPeriodMonths),
  locationPin:
    form.locationPin.lat !== "" && form.locationPin.lng !== ""
      ? {
          lat: toNumberOrUndefined(form.locationPin.lat),
          lng: toNumberOrUndefined(form.locationPin.lng),
        }
      : undefined,
});

const buildAddress = (form) =>
  [form.mapSearchAddress || form.fullAddress, form.city, form.country]
    .filter(Boolean)
    .join(", ");

const COORDINATE_AUTO_FILL_DELAY_MS = 800;

const looksLikeStreetAddress = (value) => {
  if (!value) return false;
  const normalized = value.toLowerCase();

  return (
    /\d/.test(normalized) ||
    [
      "street",
      "st",
      "road",
      "rd",
      "avenue",
      "ave",
      "boulevard",
      "blvd",
      "cadde",
      "caddesi",
      "sokak",
      "sk",
      "no:",
      "no ",
      "mah",
      "mahalle",
    ].some((token) => normalized.includes(token))
  );
};

const dedupeAddressParts = (parts) => {
  const seen = new Set();

  return parts.filter((part) => {
    const normalized = part.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

const shouldUseFreeformQuery = (fullAddress) => {
  if (!fullAddress) return false;

  const commaCount = (fullAddress.match(/,/g) || []).length;
  return commaCount >= 1;
};

const buildGeocodeAddressInput = (form) => {
  const fullAddress = (form.mapSearchAddress || form.fullAddress).trim();
  const city = form.city.trim();
  const country = form.country.trim();

  if (shouldUseFreeformQuery(fullAddress)) {
    return dedupeAddressParts([fullAddress, city, country]).join(", ");
  }

  const address = {
    city: city || undefined,
    country: country || undefined,
  };

  if (fullAddress) {
    if (looksLikeStreetAddress(fullAddress)) {
      address.street = fullAddress;
    } else {
      address.amenity = fullAddress;
    }
  }

  return address;
};

const getAddressComponent = (components = [], type) =>
  components.find((component) => component.type === type)?.long_name || "";

const getFileExtension = (filename = "") =>
  filename.split(".").pop()?.toLowerCase?.() || "";

const validateFilesByExtension = (files, allowedExtensions) =>
  files.filter((file) =>
    allowedExtensions.includes(getFileExtension(file.name)),
  );

const syncImageCoverState = (entries, preferredCoverId = null) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  const nextCoverId =
    preferredCoverId && entries.some((entry) => entry.id === preferredCoverId)
      ? preferredCoverId
      : entries.find((entry) => entry.isCover)?.id || entries[0].id;

  return entries.map((entry) => ({
    ...entry,
    isCover: entry.id === nextCoverId,
    presentation: {
      ...entry.presentation,
      role: entry.id === nextCoverId ? "cover" : "gallery",
    },
  }));
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const MapPreview = ({ lat, lng, pinpointMode, onPinpointPick }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return (
      <div className="h-72 rounded-2xl border border-dashed border-day-border dark:border-night-border bg-day-background dark:bg-night-background flex items-center justify-center text-center px-6 text-sm text-day-text/55 dark:text-night-text/55">
        Adres veya koordinat girdikten sonra harita önizlemesi burada görünecek.
      </div>
    );
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 16,
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

    map.on("click", (event) => {
      if (!pinpointMode) return;
      onPinpointPick({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [lat, lng, onPinpointPick, pinpointMode]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;

    markerRef.current.setLatLng([lat, lng]);

    if (!pinpointMode) {
      mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 16));
    }
  }, [lat, lng, pinpointMode]);

  useEffect(() => {
    if (!mapRef.current || !pinpointMode) return;
    mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 16));
  }, [pinpointMode, lat, lng]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={`relative z-0 h-72 w-full rounded-2xl border border-day-border dark:border-night-border overflow-hidden ${
          pinpointMode ? "ring-2 ring-amber-400/60" : ""
        }`}
      />
    </div>
  );
};

const ProviderBadge = ({ providerInfo }) => {
  if (!providerInfo?.name) return null;

  return (
    <div className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-day-primary dark:text-night-primary">
          Map Provider
        </span>
        <span className="inline-flex items-center rounded-full bg-day-primary/10 dark:bg-night-primary/15 px-3 py-1 text-xs font-medium text-day-primary dark:text-night-primary">
          {providerInfo.name}
        </span>
        {providerInfo.fallback?.name ? (
          <span className="text-xs text-day-text/55 dark:text-night-text/55">
            Fallback: {providerInfo.fallback.name}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-day-text/65 dark:text-night-text/65">
        Frontend önizleme katmanı hem OpenStreetMap hem Google Maps provider
        akışını destekliyor. Asıl geocoding işlemi backend provider seçimine göre
        çalışıyor.
      </p>
    </div>
  );
};

const OwnerPropertyCreate = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [providerInfo, setProviderInfo] = useState(null);
  const [providerError, setProviderError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [helperMessage, setHelperMessage] = useState("");
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pinpointMode, setPinpointMode] = useState(false);
  const [manualPinOverride, setManualPinOverride] = useState(false);
  const [imageEntries, setImageEntries] = useState([]);
  const [imageAnalysisLoading, setImageAnalysisLoading] = useState(false);
  const [coverEditorImageId, setCoverEditorImageId] = useState(null);
  const [documentEntries, setDocumentEntries] = useState([]);
  const autoGeocodeRequestIdRef = useRef(0);
  const manualGeocodeRequestIdRef = useRef(0);
  const searchRequestIdRef = useRef(0);
  const imageEntriesRef = useRef([]);

  useEffect(() => {
    let active = true;

    const loadProvider = async () => {
      try {
        const response = await bridge.geocoding.getProviderInfo();
        if (active) {
          setProviderInfo(response.data);
          setProviderError("");
        }
      } catch (error) {
        if (active) {
          setProviderError(
            error.message || "Map provider bilgisi alınamadı.",
          );
        }
      } finally {
        if (active) {
          setLoadingProvider(false);
        }
      }
    };

    loadProvider();
    return () => {
      active = false;
    };
  }, []);

  const providerKey = providerKeyFromInfo(providerInfo);
  const lat = Number(form.locationPin.lat);
  const lng = Number(form.locationPin.lng);
  const coverImage =
    imageEntries.find((entry) => entry.isCover) || imageEntries[0] || null;
  const coverEditorImage =
    imageEntries.find((entry) => entry.id === coverEditorImageId) || null;
  const coverPreset = getCropPresetConfig(coverImage?.presentation?.cropPreset);
  const coverCropMetrics = coverImage
    ? getCropDimensions({
        width: coverImage.width,
        height: coverImage.height,
        cropPreset: coverImage.presentation?.cropPreset,
      })
    : null;
  const coverWarnings = coverImage
    ? buildCoverWarnings({
        width: coverImage.width,
        height: coverImage.height,
        cropPreset: coverImage.presentation?.cropPreset,
      })
    : [];
  const addressQuery = buildAddress(form);
  const geocodeAddressInput = buildGeocodeAddressInput(form);
  const geocodeAddressKey =
    typeof geocodeAddressInput === "string"
      ? geocodeAddressInput
      : JSON.stringify(geocodeAddressInput);
  const hasEnoughAddressForGeocoding =
    !!form.fullAddress.trim() || (!!form.city.trim() && !!form.country.trim());
  const countryCode = getSupportedPropertyCountryCode(form.country);

  const updateField = (field, value) => {
    if (
      field === "fullAddress" ||
      field === "mapSearchAddress" ||
      field === "city" ||
      field === "country"
    ) {
      setManualPinOverride(false);
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateLocationField = (field, value) => {
    setManualPinOverride(true);
    setForm((prev) => ({
      ...prev,
      locationPin: {
        ...prev.locationPin,
        [field]: value,
      },
    }));
  };

  const handleGeocode = async () => {
    const address = addressQuery;
    if (!address) {
      setHelperMessage("Önce adres, şehir veya ülke bilgisi girin.");
      return;
    }

    const requestId = manualGeocodeRequestIdRef.current + 1;
    manualGeocodeRequestIdRef.current = requestId;
    setGeocodeLoading(true);
    setHelperMessage("");
    setSubmitError("");

    try {
      const response = await bridge.geocoding.geocode(
        geocodeAddressInput || address,
      );
      const result = response.data;

      if (requestId !== manualGeocodeRequestIdRef.current) {
        return;
      }

      setForm((prev) => ({
        ...prev,
        fullAddress: prev.fullAddress || result.formattedAddress || address,
        locationPin: {
          lat: result.lat?.toString?.() || "",
          lng: result.lng?.toString?.() || "",
        },
      }));
      setManualPinOverride(false);
      setHelperMessage(
        `${providerInfo?.name || "Provider"} ile koordinatlar dolduruldu.`,
      );
    } catch (error) {
      setSubmitError(
        error.statusCode === 404
          ? "Adres bulunamadı. OpenStreetMap adresini biraz sadeleştirip tekrar deneyin."
          : error.message || "Adres koordinata çevrilemedi.",
      );
    } finally {
      if (requestId === manualGeocodeRequestIdRef.current) {
        setGeocodeLoading(false);
      }
    }
  };

  useEffect(() => {
    if (
      !providerInfo ||
      !addressQuery ||
      !hasEnoughAddressForGeocoding ||
      manualPinOverride ||
      pinpointMode
    ) {
      return undefined;
    }

    const hasManualCoordinates =
      form.locationPin.lat !== "" && form.locationPin.lng !== "";
    const shouldAutofill =
      !!form.fullAddress.trim() || !hasManualCoordinates;

    if (!shouldAutofill) return undefined;

    const timeoutId = window.setTimeout(async () => {
      const requestId = autoGeocodeRequestIdRef.current + 1;
      autoGeocodeRequestIdRef.current = requestId;
      setGeocodeLoading(true);

      try {
        const response = await bridge.geocoding.geocode(
          geocodeAddressInput || addressQuery,
        );
        const result = response.data;

        if (requestId !== autoGeocodeRequestIdRef.current) {
          return;
        }

        setForm((prev) => {
          const nextLat = result.lat?.toString?.() || "";
          const nextLng = result.lng?.toString?.() || "";

          if (
            prev.locationPin.lat === nextLat &&
            prev.locationPin.lng === nextLng
          ) {
            return prev;
          }

          return {
            ...prev,
            locationPin: {
              lat: nextLat,
              lng: nextLng,
            },
          };
        });

        setHelperMessage("Adres bilgisine göre koordinatlar otomatik dolduruldu.");
        setSubmitError("");
      } catch (error) {
        if (requestId !== autoGeocodeRequestIdRef.current) {
          return;
        }
        setHelperMessage("");
      } finally {
        if (requestId === autoGeocodeRequestIdRef.current) {
          setGeocodeLoading(false);
        }
      }
    }, COORDINATE_AUTO_FILL_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    providerInfo,
    addressQuery,
    geocodeAddressKey,
    hasEnoughAddressForGeocoding,
    manualPinOverride,
    pinpointMode,
    form.fullAddress,
    form.locationPin.lat,
    form.locationPin.lng,
  ]);

  const handleReverseGeocode = async () => {
    const latitude = Number(form.locationPin.lat);
    const longitude = Number(form.locationPin.lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setHelperMessage("Reverse geocoding için geçerli enlem ve boylam girin.");
      return;
    }

    setReverseLoading(true);
    setHelperMessage("");
    setSubmitError("");

    try {
      const response = await bridge.geocoding.reverseGeocode(
        latitude,
        longitude,
      );
      const result = response.data;
      const normalizedCountry = normalizeSupportedPropertyCountry(
        result.country,
      );

      if (result.country && !normalizedCountry) {
        setSubmitError(SUPPORTED_PROPERTY_COUNTRIES_ERROR);
        return;
      }

      setForm((prev) => ({
        ...prev,
        mapSearchAddress: result.address || prev.mapSearchAddress,
        city: result.city || prev.city,
        country: normalizedCountry || prev.country,
      }));
      setManualPinOverride(false);
      setHelperMessage("Koordinatlardan adres bilgisi dolduruldu.");
    } catch (error) {
      setSubmitError(error.message || "Koordinatlardan adres alınamadı.");
    } finally {
      setReverseLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    setHelperMessage("");

    try {
      const normalizedCountry = normalizeSupportedPropertyCountry(form.country);

      if (!normalizedCountry) {
        setSubmitError(SUPPORTED_PROPERTY_COUNTRIES_ERROR);
        return;
      }

      const payload = buildPayload(form);
      const response = await bridge.properties.create(payload);
      const createdId = response.data?.id || response.data?._id;

      if (createdId) {
        try {
          if (imageEntries.length > 0) {
            const imageFormData = new FormData();
            imageEntries.forEach((entry) => {
              imageFormData.append("images", entry.file);
              imageFormData.append(
                "imageRoles",
                entry.isCover ? "cover" : "gallery",
              );
              imageFormData.append(
                "imageFocusX",
                String(entry.presentation?.focusX ?? 50),
              );
              imageFormData.append(
                "imageFocusY",
                String(entry.presentation?.focusY ?? 50),
              );
              imageFormData.append(
                "imageCropPreset",
                String(entry.presentation?.cropPreset ?? "16:9"),
              );
              imageFormData.append("imageWidth", String(entry.width));
              imageFormData.append("imageHeight", String(entry.height));
              imageFormData.append(
                "imageWarnings",
                JSON.stringify(entry.warnings || []),
              );
            });
            const primaryImageIndex = imageEntries.findIndex(
              (entry) => entry.isCover,
            );
            if (primaryImageIndex >= 0) {
              imageFormData.append(
                "primaryImageIndex",
                String(primaryImageIndex),
              );
            }
            await bridge.properties.uploadImage(createdId, imageFormData);
          }

          if (documentEntries.length > 0) {
            const documentFormData = new FormData();
            documentEntries.forEach((entry) => {
              documentFormData.append("documents", entry.file);
              documentFormData.append("documentTypes", entry.type);
              documentFormData.append(
                "documentDescriptions",
                entry.description || "",
              );
            });
            await bridge.properties.uploadDocument(createdId, documentFormData);
          }
        } catch (uploadError) {
          window.alert(
            uploadError?.message
              ? `Property created, but some files could not be uploaded: ${uploadError.message}`
              : "Property created, but some files could not be uploaded.",
          );
          navigate(`/owner/properties/${createdId}`);
          return;
        }
      }

      if (createdId) {
        navigate(`/owner/properties/${createdId}`);
        return;
      }

      navigate("/owner/properties");
    } catch (error) {
      setSubmitError(error.message || "Property oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    const cityFromSuggestion =
      getAddressComponent(suggestion.addressComponents, "locality") ||
      getAddressComponent(
        suggestion.addressComponents,
        "administrative_area_level_1",
      ) ||
      form.city;

    const countryFromSuggestion =
      getAddressComponent(suggestion.addressComponents, "country") ||
      form.country;
    const normalizedCountry = normalizeSupportedPropertyCountry(
      countryFromSuggestion,
    );

    if (!normalizedCountry) {
      setSubmitError(SUPPORTED_PROPERTY_COUNTRIES_ERROR);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setForm((prev) => ({
      ...prev,
      mapSearchAddress: suggestion.formattedAddress || prev.mapSearchAddress,
      city: cityFromSuggestion || prev.city,
      country: normalizedCountry || prev.country,
      locationPin: {
        lat: suggestion.lat?.toString?.() || prev.locationPin.lat,
        lng: suggestion.lng?.toString?.() || prev.locationPin.lng,
      },
    }));
    setManualPinOverride(false);
    setSuggestions([]);
    setShowSuggestions(false);
    setHelperMessage("Adres secildi, koordinatlar ve harita guncellendi.");
    setSubmitError("");
  };

  const handlePinpointPick = ({ lat: nextLat, lng: nextLng }) => {
    setManualPinOverride(true);
    setForm((prev) => ({
      ...prev,
      locationPin: {
        lat: nextLat.toString(),
        lng: nextLng.toString(),
      },
    }));
    setPinpointMode(false);
    setHelperMessage(
      "Pinpoint secildi. Isterseniz reverse geocode ile adresi yenileyebilirsiniz.",
    );
    setSubmitError("");
  };

  const handleImageSelection = (event) => {
    const input = event.target;
    const files = Array.from(event.target.files || []);
    const validFiles = validateFilesByExtension(
      files,
      PROPERTY_IMAGE_EXTENSIONS,
    );
    const availableSlots = PROPERTY_IMAGE_MAX_COUNT - imageEntriesRef.current.length;
    const filesToAnalyze = validFiles.slice(0, Math.max(0, availableSlots));

    const analyzeFiles = async () => {
      if (validFiles.length !== files.length) {
        setSubmitError(
          "Some image files were skipped. Allowed extensions: jpg, jpeg, png, webp.",
        );
      } else if (validFiles.length > availableSlots) {
        setSubmitError(
          `You can upload up to ${PROPERTY_IMAGE_MAX_COUNT} images per property.`,
        );
      } else {
        setSubmitError("");
      }

      if (filesToAnalyze.length === 0) {
        input.value = "";
        return;
      }

      setImageAnalysisLoading(true);

      try {
        const analyzedEntries = await Promise.all(
          filesToAnalyze.map((file) => createPropertyImageEntry(file)),
        );

        setImageEntries((prev) =>
          syncImageCoverState([...prev, ...analyzedEntries]),
        );
      } catch (error) {
        setSubmitError(error.message || "Image preview analysis failed.");
      } finally {
        setImageAnalysisLoading(false);
        input.value = "";
      }
    };

    analyzeFiles();
  };

  const handleDocumentSelection = (event) => {
    const files = Array.from(event.target.files || []);
    const validFiles = validateFilesByExtension(
      files,
      PROPERTY_DOCUMENT_EXTENSIONS,
    );

    if (validFiles.length !== files.length) {
      setSubmitError(
        "Some document files were skipped. Allowed extensions: pdf, jpg, jpeg, png.",
      );
    } else {
      setSubmitError("");
    }

    setDocumentEntries((prev) => [
      ...prev,
      ...validFiles.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        type: "other",
        description: "",
      })),
    ]);
    event.target.value = "";
  };

  const removeImageFile = (entryId) => {
    setImageEntries((prev) => {
      const targetEntry = prev.find((entry) => entry.id === entryId);
      if (targetEntry?.previewUrl) {
        URL.revokeObjectURL(targetEntry.previewUrl);
      }

      return syncImageCoverState(
        prev.filter((entry) => entry.id !== entryId),
      );
    });
  };

  const setCoverImage = (entryId) => {
    setImageEntries((prev) => syncImageCoverState(prev, entryId));
  };

  const updateImagePresentation = (entryId, nextPresentation) => {
    setImageEntries((prev) =>
      syncImageCoverState(
        prev.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                presentation: {
                  ...entry.presentation,
                  ...nextPresentation,
                },
              }
            : entry,
        ),
      ),
    );
  };

  const removeDocumentEntry = (entryId) => {
    setDocumentEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  const updateDocumentEntry = (entryId, field, value) => {
    setDocumentEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const togglePinpointMode = () => {
    setPinpointMode((prev) => !prev);
  };

  useEffect(() => {
    imageEntriesRef.current = imageEntries;
  }, [imageEntries]);

  useEffect(
    () => () => {
      imageEntriesRef.current.forEach((entry) => {
        if (entry?.previewUrl) {
          URL.revokeObjectURL(entry.previewUrl);
        }
      });
    },
    [],
  );

  useEffect(() => {
    const query = form.mapSearchAddress.trim();

    if (query.length < 3) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      const requestId = searchRequestIdRef.current + 1;
      searchRequestIdRef.current = requestId;
      setSuggestionsLoading(true);

      try {
        const response = await bridge.geocoding.search({
          query: dedupeAddressParts([
            form.mapSearchAddress,
            form.city,
            form.country,
          ]).join(", "),
          countryCode,
          limit: 5,
        });

        if (requestId !== searchRequestIdRef.current) {
          return;
        }

        setSuggestions(response.data || []);
      } catch (error) {
        if (requestId !== searchRequestIdRef.current) {
          return;
        }
        setSuggestions([]);
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setSuggestionsLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [form.mapSearchAddress, form.city, form.country, countryCode]);

  return (
    <div className="min-h-screen bg-day-dashboard dark:bg-night-dashboard px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              to="/owner/properties"
              className="text-sm text-day-primary dark:text-night-primary"
            >
              ← Properties
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-day-text dark:text-night-text">
              Create Property
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-day-text/65 dark:text-night-text/65">
              Owner listing akışını backend geocoding katmanıyla bağlıyoruz.
              Adresi koordinata çevirebilir, koordinattan adres doldurabilir ve
              aktif provider’a göre harita önizlemesi görebilirsiniz.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-3xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
                    Listing Details
                  </h2>
                  <p className="text-sm text-day-text/60 dark:text-night-text/60">
                    Temel mülk ve yatırım bilgilerini girin.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Status: draft
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-day-text dark:text-night-text">
                    Country
                  </span>
                  <select
                    required
                    value={form.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm text-day-text dark:text-night-text outline-none focus:ring-2 focus:ring-day-primary/25 dark:focus:ring-night-primary/25"
                  >
                    <option value="" disabled>
                      Select a supported country
                    </option>
                    {SUPPORTED_PROPERTY_COUNTRIES.map((country) => (
                      <option key={country.code} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-day-text/55 dark:text-night-text/55">
                    Supported countries: {SUPPORTED_PROPERTY_COUNTRIES_LABEL}
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-day-text dark:text-night-text">
                    City
                  </span>
                  <input
                    required
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm text-day-text dark:text-night-text outline-none focus:ring-2 focus:ring-day-primary/25 dark:focus:ring-night-primary/25"
                    placeholder="Istanbul"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-day-text dark:text-night-text">
                    Title Deed Address
                  </span>
                  <textarea
                    rows={3}
                    value={form.fullAddress}
                    onChange={(e) => updateField("fullAddress", e.target.value)}
                    className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm text-day-text dark:text-night-text outline-none focus:ring-2 focus:ring-day-primary/25 dark:focus:ring-night-primary/25"
                    placeholder="Tapudaki resmi adresi girin"
                  />
                  <p className="text-xs text-day-text/55 dark:text-night-text/55">
                    Bu alan resmi tapu adresi icindir. Harita konumu icin
                    asagidaki ayri arama alanini kullanin.
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-day-text dark:text-night-text">
                    Property Type
                  </span>
                  <select
                    value={form.propertyType}
                    onChange={(e) => updateField("propertyType", e.target.value)}
                    className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm text-day-text dark:text-night-text outline-none"
                  >
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="commercial">Commercial</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-day-text dark:text-night-text">
                    Currency
                  </span>
                  <select
                    value={form.currency}
                    onChange={(e) => updateField("currency", e.target.value)}
                    className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm text-day-text dark:text-night-text outline-none"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="TRY">TRY</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-day-text dark:text-night-text">
                    Size (m²)
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={form.size}
                    onChange={(e) => updateField("size", e.target.value)}
                    className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm text-day-text dark:text-night-text outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-day-text dark:text-night-text">
                    Rooms
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={form.rooms}
                    onChange={(e) => updateField("rooms", e.target.value)}
                    className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm text-day-text dark:text-night-text outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-day-text dark:text-night-text">
                    Estimated Value
                  </span>
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.estimatedValue}
                    onChange={(e) =>
                      updateField("estimatedValue", e.target.value)
                    }
                    className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm text-day-text dark:text-night-text outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-day-text dark:text-night-text">
                    Requested Investment
                  </span>
                  <input
                    required
                    type="number"
                    min="10000"
                    value={form.requestedInvestment}
                    onChange={(e) =>
                      updateField("requestedInvestment", e.target.value)
                    }
                    className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm text-day-text dark:text-night-text outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-day-text dark:text-night-text">
                    Monthly Rent Offered
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={form.rentOffered}
                    onChange={(e) => updateField("rentOffered", e.target.value)}
                    className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm text-day-text dark:text-night-text outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-day-text dark:text-night-text">
                    Annual Yield Percent
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.annualYieldPercent}
                    onChange={(e) =>
                      updateField("annualYieldPercent", e.target.value)
                    }
                    className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm text-day-text dark:text-night-text outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-day-text dark:text-night-text">
                    Contract Period (Months)
                  </span>
                  <input
                    required
                    type="number"
                    min="12"
                    value={form.contractPeriodMonths}
                    onChange={(e) =>
                      updateField("contractPeriodMonths", e.target.value)
                    }
                    className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm text-day-text dark:text-night-text outline-none"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-day-text dark:text-night-text">
                    Description
                  </span>
                  <textarea
                    rows={5}
                    value={form.description}
                    onChange={(e) =>
                      updateField("description", e.target.value)
                    }
                    className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm text-day-text dark:text-night-text outline-none"
                    placeholder="Property details, neighborhood context, and investment notes."
                  />
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
                  Media & Documents
                </h2>
                <p className="text-sm text-day-text/60 dark:text-night-text/60">
                  Property image files public gorunur. Belgeler sadece owner ve
                  admin tarafinda gorunur.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-day-text dark:text-night-text">
                        Property Images
                      </h3>
                      <p className="text-xs text-day-text/55 dark:text-night-text/55">
                        Upload flexible gallery photos, then choose one cover
                        image and adjust its 16:9 framing.
                      </p>
                    </div>
                    <label className="rounded-2xl bg-day-primary dark:bg-night-primary px-4 py-2 text-sm font-semibold text-white cursor-pointer">
                      {imageAnalysisLoading ? "Analyzing..." : "Select Images"}
                      <input
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={handleImageSelection}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    {imageEntries.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-day-border dark:border-night-border px-4 py-4 text-sm text-day-text/55 dark:text-night-text/55">
                        No images selected yet. Upload gallery photos first,
                        then pick a cover crop preset like{" "}
                        {PROPERTY_CROP_PRESETS.map((preset) => preset.label).join(
                          ", ",
                        )}
                        .
                      </div>
                    ) : (
                      <>
                        {coverImage && (
                          <div className="rounded-3xl border border-day-border dark:border-night-border p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-day-text dark:text-night-text">
                                  Cover Preview
                                </p>
                                <p className="text-xs text-day-text/55 dark:text-night-text/55">
                                  The selected crop preset and framing are shown
                                  here before upload.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setCoverEditorImageId(coverImage.id)}
                                className="rounded-2xl border border-day-border dark:border-night-border px-3 py-2 text-xs font-semibold text-day-text dark:text-night-text"
                              >
                                Adjust cover
                              </button>
                            </div>

                            <div
                              className="overflow-hidden rounded-2xl bg-day-background dark:bg-night-background"
                              style={{
                                aspectRatio: getCropAspectRatio(
                                  coverImage.presentation?.cropPreset,
                                ),
                              }}
                            >
                              <img
                                src={coverImage.previewUrl}
                                alt={`${coverImage.file.name} cover`}
                                className="h-full w-full object-cover"
                                style={{
                                  objectPosition: `${coverImage.presentation?.focusX ?? 50}% ${coverImage.presentation?.focusY ?? 50}%`,
                                }}
                              />
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full bg-day-primary/10 px-3 py-1 text-xs font-semibold text-day-primary dark:bg-night-primary/15 dark:text-night-primary">
                                Cover image
                              </span>
                              <span className="rounded-full bg-day-background px-3 py-1 text-xs text-day-text/70 dark:bg-night-background dark:text-night-text/70">
                                {coverPreset.label}
                              </span>
                              <span className="rounded-full bg-day-background px-3 py-1 text-xs text-day-text/70 dark:bg-night-background dark:text-night-text/70">
                                Crop {coverCropMetrics?.width ?? "-"} ×{" "}
                                {coverCropMetrics?.height ?? "-"}
                              </span>
                              <span className="rounded-full bg-day-background px-3 py-1 text-xs text-day-text/70 dark:bg-night-background dark:text-night-text/70">
                                {coverImage.width} × {coverImage.height} original
                              </span>
                            </div>

                            {coverWarnings.length > 0 && (
                              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                                {coverWarnings.join(" ")}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-2">
                          {imageEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="overflow-hidden rounded-3xl border border-day-border dark:border-night-border"
                            >
                              <div className="relative h-48 bg-day-background dark:bg-night-background">
                                <img
                                  src={entry.previewUrl}
                                  alt={entry.file.name}
                                  className="h-full w-full object-cover"
                                  style={{
                                    objectPosition: `${entry.presentation?.focusX ?? 50}% ${entry.presentation?.focusY ?? 50}%`,
                                  }}
                                />
                                <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                                  {entry.isCover && (
                                    <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-day-primary">
                                      Cover
                                    </span>
                                  )}
                                  {entry.warnings.length > 0 && (
                                    <span className="rounded-full bg-amber-500/90 px-3 py-1 text-[11px] font-semibold text-white">
                                      Quality warning
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-3 p-4">
                                <div>
                                  <p className="text-sm font-medium text-day-text dark:text-night-text">
                                    {entry.file.name}
                                  </p>
                                  <p className="text-xs text-day-text/55 dark:text-night-text/55">
                                    {entry.width} × {entry.height} · {entry.sizeLabel}
                                  </p>
                                </div>

                                {entry.warnings.length > 0 && (
                                  <div className="rounded-2xl bg-amber-50 px-3 py-3 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                                    {entry.warnings.join(" ")}
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setCoverImage(entry.id)}
                                    className={`rounded-2xl px-3 py-2 text-xs font-semibold ${
                                      entry.isCover
                                        ? "bg-day-primary text-white dark:bg-night-primary"
                                        : "border border-day-border text-day-text dark:border-night-border dark:text-night-text"
                                    }`}
                                  >
                                    {entry.isCover ? "Selected cover" : "Use as cover"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCoverEditorImageId(entry.id)}
                                    className="rounded-2xl border border-day-border dark:border-night-border px-3 py-2 text-xs font-semibold text-day-text dark:text-night-text"
                                  >
                                    Adjust framing
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeImageFile(entry.id)}
                                    className="rounded-2xl border border-day-border dark:border-night-border px-3 py-2 text-xs font-semibold text-day-text dark:text-night-text"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-day-text dark:text-night-text">
                        Property Documents
                      </h3>
                      <p className="text-xs text-day-text/55 dark:text-night-text/55">
                        Allowed: pdf, jpg, jpeg, png. Each document needs a
                        type.
                      </p>
                    </div>
                    <label className="rounded-2xl border border-day-border dark:border-night-border px-4 py-2 text-sm font-semibold cursor-pointer">
                      Select Documents
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleDocumentSelection}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="space-y-3">
                    {documentEntries.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-day-border dark:border-night-border px-4 py-4 text-sm text-day-text/55 dark:text-night-text/55">
                        No documents selected yet.
                      </div>
                    ) : (
                      documentEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-2xl border border-day-border dark:border-night-border p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-day-text dark:text-night-text">
                                {entry.file.name}
                              </p>
                              <p className="text-xs text-day-text/55 dark:text-night-text/55">
                                {(entry.file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDocumentEntry(entry.id)}
                              className="rounded-xl border border-day-border dark:border-night-border px-3 py-1.5 text-xs font-semibold"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <select
                              value={entry.type}
                              onChange={(e) =>
                                updateDocumentEntry(
                                  entry.id,
                                  "type",
                                  e.target.value,
                                )
                              }
                              className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm"
                            >
                              {PROPERTY_DOCUMENT_TYPES.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <input
                              value={entry.description}
                              onChange={(e) =>
                                updateDocumentEntry(
                                  entry.id,
                                  "description",
                                  e.target.value,
                                )
                              }
                              className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm"
                              placeholder="Optional description"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
                  Location & Maps
                </h2>
                <p className="text-sm text-day-text/60 dark:text-night-text/60">
                  Musteriye haritada gosterilecek konumu buradan secin. Bu alan
                  tapu adresinden bagimsiz calisir.
                </p>
              </div>

              <div className="mb-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-day-text dark:text-night-text">
                    Map Search / Location Description
                  </span>
                  <div className="relative">
                    <input
                      value={form.mapSearchAddress}
                      onChange={(e) => {
                        updateField("mapSearchAddress", e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm text-day-text dark:text-night-text outline-none focus:ring-2 focus:ring-day-primary/25 dark:focus:ring-night-primary/25"
                      placeholder="Mekan adi, mahalle, sokak veya bilinen bir lokasyon yazin"
                    />
                    {showSuggestions &&
                    (suggestionsLoading || suggestions.length > 0) ? (
                      <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-2 shadow-2xl">
                        {suggestionsLoading ? (
                          <div className="px-3 py-2 text-sm text-day-text/60 dark:text-night-text/60">
                            Adres onerileri aranıyor...
                          </div>
                        ) : (
                          suggestions.map((suggestion) => (
                            <button
                              key={suggestion.placeId}
                              type="button"
                              onClick={() => handleSuggestionSelect(suggestion)}
                              className="block w-full rounded-xl px-3 py-2 text-left hover:bg-day-background dark:hover:bg-night-background"
                            >
                              <div className="text-sm font-medium text-day-text dark:text-night-text">
                                {suggestion.name || suggestion.formattedAddress}
                              </div>
                              <div className="mt-0.5 text-xs text-day-text/60 dark:text-night-text/60">
                                {suggestion.formattedAddress}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                  <p className="text-xs text-day-text/55 dark:text-night-text/55">
                    Buradaki secim sadece harita preview ve konum koordinati
                    icin kullanilir.
                  </p>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-day-text dark:text-night-text">
                    Latitude
                  </span>
                  <input
                    type="number"
                    step="0.000001"
                    value={form.locationPin.lat}
                    onChange={(e) =>
                      updateLocationField("lat", e.target.value)
                    }
                    className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm text-day-text dark:text-night-text outline-none"
                    placeholder="41.0082"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-day-text dark:text-night-text">
                    Longitude
                  </span>
                  <input
                    type="number"
                    step="0.000001"
                    value={form.locationPin.lng}
                    onChange={(e) =>
                      updateLocationField("lng", e.target.value)
                    }
                    className="w-full rounded-2xl border border-day-border dark:border-night-border bg-day-background dark:bg-night-background px-4 py-3 text-sm text-day-text dark:text-night-text outline-none"
                    placeholder="28.9784"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleGeocode}
                  disabled={geocodeLoading}
                  className="rounded-2xl bg-day-primary dark:bg-night-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {geocodeLoading
                    ? "Finding coordinates..."
                    : "Refresh coordinates"}
                </button>

                <button
                  type="button"
                  onClick={handleReverseGeocode}
                  disabled={reverseLoading}
                  className="rounded-2xl border border-day-border dark:border-night-border px-4 py-2.5 text-sm font-semibold text-day-text dark:text-night-text disabled:opacity-60"
                >
                  {reverseLoading
                    ? "Filling address..."
                    : "Reverse geocode coordinates"}
                </button>

                <button
                  type="button"
                  onClick={togglePinpointMode}
                  disabled={!Number.isFinite(lat) || !Number.isFinite(lng)}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
                    pinpointMode
                      ? "bg-amber-500 text-white"
                      : "border border-day-border dark:border-night-border text-day-text dark:text-night-text"
                  }`}
                >
                  {pinpointMode ? "Exit pinpoint mode" : "Pinpoint on map"}
                </button>
              </div>
            </div>

            {(submitError || helperMessage) && (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  submitError
                    ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                }`}
              >
                {submitError || helperMessage}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-2xl bg-day-primary dark:bg-night-primary px-6 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              >
                {submitting ? "Creating property..." : "Create Property"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/owner/properties")}
                className="rounded-2xl border border-day-border dark:border-night-border px-6 py-3 text-sm font-semibold text-day-text dark:text-night-text"
              >
                Cancel
              </button>
            </div>
          </form>

          <aside className="space-y-6">
            {loadingProvider ? (
              <div className="rounded-3xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5 text-sm text-day-text/60 dark:text-night-text/60">
                Map provider bilgisi yükleniyor...
              </div>
            ) : providerError ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                {providerError}
              </div>
            ) : (
              <ProviderBadge providerInfo={providerInfo} />
            )}

            <div className="rounded-3xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
                    Live Map Preview
                  </h2>
                  <p className="text-sm text-day-text/60 dark:text-night-text/60">
                    Aktif provider:{" "}
                    <span className="font-medium">
                      {providerKey === "google"
                        ? "Google Maps"
                        : "OpenStreetMap"}
                    </span>
                  </p>
                </div>
              </div>

              <MapPreview
                lat={lat}
                lng={lng}
                pinpointMode={pinpointMode}
                onPinpointPick={handlePinpointPick}
              />

              <div className="mt-4 rounded-2xl bg-day-background dark:bg-night-background p-4 text-sm text-day-text/65 dark:text-night-text/65">
                <p>
                  Adres alanlarını doldurduğunuzda koordinatlar otomatik bulunur
                  ve önizleme kendini günceller. İsterseniz sağlama yapmak için
                  koordinatları elle de düzeltebilirsiniz.
                </p>
                {pinpointMode ? (
                  <p className="mt-2 font-medium text-amber-600 dark:text-amber-400">
                    Pinpoint mode acik. Haritayi normal sekilde surukleyip
                    yakinlastirin, sonra istediginiz noktaya tiklayin.
                  </p>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {coverEditorImage && (
        <CoverImageEditorModal
          imageEntry={coverEditorImage}
          onClose={() => setCoverEditorImageId(null)}
          onSave={(nextPresentation) => {
            updateImagePresentation(coverEditorImage.id, nextPresentation);
            setCoverEditorImageId(null);
          }}
        />
      )}
    </div>
  );
};

export default OwnerPropertyCreate;
