import React from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Edit,
} from "lucide-react";

const ActionButtons = ({
  canEdit,
  isAdmin,
  isOwner,
  status,
  onEdit,
  onOpenApprove,
  onOpenReject,
  onOpenFlag,
  onOpenDelete,
  t,
}) => {
  if (!canEdit) return null;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex flex-wrap gap-2">
      {isOwner && (
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Edit className="w-4 h-4" /> {t("common.edit")}
        </button>
      )}

      {isAdmin && status === "draft" && (
        <>
          <button
            onClick={onOpenApprove}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> {t("admin.property.approve")}
          </button>
          <button
            onClick={onOpenReject}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" /> {t("admin.property.reject")}
          </button>
        </>
      )}

      {isAdmin && (
        <button
          onClick={onOpenFlag}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" /> {t("admin.property.flag")}
        </button>
      )}

      <button
        onClick={onOpenDelete}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
      >
        <Trash2 className="w-4 h-4" /> {t("common.delete")}
      </button>
    </div>
  );
};

export default ActionButtons;
