import React from "react";
import { Loader2, Plus, X } from "lucide-react";

const FlagModal = ({
  flags,
  setFlags,
  newFlag,
  setNewFlag,
  onSave,
  onClose,
  processing,
  t,
}) => {
  const addFlag = () => {
    const f = newFlag.trim();
    if (f && !flags.includes(f)) setFlags([...flags, f]);
    setNewFlag("");
  };
  const removeFlag = (f) => setFlags(flags.filter((x) => x !== f));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t("admin.property.flag_title")}
        </h3>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newFlag}
            onChange={(e) => setNewFlag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFlag()}
            placeholder={t("admin.property.flag_placeholder")}
            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={addFlag}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {flags.map((f, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm flex items-center gap-1"
            >
              {f}
              <button
                onClick={() => removeFlag(f)}
                className="hover:bg-red-200 dark:hover:bg-red-800 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onSave}
            disabled={processing || flags.length === 0}
            className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
            {t("admin.property.flag_submit")}
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
};

export default FlagModal;
