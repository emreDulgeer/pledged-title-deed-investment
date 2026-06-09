import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import PropertyController from "../../controllers/propertyController";
import {
  getPrimaryPropertyImage,
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";
import { APP_CURRENCY_SYMBOL } from "../../utils/currency";

const DEFAULT_PAGINATION = {
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  itemsPerPage: 12,
  hasPrev: false,
  hasNext: false,
};

const DEFAULT_CONTROLS = {
  search: "",
  propertyType: "",
  sortBy: "-createdAt",
  limit: 12,
};

const PROPERTY_TYPE_OPTIONS = [
  { label: "All property types", value: "" },
  { label: "Apartment", value: "apartment" },
  { label: "House", value: "house" },
  { label: "Villa", value: "villa" },
  { label: "Commercial", value: "commercial" },
  { label: "Office", value: "office" },
  { label: "Retail", value: "retail" },
  { label: "Land", value: "land" },
];

const SORT_OPTIONS = [
  { label: "Newest first", value: "-createdAt" },
  { label: "Oldest first", value: "createdAt" },
  { label: "Highest listed amount", value: "-requestedInvestment" },
  { label: "Lowest listed amount", value: "requestedInvestment" },
  { label: "Highest yield", value: "-annualYieldPercent" },
];

const PAGE_SIZE_OPTIONS = [12, 24, 48];

const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString("en-US")} ${APP_CURRENCY_SYMBOL}`;

const formatCompactMoney = (value) =>
  `${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0))} ${APP_CURRENCY_SYMBOL}`;

const formatPropertyType = (value) => {
  if (!value) return "Property";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const getPropertyHeadline = (property) =>
  property.title || [property.city, property.country].filter(Boolean).join(", ");

const getPropertyLocation = (property) =>
  [property.city, property.country].filter(Boolean).join(", ");

const getTrustScore = (property) =>
  property.ownerTrustScore || property.owner?.trustScore || property.trustScore || 0;

const isFeaturedProperty = (property) =>
  Boolean(property.isFeatured || property.featuredInfo?.isFeatured);

const SummaryChip = ({ label, value }) => (
  <div className="rounded-2xl border border-day-border/70 bg-day-surface px-4 py-3 dark:border-night-border/70 dark:bg-night-surface">
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
      {label}
    </p>
    <p className="mt-2 text-lg font-semibold text-day-text dark:text-night-text">
      {value}
    </p>
  </div>
);

const FilterField = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
      {label}
    </span>
    {children}
  </label>
);

const PropertyMetric = ({ label, value, accentClass = "" }) => (
  <div className="rounded-2xl border border-day-border/60 bg-day-panel/40 px-3 py-3 dark:border-night-border/60 dark:bg-night-panel/40">
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
      {label}
    </p>
    <p
      className={`mt-2 text-base font-semibold text-day-text dark:text-night-text ${accentClass}`.trim()}
    >
      {value}
    </p>
  </div>
);

const PropertyCard = ({ property, onOpen }) => {
  const thumbnail = getPrimaryPropertyImage(property);
  const thumbnailUrl = getPropertyImageUrl(thumbnail);
  const trustScore = getTrustScore(property);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group shell-surface overflow-hidden text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-shell"
    >
      <div className="relative aspect-[16/11] overflow-hidden bg-day-panel dark:bg-night-panel">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={getPropertyHeadline(property)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            style={getPropertyImageStyle(thumbnail)}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-day-primary/30 dark:text-night-primary/35">
            <Building2 className="h-14 w-14" strokeWidth={1.8} />
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-day-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white dark:bg-night-primary dark:text-night-background">
              Open for offers
            </span>
            {isFeaturedProperty(property) ? (
              <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-text backdrop-blur dark:bg-night-surface/85 dark:text-night-text">
                Featured
              </span>
            ) : null}
          </div>

          <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-text backdrop-blur dark:bg-night-surface/85 dark:text-night-text">
            Trust {trustScore}/100
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
                {formatPropertyType(property.propertyType)}
              </p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight text-day-text dark:text-night-text">
                {getPropertyHeadline(property)}
              </h2>
            </div>

            <span className="shrink-0 rounded-full bg-day-primary-light px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-primary dark:bg-night-primary/15 dark:text-night-primary">
              {property.status || "published"}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2 text-sm text-day-muted dark:text-night-muted">
            <MapPin className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span>{getPropertyLocation(property)}</span>
          </div>

          <p
            className="mt-4 min-h-[72px] text-sm leading-6 text-day-muted dark:text-night-muted"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {property.description || "Detailed underwriting, legal context, and rental assumptions are available on the property detail page."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PropertyMetric
            label="Listed amount"
            value={formatMoney(property.requestedInvestment)}
          />
          <PropertyMetric
            label="Target yield"
            value={
              property.annualYieldPercent
                ? `${property.annualYieldPercent}%`
                : "—"
            }
            accentClass="text-emerald-600 dark:text-emerald-300"
          />
          <PropertyMetric
            label="Monthly rent"
            value={formatMoney(property.rentOffered)}
          />
          <PropertyMetric
            label="Contract"
            value={
              property.contractPeriodMonths
                ? `${property.contractPeriodMonths} months`
                : "—"
            }
          />
        </div>

        <div className="flex items-center justify-between border-t border-day-border/70 pt-4 dark:border-night-border/70">
          <div className="text-xs text-day-muted dark:text-night-muted">
            {property.metadata?.totalOffers
              ? `${property.metadata.totalOffers} active offer${property.metadata.totalOffers > 1 ? "s" : ""}`
              : "Ready for investor review"}
          </div>

          <span className="inline-flex items-center gap-2 text-sm font-semibold text-day-primary transition group-hover:gap-3 dark:text-night-primary">
            View detailed metrics
            <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          </span>
        </div>
      </div>
    </button>
  );
};

const LoadingCard = () => (
  <div className="shell-surface overflow-hidden">
    <div className="aspect-[16/11] animate-pulse bg-day-panel/70 dark:bg-night-panel/70" />
    <div className="space-y-4 p-6">
      <div className="h-3 w-28 animate-pulse rounded-full bg-day-panel/70 dark:bg-night-panel/70" />
      <div className="h-8 w-2/3 animate-pulse rounded-full bg-day-panel/70 dark:bg-night-panel/70" />
      <div className="h-4 w-1/2 animate-pulse rounded-full bg-day-panel/70 dark:bg-night-panel/70" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-2xl bg-day-panel/70 dark:bg-night-panel/70"
          />
        ))}
      </div>
    </div>
  </div>
);

const EmptyState = ({ onClear, onBrowseReset, hasActiveFilters }) => (
  <div className="shell-surface col-span-full px-6 py-14 text-center sm:px-10">
    <div className="mx-auto max-w-md">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
        <Search className="h-7 w-7" strokeWidth={2.1} />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-day-text dark:text-night-text">
        No matching properties
      </h2>
      <p className="mt-3 text-sm leading-6 text-day-muted dark:text-night-muted">
        Try clearing the current filters or broaden the search so more published
        opportunities can appear.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
          >
            Clear filters
          </button>
        ) : null}

        <button
          type="button"
          onClick={onBrowseReset}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 focus:outline-none focus:ring-4 focus:ring-day-primary/10 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60 dark:focus:ring-night-primary/10"
        >
          Refresh results
        </button>
      </div>
    </div>
  </div>
);

const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  return (
    <div className="shell-surface flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-day-muted dark:text-night-muted">
        Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalItems} total
        result{pagination.totalItems === 1 ? "" : "s"}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!pagination.hasPrev}
          onClick={() => onPageChange(pagination.currentPage - 1)}
          className="rounded-2xl border border-day-border bg-day-surface px-4 py-2.5 text-sm font-medium text-day-text transition hover:bg-day-panel/60 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={!pagination.hasNext}
          onClick={() => onPageChange(pagination.currentPage + 1)}
          className="rounded-2xl border border-day-border bg-day-surface px-4 py-2.5 text-sm font-medium text-day-text transition hover:bg-day-panel/60 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
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
  const [controls, setControls] = useState(DEFAULT_CONTROLS);
  const [filters, setFilters] = useState({
    ...DEFAULT_CONTROLS,
    page: 1,
  });

  const loadProperties = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        ...filters,
        status: "published",
      };

      if (!params.search) delete params.search;
      if (!params.propertyType) delete params.propertyType;

      const response = await PropertyController.getAll(params);

      if (response?.success) {
        setProperties(response.data || []);
        setPagination({
          ...DEFAULT_PAGINATION,
          ...(response.pagination || {}),
        });
      } else {
        setProperties([]);
        setPagination(DEFAULT_PAGINATION);
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

  const propertySummary = useMemo(() => {
    const featuredCount = properties.filter(isFeaturedProperty).length;
    const marketCount = new Set(properties.map((property) => property.country).filter(Boolean))
      .size;
    const averageYieldValues = properties
      .map((property) => Number(property.annualYieldPercent || 0))
      .filter((value) => value > 0);
    const averageYield =
      averageYieldValues.length > 0
        ? averageYieldValues.reduce((sum, value) => sum + value, 0) /
          averageYieldValues.length
        : 0;

    return {
      featuredCount,
      marketCount,
      averageYield,
    };
  }, [properties]);

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.propertyType) ||
    filters.sortBy !== DEFAULT_CONTROLS.sortBy ||
    filters.limit !== DEFAULT_CONTROLS.limit;

  const selectedSortLabel =
    SORT_OPTIONS.find((option) => option.value === filters.sortBy)?.label ||
    "Custom sort";
  const selectedTypeLabel =
    PROPERTY_TYPE_OPTIONS.find((option) => option.value === filters.propertyType)?.label ||
    "All property types";

  const handleControlChange = (key, value) => {
    setControls((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const applyFilters = () => {
    setFilters({
      ...controls,
      page: 1,
    });
  };

  const handleApplyFilters = (event) => {
    event.preventDefault();
    applyFilters();
  };

  const handleClearFilters = () => {
    setControls(DEFAULT_CONTROLS);
    setFilters({
      ...DEFAULT_CONTROLS,
      page: 1,
    });
  };

  const handlePageChange = (page) => {
    setFilters((current) => ({
      ...current,
      page,
    }));
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 xl:p-8">
      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
        <div className="shell-surface flex h-full flex-col justify-between px-6 py-7 sm:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-day-primary dark:border-night-border/70 dark:bg-night-surface dark:text-night-primary">
              Marketplace
            </span>
            <span className="rounded-full border border-day-border/70 bg-day-panel/70 px-3 py-1 text-xs font-medium text-day-muted dark:border-night-border/70 dark:bg-night-panel/70 dark:text-night-muted">
              Published assets only
            </span>
          </div>

          <div className="mt-6 max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
              Browse properties
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-day-muted dark:text-night-muted">
              Access currently published real estate opportunities, compare yield
              expectations, and move directly into underwriting on the detail page.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryChip
              label="Published results"
              value={pagination.totalItems || properties.length}
            />
            <SummaryChip
              label="Featured on page"
              value={propertySummary.featuredCount}
            />
            <SummaryChip
              label="Markets on page"
              value={propertySummary.marketCount}
            />
            <SummaryChip
              label="Avg. yield"
              value={
                propertySummary.averageYield > 0
                  ? `${propertySummary.averageYield.toFixed(2)}%`
                  : "—"
              }
            />
          </div>
        </div>

        <aside className="shell-surface flex h-full flex-col px-6 py-7 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-day-muted dark:text-night-muted">
                Market view
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
                Refine the list
              </h2>
            </div>

            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
              <SlidersHorizontal className="h-5 w-5" strokeWidth={2.2} />
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-day-muted dark:text-night-muted">
            Apply a tighter search, narrow by property type, or sort the marketplace
            around capital size and target yield.
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => navigate("/investor/investments")}
              className="inline-flex w-full items-center justify-between rounded-2xl bg-day-primary px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
            >
              <span>Go to my investments</span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/investor/dashboard")}
              className="inline-flex w-full items-center justify-between rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 focus:outline-none focus:ring-4 focus:ring-day-primary/10 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60 dark:focus:ring-night-primary/10"
            >
              <span>Back to dashboard</span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            <SummaryChip label="Sorting" value={selectedSortLabel} />
            <SummaryChip label="Property type" value={selectedTypeLabel} />
            <SummaryChip
              label="Page size"
              value={`${filters.limit} results`}
            />
          </div>
        </aside>
      </section>

      <form
        onSubmit={handleApplyFilters}
        className="shell-surface px-4 py-4 sm:px-5"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(180px,0.55fr)_minmax(220px,0.65fr)_minmax(170px,0.5fr)_auto] xl:items-end">
          <FilterField label="Search">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-day-muted dark:text-night-muted"
                strokeWidth={2.2}
              />
              <input
                type="text"
                value={controls.search}
                onChange={(event) =>
                  handleControlChange("search", event.target.value)
                }
                placeholder="Search city, country, district, or description"
                className="shell-input pl-11"
              />
            </div>
          </FilterField>

          <FilterField label="Property type">
            <select
              value={controls.propertyType}
              onChange={(event) =>
                handleControlChange("propertyType", event.target.value)
              }
              className="shell-input"
            >
              {PROPERTY_TYPE_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Sort by">
            <select
              value={controls.sortBy}
              onChange={(event) =>
                handleControlChange("sortBy", event.target.value)
              }
              className="shell-input"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Page size">
            <select
              value={controls.limit}
              onChange={(event) =>
                handleControlChange("limit", Number(event.target.value))
              }
              className="shell-input"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} per page
                </option>
              ))}
            </select>
          </FilterField>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
            >
              Apply filters
            </button>

            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3.5 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 focus:outline-none focus:ring-4 focus:ring-day-primary/10 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60 dark:focus:ring-night-primary/10"
            >
              <X className="h-4 w-4" strokeWidth={2.2} />
              Clear
            </button>
          </div>
        </div>
      </form>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-day-text dark:text-night-text">
            {loading && properties.length > 0
              ? "Refreshing property results"
              : `Showing ${properties.length} result${properties.length === 1 ? "" : "s"} on this page`}
          </p>
          <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
            {pagination.totalItems > 0
              ? `${pagination.totalItems} published propert${pagination.totalItems === 1 ? "y is" : "ies are"} currently available in the marketplace.`
              : "Published properties will appear here when listings match the active query."}
          </p>
        </div>

        {loading && properties.length > 0 ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-day-border/70 bg-day-surface px-3 py-2 text-sm text-day-muted dark:border-night-border/70 dark:bg-night-surface dark:text-night-muted">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
            Updating
          </div>
        ) : null}
      </div>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {loading && properties.length === 0
          ? Array.from({ length: 6 }).map((_, index) => <LoadingCard key={index} />)
          : null}

        {!loading && properties.length === 0 ? (
          <EmptyState
            hasActiveFilters={hasActiveFilters}
            onClear={handleClearFilters}
            onBrowseReset={loadProperties}
          />
        ) : null}

        {properties.map((property) => (
          <PropertyCard
            key={property.id || property._id}
            property={property}
            onOpen={() =>
              navigate(`/investor/properties/${property.id || property._id}`)
            }
          />
        ))}
      </section>

      {!loading && properties.length > 0 ? (
        <section className="relative overflow-hidden rounded-[32px] bg-day-primary px-6 py-7 text-white shadow-accent dark:border dark:border-night-border/70 dark:bg-[#0f2a22] sm:px-8">
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
                Pipeline access
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Compare live opportunities against your current portfolio.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/78">
                Use the detail view to examine investment size, rent assumptions, and
                contract length before deciding whether to send an offer.
              </p>

              <div className="mt-6 flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-white/60">Published results</p>
                  <p className="mt-2 text-xl font-semibold">
                    {pagination.totalItems || properties.length}
                  </p>
                </div>
                <div>
                  <p className="text-white/60">Featured on page</p>
                  <p className="mt-2 text-xl font-semibold">
                    {propertySummary.featuredCount}
                  </p>
                </div>
                <div>
                  <p className="text-white/60">Avg. listed amount</p>
                  <p className="mt-2 text-xl font-semibold">
                    {formatCompactMoney(
                      properties.reduce(
                        (sum, property) => sum + Number(property.requestedInvestment || 0),
                        0,
                      ) / Math.max(properties.length, 1),
                    )}
                  </p>
                </div>
              </div>
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
                onClick={handleClearFilters}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/14 focus:outline-none focus:ring-4 focus:ring-white/15"
              >
                Reset filters
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {!loading ? (
        <Pagination pagination={pagination} onPageChange={handlePageChange} />
      ) : null}
    </div>
  );
};

export default InvestorProperties;
