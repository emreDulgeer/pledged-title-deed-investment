import React from "react";
import { Loader2 } from "lucide-react";

const DeleteModal = ({ onConfirm, onClose, processing, t }) => (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t("common.delete")}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        {t("messages.confirm_delete")}
      </p>
      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
        <p className="text-red-600 dark:text-red-400 text-sm">
          {t("common.warning")}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          disabled={processing}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {processing && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
          {t("common.delete")}
        </button>
        <button
          onClick={onClose}
          disabled={processing}
          className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  </div>
);

export default DeleteModal;
