// src/views/owner/OwnerRentalPayments.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import bridge from "../../controllers/bridge";

// ── Sabitler ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  paid: {
    label: "Paid",
    dot: "bg-green-500",
    badge:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
  pending: {
    label: "Pending",
    dot: "bg-yellow-500",
    badge:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  },
  delayed: {
    label: "Delayed",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
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
  itemsPerPage: 20,
  hasPrev: false,
  hasNext: false,
};

// ── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {Array.from({ length: 6 }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 rounded bg-day-border dark:bg-night-border" />
      </td>
    ))}
  </tr>
);

// ── Özet kart ─────────────────────────────────────────────────────────────────

const SummaryCard = ({ label, value, sub, colorClass }) => (
  <div className="rounded-xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5">
    <p className="text-sm text-day-text/60 dark:text-night-text/60">{label}</p>
    <p
      className={`text-2xl font-bold mt-1 ${colorClass || "text-day-text dark:text-night-text"}`}
    >
      {value}
    </p>
    {sub && (
      <p className="text-xs text-day-text/50 dark:text-night-text/50 mt-0.5">
        {sub}
      </p>
    )}
  </div>
);

// ── Pagination ────────────────────────────────────────────────────────────────

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
        {from}–{to} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={!hasPrev}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-day-border dark:border-night-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-day-surface dark:hover:bg-night-surface transition-colors"
        >
          ← Prev
        </button>
        <span className="px-3 py-1.5 text-sm text-day-text dark:text-night-text">
          {currentPage} / {totalPages}
        </span>
        <button
          disabled={!hasNext}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-day-border dark:border-night-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-day-surface dark:hover:bg-night-surface transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

// ── Ana bileşen ───────────────────────────────────────────────────────────────

const OwnerRentalPayments = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    delayed: 0,
    totalAmount: 0,
    paidAmount: 0,
  });

  const [filters, setFilters] = useState({
    status: "",
    sortBy: "-month",
    limit: 20,
    page: 1,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (!params.status) delete params.status;

      const res =
        await bridge.investments.getPropertyOwnerRentalPayments(params);
      if (res?.success) {
        const data = res.data ?? [];
        setPayments(data);
        if (res.pagination) setPagination(res.pagination);

        // Özet hesapla
        const paid = data.filter((p) => p.status === "paid");
        const pending = data.filter((p) => p.status === "pending");
        const delayed = data.filter((p) => p.status === "delayed");
        setSummary({
          total: data.length,
          paid: paid.length,
          pending: pending.length,
          delayed: delayed.length,
          totalAmount: data.reduce((s, p) => s + (p.amount || 0), 0),
          paidAmount: paid.reduce((s, p) => s + (p.amount || 0), 0),
        });
      }
    } catch (e) {
      console.error("Rental payments error:", e);
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
    <div className="p-6 min-h-screen bg-day-dashboard dark:bg-night-dashboard text-day-text dark:text-night-text">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-day-text dark:text-night-text">
            {t("owner.rental_payments") || "Rental Payments"}
          </h1>
          <p className="text-sm text-day-text/60 dark:text-night-text/60 mt-0.5">
            {t("owner.rental_payments_subtitle") ||
              "Track incoming rental payments from investors"}
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-day-border dark:border-night-border text-sm font-medium hover:bg-day-surface dark:hover:bg-night-surface transition-colors"
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
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {t("common.refresh") || "Refresh"}
        </button>
      </div>

      {/* ── Özet kartlar ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          label="Total Collected"
          value={fmt(summary.paidAmount, "€")}
          sub={`${summary.paid} payment${summary.paid !== 1 ? "s" : ""}`}
          colorClass="text-green-600 dark:text-green-400"
        />
        <SummaryCard
          label="Pending"
          value={summary.pending}
          sub="awaiting payment"
          colorClass="text-yellow-600 dark:text-yellow-400"
        />
        <SummaryCard
          label="Delayed"
          value={summary.delayed}
          sub="overdue"
          colorClass={
            summary.delayed > 0 ? "text-red-600 dark:text-red-400" : undefined
          }
        />
        <SummaryCard
          label="Total Payments"
          value={summary.total}
          sub={`all time`}
        />
      </div>

      {/* ── Filtreler ── */}
      <div className="flex flex-wrap gap-3 items-end mb-5">
        <select
          value={filters.status}
          onChange={(e) => handleFilter("status", e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface text-day-text dark:text-night-text focus:outline-none"
        >
          <option value="">{t("common.all_statuses") || "All Statuses"}</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="delayed">Delayed</option>
        </select>

        <select
          value={filters.sortBy}
          onChange={(e) => handleFilter("sortBy", e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface text-day-text dark:text-night-text focus:outline-none"
        >
          <option value="-month">Newest Month First</option>
          <option value="month">Oldest Month First</option>
          <option value="-amount">Highest Amount</option>
          <option value="amount">Lowest Amount</option>
        </select>

        <select
          value={filters.limit}
          onChange={(e) => handleFilter("limit", parseInt(e.target.value))}
          className="px-3 py-2 text-sm rounded-lg border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface text-day-text dark:text-night-text focus:outline-none"
        >
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* ── Tablo ── */}
      <div className="rounded-xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface overflow-hidden">
        {/* Desktop tablo */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-day-border dark:border-night-border bg-day-background dark:bg-night-background">
                {[
                  "Property",
                  "Investment",
                  "Month",
                  "Amount",
                  "Status",
                  "Paid At",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-day-text/60 dark:text-night-text/60"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-day-border dark:divide-night-border">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-sm text-day-text/50 dark:text-night-text/50"
                  >
                    No rental payments found.
                  </td>
                </tr>
              ) : (
                payments.map((payment, idx) => {
                  const statusCfg =
                    STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
                  const investmentId =
                    payment.investment?.id ||
                    payment.investment?._id ||
                    payment.investmentId;
                  const propertyLabel = payment.property?.city
                    ? `${payment.property.city}, ${payment.property.country}`
                    : payment.property?.id || "—";

                  return (
                    <tr
                      key={payment._id || idx}
                      className="hover:bg-day-background/60 dark:hover:bg-night-background/40 transition-colors"
                    >
                      {/* Property */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-day-text dark:text-night-text">
                          {propertyLabel}
                        </p>
                        <p className="text-xs text-day-text/50 dark:text-night-text/50">
                          {payment.property?.propertyType || ""}
                        </p>
                      </td>

                      {/* Investment */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-mono text-day-text/70 dark:text-night-text/70">
                          {investmentId
                            ? `#${String(investmentId).slice(-6)}`
                            : "—"}
                        </p>
                      </td>

                      {/* Month */}
                      <td className="px-4 py-3">
                        <p className="text-sm text-day-text dark:text-night-text">
                          {payment.month || "—"}
                        </p>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-day-text dark:text-night-text">
                          {fmt(payment.amount)} {payment.currency || "EUR"}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.badge}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}
                          />
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Paid At */}
                      <td className="px-4 py-3">
                        <p className="text-sm text-day-text/70 dark:text-night-text/70">
                          {payment.paidAt ? formatDate(payment.paidAt) : "—"}
                        </p>
                      </td>

                      {/* Aksiyon */}
                      <td className="px-4 py-3">
                        {investmentId && (
                          <button
                            onClick={() =>
                              navigate(`/owner/investments/${investmentId}`)
                            }
                            className="text-sm font-medium text-day-primary dark:text-night-primary hover:opacity-75 transition-opacity"
                          >
                            View →
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile liste */}
        <div className="md:hidden divide-y divide-day-border dark:divide-night-border">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse p-4 flex items-center gap-4"
              >
                <div className="w-2 h-2 rounded-full bg-day-border dark:bg-night-border shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-day-border dark:bg-night-border" />
                  <div className="h-3 w-1/2 rounded bg-day-border dark:bg-night-border" />
                </div>
                <div className="h-4 w-16 rounded bg-day-border dark:bg-night-border" />
              </div>
            ))
          ) : payments.length === 0 ? (
            <div className="py-16 text-center text-sm text-day-text/50 dark:text-night-text/50">
              No rental payments found.
            </div>
          ) : (
            payments.map((payment, idx) => {
              const statusCfg =
                STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
              const investmentId =
                payment.investment?.id ||
                payment.investment?._id ||
                payment.investmentId;
              const propertyLabel = payment.property?.city
                ? `${payment.property.city}, ${payment.property.country}`
                : "Property";

              return (
                <div
                  key={payment._id || idx}
                  onClick={() =>
                    investmentId &&
                    navigate(`/owner/investments/${investmentId}`)
                  }
                  className={`p-4 flex items-center gap-3 ${investmentId ? "cursor-pointer hover:bg-day-background dark:hover:bg-night-background" : ""} transition-colors`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusCfg.dot}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-day-text dark:text-night-text truncate">
                      {propertyLabel}
                    </p>
                    <p className="text-xs text-day-text/50 dark:text-night-text/50">
                      {payment.month || "—"} · {statusCfg.label}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-day-text dark:text-night-text">
                      {fmt(payment.amount)} {payment.currency || "€"}
                    </p>
                    {payment.paidAt && (
                      <p className="text-xs text-day-text/50 dark:text-night-text/50">
                        {formatDate(payment.paidAt)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Pagination ── */}
      {!loading && (
        <div className="mt-4">
          <Pagination pagination={pagination} onPageChange={handlePage} />
        </div>
      )}
    </div>
  );
};

export default OwnerRentalPayments;
