// src/views/admin/AdminProperties.jsx
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  fetchProperties,
  selectProperties,
  selectPropertyPagination,
  selectPropertyFilters,
  selectPropertyLoading,
  selectPropertyError,
  setFilters,
  clearFilters,
  deleteProperty,
} from "../../store/slices/propertySlice";
import {
  MapPin,
  Calendar,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Home,
  Building,
  Castle,
  Warehouse,
  Hotel,
  RefreshCw,
  Download,
  Plus,
} from "lucide-react";

const AdminProperties = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const getPropId = (p) => (p?._id ?? p?.id)?.toString() ?? "";
  // Redux state
  const properties = useSelector(selectProperties);
  const pagination = useSelector(selectPropertyPagination);
  const filters = useSelector(selectPropertyFilters);
  const loading = useSelector(selectPropertyLoading);
  const error = useSelector(selectPropertyError);

  // Local state
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    search: "",
    status: "",
    propertyType: "",
    country: "",
    city: "",
    minPrice: "",
    maxPrice: "",
    minSize: "",
    maxSize: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const [selectedProperties, setSelectedProperties] = useState([]);
  const [bulkAction, setBulkAction] = useState("");

  // Property type icons
  const propertyTypeIcons = {
    apartment: <Building className="h-4 w-4" />,
    villa: <Home className="h-4 w-4" />,
    land: <Warehouse className="h-4 w-4" />,
    commercial: <Hotel className="h-4 w-4" />,
    other: <Castle className="h-4 w-4" />,
  };

  // Fetch properties on mount and filter changes
  useEffect(() => {
    fetchPropertiesData();
  }, [filters]);

  const fetchPropertiesData = () => {
    const cleaned = Object.fromEntries(
      Object.entries({
        ...filters,
        page: filters.page || 1,
        limit: filters.limit || 10,
      }).filter(([v]) => v !== "" && v !== null && v !== undefined)
    );
    dispatch(fetchProperties(cleaned));
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Apply filters
  const applyFilters = () => {
    dispatch(setFilters({ ...filters, ...localFilters, page: 1 }));
    setShowFilters(false);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setLocalFilters({
      search: "",
      status: "",
      propertyType: "",
      country: "",
      city: "",
      minPrice: "",
      maxPrice: "",
      minSize: "",
      maxSize: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    dispatch(clearFilters());
  };

  // Pagination
  const handlePageChange = (newPage) => {
    dispatch(setFilters({ ...filters, page: newPage }));
  };

  // Bulk actions
  const handleBulkAction = async () => {
    if (!bulkAction || selectedProperties.length === 0) return;
    if (window.confirm(t("admin.properties.confirm_bulk_action"))) {
      for (const id of selectedProperties) {
        await dispatch(deleteProperty(id));
      }
      setSelectedProperties([]);
      setBulkAction("");
      fetchPropertiesData();
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(t("common.locale"), {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Status badge
  const getStatusBadge = (status) => {
    const statusColors = {
      published:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      draft:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      pending_review:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      sold: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          statusColors[status] || statusColors.draft
        }`}
      >
        {t(`properties.status.${status}`)}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-day-text dark:text-night-text">
            {t("admin.properties.title")}
          </h1>
          <p className="text-sm text-day-text/60 dark:text-night-text/60 mt-1">
            {t("admin.properties.subtitle", { count: pagination?.total || 0 })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPropertiesData}
            className="p-2 rounded-lg hover:bg-day-border/20 dark:hover:bg-night-border/20 transition-colors"
            title={t("common.refresh")}
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border rounded-lg hover:bg-day-border/20 dark:hover:bg-night-border/20 transition-colors"
          >
            <Filter className="h-4 w-4" />
            {t("common.filters")}
            {Object.keys(filters).length > 2 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-day-accent dark:bg-night-accent text-white rounded-full">
                {Object.keys(filters).length - 2}
              </span>
            )}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-day-accent dark:bg-night-accent text-white rounded-lg hover:opacity-90 transition-opacity">
            <Download className="h-4 w-4" />
            {t("common.export")}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-day-text dark:text-night-text">
              {t("admin.properties.filter_properties")}
            </h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 rounded hover:bg-day-border/20 dark:hover:bg-night-border/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium mb-1">
                {t("common.search")}
              </label>
              <input
                type="text"
                value={localFilters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                placeholder={t("admin.properties.search_placeholder")}
                className="w-full px-3 py-2 border border-day-border dark:border-night-border rounded-lg bg-white dark:bg-night-surface-light focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("common.status")}
              </label>
              <select
                value={localFilters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-day-border dark:border-night-border rounded-lg bg-white dark:bg-night-surface-light focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
              >
                <option value="">{t("common.all")}</option>
                <option value="published">
                  {t("properties.status.published")}
                </option>
                <option value="draft">{t("properties.status.draft")}</option>
                <option value="pending_review">
                  {t("properties.status.pending_review")}
                </option>
                <option value="rejected">
                  {t("properties.status.rejected")}
                </option>
                <option value="sold">{t("properties.status.sold")}</option>
              </select>
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("properties.type")}
              </label>
              <select
                value={localFilters.propertyType}
                onChange={(e) =>
                  handleFilterChange("propertyType", e.target.value)
                }
                className="w-full px-3 py-2 border border-day-border dark:border-night-border rounded-lg bg-white dark:bg-night-surface-light focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
              >
                <option value="">{t("common.all")}</option>
                <option value="apartment">
                  {t("properties.types.apartment")}
                </option>
                <option value="villa">{t("properties.types.villa")}</option>
                <option value="land">{t("properties.types.land")}</option>
                <option value="commercial">
                  {t("properties.types.commercial")}
                </option>
                <option value="other">{t("properties.types.other")}</option>
              </select>
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("common.country")}
              </label>
              <input
                type="text"
                value={localFilters.country}
                onChange={(e) => handleFilterChange("country", e.target.value)}
                placeholder={t("common.country")}
                className="w-full px-3 py-2 border border-day-border dark:border-night-border rounded-lg bg-white dark:bg-night-surface-light focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("common.city")}
              </label>
              <input
                type="text"
                value={localFilters.city}
                onChange={(e) => handleFilterChange("city", e.target.value)}
                placeholder={t("common.city")}
                className="w-full px-3 py-2 border border-day-border dark:border-night-border rounded-lg bg-white dark:bg-night-surface-light focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
              />
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("properties.min_price")}
              </label>
              <input
                type="number"
                value={localFilters.minPrice}
                onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-day-border dark:border-night-border rounded-lg bg-white dark:bg-night-surface-light focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t("properties.max_price")}
              </label>
              <input
                type="number"
                value={localFilters.maxPrice}
                onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                placeholder="1000000"
                className="w-full px-3 py-2 border border-day-border dark:border-night-border rounded-lg bg-white dark:bg-night-surface-light focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
              />
            </div>

            {/* Size Range */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("properties.min_size")} (m²)
              </label>
              <input
                type="number"
                value={localFilters.minSize}
                onChange={(e) => handleFilterChange("minSize", e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-day-border dark:border-night-border rounded-lg bg-white dark:bg-night-surface-light focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t("properties.max_size")} (m²)
              </label>
              <input
                type="number"
                value={localFilters.maxSize}
                onChange={(e) => handleFilterChange("maxSize", e.target.value)}
                placeholder="1000"
                className="w-full px-3 py-2 border border-day-border dark:border-night-border rounded-lg bg-white dark:bg-night-surface-light focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("common.sort_by")}
              </label>
              <select
                value={localFilters.sortBy}
                onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                className="w-full px-3 py-2 border border-day-border dark:border-night-border rounded-lg bg-white dark:bg-night-surface-light focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
              >
                <option value="createdAt">{t("common.created_date")}</option>
                <option value="updatedAt">{t("common.updated_date")}</option>
                <option value="estimatedValue">{t("properties.value")}</option>
                <option value="size">{t("properties.size")}</option>
                <option value="city">{t("common.city")}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t("common.order")}
              </label>
              <select
                value={localFilters.sortOrder}
                onChange={(e) =>
                  handleFilterChange("sortOrder", e.target.value)
                }
                className="w-full px-3 py-2 border border-day-border dark:border-night-border rounded-lg bg-white dark:bg-night-surface-light focus:ring-2 focus:ring-day-accent dark:focus:ring-night-accent"
              >
                <option value="asc">{t("common.ascending")}</option>
                <option value="desc">{t("common.descending")}</option>
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-day-border dark:border-night-border">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-day-text dark:text-night-text hover:bg-day-border/20 dark:hover:bg-night-border/20 rounded-lg transition-colors"
            >
              {t("common.clear")}
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-day-accent dark:bg-night-accent text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              {t("common.apply_filters")}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedProperties.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center justify-between">
          <span className="text-blue-800 dark:text-blue-300">
            {t("common.selected_count", {
              count: selectedProperties.length,
            })}
          </span>
          <div className="flex items-center gap-3">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="px-3 py-1.5 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-night-surface"
            >
              <option value="">{t("admin.properties.select_action")}</option>
              <option value="delete">
                {t("admin.properties.bulk_delete")}
              </option>
            </select>
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {t("common.apply")}
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Properties Table */}
      <div className="bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-day-border/10 dark:bg-night-border/10 border-b border-day-border dark:border-night-border">
              <tr>
                <th className="p-4 text-left">
                  <input
                    type="checkbox"
                    checked={
                      properties.length > 0 &&
                      selectedProperties.length === properties.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProperties(
                          properties.map((p) => getPropId(p))
                        );
                      } else {
                        setSelectedProperties([]);
                      }
                    }}
                    className="rounded border-day-border dark:border-night-border"
                  />
                </th>
                <th className="p-4 text-left text-xs font-medium uppercase tracking-wider text-day-text/60 dark:text-night-text/60">
                  {t("properties.title")}
                </th>
                <th className="p-4 text-left text-xs font-medium uppercase tracking-wider text-day-text/60 dark:text-night-text/60">
                  {t("common.type")}
                </th>
                <th className="p-4 text-left text-xs font-medium uppercase tracking-wider text-day-text/60 dark:text-night-text/60">
                  {t("properties.location")}
                </th>
                <th className="p-4 text-left text-xs font-medium uppercase tracking-wider text-day-text/60 dark:text-night-text/60">
                  {t("properties.value")}
                </th>
                <th className="p-4 text-left text-xs font-medium uppercase tracking-wider text-day-text/60 dark:text-night-text/60">
                  {t("common.status")}
                </th>
                <th className="p-4 text-left text-xs font-medium uppercase tracking-wider text-day-text/60 dark:text-night-text/60">
                  {t("properties.owner")}
                </th>
                <th className="p-4 text-left text-xs font-medium uppercase tracking-wider text-day-text/60 dark:text-night-text/60">
                  {t("common.created")}
                </th>
                <th className="p-4 text-center text-xs font-medium uppercase tracking-wider text-day-text/60 dark:text-night-text/60">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-day-border dark:divide-night-border">
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                      <span className="ml-2">{t("common.loading")}</span>
                    </div>
                  </td>
                </tr>
              ) : properties.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    className="p-8 text-center text-day-text/60 dark:text-night-text/60"
                  >
                    {t("admin.properties.no_properties")}
                  </td>
                </tr>
              ) : (
                properties.map((property) => (
                  <tr
                    key={property._id}
                    className="hover:bg-day-border/5 dark:hover:bg-night-border/5 transition-colors"
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedProperties.includes(
                          getPropId(property)
                        )}
                        onChange={(e) => {
                          const pid = getPropId(property);
                          if (e.target.checked) {
                            setSelectedProperties([...selectedProperties, pid]);
                          } else {
                            setSelectedProperties(
                              selectedProperties.filter((id) => id !== pid)
                            );
                          }
                        }}
                        className="rounded border-day-border dark:border-night-border"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {property.images?.[0] && (
                          <img
                            src={property.images[0]}
                            alt={property.title}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-day-text dark:text-night-text">
                            {property.title}
                          </p>
                          <p className="text-xs text-day-text/60 dark:text-night-text/60">
                            ID:{" "}
                            {(property._id ?? property.id)
                              ?.toString()
                              ?.slice(-8) || "N/A"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {propertyTypeIcons[property.propertyType] ||
                          propertyTypeIcons.other}
                        <span className="text-sm capitalize">
                          {t(`properties.types.${property.propertyType}`)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-start gap-1">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm">{property.city}</p>
                          <p className="text-xs text-day-text/60 dark:text-night-text/60">
                            {property.country}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">
                        {formatCurrency(property.estimatedValue)}
                      </p>
                      {property.size && (
                        <p className="text-xs text-day-text/60 dark:text-night-text/60">
                          {property.size} m²
                        </p>
                      )}
                    </td>
                    <td className="p-4">{getStatusBadge(property.status)}</td>
                    <td className="p-4">
                      {property.owner ? (
                        <div>
                          <p className="text-sm">{property.owner.fullName}</p>
                          <p className="text-xs text-day-text/60 dark:text-night-text/60">
                            {property.owner.email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-day-text/40 dark:text-night-text/40">
                          —
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-start gap-1">
                        <Calendar className="h-3.5 w-3.5 mt-0.5" />
                        <span className="text-sm">
                          {formatDate(property.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() =>
                            navigate(`/admin/properties/${property.id}`)
                          }
                          className="p-1.5 rounded hover:bg-day-border/20 dark:hover:bg-night-border/20 transition-colors"
                          title={t("common.view")}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {/* Edit/Delete ve Status değişimi kaldırıldı */}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.total > 0 && (
          <div className="px-6 py-4 border-t border-day-border dark:border-night-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-day-text/60 dark:text-night-text/60">
                {t("common.showing")}{" "}
                {(pagination.page - 1) * pagination.limit + 1} -{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                {t("common.of")} {pagination.total} {t("common.results")}
              </p>
              <select
                value={pagination.limit}
                onChange={(e) =>
                  dispatch(
                    setFilters({
                      ...filters,
                      limit: parseInt(e.target.value),
                      page: 1,
                    })
                  )
                }
                className="px-3 py-1 text-sm border border-day-border dark:border-night-border rounded-lg bg-transparent"
              >
                <option value="10">10 {t("common.per_page")}</option>
                <option value="25">25 {t("common.per_page")}</option>
                <option value="50">50 {t("common.per_page")}</option>
                <option value="100">100 {t("common.per_page")}</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-1.5 rounded-lg border border-day-border dark:border-night-border hover:bg-day-border/20 dark:hover:bg-night-border/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, pagination.pages))].map((_, idx) => {
                  let pageNum;
                  if (pagination.pages <= 5) {
                    pageNum = idx + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = idx + 1;
                  } else if (pagination.page >= pagination.pages - 2) {
                    pageNum = pagination.pages - 4 + idx;
                  } else {
                    pageNum = pagination.page - 2 + idx;
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        pageNum === pagination.page
                          ? "bg-day-accent dark:bg-night-accent text-white"
                          : "hover:bg-day-border/20 dark:hover:bg-night-border/20"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {pagination.pages > 5 &&
                  pagination.page < pagination.pages - 2 && (
                    <>
                      <span className="px-2">...</span>
                      <button
                        onClick={() => handlePageChange(pagination.pages)}
                        className="px-3 py-1 rounded-lg text-sm hover:bg-day-border/20 dark:hover:bg-night-border/20"
                      >
                        {pagination.pages}
                      </button>
                    </>
                  )}
              </div>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="p-1.5 rounded-lg border border-day-border dark:border-night-border hover:bg-day-border/20 dark:hover:bg-night-border/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProperties;
