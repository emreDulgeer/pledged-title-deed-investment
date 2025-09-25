import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { fetchInvestments } from "../../store/slices/investmentSlice";
import {
  selectInvestments,
  selectInvestmentPagination,
  selectInvestmentLoading,
} from "../../store/slices/investmentSlice";
import {
  Eye,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 10;

const StatusBadge = ({ status, t }) => {
  const base = "px-2 py-1 inline-flex text-xs font-semibold rounded-full";
  const cls =
    {
      offer_sent:
        "bg-day-accent/10 text-day-accent dark:bg-night-accent/10 dark:text-night-accent",
      contract_signed:
        "bg-day-secondary/10 text-day-secondary dark:bg-night-secondary/10 dark:text-night-secondary",
      title_deed_pending:
        "bg-day-warning/10 text-day-warning dark:bg-night-warning/20 dark:text-night-warning",
      active: "bg-night-primary/10 text-night-primary dark:bg-night-primary/10",
      completed:
        "bg-day-border text-day-text/70 dark:bg-night-surface dark:text-night-text/70",
      refunded:
        "bg-day-accent/10 text-day-accent dark:bg-night-accent/10 dark:text-night-accent",
      defaulted:
        "bg-day-danger/10 text-day-danger dark:bg-night-danger/20 dark:text-night-danger",
    }[status] ||
    "bg-day-border text-day-text/70 dark:bg-night-surface dark:text-night-text/70";

  // investments.status.* (JSON'da mevcut olanlarla + eklediklerimizle eşleşir)
  const label = t(`investments.status.${status}`, status);
  return <span className={`${base} ${cls}`}>{label}</span>;
};

export default function AdminInvestments() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const loading = useSelector(selectInvestmentLoading);
  const items = useSelector(selectInvestments) || [];
  const pagination = useSelector(selectInvestmentPagination);
  const [page, setPage] = useState(1);
  const total = pagination?.totalItems || 0;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total]
  );

  const fetchData = () => {
    const params = {
      page,
      limit: PAGE_SIZE,
      q: query || undefined,
      status: status || undefined,
      amountInvestedMin: minAmount || undefined,
      amountInvestedMax: maxAmount || undefined,
      sortBy,
      sortOrder,
    };
    console.log("Fetching investments with params:", params);
    dispatch(fetchInvestments(params));
  };

  useEffect(() => {
    fetchData(); // eslint-disable-next-line
  }, [page, sortBy, sortOrder]);

  const onApplyFilters = () => {
    setPage(1);
    fetchData();
  };

  const onClearFilters = () => {
    setQuery("");
    setStatus("");
    setMinAmount("");
    setMaxAmount("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
    fetchData();
  };

  return (
    <div className="min-h-screen p-6 bg-day-background dark:bg-night-background">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-day-text dark:text-night-text">
              {t("admin.investments.title")}
            </h1>
            <p className="text-sm text-day-text/60 dark:text-night-text/60">
              {t("admin.investments.subtitle")}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border p-4 shadow">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-day-text/60 dark:text-night-text/60" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("common.search")}
                className="w-full bg-transparent outline-none text-day-text dark:text-night-text placeholder:text-day-text/50 dark:placeholder:text-night-text/50"
              />
            </div>

            <div className="md:col-span-1 flex items-center gap-2">
              <Filter className="w-4 h-4 text-day-text/60 dark:text-night-text/60" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-transparent outline-none text-day-text dark:text-night-text"
              >
                <option value="">{t("common.all")}</option>
                {[
                  "offer_sent",
                  "contract_signed",
                  "title_deed_pending",
                  "active",
                  "completed",
                  "refunded",
                  "defaulted",
                ].map((s) => (
                  <option key={s} value={s}>
                    {t(`investments.status.${s}`, s)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-day-text/60 dark:text-night-text/60">
                {t("admin.investments.min_amount")}
              </span>
              <input
                value={minAmount}
                onChange={(e) =>
                  setMinAmount(e.target.value.replace(/\D/g, ""))
                }
                inputMode="numeric"
                className="w-full bg-transparent outline-none text-day-text dark:text-night-text placeholder:text-day-text/50 dark:placeholder:text-night-text/50"
                placeholder="0"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-day-text/60 dark:text-night-text/60">
                {t("admin.investments.max_amount")}
              </span>
              <input
                value={maxAmount}
                onChange={(e) =>
                  setMaxAmount(e.target.value.replace(/\D/g, ""))
                }
                inputMode="numeric"
                className="w-full bg-transparent outline-none text-day-text dark:text-night-text placeholder:text-day-text/50 dark:placeholder:text-night-text/50"
                placeholder="∞"
              />
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-day-text/60 dark:text-night-text/60" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="createdAt">{t("common.created_date")}</option>
                <option value="amountInvested">
                  {t("investments.amount_invested")}
                </option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">↓</option>
                <option value="asc">↑</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={onApplyFilters}
              className="h-9 px-4 rounded-xl bg-night-primary text-white dark:bg-night-primary hover:opacity-95 active:scale-95 transition"
            >
              {t("common.apply_filters")}
            </button>
            <button
              onClick={onClearFilters}
              className="h-9 px-4 rounded-xl border border-day-border dark:border-night-border text-day-text dark:text-night-text hover:bg-day-surface/60 dark:hover:bg-night-surface/60 transition"
            >
              {t("common.clear")}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface shadow">
          <table className="w-full">
            <thead className="bg-day-surface dark:bg-night-surface text-day-text/70 dark:text-night-text/70">
              <tr className="text-left">
                <th className="px-4 py-3 text-xs font-semibold">
                  {t("admin.investments.investment_id")}
                </th>
                <th className="px-4 py-3 text-xs font-semibold">
                  {t("investments.investor_info")}
                </th>
                <th className="px-4 py-3 text-xs font-semibold">
                  {t("investments.property_info")}
                </th>
                <th className="px-4 py-3 text-xs font-semibold">
                  {t("investments.amount_invested")}
                </th>
                <th className="px-4 py-3 text-xs font-semibold">
                  {t("common.status")}
                </th>
                <th className="px-4 py-3 text-xs font-semibold">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-day-border dark:divide-night-border">
              {!loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-day-text/60 dark:text-night-text/60"
                  >
                    {t("admin.investments.no_investments")}
                  </td>
                </tr>
              )}

              {items.map((it) => (
                <tr
                  key={it.id || it._id}
                  className="hover:bg-day-surface/60 dark:hover:bg-night-surface/60"
                >
                  <td className="px-4 py-3 text-day-text dark:text-night-text">
                    {it.id || it._id}
                  </td>
                  <td className="px-4 py-3 text-day-text dark:text-night-text">
                    {it.investor?.fullName ||
                      `${it.investor?.firstName ?? ""} ${
                        it.investor?.lastName ?? ""
                      }`.trim() ||
                      "-"}
                  </td>
                  <td className="px-4 py-3 text-day-text dark:text-night-text">
                    {it.property?.city
                      ? `${it.property.city}, ${it.property.country || ""}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-day-text dark:text-night-text">
                    {typeof it.amountInvested === "number"
                      ? it.amountInvested.toLocaleString()
                      : "-"}{" "}
                    <span className="text-day-text/60 dark:text-night-text/60">
                      {it.currency || "EUR"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={it.status} t={t} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        navigate(`/admin/investments/${it.id || it._id}`)
                      }
                      className="inline-flex items-center gap-1 text-sm px-3 h-8 rounded-lg border border-day-border dark:border-night-border hover:bg-day-surface/60 dark:hover:bg-night-surface/60 text-day-text dark:text-night-text"
                      title={t("common.view")}
                    >
                      <Eye className="w-4 h-4" />
                      {t("common.view")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between p-3 border-t border-day-border dark:border-night-border">
            <div className="text-xs text-day-text/60 dark:text-night-text/60">
              {total} {t("common.results")}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-day-border dark:border-night-border hover:bg-day-surface/60 dark:hover:bg-night-surface/60 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-day-text dark:text-night-text">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-day-border dark:border-night-border hover:bg-day-surface/60 dark:hover:bg-night-surface/60 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
