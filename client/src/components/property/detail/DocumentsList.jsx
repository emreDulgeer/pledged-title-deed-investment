import React from "react";
import { useTranslation } from "react-i18next";
import { FileText, Download, Shield } from "lucide-react";

const prettifyDocType = (type = "") =>
  String(type)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const REVIEW_STATUS_STYLES = {
  pending_review:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  changes_requested:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
};

const formatReviewLabel = (status) => {
  switch (status) {
    case "pending_review":
      return "Pending review";
    case "approved":
      return "Approved";
    case "changes_requested":
      return "Re-upload requested";
    default:
      return null;
  }
};

const DocumentsList = ({ documents = [], onDownload, t: translate }) => {
  const { t } = useTranslation();
  const tr = translate || t;

  if (!documents.length) return null;

  return (
    <div className="bg-day-surface dark:bg-night-surface rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-day-text dark:text-night-text mb-4">
        {tr("properties.documents")}
      </h3>

      <div className="space-y-2">
        {documents.map((doc, index) => (
          <div
            key={index}
            className="rounded-lg bg-day-background p-3 dark:bg-night-dashboard"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 w-5 h-5 text-day-text/70 dark:text-night-text/70" />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-day-text/90 dark:text-night-text/90">
                      {doc.name ||
                        tr(
                          `documents.types.${doc.type}`,
                          prettifyDocType(doc.type) || `Document ${index + 1}`,
                        )}
                    </span>
                    {doc.verified && (
                      <Shield className="w-4 h-4 text-day-primary dark:text-night-primary" />
                    )}
                    {formatReviewLabel(doc.reviewStatus) ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${REVIEW_STATUS_STYLES[doc.reviewStatus]}`}
                      >
                        {formatReviewLabel(doc.reviewStatus)}
                      </span>
                    ) : null}
                  </div>
                  {doc.reviewNotes ? (
                    <p className="text-xs text-day-text/65 dark:text-night-text/65">
                      {doc.reviewNotes}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                disabled={!onDownload || !doc.fileId}
                onClick={() =>
                  onDownload?.(
                    doc.fileId,
                    doc.name ||
                      prettifyDocType(doc.type) ||
                      `document-${index + 1}`,
                  )
                }
                className="text-day-secondary dark:text-night-secondary hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentsList;
