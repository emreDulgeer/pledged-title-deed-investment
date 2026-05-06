import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InvestmentController from "../../controllers/investmentController";
import {
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";
import { APP_CURRENCY } from "../../utils/currency";

const formatAmount = (value) =>
  `${Number(value || 0).toLocaleString("en-US")} ${APP_CURRENCY}`;

const OFFER_STATUS_STYLES = {
  offer_sent:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const OFFER_STATUS_LABELS = {
  offer_sent: "Awaiting owner",
  rejected: "Rejected",
};

const InvestorOffers = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offers, setOffers] = useState([]);

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await InvestmentController.getMyInvestments({
        status: "offer_sent,rejected",
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: 50,
      });

      if (response?.success) {
        setOffers(response.data || []);
      } else {
        setOffers([]);
      }
    } catch (loadError) {
      console.error("Investor offers load error:", loadError);
      setError(loadError.message || "Offers could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  return (
    <div className="p-6 min-h-screen bg-day-dashboard dark:bg-night-dashboard text-day-text dark:text-night-text space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-white p-8 shadow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              Investor Offers
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-semibold">
              Track the offers you sent and compare the owner responses.
            </h1>
            <p className="mt-4 text-sm md:text-base text-white/75">
              Pending and rejected offers stay here. Once the owner accepts your
              offer, the process moves into the Investments section for contract
              and document handling.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/investor/properties")}
              className="inline-flex items-center justify-center rounded-xl bg-white/12 px-5 py-3 text-sm font-medium ring-1 ring-white/20 hover:bg-white/18"
            >
              Browse properties
            </button>
            <button
              type="button"
              onClick={loadOffers}
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Refresh offers
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface"
              />
            ))
          : null}

        {!loading && offers.length === 0 ? (
          <div className="xl:col-span-2 rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-12 text-center">
            <div className="text-5xl">📨</div>
            <h2 className="mt-4 text-xl font-semibold">No offer history yet</h2>
            <p className="mt-2 text-sm text-day-text/60 dark:text-night-text/60">
              Send an offer from the Investor Properties page and it will appear
              here while the owner reviews it.
            </p>
            <button
              type="button"
              onClick={() => navigate("/investor/properties")}
              className="mt-6 rounded-xl bg-day-primary dark:bg-night-primary px-5 py-3 text-sm font-medium text-white"
            >
              Go to properties
            </button>
          </div>
        ) : null}

        {!loading &&
          offers.map((offer) => (
            <button
              key={offer.id}
              type="button"
              onClick={() => navigate(`/investor/investments/${offer.id}`)}
              className="text-left rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              <div className="grid grid-cols-1 md:grid-cols-[180px_1fr]">
                <div className="h-48 md:h-full bg-day-background dark:bg-night-background">
                  {offer.property?.thumbnail ? (
                    <img
                      src={getPropertyImageUrl(offer.property.thumbnail)}
                      alt={`${offer.property?.city || "Property"}, ${offer.property?.country || ""}`}
                      className="w-full h-full object-cover"
                      style={getPropertyImageStyle(offer.property.thumbnail)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl text-day-text/20 dark:text-night-text/20">
                      🏠
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-day-text/45 dark:text-night-text/45">
                        Offer tracking
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-day-text dark:text-night-text">
                        {offer.property?.city}, {offer.property?.country}
                      </h2>
                      <p className="mt-2 text-sm text-day-text/60 dark:text-night-text/60">
                        {offer.property?.propertyType || "Property"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${OFFER_STATUS_STYLES[offer.status] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}
                    >
                      {OFFER_STATUS_LABELS[offer.status] ||
                        offer.status?.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <Metric label="Offer amount" value={formatAmount(offer.amountInvested)} />
                    <Metric
                      label="Ownership"
                      value={
                        offer.offerTerms?.ownershipPercent
                          ? `${offer.offerTerms.ownershipPercent}%`
                          : "—"
                      }
                    />
                    <Metric
                      label="Desired rent"
                      value={formatAmount(offer.offerTerms?.desiredMonthlyRent)}
                    />
                    <Metric
                      label="Created"
                      value={new Date(offer.createdAt).toLocaleDateString("en-US")}
                    />
                  </div>

                  {offer.offerTerms?.message && (
                    <div className="rounded-xl bg-day-dashboard dark:bg-night-dashboard p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-day-text/45 dark:text-night-text/45">
                        Your note
                      </p>
                      <p className="mt-2 text-sm text-day-text/70 dark:text-night-text/70">
                        {offer.offerTerms.message}
                      </p>
                    </div>
                  )}

                  {offer.offerDecision?.rejectionReason && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                      {offer.offerDecision.rejectionReason}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-day-border dark:border-night-border">
                    <p className="text-sm text-day-text/55 dark:text-night-text/55">
                      Open the detail page to review the current offer status and
                      the next required action.
                    </p>
                    <span className="text-sm font-medium text-day-primary dark:text-night-primary">
                      View offer →
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
      </section>
    </div>
  );
};

const Metric = ({ label, value }) => (
  <div className="rounded-xl bg-day-dashboard dark:bg-night-dashboard p-3">
    <p className="text-xs text-day-text/50 dark:text-night-text/50">{label}</p>
    <p className="mt-1 font-semibold text-day-text dark:text-night-text">
      {value}
    </p>
  </div>
);

export default InvestorOffers;
