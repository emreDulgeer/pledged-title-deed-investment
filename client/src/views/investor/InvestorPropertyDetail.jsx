import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PropertyController from "../../controllers/propertyController";
import InvestmentController from "../../controllers/investmentController";
import {
  LocationMap,
  OwnerCard,
} from "../../components/property/detail";
import {
  getPrimaryPropertyImage,
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";
import { APP_CURRENCY } from "../../utils/currency";
import { getUserId, getUserProfilePath } from "../../utils/profileRoutes";

const formatAmount = (value) =>
  `${Number(value || 0).toLocaleString("en-US")} ${APP_CURRENCY}`;

const DetailStat = ({ label, value, accent = "" }) => (
  <div className="rounded-2xl bg-day-dashboard dark:bg-night-dashboard p-4">
    <p className="text-xs uppercase tracking-[0.18em] text-day-text/45 dark:text-night-text/45">
      {label}
    </p>
    <p
      className={`mt-2 text-lg font-semibold text-day-text dark:text-night-text ${accent}`.trim()}
    >
      {value}
    </p>
  </div>
);

const InvestorPropertyDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [error, setError] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [ownershipPercent, setOwnershipPercent] = useState("");
  const [desiredMonthlyRent, setDesiredMonthlyRent] = useState("");
  const [offerMessage, setOfferMessage] = useState("");

  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await PropertyController.getById(id);
        if (response?.success) {
          setProperty(response.data);
          return;
        }

        setError("Property details could not be loaded.");
      } catch (fetchError) {
        console.error("Investor property detail error:", fetchError);
        setError(fetchError.message || "Property details could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  const images = useMemo(() => {
    if (!property) return [];
    if (Array.isArray(property.images) && property.images.length > 0) {
      return property.images;
    }

    const primaryImage = getPrimaryPropertyImage(property);
    return primaryImage ? [primaryImage] : [];
  }, [property]);

  useEffect(() => {
    if (!property) return;

    setOfferAmount(String(property.requestedInvestment || ""));
    setOwnershipPercent("100");
    setDesiredMonthlyRent(String(property.rentOffered || ""));
    setOfferMessage("");
  }, [property]);

  const requestedInvestment = Number(property?.requestedInvestment || 0);
  const ownerProfilePath = getUserProfilePath(getUserId(property?.owner));
  const offerAmountValue = Number(offerAmount || 0);
  const desiredMonthlyRentValue = Number(desiredMonthlyRent || 0);
  const ownershipPercentValue = Number(ownershipPercent || 0);
  const projectedYield =
    offerAmountValue > 0
      ? Number(((desiredMonthlyRentValue * 12) / offerAmountValue) * 100).toFixed(
          2,
        )
      : "0.00";

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

    if (
      !requestedInvestment ||
      !Number.isFinite(Number(normalizedAmount)) ||
      value === ""
    ) {
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
    if (!property) return;

    setSubmittingOffer(true);
    setError("");

    try {
      const response = await InvestmentController.createInvestmentOffer(
        property.id,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-day-primary dark:border-night-primary" />
          <p className="mt-4 text-sm text-day-text/60 dark:text-night-text/60">
            Loading property details...
          </p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-8 text-center">
          <h1 className="text-xl font-semibold text-day-text dark:text-night-text">
            Property not found
          </h1>
          <p className="mt-2 text-sm text-day-text/60 dark:text-night-text/60">
            The property may no longer be published or accessible to investors.
          </p>
          <button
            type="button"
            onClick={() => navigate("/investor/properties")}
            className="mt-6 rounded-xl bg-day-primary dark:bg-night-primary px-5 py-3 text-sm font-medium text-white"
          >
            Back to properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-day-dashboard dark:bg-night-dashboard text-day-text dark:text-night-text space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate("/investor/properties")}
            className="text-sm text-day-primary dark:text-night-primary hover:underline"
          >
            ← Back to investor properties
          </button>
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-day-text/45 dark:text-night-text/45">
            Property Detail
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            {property.city}, {property.country}
          </h1>
          <p className="mt-2 text-sm text-day-text/60 dark:text-night-text/60">
            {property.fullAddress || property.mapSearchAddress || "Address not provided"}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          Listed terms are{" "}
          <span className="font-semibold">
            {formatAmount(property.requestedInvestment)}
          </span>{" "}
          and{" "}
          <span className="font-semibold">
            {formatAmount(property.rentOffered)}
          </span>{" "}
          monthly rent. You can negotiate your own offer below.
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
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

          <section className="rounded-3xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-day-text/45 dark:text-night-text/45">
                  Overview
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Investment snapshot</h2>
              </div>
              <span className="rounded-full bg-day-dashboard dark:bg-night-dashboard px-3 py-1 text-xs font-medium text-day-text/60 dark:text-night-text/60">
                {property.propertyType?.replace(/_/g, " ") || "Property"}
              </span>
            </div>

            <p className="mt-5 text-sm leading-7 text-day-text/75 dark:text-night-text/75">
              {property.description || "No description has been added for this property yet."}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <DetailStat
                label="Investment"
                value={formatAmount(property.requestedInvestment)}
              />
              <DetailStat
                label="Monthly Rent"
                value={formatAmount(property.rentOffered)}
                accent="text-green-600 dark:text-green-400"
              />
              <DetailStat
                label="Annual Yield"
                value={
                  property.annualYieldPercent
                    ? `${property.annualYieldPercent}%`
                    : "—"
                }
              />
              <DetailStat
                label="Contract"
                value={
                  property.contractPeriodMonths
                    ? `${property.contractPeriodMonths} months`
                    : "—"
                }
              />
            </div>
          </section>

          <LocationMap property={property} t={t} />
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-day-text/45 dark:text-night-text/45">
              Next Step
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Send investment offer</h2>
            <p className="mt-4 text-sm leading-7 text-day-text/70 dark:text-night-text/70">
              When you submit the offer, the owner will see it under the
              {" Owner > Offers "}
              screen and can compare it with other incoming offers. Once the
              owner accepts one offer, the property leaves the public listing
              flow and both sides continue from the investment detail page.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-day-text dark:text-night-text mb-2">
                  Offer amount
                </label>
                <input
                  type="number"
                  min="1"
                  max={property.requestedInvestment}
                  step="0.01"
                  value={offerAmount}
                  onChange={(event) => handleOfferAmountChange(event.target.value)}
                  className="w-full rounded-xl border border-day-border dark:border-night-border bg-day-dashboard dark:bg-night-dashboard px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-day-primary/40 dark:focus:ring-night-primary/40"
                />
                <p className="mt-2 text-xs text-day-text/50 dark:text-night-text/50">
                  Listed investment amount: {formatAmount(property.requestedInvestment)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-day-text dark:text-night-text mb-2">
                  Ownership share (%)
                </label>
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={ownershipPercent}
                  onChange={(event) =>
                    handleOwnershipPercentChange(event.target.value)
                  }
                  className="w-full rounded-xl border border-day-border dark:border-night-border bg-day-dashboard dark:bg-night-dashboard px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-day-primary/40 dark:focus:ring-night-primary/40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-day-text dark:text-night-text mb-2">
                  Desired monthly rent
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={desiredMonthlyRent}
                  onChange={(event) => setDesiredMonthlyRent(event.target.value)}
                  className="w-full rounded-xl border border-day-border dark:border-night-border bg-day-dashboard dark:bg-night-dashboard px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-day-primary/40 dark:focus:ring-night-primary/40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-day-text dark:text-night-text mb-2">
                  Message to owner
                </label>
                <textarea
                  rows={4}
                  value={offerMessage}
                  onChange={(event) => setOfferMessage(event.target.value)}
                  placeholder="Add a short note about your proposed terms."
                  className="w-full rounded-xl border border-day-border dark:border-night-border bg-day-dashboard dark:bg-night-dashboard px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-day-primary/40 dark:focus:ring-night-primary/40"
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-day-dashboard dark:bg-night-dashboard p-4 space-y-3">
              <Row label="Offer amount" value={formatAmount(offerAmountValue)} />
              <Row
                label="Ownership share"
                value={
                  ownershipPercentValue > 0
                    ? `${ownershipPercentValue.toFixed(2)}%`
                    : "—"
                }
              />
              <Row
                label="Desired monthly rent"
                value={formatAmount(desiredMonthlyRentValue)}
              />
              <Row
                label="Projected annual yield"
                value={`${projectedYield}%`}
              />
            </div>

            <button
              type="button"
              disabled={submittingOffer || !isOfferValid}
              onClick={handleCreateOffer}
              className="mt-6 w-full rounded-2xl bg-day-primary dark:bg-night-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submittingOffer ? "Submitting offer..." : "Create investment offer"}
            </button>

            <p className="mt-3 text-xs text-day-text/50 dark:text-night-text/50">
              Payment collection is currently running through the adapter-based
              placeholder flow, so after acceptance you will prepare payment
              instructions and upload the receipt from the investment detail page.
            </p>
            {!isOfferValid && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                Offer amount must stay within the listed amount, ownership share
                must stay between 0 and 100, and desired rent must be greater
                than zero.
              </p>
            )}
          </section>

          <OwnerCard
            owner={property.owner}
            profilePath={ownerProfilePath}
            t={t}
          />

          <section className="rounded-3xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-day-text/45 dark:text-night-text/45">
              Property Facts
            </p>

            <div className="mt-5 space-y-3 text-sm">
              <Row label="Rooms" value={property.rooms || "—"} />
              <Row label="Size" value={property.size ? `${property.size} m²` : "—"} />
              <Row
                label="Estimated value"
                value={
                  property.estimatedValue
                    ? formatAmount(property.estimatedValue)
                    : "—"
                }
              />
              <Row
                label="Published status"
                value={property.status?.replace(/_/g, " ") || "—"}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-day-text/55 dark:text-night-text/55">{label}</span>
    <span className="text-right font-medium text-day-text dark:text-night-text">
      {value}
    </span>
  </div>
);

export default InvestorPropertyDetail;
