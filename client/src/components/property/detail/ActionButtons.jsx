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
    <div className="shell-surface px-5 py-5 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
        Action center
      </p>
      <h3 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
        Available actions
      </h3>

      <div className="mt-6 grid gap-3">
        {isOwner && (
          <ActionButton
            onClick={onEdit}
            tone="primary"
            icon={Edit}
            label={t("common.edit")}
          />
        )}

        {isAdmin && status === "draft" && (
          <>
            <ActionButton
              onClick={onOpenApprove}
              tone="success"
              icon={CheckCircle}
              label={t("admin.property.approve")}
            />
            <ActionButton
              onClick={onOpenReject}
              tone="danger"
              icon={XCircle}
              label={t("admin.property.reject")}
            />
          </>
        )}

        {isAdmin && (
          <ActionButton
            onClick={onOpenFlag}
            tone="warning"
            icon={AlertTriangle}
            label={t("admin.property.flag")}
          />
        )}

        <ActionButton
          onClick={onOpenDelete}
          tone="danger"
          icon={Trash2}
          label={t("common.delete")}
        />
      </div>
    </div>
  );
};

const TONE_CLASSES = {
  primary: "bg-day-primary text-white hover:opacity-95 dark:bg-night-primary dark:text-night-background",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
  warning: "bg-amber-500 text-white hover:bg-amber-600",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const ActionButton = ({ onClick, tone, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${TONE_CLASSES[tone]}`}
  >
    {React.createElement(icon, {
      className: "h-4 w-4",
      strokeWidth: 2.1,
    })}
    {label}
  </button>
);

export default ActionButtons;
