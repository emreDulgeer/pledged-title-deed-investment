import React from "react";
import { useTranslation } from "react-i18next";
import { Eye, FileText, Download, Shield } from "lucide-react";

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

const DocumentsList = ({ documents = [], onDownload, onPreview, t: translate }) => {
  const { t } = useTranslation();
  const tr = translate || t;

  if (!documents.length) return null;

  return (
    <div
      data-testid="document-list"
      className="shell-surface px-6 py-6 sm:px-7"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
        Data room
      </p>
      <h3 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
        {tr("properties.documents")}
      </h3>

      <div className="mt-6 space-y-3">
        {documents.map((doc, index) => (
          <div
            key={index}
            data-testid={`document-row-${doc.fileId || index}`}
            className="shell-subtle-surface px-4 py-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-day-surface text-day-primary dark:bg-night-surface dark:text-night-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-day-text dark:text-night-text">
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
                    <p className="text-xs leading-5 text-day-muted dark:text-night-muted">
                      {doc.reviewNotes}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Preview ${
                    doc.name ||
                    tr(
                      `documents.types.${doc.type}`,
                      prettifyDocType(doc.type) || `Document ${index + 1}`,
                    )
                  }`}
                  disabled={!onPreview || !doc.previewUrl}
                  onClick={() => onPreview?.(doc.previewUrl, doc)}
                  className="shell-icon-button h-10 w-10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Download ${
                    doc.name ||
                    tr(
                      `documents.types.${doc.type}`,
                      prettifyDocType(doc.type) || `Document ${index + 1}`,
                    )
                  }`}
                  disabled={!onDownload || !doc.fileId}
                  onClick={() =>
                    onDownload?.(
                      doc.fileId,
                      doc.name ||
                        prettifyDocType(doc.type) ||
                        `document-${index + 1}`,
                    )
                  }
                  className="shell-icon-button h-10 w-10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentsList;
