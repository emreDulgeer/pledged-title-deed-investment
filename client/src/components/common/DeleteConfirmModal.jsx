// src/components/common/DeleteConfirmModal.jsx
import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

const DeleteConfirmModal = ({ title, message, onConfirm, onClose }) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-day-surface dark:bg-night-surface rounded-lg shadow-2xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-day-text dark:text-night-text mb-4">
            {title}
          </h3>
          <p className="text-day-text/80 dark:text-night-text/80 mb-6">
            {message}
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-day-border dark:border-night-border rounded-lg
                text-day-text dark:text-night-text hover:bg-day-background dark:hover:bg-night-background
                transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {t("common.delete")}
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
