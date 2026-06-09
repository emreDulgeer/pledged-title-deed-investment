import React from "react";
import PropTypes from "prop-types";
import { ExternalLink, FileText, X } from "lucide-react";

const IMAGE_PATTERN = /\.(avif|gif|jpe?g|png|svg|webp)(\?|#|$)/i;

const DocumentPreviewModal = ({ title, url, onClose }) => {
  const isImage = IMAGE_PATTERN.test(String(url || ""));

  return (
    <div className="fixed inset-0 z-[70] bg-night-background/82 p-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-day-background shadow-[0_32px_80px_rgba(15,23,42,0.32)] dark:bg-night-background">
        <div className="flex items-center justify-between gap-4 border-b border-day-border/70 px-5 py-4 dark:border-night-border/70">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
              Document preview
            </p>
            <h3 className="truncate text-lg font-semibold text-day-text dark:text-night-text">
              {title}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-2.5 text-sm font-semibold text-day-text transition hover:bg-day-panel dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={2.1} />
              Open in new tab
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-2xl border border-day-border bg-day-surface p-2.5 text-day-text transition hover:bg-day-panel dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel"
            >
              <X className="h-4 w-4" strokeWidth={2.1} />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-day-panel/50 p-3 dark:bg-night-panel/60">
          <div className="flex h-full min-h-0 items-center justify-center overflow-hidden rounded-[24px] border border-day-border/70 bg-white dark:border-night-border/70 dark:bg-night-surface">
            {isImage ? (
              <img
                src={url}
                alt={title}
                className="h-full max-h-full w-full object-contain"
              />
            ) : url ? (
              <iframe
                src={url}
                title={title}
                className="h-full min-h-[70vh] w-full"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <FileText className="h-10 w-10 text-day-primary/60 dark:text-night-primary/60" />
                <p className="text-sm text-day-muted dark:text-night-muted">
                  Preview is unavailable for this file.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

DocumentPreviewModal.propTypes = {
  title: PropTypes.string,
  url: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

DocumentPreviewModal.defaultProps = {
  title: "Document preview",
  url: "",
};

export default DocumentPreviewModal;
