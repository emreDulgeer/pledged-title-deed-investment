import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Eye,
  FileText,
  Landmark,
  Loader2,
  MapPin,
  Ruler,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import bridge from "../../controllers/bridge";
import PropertyController from "../../controllers/propertyController";
import InvestmentController from "../../controllers/investmentController";
import DocumentPreviewModal from "../../components/common/DocumentPreviewModal";
import {
  DocumentsList,
  LocationMap,
  OwnerCard,
} from "../../components/property/detail";
import { resolveFileUrl } from "../../components/property/detail/_utils";
import {
  getPrimaryPropertyImage,
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";
import { APP_CURRENCY_SYMBOL } from "../../utils/currency";
import { getUserId, getUserProfilePath } from "../../utils/profileRoutes";
import { useAppFeedback } from "../../utils/hooks/useAppFeedback";

const formatAmount = (value) =>
  `${Number(value || 0).toLocaleString("en-US")} ${APP_CURRENCY_SYMBOL}`;

const formatPercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "—";

  return `${parsed % 1 === 0 ? parsed.toFixed(0) : parsed.toFixed(2)}%`;
};

const formatPropertyType = (value = "") => {
  if (!value) return "Property";

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatStatus = (value = "") => {
  if (!value) return "Published";

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const getPropertyId = (property) => property?.id || property?._id || "";

const getPropertyHeadline = (property) =>
  property?.title ||
  [property?.city, property?.country].filter(Boolean).join(", ") ||
  "Property Detail";

const getPropertyLocation = (property) =>
  property?.fullAddress ||
  property?.mapSearchAddress ||
  [property?.city, property?.country].filter(Boolean).join(", ") ||
  "Address not provided";

const getTrustScore = (property) =>
  property?.ownerTrustScore ||
  property?.owner?.trustScore ||
  property?.trustScore ||
  0;

const getOwnerSummary = (owner) => {
  if (!owner) return null;

  return {
    ...owner,
    fullName:
      owner.fullName ||
      [owner.firstName, owner.lastName].filter(Boolean).join(" ") ||
      owner.email ||
      "Property owner",
    phone: owner.phone || owner.phoneNumber || null,
    verificationStatus: owner.verificationStatus || owner.kycStatus || "Pending",
  };
};

const getDocumentFileId = (document) => {
  if (!document) return "";

  const rawId =
    document.fileId?._id ||
    document.fileId?.id ||
    document.fileId ||
    document.id ||
    document._id;

  return rawId ? String(rawId) : "";
};

const MetricCard = ({ label, value, icon: Icon, accentClass = "" }) => (
  <div className="shell-subtle-surface px-4 py-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
          {label}
        </p>
        <p
          className={`mt-3 text-xl font-semibold text-day-text dark:text-night-text ${accentClass}`.trim()}
        >
          {value}
        </p>
      </div>

      {Icon ? (
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-surface text-day-primary dark:bg-night-surface dark:text-night-primary">
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </div>
      ) : null}
    </div>
  </div>
);

const DataRow = ({ label, value, valueClassName = "" }) => (
  <div className="flex items-start justify-between gap-4 border-b border-day-border/70 py-3 last:border-b-0 last:pb-0 first:pt-0 dark:border-night-border/70">
    <span className="text-sm text-day-muted dark:text-night-muted">{label}</span>
    <span
      className={`text-right text-sm font-medium text-day-text dark:text-night-text ${valueClassName}`.trim()}
    >
      {value}
    </span>
  </div>
);

const OfferField = ({ label, hint, children }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
      {label}
    </span>
    {children}
    {hint ? (
      <span className="mt-2 block text-xs text-day-muted dark:text-night-muted">
        {hint}
      </span>
    ) : null}
  </label>
);

const ProcessStep = ({ title, copy, active = false }) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div
        className={`grid h-10 w-10 place-items-center rounded-2xl border text-sm font-semibold ${
          active
            ? "border-day-primary bg-day-primary text-white dark:border-night-primary dark:bg-night-primary dark:text-night-background"
            : "border-day-border bg-day-surface text-day-muted dark:border-night-border dark:bg-night-surface dark:text-night-muted"
        }`}
      >
        {active ? <BadgeCheck className="h-4 w-4" strokeWidth={2.3} /> : "•"}
      </div>
      <div className="mt-2 h-full w-px bg-day-border/70 dark:bg-night-border/70" />
    </div>

    <div className="pb-6">
      <h3 className="text-sm font-semibold text-day-text dark:text-night-text">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
        {copy}
      </p>
    </div>
  </div>
);

const GalleryThumb = ({
  image,
  index,
  isActive,
  onSelect,
  isCountTile = false,
  remainingCount = 0,
}) => (
  <button
    type="button"
    onClick={() => onSelect(index)}
    className={`group relative min-h-[112px] overflow-hidden rounded-[22px] border transition ${
      isActive
        ? "border-day-primary ring-4 ring-day-primary/10 dark:border-night-primary dark:ring-night-primary/15"
        : "border-day-border/70 dark:border-night-border/70"
    }`}
  >
    {image ? (
      <img
        src={getPropertyImageUrl(image)}
        alt={`Property gallery ${index + 1}`}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        style={getPropertyImageStyle(image)}
      />
    ) : (
      <div className="grid h-full w-full place-items-center bg-day-panel text-day-primary/40 dark:bg-night-panel dark:text-night-primary/40">
        <Building2 className="h-8 w-8" strokeWidth={1.8} />
      </div>
    )}

    {isCountTile ? (
      <div className="absolute inset-0 grid place-items-center bg-day-background/55 text-center backdrop-blur-sm dark:bg-night-background/55">
        <div>
          <p className="text-lg font-semibold text-day-text dark:text-night-text">
            +{remainingCount}
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
            more photos
          </p>
        </div>
      </div>
    ) : null}
  </button>
);

const LoadingState = () => (
  <div className="space-y-6 p-4 sm:p-6 xl:p-8">
    <div className="h-7 w-40 animate-pulse rounded-full bg-day-panel/60 dark:bg-night-panel/60" />

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.42fr)_360px]">
      <div className="space-y-6">
        <div className="shell-surface overflow-hidden p-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="h-[420px] animate-pulse rounded-[24px] bg-day-panel/60 dark:bg-night-panel/60" />
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[132px] animate-pulse rounded-[22px] bg-day-panel/60 dark:bg-night-panel/60"
                />
              ))}
            </div>
          </div>

          <div className="mt-3 grid gap-3 border-t border-day-border/70 px-3 pt-6 dark:border-night-border/70 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-3xl bg-day-panel/60 dark:bg-night-panel/60"
              />
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="shell-surface h-80 animate-pulse bg-day-panel/60 dark:bg-night-panel/60" />
          <div className="shell-surface h-80 animate-pulse bg-day-panel/60 dark:bg-night-panel/60" />
        </div>

        <div className="shell-surface h-72 animate-pulse bg-day-panel/60 dark:bg-night-panel/60" />
      </div>

      <div className="space-y-6">
        <div className="shell-surface h-[620px] animate-pulse bg-day-panel/60 dark:bg-night-panel/60" />
        <div className="shell-surface h-80 animate-pulse bg-day-panel/60 dark:bg-night-panel/60" />
      </div>
    </div>
  </div>
);

const EmptyState = ({ onBack }) => (
  <div className="p-4 sm:p-6 xl:p-8">
    <div className="shell-surface px-6 py-12 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
        <Building2 className="h-8 w-8" strokeWidth={1.9} />
      </div>

      <h1 className="mt-6 text-2xl font-semibold text-day-text dark:text-night-text">
        Property not found
      </h1>
      <p className="mt-3 text-sm leading-6 text-day-muted dark:text-night-muted">
        The property may no longer be published or accessible to investors.
      </p>

      <button
        type="button"
        onClick={onBack}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-day-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
        Back to properties
      </button>
    </div>
  </div>
);

const InvestorPropertyDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const feedback = useAppFeedback();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [error, setError] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [ownershipPercent, setOwnershipPercent] = useState("");
  const [desiredMonthlyRent, setDesiredMonthlyRent] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [previewDocument, setPreviewDocument] = useState(null);

  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await PropertyController.getById(id);

        if (response?.success && response.data) {
          setProperty(response.data);
          return;
        }

        setProperty(null);
        setError("Property details could not be loaded.");
      } catch (fetchError) {
        console.error("Investor property detail error:", fetchError);
        setProperty(null);
        setError(fetchError.message || "Property details could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  const propertyId = getPropertyId(property);
  const requestedInvestment = Number(property?.requestedInvestment || 0);

  const images = useMemo(() => {
    if (!property) return [];

    if (Array.isArray(property.images) && property.images.length > 0) {
      return property.images.filter(Boolean);
    }

    const primaryImage = getPrimaryPropertyImage(property);
    return primaryImage ? [primaryImage] : [];
  }, [property]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [propertyId]);

  useEffect(() => {
    if (!property) return;

    setOfferAmount(String(property.requestedInvestment || ""));
    setOwnershipPercent("100");
    setDesiredMonthlyRent(String(property.rentOffered || ""));
    setOfferMessage("");
  }, [property]);

  const selectedImage = images[selectedImageIndex] || images[0] || null;
  const galleryThumbnails = images.slice(0, 3);

  const normalizedOwner = useMemo(
    () => getOwnerSummary(property?.owner),
    [property],
  );
  const ownerProfilePath = normalizedOwner
    ? getUserProfilePath(getUserId(normalizedOwner))
    : null;

  const normalizedDocuments = useMemo(() => {
    return (property?.documents || []).map((document, index) => {
      const fileId = getDocumentFileId(document);

      return {
        ...document,
        fileId,
        name:
          document.fileName ||
          document.name ||
          document.originalName ||
          document.fileId?.originalName ||
          `Document ${index + 1}`,
        previewUrl:
          bridge.files.getPreviewUrl(fileId) ||
          resolveFileUrl(document.url || document.path || ""),
      };
    });
  }, [property]);

  const offerAmountValue = Number(offerAmount || 0);
  const desiredMonthlyRentValue = Number(desiredMonthlyRent || 0);
  const ownershipPercentValue = Number(ownershipPercent || 0);
  const projectedYield =
    offerAmountValue > 0
      ? (((desiredMonthlyRentValue * 12) / offerAmountValue) * 100).toFixed(2)
      : "0.00";

  const hasCoordinates =
    Number.isFinite(Number(property?.locationPin?.lat)) &&
    Number.isFinite(Number(property?.locationPin?.lng));
  const officialCityCountry = [property?.city, property?.country]
    .filter(Boolean)
    .join(", ");
  const titleDeedAddress = property?.fullAddress || "—";
  const mapReferenceAddress = property?.mapSearchAddress || "";
  const showMapReferenceAddress =
    Boolean(mapReferenceAddress) && mapReferenceAddress !== property?.fullAddress;

  const facts = [
    {
      label: "Property type",
      value: formatPropertyType(property?.propertyType),
    },
    {
      label: "Rooms",
      value: property?.rooms || "—",
    },
    {
      label: "Size",
      value: property?.size ? `${property.size} m²` : "—",
    },
    {
      label: "Estimated value",
      value: property?.estimatedValue ? formatAmount(property.estimatedValue) : "—",
    },
    {
      label: "Contract period",
      value: property?.contractPeriodMonths
        ? `${property.contractPeriodMonths} months`
        : "—",
    },
    {
      label: "Published status",
      value: formatStatus(property?.status),
    },
  ];

  const sponsorFacts = [
    {
      label: "Owner trust score",
      value: `${getTrustScore(property)}/100`,
    },
    {
      label: "Verification",
      value: normalizedOwner?.verificationStatus || "Pending",
      valueClassName:
        normalizedOwner?.verificationStatus === "Approved"
          ? "text-emerald-600 dark:text-emerald-300"
          : "",
    },
    {
      label: "Offer activity",
      value: property?.metadata?.totalOffers
        ? `${property.metadata.totalOffers} active offer${
            property.metadata.totalOffers > 1 ? "s" : ""
          }`
        : "No active offers yet",
    },
    {
      label: "Created",
      value: property?.createdAt
        ? new Date(property.createdAt).toLocaleDateString()
        : "—",
    },
    {
      label: "Updated",
      value: property?.updatedAt
        ? new Date(property.updatedAt).toLocaleDateString()
        : "—",
    },
    {
      label: "Market",
      value: [property?.city, property?.country].filter(Boolean).join(", ") || "—",
    },
  ];

  const handleOfferAmountChange = (value) => {
    if (value === "") {
      setOfferAmount("");
      setOwnershipPercent("");
      return;
    }

    const parsedAmount = Number(value);
    const normalizedAmount =
      Number.isFinite(parsedAmount) && requestedInvestment > 0
        ? Math.min(requestedInvestment, Math.max(parsedAmount, 0))
        : value;

    setOfferAmount(String(normalizedAmount));

    if (!requestedInvestment || !Number.isFinite(Number(normalizedAmount))) {
      setOwnershipPercent("");
      return;
    }

    const computedPercent = Math.min(
      100,
      Math.max(0, (Number(normalizedAmount) / requestedInvestment) * 100),
    );

    setOwnershipPercent(computedPercent.toFixed(2));
  };

  const handleOwnershipPercentChange = (value) => {
    const parsedPercent = Number(value);

    if (!requestedInvestment || !Number.isFinite(parsedPercent) || value === "") {
      setOwnershipPercent(value);
      setOfferAmount("");
      return;
    }

    const clampedPercent = Math.min(100, Math.max(0, parsedPercent));
    setOwnershipPercent(clampedPercent.toFixed(2));

    const computedAmount = (requestedInvestment * clampedPercent) / 100;
    setOfferAmount(computedAmount.toFixed(2));
  };

  const isOfferValid =
    property?.status === "published" &&
    offerAmountValue > 0 &&
    offerAmountValue <= requestedInvestment &&
    ownershipPercentValue > 0 &&
    ownershipPercentValue <= 100 &&
    desiredMonthlyRentValue > 0;

  const handleCreateOffer = async () => {
    if (!propertyId) return;

    setSubmittingOffer(true);
    setError("");

    try {
      const response = await InvestmentController.createInvestmentOffer(
        propertyId,
        {
          amountInvested: Number(offerAmount),
          ownershipPercent: Number(ownershipPercent),
          desiredMonthlyRent: Number(desiredMonthlyRent),
          message: offerMessage,
        },
      );

      const investmentId = response?.data?.id || response?.data?._id;

      if (investmentId) {
        navigate(`/investor/investments/${investmentId}`);
        return;
      }

      navigate("/investor/investments");
    } catch (submitError) {
      console.error("Create investment offer error:", submitError);
      setError(
        submitError.message || "The investment offer could not be created.",
      );
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleDownloadDocument = (fileId, fileName) => {
    if (!fileId) return;

    try {
      const downloadUrl = bridge.files.getDownloadUrl(fileId);

      if (!downloadUrl) {
        throw new Error("Download URL could not be created");
      }

      bridge.files.triggerBrowserDownload(downloadUrl, fileName);
    } catch (downloadError) {
      console.error("Property document download error:", downloadError);
      feedback.error("The document could not be downloaded.");
    }
  };

  const handlePreviewDocument = (previewUrl, document) => {
    if (!previewUrl) return;

    setPreviewDocument({
      url: previewUrl,
      title: document?.name || document?.fileName || "Document preview",
    });
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!property) {
    return <EmptyState onBack={() => navigate("/investor/properties")} />;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 xl:p-8">
      {previewDocument?.url ? (
        <DocumentPreviewModal
          title={previewDocument.title}
          url={previewDocument.url}
          onClose={() => setPreviewDocument(null)}
        />
      ) : null}

      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate("/investor/properties")}
            className="inline-flex items-center gap-2 text-sm font-medium text-day-primary transition hover:text-day-primary-dark dark:text-night-primary dark:hover:text-night-primary-dark"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
            Back to properties
          </button>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-day-primary dark:border-night-border/70 dark:bg-night-surface dark:text-night-primary">
              {formatPropertyType(property.propertyType)}
            </span>
            <span className="rounded-full border border-day-border/70 bg-day-panel/70 px-3 py-1 text-xs font-medium text-day-muted dark:border-night-border/70 dark:bg-night-panel/70 dark:text-night-muted">
              {formatStatus(property.status)}
            </span>
            {property?.featuredInfo?.isFeatured || property?.isFeatured ? (
              <span className="rounded-full border border-day-primary/15 bg-day-primary-light px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-day-primary dark:border-night-primary/20 dark:bg-night-primary/15 dark:text-night-primary">
                Featured
              </span>
            ) : null}
          </div>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
            {getPropertyHeadline(property)}
          </h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-day-muted dark:text-night-muted">
            <MapPin className="h-4 w-4 shrink-0" strokeWidth={2.1} />
            {getPropertyLocation(property)}
          </p>
        </div>

        <div className="shell-subtle-surface max-w-md px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
            Listed terms
          </p>
          <p className="mt-3 text-sm leading-6 text-day-muted dark:text-night-muted">
            The current listing is structured around{" "}
            <span className="font-semibold text-day-text dark:text-night-text">
              {formatAmount(property.requestedInvestment)}
            </span>{" "}
            of capital and{" "}
            <span className="font-semibold text-day-text dark:text-night-text">
              {formatAmount(property.rentOffered)}
            </span>{" "}
            monthly rent. You can revise those terms when preparing your offer.
          </p>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.42fr)_360px]">
        <div className="space-y-6">
          <section className="shell-surface overflow-hidden">
            <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative min-h-[340px] overflow-hidden rounded-[24px] bg-day-panel dark:bg-night-panel sm:min-h-[460px]">
                {selectedImage ? (
                  <img
                    src={getPropertyImageUrl(selectedImage)}
                    alt={getPropertyHeadline(property)}
                    className="h-full w-full object-cover"
                    style={getPropertyImageStyle(selectedImage)}
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-day-primary/35 dark:text-night-primary/35">
                    <Building2 className="h-20 w-20" strokeWidth={1.7} />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

                <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-text backdrop-blur dark:bg-night-surface/85 dark:text-night-text">
                      Open for offers
                    </span>
                    {property?.metadata?.totalOffers ? (
                      <span className="rounded-full bg-day-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white dark:bg-night-primary dark:text-night-background">
                        {property.metadata.totalOffers} active
                      </span>
                    ) : null}
                  </div>

                  <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-text backdrop-blur dark:bg-night-surface/85 dark:text-night-text">
                    Trust {getTrustScore(property)}/100
                  </span>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                      Investment detail
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                      {getPropertyHeadline(property)}
                    </h2>
                    <p className="mt-3 flex items-center gap-2 text-sm text-white/80">
                      <MapPin className="h-4 w-4 shrink-0" strokeWidth={2} />
                      {[
                        property?.district,
                        property?.city,
                        property?.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
                {galleryThumbnails.length > 0
                  ? galleryThumbnails.map((image, index) => (
                      <GalleryThumb
                        key={`${getPropertyImageUrl(image)}-${index}`}
                        image={image}
                        index={index}
                        isActive={selectedImageIndex === index}
                        onSelect={setSelectedImageIndex}
                        isCountTile={index === 2 && images.length > 3}
                        remainingCount={images.length - 3}
                      />
                    ))
                  : Array.from({ length: 3 }).map((_, index) => (
                      <GalleryThumb
                        key={index}
                        image={null}
                        index={index}
                        isActive={false}
                        onSelect={() => {}}
                      />
                    ))}
              </div>
            </div>

            <div className="border-t border-day-border/70 px-6 py-6 dark:border-night-border/70 sm:px-8">
              <p className="max-w-4xl text-sm leading-7 text-day-muted dark:text-night-muted">
                {property.description ||
                  "No detailed underwriting notes have been published for this property yet."}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Listed amount"
                  value={formatAmount(property.requestedInvestment)}
                  icon={CircleDollarSign}
                />
                <MetricCard
                  label="Monthly rent"
                  value={formatAmount(property.rentOffered)}
                  icon={Wallet}
                  accentClass="text-emerald-600 dark:text-emerald-300"
                />
                <MetricCard
                  label="Target yield"
                  value={formatPercent(property.annualYieldPercent)}
                  icon={Sparkles}
                />
                <MetricCard
                  label="Contract"
                  value={
                    property.contractPeriodMonths
                      ? `${property.contractPeriodMonths} months`
                      : "—"
                  }
                  icon={CalendarClock}
                />
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
            <section className="shell-surface px-6 py-6 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                    Asset profile
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
                    Core property facts
                  </h2>
                </div>

                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
                  <Ruler className="h-5 w-5" strokeWidth={2.1} />
                </div>
              </div>

              <div className="mt-6">
                {facts.map((item) => (
                  <DataRow key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </section>

            <section className="shell-surface px-6 py-6 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                    Sponsor context
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
                    Market and owner signals
                  </h2>
                </div>

                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
                  <ShieldCheck className="h-5 w-5" strokeWidth={2.1} />
                </div>
              </div>

              <div className="mt-6">
                {sponsorFacts.map((item) => (
                  <DataRow
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    valueClassName={item.valueClassName}
                  />
                ))}
              </div>
            </section>
          </section>

          {normalizedDocuments.length > 0 ? (
            <DocumentsList
              documents={normalizedDocuments}
              onDownload={handleDownloadDocument}
              onPreview={handlePreviewDocument}
              t={t}
            />
          ) : (
            <section className="shell-surface px-6 py-6 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                    Data room
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
                    Documents
                  </h2>
                </div>

                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
                  <FileText className="h-5 w-5" strokeWidth={2.1} />
                </div>
              </div>

              <div className="mt-6 shell-subtle-surface px-5 py-5">
                <p className="text-sm leading-6 text-day-muted dark:text-night-muted">
                  No property documents have been published for investor review yet.
                </p>
              </div>
            </section>
          )}

          <section className="shell-surface px-6 py-6 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                  Address record
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
                  Official property address
                </h2>
              </div>

              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
                <MapPin className="h-5 w-5" strokeWidth={2.1} />
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="shell-subtle-surface px-5 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
                  Title deed address
                </p>
                <p className="mt-2 text-sm leading-7 text-day-text dark:text-night-text">
                  {titleDeedAddress}
                </p>

                {showMapReferenceAddress ? (
                  <div className="mt-5 border-t border-day-border/70 pt-5 dark:border-night-border/70">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
                      Map search address
                    </p>
                    <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                      {mapReferenceAddress}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="shell-subtle-surface px-5 py-5">
                <DataRow
                  label="City / Country"
                  value={officialCityCountry || "—"}
                />
                <DataRow label="District" value={property?.district || "—"} />
                <DataRow
                  label="Map coordinates"
                  value={hasCoordinates ? "Available" : "Not published"}
                />
              </div>
            </div>
          </section>

          {hasCoordinates ? (
            <LocationMap property={property} t={t} />
          ) : (
            <section className="shell-surface px-6 py-6 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                    Location context
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
                    Address and market placement
                  </h2>
                </div>

                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
                  <GlobeSectionIcon />
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="shell-subtle-surface px-5 py-5">
                  <p className="text-sm leading-7 text-day-text dark:text-night-text">
                    {getPropertyLocation(property)}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-day-muted dark:text-night-muted">
                    Exact map coordinates are not available on this listing. Use
                    the official address record above as the primary location
                    reference in the current underwriting package.
                  </p>
                </div>

                <div className="shell-subtle-surface px-5 py-5">
                  <DataRow
                    label="District"
                    value={property?.district || "—"}
                  />
                  <DataRow label="City" value={property?.city || "—"} />
                  <DataRow label="Country" value={property?.country || "—"} />
                </div>
              </div>
            </section>
          )}

          <section className="relative overflow-hidden rounded-[32px] bg-day-primary px-6 py-7 text-white shadow-accent dark:border dark:border-night-border/70 dark:bg-[#0f2a22] sm:px-8">
            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:18px_18px]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
                  Next action
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Move from review into a structured investment offer.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/78">
                  Compare the listed amount, rent assumptions, and contract horizon,
                  then use the offer rail to create the investment thread you want the
                  owner to review.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/investor/investments")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-day-primary transition hover:bg-white/90 focus:outline-none focus:ring-4 focus:ring-white/20 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark"
                >
                  Review investments
                  <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/investor/properties")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/14 focus:outline-none focus:ring-4 focus:ring-white/15"
                >
                  Back to marketplace
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <section className="shell-surface px-6 py-6 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                  Offer rail
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
                  Prepare your terms
                </h2>
              </div>

              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
                <Landmark className="h-5 w-5" strokeWidth={2.1} />
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-day-muted dark:text-night-muted">
              The owner will review this proposal inside their offers workflow. Once
              accepted, both sides continue from the investment detail page.
            </p>

            <div className="mt-6 shell-subtle-surface px-5 py-5">
              <DataRow
                label="Listed capital"
                value={formatAmount(property.requestedInvestment)}
              />
              <DataRow
                label="Current yield"
                value={formatPercent(property.annualYieldPercent)}
              />
              <DataRow
                label="Listed rent"
                value={formatAmount(property.rentOffered)}
              />
            </div>

            <div className="mt-6 space-y-4">
              <OfferField
                label="Offer amount"
                hint={`Listed investment amount: ${formatAmount(property.requestedInvestment)}`}
              >
                <input
                  type="number"
                  min="1"
                  max={property.requestedInvestment}
                  step="0.01"
                  value={offerAmount}
                  onChange={(event) => handleOfferAmountChange(event.target.value)}
                  className="shell-input"
                />
              </OfferField>

              <OfferField label="Ownership share (%)">
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={ownershipPercent}
                  onChange={(event) =>
                    handleOwnershipPercentChange(event.target.value)
                  }
                  className="shell-input"
                />
              </OfferField>

              <OfferField label="Desired monthly rent">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={desiredMonthlyRent}
                  onChange={(event) => setDesiredMonthlyRent(event.target.value)}
                  className="shell-input"
                />
              </OfferField>

              <OfferField label="Message to owner">
                <textarea
                  rows={4}
                  value={offerMessage}
                  onChange={(event) => setOfferMessage(event.target.value)}
                  placeholder="Add a short note about your preferred structure or timing."
                  className="shell-input resize-none"
                />
              </OfferField>
            </div>

            <div className="mt-6 shell-subtle-surface px-5 py-5">
              <DataRow label="Offer amount" value={formatAmount(offerAmountValue)} />
              <DataRow
                label="Ownership share"
                value={
                  ownershipPercentValue > 0
                    ? `${ownershipPercentValue.toFixed(2)}%`
                    : "—"
                }
              />
              <DataRow
                label="Desired monthly rent"
                value={formatAmount(desiredMonthlyRentValue)}
              />
              <DataRow
                label="Projected annual yield"
                value={`${projectedYield}%`}
                valueClassName="text-emerald-600 dark:text-emerald-300"
              />
            </div>

            <button
              type="button"
              disabled={submittingOffer || !isOfferValid}
              onClick={handleCreateOffer}
              className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-day-primary px-4 py-3.5 text-sm font-semibold text-white shadow-accent transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
            >
              {submittingOffer ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
                  Submitting offer...
                </>
              ) : (
                <>
                  Create investment offer
                  <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                </>
              )}
            </button>

            {!isOfferValid ? (
              <p className="mt-3 text-xs leading-5 text-red-600 dark:text-red-300">
                Offer amount must stay within the listed capital, ownership share
                must stay between 0 and 100, and desired rent must be greater than
                zero.
              </p>
            ) : (
              <p className="mt-3 text-xs leading-5 text-day-muted dark:text-night-muted">
                After owner acceptance, payment collection and receipt upload continue
                from the investment detail workflow.
              </p>
            )}
          </section>

          {normalizedOwner ? (
            <OwnerCard
              owner={normalizedOwner}
              profilePath={ownerProfilePath}
              t={t}
            />
          ) : null}

          <section className="shell-surface px-6 py-6 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                  Workflow
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
                  What happens next
                </h2>
              </div>

              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
                <Users className="h-5 w-5" strokeWidth={2.1} />
              </div>
            </div>

            <div className="mt-6">
              <ProcessStep
                active
                title="Review the listed underwriting"
                copy="Check the capital requirement, rent assumptions, and available documents before locking terms."
              />
              <ProcessStep
                title="Send your offer to the owner"
                copy="Your proposal is delivered into the owner workspace where it can be compared with competing offers."
              />
              <div className="flex gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-day-border bg-day-surface text-day-muted dark:border-night-border dark:bg-night-surface dark:text-night-muted">
                  <Eye className="h-4 w-4" strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-day-text dark:text-night-text">
                    Continue from the investment detail page
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                    Once accepted, both parties move into payment, document, and
                    status tracking from the shared investment record.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
};

const GlobeSectionIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 010 18M12 3a15.3 15.3 0 000 18"
    />
  </svg>
);

export default InvestorPropertyDetail;
