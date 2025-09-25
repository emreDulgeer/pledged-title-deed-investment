import React from "react";

const FlaggedIssues = ({ issues = [], t }) => (
  <div className="bg-day-surface dark:bg-night-surface rounded-lg shadow-lg p-6">
    <h3 className="text-lg font-semibold text-day-text dark:text-night-text mb-2">
      {t("properties.flagged_issues")}
    </h3>

    <div className="flex flex-wrap gap-2">
      {issues.map((issue, i) => (
        <span
          key={i}
          className="px-3 py-1 rounded-full text-sm
                     bg-day-accent-light/20 text-day-accent-dark
                     dark:bg-night-accent/20 dark:text-night-accent"
        >
          {issue}
        </span>
      ))}
    </div>
  </div>
);

export default FlaggedIssues;
