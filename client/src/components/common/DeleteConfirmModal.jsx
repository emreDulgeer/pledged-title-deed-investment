// src/components/common/DeleteConfirmModal.jsx
import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

const DeleteConfirmModal = ({ title, message, onConfirm, onClose }) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-night-background/70 p-4 backdrop-blur-sm">
      <div className="shell-surface w-full max-w-md overflow-hidden shadow-shell">
        <div className="relative px-6 py-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-red-500/10 via-day-panel to-day-accent/10 dark:from-red-400/10 dark:via-night-panel/40 dark:to-night-accent/10" />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-600 dark:text-red-300">
              Confirm action
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
              className="inline-flex items-center justify-center rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel"
            >
              {t("common.cancel") || "Cancel"}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              {t("common.delete") || "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

DeleteConfirmModal.propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DeleteConfirmModal;
