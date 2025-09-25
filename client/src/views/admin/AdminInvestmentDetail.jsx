import React, { useEffect, useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FileDown,
  Loader2,
  ArrowLeft,
  FileText,
  ReceiptText,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchInvestmentById,
  selectCurrentInvestment,
  selectInvestmentLoading,
} from "../../store/slices/investmentSlice";
function LineItem({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-day-text/60 dark:text-night-text/60">
        {label}
      </span>
      <span className="text-sm font-medium text-day-text dark:text-night-text">
        {value}
      </span>
    </div>
  );
}

export default function AdminInvestmentDetail() {
  const { id } = useParams();
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const loading = useSelector(selectInvestmentLoading);
  const investment = useSelector(selectCurrentInvestment);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("overview");

  const load = async () => {
    dispatch(fetchInvestmentById(id));
    // belgeler & istatistikler henüz slice'ta yok; şimdilik bridge ile:
    const [docsRes, statsRes] = await Promise.all([
      window.bridge.investments.getInvestmentDocuments(id),
      window.bridge.investments.getInvestmentStatistics(id),
    ]);
    setDocuments(docsRes?.data ?? []);
    setStats(statsRes?.data ?? null);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const download = async (fileId) => {
    try {
      await window.bridge.investments.downloadDocument(id, fileId);
    } catch (e) {
      console.error("Download error:", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-day-background dark:bg-night-background grid place-items-center">
        <div className="flex items-center gap-2 text-day-text/80 dark:text-night-text/80">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t("common.loading")}</span>
        </div>
      </div>
    );
  }

  if (!investment) {
    return (
      <div className="min-h-screen p-6 bg-day-background dark:bg-night-background">
        <div className="max-w-5xl mx-auto">
          <RouterLink
            to="/admin/investments"
            className="inline-flex items-center gap-2 text-day-text dark:text-night-text hover:opacity-80"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("admin.investments.to_list")}
          </RouterLink>

          <div className="mt-6 rounded-xl bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border p-6">
            <p className="text-day-text dark:text-night-text">
              {t("admin.investments.not_found")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const investorName =
    investment?.investor?.fullName ||
    `${investment?.investor?.firstName ?? ""} ${
      investment?.investor?.lastName ?? ""
    }`.trim() ||
    "-";

  const propertyCity = investment?.property?.city
    ? `${investment.property.city}, ${investment.property?.country || ""}`
    : "-";

  const statusLabel = t(
    `investments.status.${investment.status}`,
    investment.status
  );

  const docTypeLabel = (type) => t(`documents.types.${type}`, type);

  return (
    <div className="min-h-screen p-6 bg-day-background dark:bg-night-background">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <RouterLink
            to="/admin/investments"
            className="inline-flex items-center gap-2 text-day-text dark:text-night-text hover:opacity-80"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("admin.investments.to_list")}
          </RouterLink>
        </div>

        {/* Main card */}
        <div className="rounded-xl bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border p-6 shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-day-text dark:text-night-text">
                    #{investment.id || investment._id}
                  </h2>
                  <p className="text-sm text-day-text/60 dark:text-night-text/60">
                    {propertyCity}
                  </p>
                </div>
                <span className="px-2 py-1 text-xs rounded-full border border-day-border dark:border-night-border text-day-text dark:text-night-text">
                  {statusLabel}
                </span>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-day-border dark:border-night-border">
                {[
                  {
                    key: "overview",
                    label: t("admin.investments.tab_overview"),
                  },
                  {
                    key: "payments",
                    label: t("admin.investments.tab_payments"),
                  },
                  { key: "documents", label: t("investments.documents") },
                ].map((tb) => (
                  <button
                    key={tb.key}
                    onClick={() => setTab(tb.key)}
                    className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                      tab === tb.key
                        ? "border-night-primary text-day-text dark:text-night-text"
                        : "border-transparent text-day-text/60 dark:text-night-text/60 hover:text-day-text dark:hover:text-night-text"
                    }`}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>

              {/* Tab contents */}
              {tab === "overview" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                    <h3 className="text-sm font-semibold text-day-text dark:text-night-text mb-2">
                      {t("investments.investor_info")}
                    </h3>
                    <LineItem
                      label={t("common.full_name")}
                      value={investorName}
                    />
                    <LineItem
                      label="KYC"
                      value={investment?.investor?.kycStatus || "-"}
                    />
                  </div>
                  <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                    <h3 className="text-sm font-semibold text-day-text dark:text-night-text mb-2">
                      {t("investments.property_info")}
                    </h3>
                    <LineItem
                      label={t("properties.location")}
                      value={propertyCity}
                    />
                    <LineItem
                      label={t("properties.address")}
                      value={investment?.property?.fullAddress || "-"}
                    />
                  </div>
                  <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                    <h3 className="text-sm font-semibold text-day-text dark:text-night-text mb-2">
                      {t("investments.payment_info")}
                    </h3>
                    <LineItem
                      label={t("investments.amount_invested")}
                      value={`${(
                        investment?.amountInvested ?? 0
                      ).toLocaleString()} ${investment?.currency || "EUR"}`}
                    />
                    <LineItem
                      label={t("common.created")}
                      value={new Date(investment?.createdAt).toLocaleString()}
                    />
                  </div>
                  {stats && (
                    <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                      <h3 className="text-sm font-semibold text-day-text dark:text-night-text mb-2">
                        {t("admin.investments.payment_statistics")}
                      </h3>
                      <LineItem
                        label={t("admin.investments.total_payments")}
                        value={stats?.statistics?.payments?.total ?? "-"}
                      />
                      <LineItem
                        label={t("admin.investments.paid_payments")}
                        value={stats?.statistics?.payments?.paid ?? "-"}
                      />
                      <LineItem
                        label={t("admin.investments.pending_payments")}
                        value={stats?.statistics?.payments?.pending ?? "-"}
                      />
                      <LineItem
                        label={t("admin.investments.delayed_payments")}
                        value={stats?.statistics?.payments?.delayed ?? "-"}
                      />
                      <LineItem
                        label={t("admin.investments.payment_rate")}
                        value={`${stats?.statistics?.rates?.paymentRate ?? 0}%`}
                      />
                      <LineItem
                        label={t("admin.investments.on_time_rate")}
                        value={`${stats?.statistics?.rates?.onTimeRate ?? 0}%`}
                      />
                    </div>
                  )}
                </div>
              )}

              {tab === "payments" && (
                <div className="rounded-xl border border-day-border dark:border-night-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-day-surface dark:bg-night-surface text-day-text/70 dark:text-night-text/70">
                      <tr className="text-left">
                        <th className="px-4 py-2 text-xs font-semibold">
                          {t("investments.investment_date")}
                        </th>
                        <th className="px-4 py-2 text-xs font-semibold">
                          {t("investments.amount_invested")}
                        </th>
                        <th className="px-4 py-2 text-xs font-semibold">
                          {t("common.status")}
                        </th>
                        <th className="px-4 py-2 text-xs font-semibold">
                          {t("admin.investments.paid_at")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-day-border dark:divide-night-border">
                      {(investment?.rentalPayments ?? []).length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-6 text-center text-day-text/60 dark:text-night-text/60"
                          >
                            {t("admin.investments.no_payments")}
                          </td>
                        </tr>
                      )}
                      {(investment?.rentalPayments ?? []).map((p, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-day-text dark:text-night-text">
                            {p.month ||
                              (p.dueDate
                                ? new Date(p.dueDate).toLocaleDateString()
                                : "-")}
                          </td>
                          <td className="px-4 py-2 text-day-text dark:text-night-text">
                            {(p.amount ?? 0).toLocaleString()}{" "}
                            {investment?.currency || "EUR"}
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-xs px-2 py-1 rounded-full border border-day-border dark:border-night-border text-day-text dark:text-night-text">
                              {t(`investments.status.${p.status}`, p.status)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-day-text dark:text-night-text">
                            {p.paidAt
                              ? new Date(p.paidAt).toLocaleString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === "documents" && (
                <div className="space-y-3">
                  {documents.length === 0 && (
                    <div className="text-sm text-day-text/60 dark:text-night-text/60">
                      {t("common.file")}: {t("errors.not_found")}
                    </div>
                  )}
                  {documents.map((d) => (
                    <div
                      key={d.fileId}
                      className="flex items-center justify-between rounded-xl border border-day-border dark:border-night-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        {d.type === "payment_receipt" ||
                        d.type === "rental_receipt" ? (
                          <ReceiptText className="w-5 h-5 text-day-text/70 dark:text-night-text/70" />
                        ) : (
                          <FileText className="w-5 h-5 text-day-text/70 dark:text-night-text/70" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-day-text dark:text-night-text">
                            {docTypeLabel(d.type)}
                          </div>
                          <div className="text-xs text-day-text/60 dark:text-night-text/60">
                            {t("admin.investments.uploaded")}:{" "}
                            {d.uploadedAt
                              ? new Date(d.uploadedAt).toLocaleString()
                              : "-"}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => download(d.fileId)}
                        className="inline-flex items-center gap-2 text-sm px-3 h-8 rounded-lg border border-day-border dark:border-night-border hover:bg-day-surface/60 dark:hover:bg-night-surface/60 text-day-text dark:text-night-text"
                      >
                        <FileDown className="w-4 h-4" />
                        {t("common.download")}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Side info */}
            <aside className="space-y-4">
              <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                <h3 className="text-sm font-semibold text-day-text dark:text-night-text mb-2">
                  {t("admin.investments.meta")}
                </h3>
                <LineItem
                  label={t("common.created")}
                  value={new Date(investment?.createdAt).toLocaleString()}
                />
                <LineItem
                  label={t("common.updated")}
                  value={new Date(investment?.updatedAt).toLocaleString()}
                />
                <LineItem
                  label={t("properties.currency")}
                  value={investment?.currency || "EUR"}
                />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
