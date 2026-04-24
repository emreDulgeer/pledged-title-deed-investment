import React from "react";
import { useTranslation } from "react-i18next";
import { FileText, Download, Shield } from "lucide-react";

const prettifyDocType = (type = "") =>
  String(type)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

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
            className="flex items-center justify-between p-3 rounded-lg
                       bg-day-background dark:bg-night-dashboard"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-day-text/70 dark:text-night-text/70" />
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
        ))}
      </div>
    </div>
  );
};

export default DocumentsList;
