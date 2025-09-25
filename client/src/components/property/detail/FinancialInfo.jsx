import React from "react";
import { currencySymbol } from "./_utils";

const FinancialInfo = ({ property, t }) => {
  const cur = currencySymbol(property.currency);
  return (
    <div className="bg-day-surface dark:bg-night-surface rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-day-text dark:text-night-text mb-4">
        {t("properties.financial")}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex justify-between">
          <span className="text-day-text/70 dark:text-night-text/70">
            {t("properties.estimated_value")}
          </span>
          <span className="font-semibold text-day-text dark:text-night-text">
            {cur}
            {property.estimatedValue?.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-day-text/70 dark:text-night-text/70">
            {t("properties.requested_investment")}
          </span>
          <span className="font-semibold text-day-text dark:text-night-text">
            {cur}
            {property.requestedInvestment?.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-day-text/70 dark:text-night-text/70">
            {t("properties.rent_offered")}
          </span>
          <span className="font-semibold text-day-text dark:text-night-text">
            {cur}
            {property.rentOffered?.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-day-text/70 dark:text-night-text/70">
            {t("properties.annual_yield")}
          </span>
          <span className="font-semibold text-day-primary dark:text-night-primary">
            {property.annualYieldPercent}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-day-text/70 dark:text-night-text/70">
            {t("properties.contract_period_months")}
          </span>
          <span className="font-semibold text-day-text dark:text-night-text">
            {property.contractPeriodMonths}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FinancialInfo;
