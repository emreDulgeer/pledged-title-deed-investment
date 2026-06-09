// src/views/owner/OwnerProperties.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  ClipboardList,
  Eye,
  FilePlus2,
  Globe2,
  Home,
  LayoutGrid,
  Loader2,
  MessageSquareText,
  Plus,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import bridge from "../../controllers/bridge";
import {
  getPrimaryPropertyImage,
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";
import { APP_CURRENCY } from "../../utils/currency";

// ── Sabitler ─────────────────────────────────────────────────────────────────

const TABS = ["all", "my", "offers", "invested"];

const PROPERTY_STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  pending_review:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  published:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  in_contract:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  completed:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  on_resale:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const INVESTMENT_STATUS_COLORS = {
  offer_sent:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  contract_signed:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  title_deed_pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  active:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  completed: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  refunded: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  defaulted: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const fmt = (num, currency = "") =>
  `${(num ?? 0).toLocaleString("en-US")}${currency ? " " + currency : ""}`;

const getPropertyOfferCount = (property) =>
  Number(
    property?.investmentOfferCount ??
      property?.statistics?.investmentOfferCount ??
      0,
  );

const getPropertyViewCount = (property) =>
  Number(property?.viewCount ?? property?.statistics?.viewCount ?? 0);

const formatDate = (str) =>
  str
    ? new Date(str).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const DEFAULT_PAGINATION = {
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  itemsPerPage: 12,
  hasPrev: false,
  hasNext: false,
};

// ── Küçük yardımcı bileşenler ────────────────────────────────────────────────

const StatusBadge = ({ status, map = PROPERTY_STATUS_COLORS }) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${map[status] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}
  >
    {status?.replace(/_/g, " ")}
  </span>
);

const SkeletonCard = () => (
  <div className="shell-surface animate-pulse overflow-hidden">
    <div className="h-52 bg-day-panelStrong dark:bg-night-panelStrong" />
    <div className="space-y-4 p-5">
      <div className="h-4 w-2/3 rounded-full bg-day-panelStrong dark:bg-night-panelStrong" />
      <div className="h-3 w-1/2 rounded-full bg-day-panelStrong dark:bg-night-panelStrong" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 rounded-2xl bg-day-panelStrong dark:bg-night-panelStrong" />
        <div className="h-16 rounded-2xl bg-day-panelStrong dark:bg-night-panelStrong" />
      </div>
      <div className="h-10 rounded-2xl bg-day-panelStrong dark:bg-night-panelStrong" />
    </div>
  </div>
);

const EmptyState = ({ icon, title, subtitle, actionLabel, onAction }) => (
  <div className="shell-surface col-span-full flex flex-col items-center px-6 py-16 text-center">
    <div className="grid h-16 w-16 place-items-center rounded-3xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
      {typeof icon === "function" ? (
        React.createElement(icon, { className: "h-7 w-7", strokeWidth: 2.1 })
      ) : (
        <span className="text-3xl">{icon}</span>
      )}
    </div>
    <h3 className="mt-5 text-2xl font-semibold text-day-text dark:text-night-text">
      {title}
    </h3>
    <p className="mt-3 max-w-md text-sm leading-6 text-day-muted dark:text-night-muted">
      {subtitle}
    </p>
    {actionLabel && (
      <button
        type="button"
        onClick={onAction}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark"
      >
        {actionLabel}
        <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
      </button>
    )}
  </div>
);

const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;
  const {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasPrev,
    hasNext,
  } = pagination;
  const from = (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="shell-surface flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-day-muted dark:text-night-muted">
        {from}–{to} / {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-day-border text-sm font-semibold text-day-text transition hover:bg-day-panel disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-border dark:text-night-text dark:hover:bg-night-panel"
        >
          ←
        </button>
        <span className="rounded-2xl bg-day-panel px-4 py-2 text-sm font-semibold text-day-text dark:bg-night-panel dark:text-night-text">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-day-border text-sm font-semibold text-day-text transition hover:bg-day-panel disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-border dark:text-night-text dark:hover:bg-night-panel"
        >
          →
        </button>
      </div>
    </div>
  );
};

// ── Filtre paneli ─────────────────────────────────────────────────────────────

const FilterBar = ({
  filters,
  onChange,
  showStatusFilter = true,
  statusOptions = [],
}) => {
  const { t } = useTranslation();

  return (
    <div className="shell-surface p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
            Portfolio controls
          </p>
          <h2 className="mt-2 text-xl font-semibold text-day-text dark:text-night-text">
            Filter the property pipeline
          </h2>
        </div>

        <div
          className={`grid w-full gap-3 md:grid-cols-2 xl:w-auto ${
            showStatusFilter
              ? "xl:grid-cols-[280px_160px_160px_170px_100px]"
              : "xl:grid-cols-[280px_170px_170px_110px]"
          }`}
        >
          {/* Arama */}
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-day-muted dark:text-night-muted"
              strokeWidth={2.2}
            />
            <input
              type="text"
              placeholder={t("common.search") || "Search city, country..."}
              value={filters.search || ""}
              onChange={(e) => onChange("search", e.target.value)}
              className="shell-input pl-11"
            />
          </label>

          {/* Mülk tipi */}
          <select
            value={filters.propertyType || ""}
            onChange={(e) => onChange("propertyType", e.target.value)}
            className="shell-input"
          >
            <option value="">{t("owner.all_types") || "All types"}</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="commercial">Commercial</option>
            <option value="other">Other</option>
          </select>

          {/* Durum filtresi - sadece bazı tablarda */}
          {showStatusFilter ? (
            <select
              value={filters.status || ""}
              onChange={(e) => onChange("status", e.target.value)}
              className="shell-input"
            >
              <option value="">
                {t("common.all_statuses") || "All statuses"}
              </option>
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={filters.sortBy || "-createdAt"}
              onChange={(e) => onChange("sortBy", e.target.value)}
              className="shell-input"
            >
              <option value="-createdAt">
                {t("common.newest") || "Newest first"}
              </option>
              <option value="createdAt">
                {t("common.oldest") || "Oldest first"}
              </option>
              <option value="-requestedInvestment">Highest investment</option>
              <option value="requestedInvestment">Lowest investment</option>
              <option value="-annualYieldPercent">Highest yield</option>
            </select>
          )}

          {/* Sıralama */}
          {showStatusFilter ? (
            <select
              value={filters.sortBy || "-createdAt"}
              onChange={(e) => onChange("sortBy", e.target.value)}
              className="shell-input"
            >
              <option value="-createdAt">
                {t("common.newest") || "Newest first"}
              </option>
              <option value="createdAt">
                {t("common.oldest") || "Oldest first"}
              </option>
              <option value="-requestedInvestment">Highest investment</option>
              <option value="requestedInvestment">Lowest investment</option>
              <option value="-annualYieldPercent">Highest yield</option>
            </select>
          ) : null}

          {/* Limit */}
          <select
            value={filters.limit || 12}
            onChange={(e) => onChange("limit", parseInt(e.target.value))}
            className="shell-input"
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// ── Property kartı (All / My / Invested tabları için) ─────────────────────────

const PropertyCard = ({ property, onNavigate, showMyBadge = false }) => {
  const thumbnail = getPrimaryPropertyImage(property);
  const thumbnailUrl = getPropertyImageUrl(thumbnail);
  const offerCount = getPropertyOfferCount(property);
  const viewCount = getPropertyViewCount(property);

  return (
    <button
      type="button"
      className="shell-surface group flex h-full cursor-pointer flex-col overflow-hidden text-left transition duration-300 hover:-translate-y-1 hover:shadow-shell"
      onClick={onNavigate}
    >
      {/* Resim */}
      <div className="relative h-56 overflow-hidden bg-day-panel dark:bg-night-panel">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`${property.city || "Property"}, ${property.country || ""}`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            style={getPropertyImageStyle(thumbnail)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-day-muted dark:text-night-muted">
            <Home className="h-12 w-12" strokeWidth={1.7} />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/60 to-transparent" />

        {/* Featured rozeti */}
        {property.isFeatured && (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-amber-950 shadow-sm">
            <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
            Featured
          </span>
        )}

        {/* Status */}
        <span className="absolute right-4 top-4">
          <StatusBadge status={property.status} />
        </span>

        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            {property.propertyType?.replace(/_/g, " ") || "Property"}
          </p>
          <h3 className="mt-1 truncate text-2xl font-semibold text-white">
            {property.city}, {property.country}
          </h3>
        </div>
      </div>

      {/* İçerik */}
      <div className="flex flex-1 flex-col p-5">
        <div className="grid grid-cols-2 gap-3">
          <OfferMetric
            label="Investment"
            value={formatMoney(property.requestedInvestment)}
          />
          <OfferMetric
            label="Yield"
            value={formatPercent(property.annualYieldPercent)}
            tone="text-emerald-700 dark:text-emerald-300"
          />
        </div>

        {/* My Properties: yatırım sayısı rozeti */}
        {showMyBadge && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${offerCount > 0 ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-200" : "bg-day-panel text-day-muted dark:bg-night-panel dark:text-night-muted"}`}
            >
              <ClipboardList className="h-3.5 w-3.5" strokeWidth={2.1} />
              {offerCount} offer
              {offerCount !== 1 ? "s" : ""}
            </span>
            {viewCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-day-panel px-3 py-1 text-xs font-semibold text-day-muted dark:bg-night-panel dark:text-night-muted">
                <Eye className="h-3.5 w-3.5" strokeWidth={2.1} />
                {viewCount}
              </span>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-day-border/70 pt-4 dark:border-night-border/70">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-day-muted dark:text-night-muted">
              Size
            </p>
            <p className="mt-1 text-sm font-semibold text-day-text dark:text-night-text">
              {property.size ? `${property.size} m²` : "—"}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full text-sm font-semibold text-day-primary transition group-hover:translate-x-1 dark:text-night-primary">
            View details
            <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          </span>
        </div>

        {/* Tarih */}
        <p className="mt-4 text-xs text-day-muted dark:text-night-muted">
          Created {formatDate(property.createdAt)}
        </p>
      </div>
    </button>
  );
};

// ── ALL PROPERTIES TAB ─────────────────────────────────────────────────────────

const AllPropertiesTab = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    propertyType: "",
    sortBy: "-createdAt",
    limit: 12,
    page: 1,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, status: "published" }; // Her zaman published
      if (!params.propertyType) delete params.propertyType;
      if (!params.search) delete params.search;

      const res = await bridge.properties.getAll(params);
      if (res?.success) {
        setProperties(res.data ?? []);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (e) {
      console.error("All properties error:", e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  const handlePage = (page) => setFilters((prev) => ({ ...prev, page }));

  return (
    <div className="space-y-5">
      <FilterBar
        filters={filters}
        onChange={handleFilter}
        showStatusFilter={false}
        statusOptions={[]}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : properties.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No properties found"
            subtitle="Try adjusting your filters."
          />
        ) : (
          properties.map((p) => (
            <PropertyCard
              key={p.id || p._id}
              property={p}
              onNavigate={() => navigate(`/owner/properties/${p.id || p._id}`)}
            />
          ))
        )}
      </div>

      {!loading && (
        <Pagination pagination={pagination} onPageChange={handlePage} />
      )}
    </div>
  );
};

// ── MY PROPERTIES TAB ─────────────────────────────────────────────────────────

const MyPropertiesTab = ({ onCreateNew }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    propertyType: "",
    sortBy: "-createdAt",
    limit: 12,
    page: 1,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters }; // Status filtresi yok → hepsi gelir
      if (!params.propertyType) delete params.propertyType;
      if (!params.search) delete params.search;

      const res = await bridge.properties.getMyProperties(params);
      if (res?.success) {
        setProperties(res.data ?? []);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (e) {
      console.error("My properties error:", e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  const handlePage = (page) => setFilters((prev) => ({ ...prev, page }));

  return (
    <div className="space-y-5">
      <FilterBar
        filters={filters}
        onChange={handleFilter}
        showStatusFilter={false}
        statusOptions={[]}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : properties.length === 0 ? (
          <EmptyState
            icon={Home}
            title={t("owner.no_properties") || "No properties yet"}
            subtitle={
              t("owner.create_first") ||
              "Create your first property listing to get started."
            }
            actionLabel={t("owner.add_property") || "Add Property"}
            onAction={onCreateNew}
          />
        ) : (
          properties.map((p) => (
            <PropertyCard
              key={p.id || p._id}
              property={p}
              showMyBadge
              onNavigate={() => navigate(`/owner/properties/${p.id || p._id}`)}
            />
          ))
        )}
      </div>

      {!loading && (
        <Pagination pagination={pagination} onPageChange={handlePage} />
      )}
    </div>
  );
};

// ── OFFERS TAB ────────────────────────────────────────────────────────────────

const REVIEWABLE_PROPERTY_STATUSES = ["in_contract", "active", "completed"];

const formatMoney = (value) => `${fmt(value)} ${APP_CURRENCY}`;

const formatPercent = (value) =>
  value || value === 0 ? `${Number(value).toLocaleString("en-US")}%` : "—";

const getEntityId = (entity) => entity?.id || entity?._id;

const OfferSummaryCard = ({
  label,
  value,
  helpText,
  icon,
  accentClass = "text-day-primary dark:text-night-primary",
}) => (
  <div className="rounded-2xl border border-day-border/70 bg-day-panel/70 p-4 dark:border-night-border/70 dark:bg-night-panel/70">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
          {label}
        </p>
        <p className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
          {value}
        </p>
      </div>
      <div
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-day-surface dark:bg-night-surface ${accentClass}`}
      >
        {React.createElement(icon, {
          className: "h-5 w-5",
          strokeWidth: 2.2,
        })}
      </div>
    </div>
    <p className="mt-3 text-xs leading-5 text-day-muted dark:text-night-muted">
      {helpText}
    </p>
  </div>
);

const OfferMetric = ({ label, value, tone = "" }) => (
  <div className="rounded-2xl border border-day-border/60 bg-day-panel/70 px-3 py-3 dark:border-night-border/60 dark:bg-night-panel/70">
    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-day-muted dark:text-night-muted">
      {label}
    </p>
    <p
      className={`mt-1 text-sm font-semibold text-day-text dark:text-night-text ${tone}`}
    >
      {value}
    </p>
  </div>
);

const OfferPropertySkeleton = () => (
  <div className="shell-surface animate-pulse overflow-hidden p-5">
    <div className="flex gap-4">
      <div className="h-24 w-24 rounded-2xl bg-day-panelStrong dark:bg-night-panelStrong" />
      <div className="flex-1 space-y-3 py-1">
        <div className="h-4 w-2/5 rounded-full bg-day-panelStrong dark:bg-night-panelStrong" />
        <div className="h-3 w-3/5 rounded-full bg-day-panelStrong dark:bg-night-panelStrong" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-14 rounded-2xl bg-day-panelStrong dark:bg-night-panelStrong" />
          <div className="h-14 rounded-2xl bg-day-panelStrong dark:bg-night-panelStrong" />
          <div className="h-14 rounded-2xl bg-day-panelStrong dark:bg-night-panelStrong" />
        </div>
      </div>
    </div>
  </div>
);

const OfferFilterPanel = ({ filters, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className="shell-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
            Review controls
          </p>
          <h2 className="mt-2 text-xl font-semibold text-day-text dark:text-night-text">
            Find the right offer set
          </h2>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
          <SlidersHorizontal className="h-5 w-5" strokeWidth={2.2} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_120px]">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-day-muted dark:text-night-muted"
            strokeWidth={2.2}
          />
          <input
            type="text"
            placeholder={t("common.search") || "Search city, country..."}
            value={filters.search || ""}
            onChange={(event) => onChange("search", event.target.value)}
            className="shell-input pl-11"
          />
        </label>

        <select
          value={filters.propertyType || ""}
          onChange={(event) => onChange("propertyType", event.target.value)}
          className="shell-input"
        >
          <option value="">{t("owner.all_types") || "All types"}</option>
          <option value="apartment">Apartment</option>
          <option value="house">House</option>
          <option value="commercial">Commercial</option>
          <option value="other">Other</option>
        </select>

        <select
          value={filters.sortBy || "-createdAt"}
          onChange={(event) => onChange("sortBy", event.target.value)}
          className="shell-input"
        >
          <option value="-createdAt">
            {t("common.newest") || "Newest first"}
          </option>
          <option value="createdAt">
            {t("common.oldest") || "Oldest first"}
          </option>
          <option value="-requestedInvestment">Highest investment</option>
          <option value="requestedInvestment">Lowest investment</option>
          <option value="-annualYieldPercent">Highest yield</option>
        </select>

        <select
          value={filters.limit || 12}
          onChange={(event) => onChange("limit", parseInt(event.target.value))}
          className="shell-input"
        >
          <option value={12}>12</option>
          <option value={24}>24</option>
          <option value={48}>48</option>
        </select>
      </div>
    </div>
  );
};

export const OffersTab = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  // Expanded propertyId → investment listesi
  const [expandedId, setExpandedId] = useState(null);
  const [offersMap, setOffersMap] = useState({}); // { [propertyId]: { loading, data, error } }

  // Kabul / ret state
  const [actionLoading, setActionLoading] = useState(null); // investmentId
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null); // investmentId

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const params = { ...filters };
      if (!params.propertyType) delete params.propertyType;
      if (!params.search) delete params.search;

      // Teklif almış mülkleri göster (investmentOfferCount > 0 olan)
      const res = await bridge.properties.getMyProperties(params);
      if (res?.success) {
        // Sadece offer'ı olan ya da henüz tamamlanmamış yatırım sürecindekiler
        const withOffers = (res.data ?? []).filter(
          (p) =>
            getPropertyOfferCount(p) > 0 ||
            REVIEWABLE_PROPERTY_STATUSES.includes(p.status),
        );
        setProperties(withOffers);
        if (res.pagination) setPagination(res.pagination);
      } else {
        setProperties([]);
        setError(res?.message || "Offers could not be loaded.");
      }
    } catch (e) {
      console.error("Offers tab error:", e);
      setError(e?.message || "Offers could not be loaded.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  const handlePage = (page) => setFilters((prev) => ({ ...prev, page }));

  const loadOffersForProperty = useCallback(
    async (propertyId, { force = false } = {}) => {
      if (!force && offersMap[propertyId]) return;

      setOffersMap((prev) => ({
        ...prev,
        [propertyId]: { loading: true, data: [], error: "" },
      }));
      try {
        const res = await bridge.investments.getPropertyInvestments(
          propertyId,
          {
            status:
              "offer_sent,contract_signed,title_deed_pending,active,completed,refunded",
            sortBy: "createdAt",
            sortOrder: "desc",
          },
        );
        setOffersMap((prev) => ({
          ...prev,
          [propertyId]: {
            loading: false,
            data: Array.isArray(res?.data) ? res.data : [],
            error: "",
          },
        }));
      } catch (e) {
        console.error("Offers load error:", e);
        setOffersMap((prev) => ({
          ...prev,
          [propertyId]: {
            loading: false,
            data: [],
            error: e?.message || "Offers could not be loaded.",
          },
        }));
      }
    },
    [offersMap],
  );

  const toggleOffers = async (propertyId) => {
    if (expandedId === propertyId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(propertyId);
    await loadOffersForProperty(propertyId);
  };

  // Teklifi kabul et
  const handleAccept = async (investmentId, propertyId) => {
    setActionLoading(investmentId);
    try {
      await bridge.investments.acceptOffer(investmentId);
      await loadOffersForProperty(propertyId, { force: true });
      await load({ silent: true });
    } catch (e) {
      console.error("Accept error:", e);
    } finally {
      setActionLoading(null);
    }
  };

  // Teklifi reddet
  const handleReject = async () => {
    if (!rejectTarget) return;
    const { investmentId, propertyId } = rejectTarget;
    setActionLoading(investmentId);
    try {
      await bridge.investments.rejectOffer(
        investmentId,
        rejectReason || "Rejected by owner",
      );
      setRejectTarget(null);
      setRejectReason("");
      await loadOffersForProperty(propertyId, { force: true });
      await load({ silent: true });
    } catch (e) {
      console.error("Reject error:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingOfferCount = properties.reduce(
    (sum, property) => sum + getPropertyOfferCount(property),
    0,
  );
  const lifecyclePropertyCount = properties.filter((property) =>
    REVIEWABLE_PROPERTY_STATUSES.includes(property.status),
  ).length;
  const openReviewCount = properties.filter(
    (property) => getPropertyOfferCount(property) > 0,
  ).length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <OfferSummaryCard
          label="Open queue"
          value={loading ? "—" : openReviewCount}
          helpText="Properties with investor proposals or active deal movement."
          icon={ClipboardList}
        />
        <OfferSummaryCard
          label="Investor offers"
          value={loading ? "—" : pendingOfferCount}
          helpText="Current offer count reported on the loaded property slice."
          icon={CircleDollarSign}
          accentClass="text-cyan-700 dark:text-cyan-300"
        />
        <OfferSummaryCard
          label="In lifecycle"
          value={loading ? "—" : lifecyclePropertyCount}
          helpText="Accepted properties now moving through contract or active stages."
          icon={BadgeCheck}
          accentClass="text-emerald-700 dark:text-emerald-300"
        />
      </section>

      <OfferFilterPanel filters={filters} onChange={handleFilter} />

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          {error}
        </div>
      ) : null}

      {/* Ret modalı */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="shell-surface w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                  Offer decision
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-day-text dark:text-night-text">
                  Reject offer
                </h3>
                <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                  Add an optional note so the investor can understand the owner
                  decision.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
                className="shell-icon-button h-10 w-10 shrink-0"
                aria-label="Close reject dialog"
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </div>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)..."
              className="mt-5 min-h-28 w-full rounded-2xl border border-day-border bg-day-panel px-4 py-3 text-sm text-day-text outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-400/10 dark:border-night-border dark:bg-night-panel dark:text-night-text"
            />
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-day-border px-5 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/70 dark:border-night-border dark:text-night-text dark:hover:bg-night-panel/70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={!!actionLoading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
                ) : (
                  <XCircle className="h-4 w-4" strokeWidth={2.2} />
                )}
                {actionLoading ? "Rejecting..." : "Confirm reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <OfferPropertySkeleton key={i} />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="shell-surface px-6 py-16 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
            <ClipboardList className="h-7 w-7" strokeWidth={2.1} />
          </div>
          <h3 className="mt-5 text-2xl font-semibold text-day-text dark:text-night-text">
            No pending offers
          </h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-day-muted dark:text-night-muted">
            When investors send offers for your properties, they will appear
            here grouped by listing.
          </p>
          <button
            type="button"
            onClick={() => navigate("/owner/properties")}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark"
          >
            Review properties
            <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map((p) => {
            const pid = getEntityId(p);
            const isExpanded = expandedId === pid;
            const offerState = offersMap[pid];
            const offerCount = getPropertyOfferCount(p);
            const thumbnail = getPrimaryPropertyImage(p);
            const thumbnailUrl = getPropertyImageUrl(thumbnail);

            return (
              <div
                key={pid}
                data-testid={`owner-offer-property-${pid}`}
                className="shell-surface overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-shell"
              >
                {/* Mülk satırı */}
                <div className="grid gap-4 p-4 lg:grid-cols-[112px_minmax(0,1fr)_auto] lg:items-center lg:p-5">
                  {/* Küçük resim */}
                  <div className="h-28 w-full overflow-hidden rounded-3xl bg-day-panel dark:bg-night-panel lg:h-28 lg:w-28">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={`${p.city || "Property"}, ${p.country || ""}`}
                        className="w-full h-full object-cover"
                        style={getPropertyImageStyle(thumbnail)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-day-muted dark:text-night-muted">
                        <Home className="h-8 w-8" strokeWidth={1.8} />
                      </div>
                    )}
                  </div>

                  {/* Bilgi */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-day-text dark:text-night-text">
                        {p.city}, {p.country}
                      </h3>
                      <StatusBadge status={p.status} />
                      <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-200">
                        {offerCount} offer
                        {offerCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-day-muted dark:text-night-muted">
                      {p.propertyType?.replace(/_/g, " ") || "Property"} ·{" "}
                      {formatMoney(p.requestedInvestment)}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <OfferMetric
                        label="Requested"
                        value={formatMoney(p.requestedInvestment)}
                      />
                      <OfferMetric
                        label="Yield"
                        value={formatPercent(p.annualYieldPercent)}
                        tone="text-emerald-700 dark:text-emerald-300"
                      />
                      <OfferMetric
                        label="Created"
                        value={formatDate(p.createdAt)}
                      />
                    </div>
                  </div>

                  {/* Aksiyon butonları */}
                  <div className="flex flex-col gap-2 sm:flex-row lg:w-44 lg:flex-col">
                    <button
                      type="button"
                      onClick={() => navigate(`/owner/properties/${pid}`)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/70 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/70"
                    >
                      <Eye className="h-4 w-4" strokeWidth={2.1} />
                      {t("properties.property_details") || "Property Details"}
                    </button>
                    <button
                      type="button"
                      data-testid={`owner-offer-toggle-${pid}`}
                      onClick={() => toggleOffers(pid)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" strokeWidth={2.2} />
                      ) : (
                        <ChevronDown className="h-4 w-4" strokeWidth={2.2} />
                      )}
                      {isExpanded ? "Hide offers" : "View offers"}
                    </button>
                  </div>
                </div>

                {/* Genişletilmiş offer listesi */}
                {isExpanded && (
                  <div className="border-t border-day-border/70 bg-day-panel/65 p-4 dark:border-night-border/70 dark:bg-night-panel/55">
                    {offerState?.loading ? (
                      <div className="flex items-center justify-center gap-2 rounded-2xl border border-day-border/60 bg-day-surface p-6 text-sm text-day-muted dark:border-night-border/60 dark:bg-night-surface dark:text-night-muted">
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
                        Loading offers...
                      </div>
                    ) : offerState?.error ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                        {offerState.error}
                      </div>
                    ) : !offerState || offerState.data.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-day-border bg-day-surface p-6 text-center text-sm text-day-muted dark:border-night-border dark:bg-night-surface dark:text-night-muted">
                        No active offers for this property.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {offerState.data.map((inv) => {
                          const invId = getEntityId(inv);
                          return (
                            <div
                              key={invId}
                              className="rounded-3xl border border-day-border/70 bg-day-surface p-4 dark:border-night-border/70 dark:bg-night-surface"
                            >
                              <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
                                        <UserRound className="h-5 w-5" strokeWidth={2.1} />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-day-text dark:text-night-text">
                                          {inv.investor?.fullName ||
                                            inv.investor?.email ||
                                            "Investor"}
                                        </p>
                                        <p className="mt-1 text-xs text-day-muted dark:text-night-muted">
                                          Submitted {formatDate(inv.createdAt)}
                                        </p>
                                      </div>
                                    </div>
                                    <StatusBadge
                                      status={inv.status}
                                      map={INVESTMENT_STATUS_COLORS}
                                    />
                                  </div>

                                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    <OfferMetric
                                      label="Offer amount"
                                      value={formatMoney(inv.amountInvested)}
                                    />
                                    <OfferMetric
                                      label="Ownership"
                                      value={
                                        inv.offerTerms?.ownershipPercent
                                          ? `${inv.offerTerms.ownershipPercent}% share`
                                          : "Share n/a"
                                      }
                                    />
                                    <OfferMetric
                                      label="Desired rent"
                                      value={formatMoney(
                                        inv.offerTerms?.desiredMonthlyRent,
                                      )}
                                    />
                                    <OfferMetric
                                      label="Yield"
                                      value={
                                        inv.offerTerms?.annualYieldPercent
                                          ? `${inv.offerTerms.annualYieldPercent}%`
                                          : "Yield n/a"
                                      }
                                      tone="text-emerald-700 dark:text-emerald-300"
                                    />
                                  </div>

                                  {inv.offerTerms?.message && (
                                    <div className="mt-4 rounded-2xl border border-day-border/60 bg-day-panel/70 p-4 dark:border-night-border/60 dark:bg-night-panel/70">
                                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-day-muted dark:text-night-muted">
                                        <MessageSquareText className="h-4 w-4" strokeWidth={2.1} />
                                        Investor note
                                      </div>
                                      <p className="mt-2 text-sm leading-6 text-day-text/75 dark:text-night-text/75">
                                        {inv.offerTerms.message}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Aksiyon */}
                                <div className="grid gap-2 sm:grid-cols-3 xl:w-44 xl:grid-cols-1">
                                  <button
                                    type="button"
                                    data-testid={`owner-offer-detail-${invId}`}
                                    onClick={() =>
                                      navigate(`/owner/investments/${invId}`)
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/70 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/70"
                                  >
                                    Offer details
                                    <ArrowRight className="h-4 w-4" strokeWidth={2.1} />
                                  </button>

                                  {inv.status === "offer_sent" && (
                                    <>
                                      <button
                                        type="button"
                                        disabled={actionLoading === invId}
                                        onClick={() => handleAccept(invId, pid)}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        {actionLoading === invId ? (
                                          <Loader2
                                            className="h-4 w-4 animate-spin"
                                            strokeWidth={2.2}
                                          />
                                        ) : (
                                          <CheckCircle2 className="h-4 w-4" strokeWidth={2.2} />
                                        )}
                                        {actionLoading === invId
                                          ? "Working..."
                                          : "Accept"}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={actionLoading === invId}
                                        onClick={() =>
                                          setRejectTarget({
                                            investmentId: invId,
                                            propertyId: pid,
                                          })
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/15"
                                      >
                                        <XCircle className="h-4 w-4" strokeWidth={2.2} />
                                        Reject
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && (
        <Pagination pagination={pagination} onPageChange={handlePage} />
      )}
    </div>
  );
};

// ── INVESTED TAB ──────────────────────────────────────────────────────────────

const InvestedTab = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    propertyType: "",
    status: "active",
    sortBy: "-createdAt",
    limit: 12,
    page: 1,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (!params.propertyType) delete params.propertyType;
      if (!params.search) delete params.search;

      const res = await bridge.properties.getMyProperties(params);
      if (res?.success) {
        setProperties(res.data ?? []);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (e) {
      console.error("Invested tab error:", e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  const handlePage = (page) => setFilters((prev) => ({ ...prev, page }));

  const investedStatusOptions = [
    { value: "in_contract", label: "In Contract" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-5">
      <FilterBar
        filters={filters}
        onChange={handleFilter}
        showStatusFilter
        statusOptions={investedStatusOptions}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : properties.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title="No active investments"
            subtitle="Properties with active or completed investment contracts will appear here."
          />
        ) : (
          properties.map((p) => (
            <PropertyCard
              key={p.id || p._id}
              property={p}
              showMyBadge
              onNavigate={() => navigate(`/owner/properties/${p.id || p._id}`)}
            />
          ))
        )}
      </div>

      {!loading && (
        <Pagination pagination={pagination} onPageChange={handlePage} />
      )}
    </div>
  );
};

// ── ANA BİLEŞEN ───────────────────────────────────────────────────────────────

const OwnerProperties = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");

  const tabConfig = [
    {
      key: "all",
      label: t("owner.tabs.all_properties") || "All Properties",
      description: "Published marketplace listings",
      icon: Globe2,
    },
    {
      key: "my",
      label: t("owner.tabs.my_properties") || "My Properties",
      description: "Assets you created",
      icon: Building2,
    },
    {
      key: "offers",
      label: t("owner.tabs.offers") || "Offers",
      description: "Investor proposals",
      icon: ClipboardList,
    },
    {
      key: "invested",
      label: t("owner.tabs.invested") || "Invested",
      description: "Contract and active assets",
      icon: BadgeCheck,
    },
  ];
  const activeTabMeta =
    tabConfig.find((tab) => tab.key === activeTab) || tabConfig[0];

  return (
    <div className="min-h-screen bg-day-dashboard px-4 py-6 text-day-text dark:bg-night-dashboard dark:text-night-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="relative overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_top_left,_rgba(149,211,186,0.32),_transparent_34%),linear-gradient(135deg,#0b1c30_0%,#14253a_52%,#003527_100%)] px-6 py-7 text-white shadow-accent sm:px-8 sm:py-9">
            <div className="absolute -right-10 top-8 h-40 w-40 rounded-full border border-white/10 bg-white/5" />
            <div className="absolute bottom-0 right-16 h-40 w-40 translate-y-24 rounded-full bg-night-primary/20 blur-3xl" />

            <div className="relative max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
                Property command center
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                Manage listings, ownership pipeline, and investor interest in
                one place.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72 sm:text-base">
                Browse the published marketplace, maintain your own assets, and
                jump into offers or active investment records without leaving the
                owner workspace.
              </p>
            </div>

            <div className="relative mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/owner/properties/new")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
              >
                <Plus className="h-4 w-4" strokeWidth={2.4} />
                {t("owner.add_property") || "Add Property"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("offers")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <ClipboardList className="h-4 w-4" strokeWidth={2.2} />
                {t("owner.tabs.offers") || "Offers"}
              </button>
            </div>
          </div>

          <aside className="shell-surface flex flex-col justify-between px-6 py-6">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                    Active view
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
                    {activeTabMeta.label}
                  </h2>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
                  {React.createElement(activeTabMeta.icon, {
                    className: "h-5 w-5",
                    strokeWidth: 2.2,
                  })}
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-day-muted dark:text-night-muted">
                {activeTabMeta.description}
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => navigate("/owner/properties/new")}
                className="inline-flex w-full items-center justify-between rounded-2xl bg-day-primary px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-day-primary-dark dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark"
              >
                <span>{t("owner.add_property") || "Add Property"}</span>
                <FilePlus2 className="h-4 w-4" strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/owner/dashboard")}
                className="inline-flex w-full items-center justify-between rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
              >
                <span>{t("navigation.dashboard", "Dashboard")}</span>
                <ArrowRight className="h-4 w-4" strokeWidth={2.1} />
              </button>
            </div>
          </aside>
        </section>

        {/* ── Sekmeler ── */}
        <div className="shell-surface p-2">
          <div
            className="grid gap-2 lg:grid-cols-4"
            role="tablist"
            aria-label="Owner property sections"
          >
            {tabConfig.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-3 rounded-[22px] px-4 py-3 text-left transition ${
                    isActive
                      ? "bg-day-primary text-white shadow-accent dark:bg-night-primary dark:text-night-background"
                      : "text-day-muted hover:bg-day-panel hover:text-day-text dark:text-night-muted dark:hover:bg-night-panel dark:hover:text-night-text"
                  }`}
                >
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                      isActive
                        ? "bg-white/15"
                        : "bg-day-panel dark:bg-night-panel"
                    }`}
                  >
                    {React.createElement(tab.icon, {
                      className: "h-5 w-5",
                      strokeWidth: 2.2,
                    })}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {tab.label}
                    </span>
                    <span
                      className={`mt-0.5 block truncate text-xs ${
                        isActive
                          ? "text-white/70 dark:text-night-background/70"
                          : "text-day-muted dark:text-night-muted"
                      }`}
                    >
                      {tab.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Sekme içeriği ── */}
        <div>
          {activeTab === "all" && <AllPropertiesTab />}
          {activeTab === "my" && (
            <MyPropertiesTab
              onCreateNew={() => navigate("/owner/properties/new")}
            />
          )}
          {activeTab === "offers" && <OffersTab />}
          {activeTab === "invested" && <InvestedTab />}
        </div>
      </div>
    </div>
  );
};

export default OwnerProperties;
