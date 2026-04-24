// src/views/owner/OwnerProperties.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}
  >
    {status?.replace(/_/g, " ")}
  </span>
);

const SkeletonCard = () => (
  <div className="animate-pulse rounded-xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5">
    <div className="h-40 rounded-lg bg-day-border dark:bg-night-border mb-4" />
    <div className="h-4 w-3/4 rounded bg-day-border dark:bg-night-border mb-2" />
    <div className="h-3 w-1/2 rounded bg-day-border dark:bg-night-border mb-4" />
    <div className="h-3 w-full rounded bg-day-border dark:bg-night-border mb-2" />
    <div className="h-3 w-2/3 rounded bg-day-border dark:bg-night-border" />
  </div>
);

const EmptyState = ({ icon, title, subtitle, actionLabel, onAction }) => (
  <div className="col-span-full py-20 flex flex-col items-center text-center gap-3">
    <span className="text-5xl">{icon}</span>
    <h3 className="text-lg font-semibold text-day-text dark:text-night-text">
      {title}
    </h3>
    <p className="text-sm text-day-text/60 dark:text-night-text/60 max-w-sm">
      {subtitle}
    </p>
    {actionLabel && (
      <button
        onClick={onAction}
        className="mt-2 px-5 py-2 rounded-lg bg-day-primary dark:bg-night-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        {actionLabel}
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
    <div className="flex items-center justify-between pt-4 border-t border-day-border dark:border-night-border">
      <p className="text-sm text-day-text/60 dark:text-night-text/60">
        {from}–{to} / {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={!hasPrev}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-day-border dark:border-night-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-day-surface dark:hover:bg-night-surface transition-colors"
        >
          ←
        </button>
        <span className="px-3 py-1.5 text-sm text-day-text dark:text-night-text">
          {currentPage} / {totalPages}
        </span>
        <button
          disabled={!hasNext}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-day-border dark:border-night-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-day-surface dark:hover:bg-night-surface transition-colors"
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
    <div className="flex flex-wrap gap-3 items-end">
      {/* Arama */}
      <div className="flex-1 min-w-48">
        <input
          type="text"
          placeholder={t("common.search") || "Search city, country…"}
          value={filters.search || ""}
          onChange={(e) => onChange("search", e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface text-day-text dark:text-night-text placeholder:text-day-text/40 dark:placeholder:text-night-text/40 focus:outline-none focus:ring-2 focus:ring-day-primary/40 dark:focus:ring-night-primary/40"
        />
      </div>

      {/* Mülk tipi */}
      <select
        value={filters.propertyType || ""}
        onChange={(e) => onChange("propertyType", e.target.value)}
        className="px-3 py-2 text-sm rounded-lg border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface text-day-text dark:text-night-text focus:outline-none"
      >
        <option value="">{t("owner.all_types") || "All Types"}</option>
        <option value="apartment">Apartment</option>
        <option value="house">House</option>
        <option value="commercial">Commercial</option>
        <option value="other">Other</option>
      </select>

      {/* Durum filtresi - sadece bazı tablarda */}
      {showStatusFilter && (
        <select
          value={filters.status || ""}
          onChange={(e) => onChange("status", e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface text-day-text dark:text-night-text focus:outline-none"
        >
          <option value="">{t("common.all_statuses") || "All Statuses"}</option>
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      )}

      {/* Sıralama */}
      <select
        value={filters.sortBy || "-createdAt"}
        onChange={(e) => onChange("sortBy", e.target.value)}
        className="px-3 py-2 text-sm rounded-lg border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface text-day-text dark:text-night-text focus:outline-none"
      >
        <option value="-createdAt">
          {t("common.newest") || "Newest First"}
        </option>
        <option value="createdAt">
          {t("common.oldest") || "Oldest First"}
        </option>
        <option value="-requestedInvestment">Highest Investment</option>
        <option value="requestedInvestment">Lowest Investment</option>
        <option value="-annualYieldPercent">Highest Yield</option>
      </select>

      {/* Limit */}
      <select
        value={filters.limit || 12}
        onChange={(e) => onChange("limit", parseInt(e.target.value))}
        className="px-3 py-2 text-sm rounded-lg border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface text-day-text dark:text-night-text focus:outline-none"
      >
        <option value={12}>12</option>
        <option value={24}>24</option>
        <option value={48}>48</option>
      </select>
    </div>
  );
};

// ── Property kartı (All / My / Invested tabları için) ─────────────────────────

const PropertyCard = ({ property, onNavigate, showMyBadge = false }) => {
  const thumbnail = getPrimaryPropertyImage(property);
  const thumbnailUrl = getPropertyImageUrl(thumbnail);

  return (
    <div
      className="rounded-xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onNavigate}
    >
      {/* Resim */}
      <div className="relative h-44 bg-day-background dark:bg-night-background">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={property.city}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            style={getPropertyImageStyle(thumbnail)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-day-text/20 dark:text-night-text/20">
            🏠
          </div>
        )}

        {/* Featured rozeti */}
        {property.isFeatured && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900">
            ⭐ Featured
          </span>
        )}

        {/* Status */}
        <span className="absolute top-2 right-2">
          <StatusBadge status={property.status} />
        </span>
      </div>

      {/* İçerik */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div>
          <h3 className="font-semibold text-day-text dark:text-night-text truncate">
            {property.city}, {property.country}
          </h3>
          <p className="text-xs text-day-text/60 dark:text-night-text/60">
            {property.propertyType?.replace(/_/g, " ")} ·{" "}
            {property.size ? `${property.size} m²` : "—"}
          </p>
        </div>

        {/* Finansal bilgi */}
        <div className="grid grid-cols-2 gap-2 text-sm mt-1">
          <div>
            <p className="text-xs text-day-text/50 dark:text-night-text/50">
              Investment
            </p>
            <p className="font-semibold text-day-text dark:text-night-text">
              {fmt(property.requestedInvestment)} {APP_CURRENCY}
            </p>
          </div>
          <div>
            <p className="text-xs text-day-text/50 dark:text-night-text/50">
              Yield
            </p>
            <p className="font-semibold text-green-600 dark:text-green-400">
              {property.annualYieldPercent
                ? `${property.annualYieldPercent}%`
                : "—"}
            </p>
          </div>
        </div>

        {/* My Properties: yatırım sayısı rozeti */}
        {showMyBadge && (
          <div className="flex items-center gap-2 pt-2 border-t border-day-border dark:border-night-border">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${property.investmentOfferCount > 0 ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}
            >
              {property.investmentOfferCount || 0} offer
              {property.investmentOfferCount !== 1 ? "s" : ""}
            </span>
            {property.viewCount > 0 && (
              <span className="text-xs text-day-text/50 dark:text-night-text/50">
                👁 {property.viewCount}
              </span>
            )}
          </div>
        )}

        {/* Tarih */}
        <p className="text-xs text-day-text/40 dark:text-night-text/40 mt-auto">
          {formatDate(property.createdAt)}
        </p>
      </div>
    </div>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : properties.length === 0 ? (
          <EmptyState
            icon="🔍"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : properties.length === 0 ? (
          <EmptyState
            icon="🏠"
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

export const OffersTab = () => {
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

  // Expanded propertyId → investment listesi
  const [expandedId, setExpandedId] = useState(null);
  const [offersMap, setOffersMap] = useState({}); // { [propertyId]: { loading, data } }

  // Kabul / ret state
  const [actionLoading, setActionLoading] = useState(null); // investmentId
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null); // investmentId

  const load = useCallback(async () => {
    setLoading(true);
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
            p.investmentOfferCount > 0 ||
            ["in_contract", "active"].includes(p.status),
        );
        setProperties(withOffers);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (e) {
      console.error("Offers tab error:", e);
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

  // Bir mülkün tekliflerini yükle / kapat
  const toggleOffers = async (propertyId) => {
    if (expandedId === propertyId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(propertyId);

    if (offersMap[propertyId]) return; // zaten yüklendi

    setOffersMap((prev) => ({
      ...prev,
      [propertyId]: { loading: true, data: [] },
    }));
    try {
      const res = await bridge.investments.getPropertyInvestments(propertyId, {
        status: "offer_sent,contract_signed,title_deed_pending",
      });
      setOffersMap((prev) => ({
        ...prev,
        [propertyId]: { loading: false, data: res?.data ?? [] },
      }));
    } catch (e) {
      console.error("Offers load error:", e);
      setOffersMap((prev) => ({
        ...prev,
        [propertyId]: { loading: false, data: [] },
      }));
    }
  };

  // Teklifi kabul et
  const handleAccept = async (investmentId, propertyId) => {
    setActionLoading(investmentId);
    try {
      await bridge.investments.acceptOffer(investmentId);
      // Güncelle
      setOffersMap((prev) => ({
        ...prev,
        [propertyId]: undefined,
      }));
      toggleOffers(propertyId);
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
      setOffersMap((prev) => ({ ...prev, [propertyId]: undefined }));
      toggleOffers(propertyId);
    } catch (e) {
      console.error("Reject error:", e);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      <FilterBar
        filters={filters}
        onChange={handleFilter}
        showStatusFilter={false}
      />

      {/* Ret modalı */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-day-surface dark:bg-night-surface rounded-xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-day-text dark:text-night-text">
              Reject Offer
            </h3>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)…"
              className="w-full px-3 py-2 text-sm rounded-lg border border-day-border dark:border-night-border bg-day-background dark:bg-night-background text-day-text dark:text-night-text focus:outline-none focus:ring-2 focus:ring-red-400/40"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-day-border dark:border-night-border hover:bg-day-background dark:hover:bg-night-background transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!!actionLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5 h-24"
            />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="py-20 text-center">
          <span className="text-5xl block mb-3">📋</span>
          <h3 className="text-lg font-semibold text-day-text dark:text-night-text">
            No pending offers
          </h3>
          <p className="text-sm text-day-text/60 dark:text-night-text/60 mt-1">
            When investors send offers for your properties, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map((p) => {
            const pid = p.id || p._id;
            const isExpanded = expandedId === pid;
            const offerState = offersMap[pid];
            const thumbnail = getPrimaryPropertyImage(p);
            const thumbnailUrl = getPropertyImageUrl(thumbnail);

            return (
              <div
                key={pid}
                className="rounded-xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface overflow-hidden"
              >
                {/* Mülk satırı */}
                <div className="flex items-center gap-4 p-4">
                  {/* Küçük resim */}
                  <div className="w-16 h-16 rounded-lg bg-day-background dark:bg-night-background shrink-0 overflow-hidden">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={p.city}
                        className="w-full h-full object-cover"
                        style={getPropertyImageStyle(thumbnail)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🏠
                      </div>
                    )}
                  </div>

                  {/* Bilgi */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-day-text dark:text-night-text">
                        {p.city}, {p.country}
                      </h3>
                      <StatusBadge status={p.status} />
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        {p.investmentOfferCount || 0} offer
                        {p.investmentOfferCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-sm text-day-text/60 dark:text-night-text/60">
                      {p.propertyType} · {fmt(p.requestedInvestment)}{" "}
                      {APP_CURRENCY}
                    </p>
                  </div>

                  {/* Aksiyon butonları */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => navigate(`/owner/properties/${pid}`)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-day-border dark:border-night-border hover:bg-day-background dark:hover:bg-night-background transition-colors"
                    >
                      {t("properties.property_details") || "Property Details"}
                    </button>
                    <button
                      onClick={() => toggleOffers(pid)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-day-primary dark:bg-night-primary text-white hover:opacity-90 transition-opacity"
                    >
                      {isExpanded ? "▲ Hide" : "▼ View Offers"}
                    </button>
                  </div>
                </div>

                {/* Genişletilmiş offer listesi */}
                {isExpanded && (
                  <div className="border-t border-day-border dark:border-night-border bg-day-background dark:bg-night-background">
                    {offerState?.loading ? (
                      <div className="p-6 text-center text-sm text-day-text/60 dark:text-night-text/60 animate-pulse">
                        Loading offers…
                      </div>
                    ) : !offerState || offerState.data.length === 0 ? (
                      <div className="p-6 text-center text-sm text-day-text/60 dark:text-night-text/60">
                        No active offers for this property.
                      </div>
                    ) : (
                      <div className="divide-y divide-day-border dark:divide-night-border">
                        {offerState.data.map((inv) => {
                          const invId = inv.id || inv._id;
                          return (
                            <div
                              key={invId}
                              className="flex items-center gap-4 px-5 py-3"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-day-text dark:text-night-text">
                                    {inv.investor?.fullName ||
                                      inv.investor?.email ||
                                      "Investor"}
                                  </span>
                                  <StatusBadge
                                    status={inv.status}
                                    map={INVESTMENT_STATUS_COLORS}
                                  />
                                </div>
                                <p className="text-xs text-day-text/60 dark:text-night-text/60">
                                  {fmt(inv.amountInvested)}{" "}
                                  {APP_CURRENCY} ·{" "}
                                  {formatDate(inv.createdAt)}
                                </p>
                              </div>

                              {/* Aksiyon */}
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() =>
                                    navigate(`/owner/investments/${invId}`)
                                  }
                                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-day-border dark:border-night-border hover:bg-day-surface dark:hover:bg-night-surface transition-colors"
                                >
                                  Offer Details →
                                </button>

                                {inv.status === "offer_sent" && (
                                  <>
                                    <button
                                      disabled={actionLoading === invId}
                                      onClick={() => handleAccept(invId, pid)}
                                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                                    >
                                      {actionLoading === invId ? "…" : "Accept"}
                                    </button>
                                    <button
                                      disabled={actionLoading === invId}
                                      onClick={() =>
                                        setRejectTarget({
                                          investmentId: invId,
                                          propertyId: pid,
                                        })
                                      }
                                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : properties.length === 0 ? (
          <EmptyState
            icon="💼"
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
      icon: "🌍",
    },
    {
      key: "my",
      label: t("owner.tabs.my_properties") || "My Properties",
      icon: "🏠",
    },
    { key: "offers", label: t("owner.tabs.offers") || "Offers", icon: "📋" },
    {
      key: "invested",
      label: t("owner.tabs.invested") || "Invested",
      icon: "💼",
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-day-dashboard dark:bg-night-dashboard text-day-text dark:text-night-text">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-day-text dark:text-night-text">
            {t("navigation.properties") || "Properties"}
          </h1>
          <p className="text-sm text-day-text/60 dark:text-night-text/60 mt-0.5">
            {t("owner.properties_subtitle") ||
              "Browse all listings or manage your own properties"}
          </p>
        </div>

        <button
          onClick={() => navigate("/owner/properties/new")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-day-primary dark:bg-night-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {t("owner.add_property") || "Add Property"}
        </button>
      </div>

      {/* ── Sekmeler ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border mb-6 overflow-x-auto">
        {tabConfig.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-max flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-day-primary dark:bg-night-primary text-white shadow-sm"
                : "text-day-text/70 dark:text-night-text/70 hover:bg-day-background dark:hover:bg-night-background"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
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
  );
};

export default OwnerProperties;
