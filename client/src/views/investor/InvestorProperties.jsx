import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PropertyController from "../../controllers/propertyController";
import {
  getPrimaryPropertyImage,
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";
import { APP_CURRENCY } from "../../utils/currency";

const DEFAULT_PAGINATION = {
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  itemsPerPage: 12,
  hasPrev: false,
  hasNext: false,
};

const formatAmount = (value) =>
  `${Number(value || 0).toLocaleString("en-US")} ${APP_CURRENCY}`;

const PropertyCard = ({ property, onOpen }) => {
  const thumbnail = getPrimaryPropertyImage(property);
  const thumbnailUrl = getPropertyImageUrl(thumbnail);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface overflow-hidden shadow-sm hover:shadow-md transition-all"
    >
      <div className="relative h-52 bg-day-background dark:bg-night-background">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`${property.city}, ${property.country}`}
            className="w-full h-full object-cover"
            style={getPropertyImageStyle(thumbnail)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-day-text/20 dark:text-night-text/20">
            🏠
          </div>
        )}

        {property.isFeatured && (
          <span className="absolute top-3 left-3 rounded-full bg-yellow-300 text-yellow-900 px-3 py-1 text-xs font-semibold">
            Featured
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-day-text/45 dark:text-night-text/45">
            {property.propertyType?.replace(/_/g, " ") || "Property"}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-day-text dark:text-night-text">
            {property.city}, {property.country}
          </h2>
          <p className="mt-2 text-sm text-day-text/65 dark:text-night-text/65 min-h-10">
            {property.description || "Property details are available on the detail page."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Investment" value={formatAmount(property.requestedInvestment)} />
          <Metric
            label="Monthly Rent"
            value={formatAmount(property.rentOffered)}
            accent="text-green-600 dark:text-green-400"
          />
          <Metric
            label="Annual Yield"
            value={
              property.annualYieldPercent
                ? `${property.annualYieldPercent}%`
                : "—"
            }
          />
          <Metric
            label="Contract"
            value={
              property.contractPeriodMonths
                ? `${property.contractPeriodMonths} months`
                : "—"
            }
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-day-border dark:border-night-border">
          <div className="text-xs text-day-text/55 dark:text-night-text/55">
            Owner trust: {property.ownerTrustScore || property.owner?.trustScore || 0}
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-day-primary dark:text-night-primary">
            View details
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </div>
    </button>
  );
};

const Metric = ({ label, value, accent = "" }) => (
  <div className="rounded-xl bg-day-dashboard dark:bg-night-dashboard p-3">
    <p className="text-xs text-day-text/50 dark:text-night-text/50">{label}</p>
    <p
      className={`mt-1 font-semibold text-day-text dark:text-night-text ${accent}`.trim()}
    >
      {value}
    </p>
  </div>
);

const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface px-4 py-3">
      <p className="text-sm text-day-text/60 dark:text-night-text/60">
        Page {pagination.currentPage} / {pagination.totalPages} ·{" "}
        {pagination.totalItems} results
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!pagination.hasPrev}
          onClick={() => onPageChange(pagination.currentPage - 1)}
          className="px-3 py-2 rounded-lg border border-day-border dark:border-night-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-day-dashboard dark:hover:bg-night-dashboard"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={!pagination.hasNext}
          onClick={() => onPageChange(pagination.currentPage + 1)}
          className="px-3 py-2 rounded-lg border border-day-border dark:border-night-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-day-dashboard dark:hover:bg-night-dashboard"
        >
          Next
        </button>
      </div>
    </div>
  );
};

const InvestorProperties = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    propertyType: "",
    sortBy: "-createdAt",
    limit: 12,
    page: 1,
  });

  const loadProperties = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = { ...filters, status: "published" };
      if (!params.search) delete params.search;
      if (!params.propertyType) delete params.propertyType;

      const response = await PropertyController.getAll(params);

      if (response?.success) {
        setProperties(response.data || []);
        setPagination(response.pagination || DEFAULT_PAGINATION);
      }
    } catch (loadError) {
      console.error("Investor properties load error:", loadError);
      setError(loadError.message || "Properties could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: 1,
    }));
  };

  const handlePageChange = (page) => {
    setFilters((current) => ({
      ...current,
      page,
    }));
  };

  return (
    <div className="p-6 min-h-screen bg-day-dashboard dark:bg-night-dashboard text-day-text dark:text-night-text space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white p-8 shadow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              Investor Properties
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-semibold">
              Browse published properties and start a new investment offer.
            </h1>
            <p className="mt-4 text-sm md:text-base text-white/75">
              This list only shows properties that are currently open for new
              offers. Open a property to review the details, then submit the
              investment amount required by the listing.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/investor/investments")}
            className="inline-flex items-center justify-center rounded-xl bg-white/12 px-5 py-3 text-sm font-medium ring-1 ring-white/20 hover:bg-white/18"
          >
            Go to my investments
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <input
            type="text"
            value={filters.search}
            onChange={(event) =>
              handleFilterChange("search", event.target.value)
            }
            placeholder="Search city, country or description"
            className="w-full rounded-xl border border-day-border dark:border-night-border bg-day-dashboard dark:bg-night-dashboard px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-day-primary/40 dark:focus:ring-night-primary/40"
          />

          <select
            value={filters.propertyType}
            onChange={(event) =>
              handleFilterChange("propertyType", event.target.value)
            }
            className="w-full rounded-xl border border-day-border dark:border-night-border bg-day-dashboard dark:bg-night-dashboard px-4 py-3 text-sm focus:outline-none"
          >
            <option value="">All property types</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="commercial">Commercial</option>
            <option value="other">Other</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(event) => handleFilterChange("sortBy", event.target.value)}
            className="w-full rounded-xl border border-day-border dark:border-night-border bg-day-dashboard dark:bg-night-dashboard px-4 py-3 text-sm focus:outline-none"
          >
            <option value="-createdAt">Newest first</option>
            <option value="createdAt">Oldest first</option>
            <option value="-requestedInvestment">Highest investment</option>
            <option value="requestedInvestment">Lowest investment</option>
            <option value="-annualYieldPercent">Highest yield</option>
          </select>

          <select
            value={filters.limit}
            onChange={(event) =>
              handleFilterChange("limit", parseInt(event.target.value, 10))
            }
            className="w-full rounded-xl border border-day-border dark:border-night-border bg-day-dashboard dark:bg-night-dashboard px-4 py-3 text-sm focus:outline-none"
          >
            <option value={12}>12 per page</option>
            <option value={24}>24 per page</option>
            <option value={48}>48 per page</option>
          </select>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[420px] animate-pulse rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface"
              />
            ))
          : null}

        {!loading && properties.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-12 text-center">
            <div className="text-5xl">🔎</div>
            <h2 className="mt-4 text-xl font-semibold">No matching properties</h2>
            <p className="mt-2 text-sm text-day-text/60 dark:text-night-text/60">
              Try broadening your search or clearing the property type filter.
            </p>
          </div>
        ) : null}

        {!loading &&
          properties.map((property) => (
            <PropertyCard
              key={property.id || property._id}
              property={property}
              onOpen={() =>
                navigate(`/investor/properties/${property.id || property._id}`)
              }
            />
          ))}
      </section>

      {!loading && (
        <Pagination pagination={pagination} onPageChange={handlePageChange} />
      )}
    </div>
  );
};

export default InvestorProperties;
