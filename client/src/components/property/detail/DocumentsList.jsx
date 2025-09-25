import React from "react";
import { FileText, Download, Shield } from "lucide-react";

const DocumentsList = ({ documents = [], t }) => {
  if (!documents.length) return null;

  return (
    <div className="bg-day-surface dark:bg-night-surface rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-day-text dark:text-night-text mb-4">
        {t("properties.documents")}
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
                {doc.name || `Document ${index + 1}`}
              </span>
              {doc.verified && (
                <Shield className="w-4 h-4 text-day-primary dark:text-night-primary" />
              )}
            </div>
            <button className="text-day-secondary dark:text-night-secondary hover:underline">
              <Download className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentsList;
