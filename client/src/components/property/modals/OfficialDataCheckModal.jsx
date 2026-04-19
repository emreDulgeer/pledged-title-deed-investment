import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";

const STATUS_STYLES = {
  match: {
    icon: CheckCircle2,
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    label: "Match",
  },
  simulated_match: {
    icon: ShieldCheck,
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    label: "Simulated Match",
  },
  manual_review_required: {
    icon: AlertTriangle,
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    label: "Manual Review Required",
  },
  review_required: {
    icon: AlertTriangle,
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    label: "Review Required",
  },
  missing: {
    icon: AlertTriangle,
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    label: "Missing",
  },
  pending_integration: {
    icon: CircleDashed,
    className:
      "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
    label: "Pending Integration",
  },
};

const getStatusConfig = (status) =>
  STATUS_STYLES[status] || {
    icon: CircleDashed,
    className:
      "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
    label: String(status || "Unknown")
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
  };

const StatusBadge = ({ status }) => {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}
    >
      <Icon className="h-4 w-4" />
      {config.label}
    </span>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-day-border/60 dark:border-night-border/60 py-2 text-sm last:border-b-0">
    <span className="text-day-text/60 dark:text-night-text/60">{label}</span>
    <span className="text-right font-medium text-day-text dark:text-night-text">
      {value || "-"}
    </span>
  </div>
);

const OfficialDataCheckModal = ({
  open,
  onClose,
  loading,
  error,
  data,
  t,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-day-border dark:border-night-border bg-day-surface/95 dark:bg-night-surface/95 px-6 py-5 backdrop-blur">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold text-day-text dark:text-night-text">
                {t("admin.property.official_data_title")}
              </h3>
              {data?.simulated && (
                <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {t("admin.property.official_data_simulated_badge")}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-day-text/65 dark:text-night-text/65">
              {t("admin.property.official_data_hint")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-day-text/70 transition-colors hover:bg-day-border/20 hover:text-day-text dark:text-night-text/70 dark:hover:bg-night-border/20 dark:hover:text-night-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {loading ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-day-accent dark:text-night-accent" />
              <p className="text-sm text-day-text/70 dark:text-night-text/70">
                {t("admin.property.official_data_loading")}
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          ) : data ? (
            <>
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-day-border dark:border-night-border p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="font-semibold text-day-text dark:text-night-text">
                      {t("admin.property.official_data_summary")}
                    </h4>
                    <StatusBadge status={data.overallStatus} />
                  </div>
                  <p className="text-sm leading-6 text-day-text/80 dark:text-night-text/80">
                    {data.summary}
                  </p>
                </div>

                <div className="rounded-2xl border border-day-border dark:border-night-border p-4">
                  <InfoRow
                    label={t("admin.property.official_data_provider")}
                    value={data.provider?.name}
                  />
                  <InfoRow
                    label={t("admin.property.official_data_checked_at")}
                    value={
                      data.checkedAt
                        ? new Date(data.checkedAt).toLocaleString()
                        : "-"
                    }
                  />
                  <InfoRow
                    label={t("admin.property.official_data_registry_id")}
                    value={data.registryRecord?.id}
                  />
                  <InfoRow
                    label={t("admin.property.official_data_confidence")}
                    value={
                      typeof data.registryRecord?.confidenceScore === "number"
                        ? `${data.registryRecord.confidenceScore}%`
                        : "-"
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-day-border dark:border-night-border p-4">
                <h4 className="mb-3 font-semibold text-day-text dark:text-night-text">
                  {t("admin.property.official_data_checks")}
                </h4>
                <div className="space-y-3">
                  {(data.checks || []).map((check) => (
                    <div
                      key={check.key}
                      className="rounded-xl border border-day-border/80 dark:border-night-border/80 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-medium text-day-text dark:text-night-text">
                          {check.label}
                        </p>
                        <StatusBadge status={check.status} />
                      </div>
                      <p className="mt-2 text-sm text-day-text/70 dark:text-night-text/70">
                        {check.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-day-border dark:border-night-border p-4">
                  <h4 className="mb-3 font-semibold text-day-text dark:text-night-text">
                    {t("admin.property.official_data_recommended_actions")}
                  </h4>
                  {(data.recommendedActions || []).length > 0 ? (
                    <ul className="space-y-2 text-sm text-day-text/75 dark:text-night-text/75">
                      {data.recommendedActions.map((item) => (
                        <li key={item} className="rounded-xl bg-day-background/70 px-3 py-2 dark:bg-night-background/70">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-day-text/60 dark:text-night-text/60">
                      {t("admin.property.official_data_no_actions")}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-day-border dark:border-night-border p-4">
                  <h4 className="mb-3 font-semibold text-day-text dark:text-night-text">
                    {t("admin.property.official_data_disclaimer_title")}
                  </h4>
                  <ul className="space-y-2 text-sm text-day-text/75 dark:text-night-text/75">
                    {(data.disclaimers || []).map((item) => (
                      <li key={item} className="rounded-xl bg-day-background/70 px-3 py-2 dark:bg-night-background/70">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default OfficialDataCheckModal;
