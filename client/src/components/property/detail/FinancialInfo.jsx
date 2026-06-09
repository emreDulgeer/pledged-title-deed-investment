import React from "react";
import { currencySymbol } from "./_utils";

const FinancialInfo = ({ property, t }) => {
  const cur = currencySymbol(property.currency);
  return (
    <div className="shell-surface px-6 py-6 sm:px-7">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
        Financial profile
      </p>
      <h3 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
        {t("properties.financial")}
      </h3>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <FinancialTile
          label={t("properties.estimated_value")}
          value={`${cur}${property.estimatedValue?.toLocaleString?.() || "—"}`}
        />
        <FinancialTile
          label={t("properties.requested_investment")}
          value={`${cur}${property.requestedInvestment?.toLocaleString?.() || "—"}`}
        />
        <FinancialTile
          label={t("properties.rent_offered")}
          value={`${cur}${property.rentOffered?.toLocaleString?.() || "—"}`}
        />
        <FinancialTile
          label={t("properties.annual_yield")}
          value={`${property.annualYieldPercent ?? "—"}%`}
          accent
        />
        <FinancialTile
          label={t("properties.contract_period_months")}
          value={property.contractPeriodMonths ?? "—"}
        />
      </div>
    </div>
  );
};

const FinancialTile = ({ label, value, accent = false }) => (
  <div className="shell-subtle-surface px-4 py-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-day-muted dark:text-night-muted">
      {label}
    </p>
    <p
      className={`mt-3 text-lg font-semibold ${
        accent
          ? "text-day-primary dark:text-night-primary"
          : "text-day-text dark:text-night-text"
      }`}
    >
      {value}
    </p>
  </div>
);

export default FinancialInfo;
