// _utils.js
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export const getStatusConfig = (status, t) => {
  const map = {
    draft: {
      color:
        "text-day-text/70 bg-day-background dark:text-night-text/70 dark:bg-night-dashboard",
      icon: Clock,
      label: t("properties.status.draft"),
    },
    published: {
      color:
        "text-day-primary bg-day-primary-light/15 dark:text-night-primary dark:bg-night-primary/20",
      icon: CheckCircle,
      label: t("properties.status.published"),
    },
    rejected: {
      color:
        "text-day-accent bg-day-accent-light/20 dark:text-night-accent dark:bg-night-accent/20",
      icon: XCircle,
      label: t("properties.status.rejected"),
    },
    pending_review: {
      color:
        "text-day-secondary bg-day-secondary-light/20 dark:text-night-secondary dark:bg-night-secondary/20",
      icon: AlertCircle,
      label: t("properties.status.pending_review"),
    },
  };
  return map[status] || map.draft;
};

export const currencySymbol = (c) =>
  ({ USD: "$", EUR: "€", GBP: "£", TRY: "₺" }[c] || c);
export const propertyTypeLabel = (t, type) =>
  t(`properties.types.${type}`, type);
