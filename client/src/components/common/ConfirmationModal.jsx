import React from "react";
import PropTypes from "prop-types";
import { Loader2 } from "lucide-react";

const TONE_STYLES = {
  primary: "bg-day-primary hover:opacity-90 dark:bg-night-primary dark:text-night-background",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  warning: "bg-amber-500 hover:bg-amber-600 text-slate-950",
  success:
    "bg-emerald-600 hover:bg-emerald-700 text-white",
};

const EYEBROW_STYLES = {
  primary: "text-day-primary dark:text-night-primary",
  danger: "text-red-600 dark:text-red-300",
  warning: "text-amber-600 dark:text-amber-300",
  success: "text-emerald-600 dark:text-emerald-300",
};

const ConfirmationModal = ({
  title,
  message,
  onConfirm,
  onClose,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  processing = false,
  tone = "primary",
  eyebrow = "Confirm action",
}) => (
  <div className="fixed inset-0 z-[70] grid place-items-center bg-night-background/72 p-4 backdrop-blur-sm">
    <div className="shell-surface w-full max-w-md overflow-hidden shadow-shell">
      <div className="relative px-6 py-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-day-primary/10 via-day-panel to-day-accent/10 dark:from-night-primary/10 dark:via-night-panel/40 dark:to-night-accent/10" />
        <div className="relative">
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${EYEBROW_STYLES[tone] || EYEBROW_STYLES.primary}`.trim()}
          >
            {eyebrow}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-day-text dark:text-night-text">
            {title}
          </h3>
        </div>
        <p className="relative mt-4 text-sm leading-6 text-day-muted dark:text-night-muted">
          {message}
        </p>
        <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="inline-flex items-center justify-center rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel disabled:cursor-not-allowed disabled:opacity-60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={processing}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${TONE_STYLES[tone] || TONE_STYLES.primary}`.trim()}
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  </div>
);

ConfirmationModal.propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  processing: PropTypes.bool,
  tone: PropTypes.oneOf(["primary", "danger", "warning", "success"]),
  eyebrow: PropTypes.string,
};

export default ConfirmationModal;
