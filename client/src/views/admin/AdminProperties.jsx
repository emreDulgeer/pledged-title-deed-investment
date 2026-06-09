import React, { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  fetchProperties,
  selectProperties,
  selectPropertyPagination,
  selectPropertyFilters,
  selectPropertyLoading,
  selectPropertyError,
  setFilters,
  deleteProperty,
} from "../../store/slices/propertySlice";
import {
  ArrowRight,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import { useAppFeedback } from "../../utils/hooks/useAppFeedback";
import { getUserId, getUserProfilePath } from "../../utils/profileRoutes";
import {
  getPrimaryPropertyImage,
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";
import { APP_CURRENCY } from "../../utils/currency";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const buildLocalFilters = (activeTab, source = {}) => ({
  search: source.search || "",
  status: activeTab === "draft" ? "draft" : source.status || "",
  propertyType: source.propertyType || "",
  country: source.country || "",
  city: source.city || "",
  minPrice: source.minPrice || source.minValue || "",
  maxPrice: source.maxPrice || source.maxValue || "",
  minSize: source.minSize || "",
  maxSize: source.maxSize || "",
  sortBy: source.sortBy || "createdAt",
  sortOrder: source.sortOrder || "desc",
});

const normalizePagination = (pagination, fallbackCount = 0) => {
  const currentPage = Number(pagination?.currentPage || pagination?.page || 1);
  const totalPages = Number(pagination?.totalPages || pagination?.pages || 1);
  const totalItems = Number(
    pagination?.totalItems || pagination?.total || fallbackCount || 0,
  );
  const itemsPerPage = Number(
    pagination?.itemsPerPage || pagination?.limit || 10,
  );

  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasPrev:
      typeof pagination?.hasPrev === "boolean"
        ? pagination.hasPrev
        : currentPage > 1,
    hasNext:
      typeof pagination?.hasNext === "boolean"
        ? pagination.hasNext
        : currentPage < totalPages,
  };
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: APP_CURRENCY,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatCompactMoney = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: APP_CURRENCY,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const formatPercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "—";

  return `${parsed % 1 === 0 ? parsed.toFixed(0) : parsed.toFixed(2)}%`;
};

const formatDate = (value, locale = "en-US") => {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const formatPropertyType = (value = "") =>
  String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Property";

const formatStatus = (value = "") =>
  String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Draft";

const getPropertyId = (property) =>
  (property?._id ?? property?.id)?.toString() ?? "";

const getStatusBadgeClass = (status) => {
  switch (status) {
    case "published":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200";
    case "pending_review":
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200";
    case "rejected":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200";
    case "sold":
      return "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200";
    case "draft":
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200";
  }
};

const getFundingRatio = (property) => {
  const estimatedValue = Number(property?.estimatedValue || 0);
  const requestedInvestment = Number(property?.requestedInvestment || 0);
  if (estimatedValue <= 0 || requestedInvestment <= 0) return 0;

  return Math.max(
    0,
    Math.min(100, (requestedInvestment / estimatedValue) * 100),
  );
};

const SummaryCard = ({ label, value, accent = "", helpText = "" }) => (
  <div className="shell-subtle-surface px-4 py-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
      {label}
    </p>
    <p
      className={`mt-3 text-2xl font-semibold text-day-text dark:text-night-text ${accent}`.trim()}
    >
      {value}
    </p>
    {helpText ? (
      <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
        {helpText}
      </p>
    ) : null}
  </div>
);

const FilterField = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
      {label}
    </span>
    {children}
  </label>
);

const LoadingRow = () => (
  <div className="grid gap-4 px-5 py-5 lg:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
    <div className="h-5 w-5 animate-pulse rounded bg-day-panel/70 dark:bg-night-panel/70" />
    <div className="flex items-start gap-4">
      <div className="h-16 w-16 animate-pulse rounded-3xl bg-day-panel/70 dark:bg-night-panel/70" />
      <div className="flex-1 space-y-3">
        <div className="h-3 w-28 animate-pulse rounded-full bg-day-panel/70 dark:bg-night-panel/70" />
        <div className="h-6 w-2/3 animate-pulse rounded-full bg-day-panel/70 dark:bg-night-panel/70" />
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-day-panel/70 dark:bg-night-panel/70" />
      </div>
    </div>
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={index}
        className="h-24 animate-pulse rounded-3xl bg-day-panel/70 dark:bg-night-panel/70"
      />
    ))}
  </div>
);

const EmptyState = ({ activeTab, onReset, hasActiveFilters }) => (
  <div className="px-6 py-14 text-center sm:px-10">
    <div className="mx-auto max-w-lg">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
        <Search className="h-7 w-7" strokeWidth={2.1} />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-day-text dark:text-night-text">
        No assets in this queue yet
      </h2>
      <p className="mt-3 text-sm leading-6 text-day-muted dark:text-night-muted">
        {activeTab === "draft"
          ? "Draft submissions that require admin vetting will appear here."
          : "Try widening the filters or refresh the list to pull more institutional property records."}
      </p>

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  </div>
);

const Pagination = ({ pagination, onPageChange, onLimitChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  const start = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
  const end = Math.min(
    pagination.currentPage * pagination.itemsPerPage,
    pagination.totalItems,
  );

  return (
    <div className="shell-surface flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <p className="text-sm text-day-muted dark:text-night-muted">
          Showing {start}-{end} of {pagination.totalItems} results
        </p>

        <select
          value={pagination.itemsPerPage}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          className="shell-input max-w-[160px] py-2.5"
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option} per page
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!pagination.hasPrev}
          onClick={() => onPageChange(pagination.currentPage - 1)}
          className="rounded-2xl border border-day-border bg-day-surface px-4 py-2.5 text-sm font-medium text-day-text transition hover:bg-day-panel/60 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
        >
          Previous
        </button>
        <div className="rounded-2xl border border-day-border bg-day-surface px-4 py-2.5 text-sm font-medium text-day-text dark:border-night-border dark:bg-night-surface dark:text-night-text">
          {pagination.currentPage} / {pagination.totalPages}
        </div>
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

const PropertyRow = ({
  property,
  isSelected,
  onToggleSelect,
  onOpen,
  onOpenOwner,
}) => {
  const thumbnail = getPrimaryPropertyImage(property);
  const thumbnailUrl = getPropertyImageUrl(thumbnail);
  const fundingRatio = getFundingRatio(property);
  const ownerId = getUserId(property.owner);

  return (
    <div className="grid gap-5 px-5 py-5 lg:grid-cols-[auto_minmax(0,2fr)_minmax(220px,1fr)_minmax(220px,1fr)_auto] lg:items-start">
      <div className="pt-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-4 w-4 rounded border-day-border text-day-primary focus:ring-day-primary/20 dark:border-night-border dark:bg-night-surface dark:text-night-primary dark:focus:ring-night-primary/20"
          aria-label={`Select ${property.title || "property"}`}
        />
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="flex items-start gap-4 text-left"
      >
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[24px] bg-day-panel dark:bg-night-panel">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={property.title || "Property"}
              className="h-full w-full object-cover"
              style={getPropertyImageStyle(thumbnail)}
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-day-primary/35 dark:text-night-primary/35">
              <Building2 className="h-8 w-8" strokeWidth={1.9} />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-day-panel px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-primary dark:bg-night-panel dark:text-night-primary">
              {formatPropertyType(property.propertyType)}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getStatusBadgeClass(property.status)}`}
            >
              {formatStatus(property.status)}
            </span>
          </div>

          <h2 className="mt-3 text-xl font-semibold text-day-text dark:text-night-text">
            {property.title || "Untitled property"}
          </h2>

          <div className="mt-2 flex items-start gap-2 text-sm text-day-muted dark:text-night-muted">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            <span>{[property.city, property.country].filter(Boolean).join(", ") || "Location pending"}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-day-muted dark:text-night-muted">
            <span>ID: {getPropertyId(property).slice(-8) || "N/A"}</span>
            <span>{property.size ? `${property.size} m²` : "Size pending"}</span>
            <span>{property.rooms ? `${property.rooms} rooms` : "Rooms pending"}</span>
          </div>
        </div>
      </button>

      <div className="shell-subtle-surface px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
          Capital stack
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-day-text dark:text-night-text">
              {formatMoney(property.estimatedValue)}
            </p>
            <p className="text-sm text-day-muted dark:text-night-muted">
              Estimated value
            </p>
          </div>
          <div className="text-right">
            <p className="text-base font-semibold text-day-text dark:text-night-text">
              {formatMoney(property.requestedInvestment)}
            </p>
            <p className="text-sm text-day-muted dark:text-night-muted">
              Requested
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-medium text-day-muted dark:text-night-muted">
            <span>Funding ratio</span>
            <span>{Math.round(fundingRatio)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-day-border/50 dark:bg-night-border/50">
            <div
              className="h-full rounded-full bg-day-primary dark:bg-night-primary"
              style={{ width: `${fundingRatio}%` }}
            />
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-day-muted dark:text-night-muted">Target yield</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-300">
              {formatPercent(property.annualYieldPercent)}
            </span>
          </div>
        </div>
      </div>

      <div className="shell-subtle-surface px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
          Ownership
        </p>
        {property.owner ? (
          <div className="mt-3">
            <p className="text-base font-semibold text-day-text dark:text-night-text">
              {property.owner.fullName}
            </p>
            <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
              {property.owner.email}
            </p>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-day-muted dark:text-night-muted">Created</span>
              <span className="font-medium text-day-text dark:text-night-text">
                {formatDate(property.createdAt)}
              </span>
            </div>
            {ownerId ? (
              <button
                type="button"
                onClick={onOpenOwner}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-day-border px-3 py-1.5 text-xs font-semibold text-day-primary transition hover:bg-day-panel/60 dark:border-night-border dark:text-night-primary dark:hover:bg-night-panel/60"
              >
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.1} />
                View owner profile
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 space-y-3 text-sm text-day-muted dark:text-night-muted">
            <p>Owner information has not been attached yet.</p>
            <div className="flex items-center justify-between">
              <span>Created</span>
              <span className="font-medium text-day-text dark:text-night-text">
                {formatDate(property.createdAt)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-start gap-3 lg:items-end">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
        >
          Review asset
          <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
        </button>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-day-border bg-day-surface px-3 py-2 text-sm text-day-muted dark:border-night-border dark:bg-night-surface dark:text-night-muted">
          <Calendar className="h-4 w-4" strokeWidth={2.1} />
          Updated {formatDate(property.updatedAt || property.createdAt)}
        </div>
      </div>
    </div>
  );
};

const AdminProperties = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const feedback = useAppFeedback();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "draft" ? "draft" : "other";

  const properties = useSelector(selectProperties);
  const rawPagination = useSelector(selectPropertyPagination);
  const filters = useSelector(selectPropertyFilters);
  const loading = useSelector(selectPropertyLoading);
  const error = useSelector(selectPropertyError);

  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState(
    buildLocalFilters(activeTab, filters),
  );
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const pagination = useMemo(
    () => normalizePagination(rawPagination, properties.length),
    [rawPagination, properties.length],
  );

  const tabItems = [
    { key: "other", label: t("admin.properties.tabs.other", "Other") },
    { key: "draft", label: t("admin.properties.tabs.draft", "Draft") },
  ];

  const getTabScopedFilters = (tabKey, baseFilters = {}) => {
    const nextFilters = { ...baseFilters };

    if (tabKey === "draft") {
      nextFilters.status = "draft";
      delete nextFilters.statusMode;
      return nextFilters;
    }

    if (!nextFilters.status || nextFilters.status === "draft") {
      nextFilters.status = "";
      nextFilters.statusMode = "nonDraft";
    } else {
      delete nextFilters.statusMode;
    }

    return nextFilters;
  };

  useEffect(() => {
    const cleaned = Object.fromEntries(
      Object.entries({
        ...getTabScopedFilters(activeTab, filters),
        page: filters.page || 1,
        limit: filters.limit || pagination.itemsPerPage || 10,
      }).filter(
        ([, value]) => value !== "" && value !== null && value !== undefined,
      ),
    );

    dispatch(fetchProperties(cleaned));
  }, [activeTab, dispatch, filters, pagination.itemsPerPage]);

  useEffect(() => {
    setLocalFilters(buildLocalFilters(activeTab, filters));
  }, [activeTab, filters]);

  useEffect(() => {
    dispatch(
      setFilters(
        getTabScopedFilters(activeTab, {
          ...filters,
          page: 1,
        }),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const propertySummary = useMemo(() => {
    const totalPortfolioValue = properties.reduce(
      (sum, property) => sum + Number(property.estimatedValue || 0),
      0,
    );
    const pendingReviews = properties.filter((property) =>
      ["draft", "pending_review"].includes(property.status),
    ).length;
    const averageYieldValues = properties
      .map((property) => Number(property.annualYieldPercent || 0))
      .filter((value) => value > 0);
    const averageYield =
      averageYieldValues.length > 0
        ? averageYieldValues.reduce((sum, value) => sum + value, 0) /
          averageYieldValues.length
        : 0;
    const uniqueMarkets = new Set(
      properties.map((property) => property.country).filter(Boolean),
    ).size;

    return {
      totalPortfolioValue,
      pendingReviews,
      averageYield,
      uniqueMarkets,
      publishedCount: properties.filter((property) => property.status === "published")
        .length,
    };
  }, [properties]);

  const appliedFilterCount = Object.entries(localFilters).filter(
    ([key, value]) => {
      if (value === "" || value === null || value === undefined) {
        return false;
      }

      if (key === "status" && activeTab === "draft") {
        return false;
      }

      if (key === "sortBy" || key === "sortOrder") {
        return false;
      }

      return true;
    },
  ).length;

  const hasActiveFilters = useMemo(
    () =>
      Boolean(filters.search) ||
      Boolean(filters.status) ||
      Boolean(filters.propertyType) ||
      Boolean(filters.country) ||
      Boolean(filters.city) ||
      Boolean(filters.minPrice || filters.minValue) ||
      Boolean(filters.maxPrice || filters.maxValue) ||
      Boolean(filters.minSize) ||
      Boolean(filters.maxSize) ||
      Boolean(filters.statusMode),
    [filters],
  );

  const fetchPropertiesData = () => {
    const cleaned = Object.fromEntries(
      Object.entries({
        ...getTabScopedFilters(activeTab, filters),
        page: filters.page || 1,
        limit: filters.limit || pagination.itemsPerPage || 10,
      }).filter(
        ([, value]) => value !== "" && value !== null && value !== undefined,
      ),
    );
    dispatch(fetchProperties(cleaned));
  };

  const handleFilterChange = (key, value) => {
    setLocalFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const applyFilters = () => {
    dispatch(
      setFilters(
        getTabScopedFilters(activeTab, {
          ...filters,
          ...localFilters,
          page: 1,
        }),
      ),
    );
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    const resetFilters = buildLocalFilters(activeTab);
    setLocalFilters(resetFilters);
    dispatch(
      setFilters(
        getTabScopedFilters(activeTab, {
          ...resetFilters,
          page: 1,
          limit: filters.limit || pagination.itemsPerPage || 10,
        }),
      ),
    );
  };

  const handlePageChange = (page) => {
    dispatch(
      setFilters({
        ...filters,
        page,
      }),
    );
  };

  const handleLimitChange = (limit) => {
    dispatch(
      setFilters({
        ...filters,
        limit,
        page: 1,
      }),
    );
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedProperties.length === 0) return;

    if (bulkAction === "delete") {
      setShowBulkDeleteModal(true);
    }
  };

  const handleConfirmBulkDelete = async () => {
    try {
      for (const id of selectedProperties) {
        await dispatch(deleteProperty(id)).unwrap();
      }

      setSelectedProperties([]);
      setBulkAction("");
      setShowBulkDeleteModal(false);
      feedback.success("Selected properties were deleted.");
      fetchPropertiesData();
    } catch (bulkDeleteError) {
      console.error("Bulk property delete error:", bulkDeleteError);
      feedback.error(
        bulkDeleteError?.message || "Failed to delete the selected properties.",
      );
    }
  };

  const handleExport = () => {
    const rows = properties.map((property) => ({
      id: getPropertyId(property),
      title: property.title || "",
      propertyType: formatPropertyType(property.propertyType),
      city: property.city || "",
      country: property.country || "",
      estimatedValue: property.estimatedValue || "",
      requestedInvestment: property.requestedInvestment || "",
      annualYieldPercent: property.annualYieldPercent || "",
      status: formatStatus(property.status),
      owner: property.owner?.fullName || "",
      ownerEmail: property.owner?.email || "",
      createdAt: property.createdAt || "",
    }));

    const headers = Object.keys(rows[0] || {
      id: "",
      title: "",
      propertyType: "",
      city: "",
      country: "",
      estimatedValue: "",
      requestedInvestment: "",
      annualYieldPercent: "",
      status: "",
      owner: "",
      ownerEmail: "",
      createdAt: "",
    });

    const escapeCell = (value) => {
      const normalized = String(value ?? "");
      return `"${normalized.replace(/"/g, '""')}"`;
    };

    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `admin-properties-${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const selectedSortLabel =
    localFilters.sortBy === "estimatedValue"
      ? "Estimated value"
      : localFilters.sortBy === "size"
        ? "Size"
        : localFilters.sortBy === "city"
          ? "City"
          : localFilters.sortBy === "updatedAt"
            ? "Updated date"
            : "Created date";

  return (
    <div className="space-y-6 p-4 sm:p-6 xl:p-8">
      {showBulkDeleteModal ? (
        <ConfirmationModal
          title="Delete selected properties"
          message={t(
            "admin.properties.confirm_bulk_action",
            "Delete the selected properties? This action cannot be undone.",
          )}
          confirmLabel="Delete selection"
          onConfirm={handleConfirmBulkDelete}
          onClose={() => setShowBulkDeleteModal(false)}
          tone="danger"
        />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.22fr)_340px]">
        <div className="shell-surface flex h-full flex-col justify-between px-6 py-7 sm:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-day-primary dark:border-night-border/70 dark:bg-night-surface dark:text-night-primary">
              Property vetting
            </span>
            <span className="rounded-full border border-day-border/70 bg-day-panel/70 px-3 py-1 text-xs font-medium text-day-muted dark:border-night-border/70 dark:bg-night-panel/70 dark:text-night-muted">
              Institutional oversight
            </span>
          </div>

          <div className="mt-6 max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
              {t("admin.properties.title", "Properties master list")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-day-muted dark:text-night-muted">
              Review incoming submissions, audit live inventory, and keep the
              marketplace queue aligned with operational and compliance standards.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Visible assets"
              value={pagination.totalItems || properties.length}
              helpText={
                activeTab === "draft"
                  ? "Draft submissions currently sitting in the review queue."
                  : "Results returned by the active admin listing query."
              }
            />
            <SummaryCard
              label="Visible portfolio value"
              value={formatCompactMoney(propertySummary.totalPortfolioValue)}
            />
            <SummaryCard
              label="Pending review"
              value={propertySummary.pendingReviews}
              accent="text-amber-600 dark:text-amber-300"
            />
            <SummaryCard
              label="Average yield"
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
                Queue controls
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
                Manage the workflow
              </h2>
            </div>

            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
              <SlidersHorizontal className="h-5 w-5" strokeWidth={2.2} />
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-day-muted dark:text-night-muted">
            Refresh the queue, refine the active dataset, or export the current
            audit view for compliance and partner operations.
          </p>

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={fetchPropertiesData}
              className="inline-flex items-center justify-between rounded-2xl bg-day-primary px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
            >
              <span>Refresh queue</span>
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                strokeWidth={2.2}
              />
            </button>

            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              className="inline-flex items-center justify-between rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 focus:outline-none focus:ring-4 focus:ring-day-primary/10 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60 dark:focus:ring-night-primary/10"
            >
              <span>Advanced filters</span>
              <Filter className="h-4 w-4" strokeWidth={2.2} />
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center justify-between rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 focus:outline-none focus:ring-4 focus:ring-day-primary/10 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60 dark:focus:ring-night-primary/10"
            >
              <span>Export CSV</span>
              <Download className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            <SummaryCard
              label="Active view"
              value={activeTab === "draft" ? "Draft review queue" : "Non-draft inventory"}
            />
            <SummaryCard label="Applied filters" value={appliedFilterCount} />
            <SummaryCard label="Sort order" value={selectedSortLabel} />
            <SummaryCard label="Markets on page" value={propertySummary.uniqueMarkets} />
          </div>
        </aside>
      </section>

      <div className="flex items-center gap-2 overflow-x-auto border-b border-day-border/70 px-1 dark:border-night-border/70">
        {tabItems.map((tab) => {
          const isActive = tab.key === activeTab;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                const nextParams = new URLSearchParams(searchParams);
                nextParams.set("tab", tab.key);
                setSearchParams(nextParams);
              }}
              className={`border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "border-day-primary text-day-primary dark:border-night-primary dark:text-night-primary"
                  : "border-transparent text-day-muted hover:text-day-text dark:text-night-muted dark:hover:text-night-text"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {showFilters ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters();
          }}
          className="shell-surface px-5 py-5 sm:px-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
                Filter stack
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-day-text dark:text-night-text">
                Refine the property queue
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="shell-icon-button"
              aria-label="Close filters"
            >
              <X className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-4">
            <FilterField label="Search">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-day-muted dark:text-night-muted"
                  strokeWidth={2.2}
                />
                <input
                  type="text"
                  value={localFilters.search}
                  onChange={(event) =>
                    handleFilterChange("search", event.target.value)
                  }
                  placeholder={t(
                    "admin.properties.search_placeholder",
                    "Search property title, city, country, or owner",
                  )}
                  className="shell-input pl-11"
                />
              </div>
            </FilterField>

            <FilterField label="Status">
              <select
                value={localFilters.status}
                onChange={(event) =>
                  handleFilterChange("status", event.target.value)
                }
                disabled={activeTab === "draft"}
                className="shell-input"
              >
                <option value="">{t("common.all", "All")}</option>
                {activeTab === "draft" ? (
                  <option value="draft">{t("properties.status.draft", "Draft")}</option>
                ) : (
                  <>
                    <option value="published">
                      {t("properties.status.published", "Published")}
                    </option>
                    <option value="pending_review">
                      {t("properties.status.pending_review", "Pending review")}
                    </option>
                    <option value="rejected">
                      {t("properties.status.rejected", "Rejected")}
                    </option>
                    <option value="sold">{t("properties.status.sold", "Sold")}</option>
                  </>
                )}
              </select>
            </FilterField>

            <FilterField label="Property type">
              <select
                value={localFilters.propertyType}
                onChange={(event) =>
                  handleFilterChange("propertyType", event.target.value)
                }
                className="shell-input"
              >
                <option value="">{t("common.all", "All")}</option>
                <option value="apartment">{t("properties.types.apartment", "Apartment")}</option>
                <option value="villa">{t("properties.types.villa", "Villa")}</option>
                <option value="land">{t("properties.types.land", "Land")}</option>
                <option value="commercial">
                  {t("properties.types.commercial", "Commercial")}
                </option>
                <option value="other">{t("properties.types.other", "Other")}</option>
              </select>
            </FilterField>

            <FilterField label="Country">
              <input
                type="text"
                value={localFilters.country}
                onChange={(event) =>
                  handleFilterChange("country", event.target.value)
                }
                placeholder={t("common.country", "Country")}
                className="shell-input"
              />
            </FilterField>

            <FilterField label="City">
              <input
                type="text"
                value={localFilters.city}
                onChange={(event) => handleFilterChange("city", event.target.value)}
                placeholder={t("common.city", "City")}
                className="shell-input"
              />
            </FilterField>

            <FilterField label="Min value">
              <input
                type="number"
                value={localFilters.minPrice}
                onChange={(event) =>
                  handleFilterChange("minPrice", event.target.value)
                }
                placeholder="0"
                className="shell-input"
              />
            </FilterField>

            <FilterField label="Max value">
              <input
                type="number"
                value={localFilters.maxPrice}
                onChange={(event) =>
                  handleFilterChange("maxPrice", event.target.value)
                }
                placeholder="1000000"
                className="shell-input"
              />
            </FilterField>

            <FilterField label="Min size (m²)">
              <input
                type="number"
                value={localFilters.minSize}
                onChange={(event) =>
                  handleFilterChange("minSize", event.target.value)
                }
                placeholder="0"
                className="shell-input"
              />
            </FilterField>

            <FilterField label="Max size (m²)">
              <input
                type="number"
                value={localFilters.maxSize}
                onChange={(event) =>
                  handleFilterChange("maxSize", event.target.value)
                }
                placeholder="1000"
                className="shell-input"
              />
            </FilterField>

            <FilterField label="Sort by">
              <select
                value={localFilters.sortBy}
                onChange={(event) =>
                  handleFilterChange("sortBy", event.target.value)
                }
                className="shell-input"
              >
                <option value="createdAt">{t("common.created_date", "Created date")}</option>
                <option value="updatedAt">{t("common.updated_date", "Updated date")}</option>
                <option value="estimatedValue">{t("properties.value", "Value")}</option>
                <option value="size">{t("properties.size", "Size")}</option>
                <option value="city">{t("common.city", "City")}</option>
              </select>
            </FilterField>

            <FilterField label="Order">
              <select
                value={localFilters.sortOrder}
                onChange={(event) =>
                  handleFilterChange("sortOrder", event.target.value)
                }
                className="shell-input"
              >
                <option value="asc">{t("common.ascending", "Ascending")}</option>
                <option value="desc">{t("common.descending", "Descending")}</option>
              </select>
            </FilterField>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-day-border/70 pt-5 dark:border-night-border/70 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 focus:outline-none focus:ring-4 focus:ring-day-primary/10 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60 dark:focus:ring-night-primary/10"
            >
              Clear
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
            >
              Apply filters
            </button>
          </div>
        </form>
      ) : null}

      {selectedProperties.length > 0 ? (
        <div className="shell-subtle-surface flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-day-text dark:text-night-text">
              {selectedProperties.length} asset
              {selectedProperties.length === 1 ? "" : "s"} selected
            </p>
            <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
              Apply a bulk action to the current admin selection.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={bulkAction}
              onChange={(event) => setBulkAction(event.target.value)}
              className="shell-input min-w-[220px] py-2.5"
            >
              <option value="">{t("admin.properties.select_action", "Select action")}</option>
              <option value="delete">{t("admin.properties.bulk_delete", "Delete")}</option>
            </select>
            <button
              type="button"
              onClick={handleBulkAction}
              disabled={!bulkAction}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2.1} />
              {t("common.apply", "Apply")}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <section className="shell-surface overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-day-border/70 px-5 py-5 dark:border-night-border/70 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
              Review dataset
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-day-text dark:text-night-text">
              Institutional asset queue
            </h2>
            <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
              {pagination.totalItems > 0
                ? `${pagination.totalItems} asset${pagination.totalItems === 1 ? "" : "s"} match the current query.`
                : "Matching property records will appear here once the query returns results."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-day-border/70 bg-day-surface px-3 py-2 text-sm text-day-muted dark:border-night-border/70 dark:bg-night-surface dark:text-night-muted">
              {activeTab === "draft" ? "Draft-only review queue" : "All non-draft assets"}
            </div>
            {loading && properties.length > 0 ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-day-border/70 bg-day-surface px-3 py-2 text-sm text-day-muted dark:border-night-border/70 dark:bg-night-surface dark:text-night-muted">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
                Updating
              </div>
            ) : null}
          </div>
        </div>

        <div className="divide-y divide-day-border/70 dark:divide-night-border/70">
          {loading && properties.length === 0
            ? Array.from({ length: 5 }).map((_, index) => (
                <LoadingRow key={index} />
              ))
            : null}

          {!loading && properties.length === 0 ? (
            <EmptyState
              activeTab={activeTab}
              onReset={handleClearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          ) : null}

          {properties.map((property) => {
            const propertyId = getPropertyId(property);
            const ownerId = getUserId(property.owner);

            return (
              <PropertyRow
                key={propertyId}
                property={property}
                isSelected={selectedProperties.includes(propertyId)}
                onToggleSelect={() => {
                  setSelectedProperties((current) =>
                    current.includes(propertyId)
                      ? current.filter((id) => id !== propertyId)
                      : [...current, propertyId],
                  );
                }}
                onOpen={() => navigate(`/admin/properties/${propertyId}`)}
                onOpenOwner={() => {
                  if (ownerId) {
                    navigate(getUserProfilePath(ownerId));
                  }
                }}
              />
            );
          })}
        </div>
      </section>

      {!loading ? (
        <Pagination
          pagination={pagination}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      ) : null}
    </div>
  );
};

export default AdminProperties;
