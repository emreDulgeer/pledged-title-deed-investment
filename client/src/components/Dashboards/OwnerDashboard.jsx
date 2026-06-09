import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CircleDollarSign,
  ClipboardList,
  FilePlus2,
  Landmark,
  MapPin,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import { selectUser } from "../../store/slices/authSlice";
import bridge from "../../controllers/bridge";
import {
  getPrimaryPropertyImage,
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";
import { APP_CURRENCY } from "../../utils/currency";

const STATUS_STYLES = {
  draft:
    "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
  published:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  in_contract:
    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200",
  active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  sold: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200",
  suspended:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
  archived:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
};

const PAYMENT_STATUS_STYLES = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  delayed:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
};

const formatAmount = (value, currency = APP_CURRENCY) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const formatMonthLabel = (value) => {
  if (!value) return "Pending schedule";

  if (/^\d{4}-\d{2}$/.test(value)) {
    const date = new Date(`${value}-01T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(date);
    }
  }

  return formatDate(value) === "—" ? value : formatDate(value);
};

const formatKeyLabel = (value = "") =>
  String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";

const getStatusClass = (status) =>
  STATUS_STYLES[status] || STATUS_STYLES.draft;

const getPaymentStatusClass = (status) =>
  PAYMENT_STATUS_STYLES[status] || PAYMENT_STATUS_STYLES.pending;

const getPropertyId = (property) => property?._id || property?.id || "";

const getPropertyTitle = (property) =>
  property?.title ||
  property?.fullAddress ||
  [property?.city, property?.country].filter(Boolean).join(", ") ||
  "Property";

const getPropertyLocation = (property) =>
  [property?.city, property?.country].filter(Boolean).join(", ") ||
  property?.fullAddress ||
  "Location pending";

const getPaymentPropertyLabel = (payment) =>
  payment?.property?.title ||
  [payment?.property?.city, payment?.property?.country]
    .filter(Boolean)
    .join(", ") ||
  "Payment";

const getPaymentInvestmentId = (payment) =>
  payment?.investment?.id ||
  payment?.investment?._id ||
  payment?.investmentId ||
  "";

const SummaryCard = ({ label, value, helpText = "", icon: Icon, accentClass = "" }) => (
  <div className="shell-subtle-surface px-4 py-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
          {label}
        </p>
        <p
          className={`mt-3 text-2xl font-semibold text-day-text dark:text-night-text ${accentClass}`.trim()}
        >
          {value}
        </p>
        {helpText ? (
          <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
            {helpText}
          </p>
        ) : null}
      </div>

      {Icon ? (
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-day-surface text-day-primary dark:bg-night-surface dark:text-night-primary">
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </div>
      ) : null}
    </div>
  </div>
);

const LoadingBlock = ({ className = "h-32" }) => (
  <div
    className={`shell-surface animate-pulse bg-day-panel/60 dark:bg-night-panel/60 ${className}`.trim()}
  />
);

const EmptyState = ({ title, copy, actionLabel, onAction }) => (
  <div className="px-6 py-12 text-center">
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
      <Landmark className="h-6 w-6" strokeWidth={2} />
    </div>
    <h3 className="mt-5 text-xl font-semibold text-day-text dark:text-night-text">
      {title}
    </h3>
    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-day-muted dark:text-night-muted">
      {copy}
    </p>
    {actionLabel ? (
      <button
        type="button"
        onClick={onAction}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark"
      >
        {actionLabel}
        <ArrowRight className="h-4 w-4" strokeWidth={2.1} />
      </button>
    ) : null}
  </div>
);

const PropertyRow = ({ property, onOpen }) => {
  const image = getPrimaryPropertyImage(property);
  const imageUrl = getPropertyImageUrl(image);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group shell-subtle-surface w-full px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-shell"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[24px] bg-day-panel dark:bg-night-panel">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={getPropertyTitle(property)}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                style={getPropertyImageStyle(image)}
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-day-primary/35 dark:text-night-primary/35">
                <Building2 className="h-8 w-8" strokeWidth={1.8} />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getStatusClass(
                  property.status,
                )}`}
              >
                {formatKeyLabel(property.status || "draft")}
              </span>
              <span className="rounded-full bg-day-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-primary dark:bg-night-surface dark:text-night-primary">
                {formatKeyLabel(property.propertyType || "property")}
              </span>
            </div>

            <h3 className="mt-3 text-lg font-semibold text-day-text dark:text-night-text">
              {getPropertyTitle(property)}
            </h3>
            <div className="mt-2 flex items-start gap-2 text-sm text-day-muted dark:text-night-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{getPropertyLocation(property)}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[300px]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
              Estimated value
            </p>
            <p className="mt-2 text-sm font-semibold text-day-text dark:text-night-text">
              {property.estimatedValue ? formatAmount(property.estimatedValue) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
              Listed capital
            </p>
            <p className="mt-2 text-sm font-semibold text-day-text dark:text-night-text">
              {property.requestedInvestment
                ? formatAmount(property.requestedInvestment)
                : "—"}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
};

const PaymentRow = ({ payment, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    disabled={!getPaymentInvestmentId(payment)}
    className="shell-subtle-surface flex w-full flex-col gap-4 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-shell disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:shadow-none sm:flex-row sm:items-center sm:justify-between"
  >
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-day-text dark:text-night-text">
          {getPaymentPropertyLabel(payment)}
        </p>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getPaymentStatusClass(
            payment.status,
          )}`}
        >
          {formatKeyLabel(payment.status || "pending")}
        </span>
      </div>
      <p className="mt-2 text-sm text-day-muted dark:text-night-muted">
        {formatMonthLabel(payment.month || payment.createdAt)} · Settled{" "}
        {payment.paidAt ? formatDate(payment.paidAt) : "—"}
      </p>
    </div>

    <p className="text-base font-semibold text-day-text dark:text-night-text">
      {formatAmount(payment.amount)}
    </p>
  </button>
);

const OwnerDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  const [stats, setStats] = useState(null);
  const [recentProperties, setRecentProperties] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingProps, setLoadingProps] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [errors, setErrors] = useState([]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const response = await bridge.properties.getMyPropertiesStatistics();
      if (response?.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Owner stats error:", error);
      setErrors((current) => [
        ...current.filter((item) => item !== "stats"),
        "stats",
      ]);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchRecentProperties = useCallback(async () => {
    setLoadingProps(true);
    try {
      const response = await bridge.properties.getMyProperties({
        limit: 6,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      if (response?.success) {
        setRecentProperties(response.data ?? []);
      }
    } catch (error) {
      console.error("Owner properties error:", error);
      setErrors((current) => [
        ...current.filter((item) => item !== "properties"),
        "properties",
      ]);
    } finally {
      setLoadingProps(false);
    }
  }, []);

  const fetchRecentPayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const response = await bridge.investments.getPropertyOwnerRentalPayments({
        limit: 5,
        sortBy: "month",
        sortOrder: "desc",
      });
      if (response?.success) {
        setRecentPayments(response.data ?? []);
      }
    } catch (error) {
      console.error("Owner rental payments error:", error);
      setErrors((current) => [
        ...current.filter((item) => item !== "payments"),
        "payments",
      ]);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setErrors([]);
    fetchStats();
    fetchRecentProperties();
    fetchRecentPayments();
  }, [fetchRecentPayments, fetchRecentProperties, fetchStats]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const paymentSummary = useMemo(() => {
    const paid = recentPayments.filter((payment) => payment.status === "paid");
    const pending = recentPayments.filter(
      (payment) => payment.status === "pending",
    );
    const delayed = recentPayments.filter(
      (payment) => payment.status === "delayed",
    );

    return {
      paidAmount: paid.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      pendingCount: pending.length,
      delayedCount: delayed.length,
    };
  }, [recentPayments]);

  const activeListingCount = stats?.publishedProperties ?? 0;
  const contractCount = stats?.propertiesInContract ?? 0;
  const ownerName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Owner";

  return (
    <div className="space-y-6 p-4 sm:p-6 xl:p-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
        <div className="shell-surface flex h-full flex-col justify-between px-6 py-7 sm:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-day-primary dark:border-night-border/70 dark:bg-night-surface dark:text-night-primary">
              Owner workspace
            </span>
            <span className="rounded-full border border-day-border/70 bg-day-panel/70 px-3 py-1 text-xs font-medium text-day-muted dark:border-night-border/70 dark:bg-night-panel/70 dark:text-night-muted">
              Asset operations
            </span>
          </div>

          <div className="mt-6 max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
              {t("owner.dashboard", "Property Owner Dashboard")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-day-muted dark:text-night-muted">
              Welcome back,{" "}
              <span className="font-semibold text-day-text dark:text-night-text">
                {ownerName}
              </span>
              . Monitor listed assets, active contract movement, and rental
              payment flow from one operational surface.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label={t("owner.total_properties", "Total properties")}
              value={loadingStats ? "—" : (stats?.totalProperties ?? 0)}
              helpText={t("owner.all_time", "All time")}
              icon={Building2}
            />
            <SummaryCard
              label={t("owner.published_properties", "Published")}
              value={loadingStats ? "—" : activeListingCount}
              helpText={t("owner.active_listings", "Active listings")}
              icon={BadgeCheck}
              accentClass="text-emerald-600 dark:text-emerald-300"
            />
            <SummaryCard
              label={t("owner.in_contract", "In contract")}
              value={loadingStats ? "—" : contractCount}
              helpText={t("owner.active_contracts", "Active contracts")}
              icon={ClipboardList}
            />
            <SummaryCard
              label={t("owner.total_value", "Portfolio value")}
              value={loadingStats ? "—" : formatAmount(stats?.totalValue)}
              helpText={t("owner.estimated_value", "Estimated total")}
              icon={CircleDollarSign}
            />
          </div>
        </div>

        <aside className="shell-surface flex h-full flex-col px-6 py-7 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-day-muted dark:text-night-muted">
                Primary actions
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
                Move the portfolio
              </h2>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
              <FilePlus2 className="h-5 w-5" strokeWidth={2.2} />
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-day-muted dark:text-night-muted">
            Add a new asset, review investor offers, or refresh the latest asset
            and rental payment data.
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => navigate("/owner/properties/new")}
              className="inline-flex w-full items-center justify-between rounded-2xl bg-day-primary px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-day-primary-dark dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark"
            >
              <span>{t("owner.add_property", "Add property")}</span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/owner/offers")}
              className="inline-flex w-full items-center justify-between rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
            >
              <span>{t("owner.view_offers", "View offers")}</span>
              <ClipboardList className="h-4 w-4" strokeWidth={2.1} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/owner/rental-payments")}
              className="inline-flex w-full items-center justify-between rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
            >
              <span>{t("owner.rental_payments", "Rental payments")}</span>
              <ReceiptText className="h-4 w-4" strokeWidth={2.1} />
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex w-full items-center justify-between rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
            >
              <span>{t("common.refresh", "Refresh")}</span>
              <RefreshCw
                className={`h-4 w-4 ${
                  loadingStats || loadingProps || loadingPayments ? "animate-spin" : ""
                }`}
                strokeWidth={2.2}
              />
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            <SummaryCard
              label="Recent rent received"
              value={formatAmount(paymentSummary.paidAmount)}
              helpText="Loaded from the latest owner payment records."
              icon={WalletCards}
              accentClass="text-emerald-600 dark:text-emerald-300"
            />
            <SummaryCard
              label="Payment exceptions"
              value={paymentSummary.delayedCount}
              helpText={`${paymentSummary.pendingCount} pending payment${paymentSummary.pendingCount === 1 ? "" : "s"} in the same slice.`}
              icon={ShieldCheck}
              accentClass={
                paymentSummary.delayedCount > 0
                  ? "text-rose-700 dark:text-rose-300"
                  : ""
              }
            />
          </div>
        </aside>
      </section>

      {errors.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          Some dashboard data could not be refreshed. The available sections are
          still shown below.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div className="shell-surface overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-day-border/70 px-6 py-5 dark:border-night-border/70 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                Asset pipeline
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-day-text dark:text-night-text">
                {t("owner.my_properties", "My properties")}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/owner/properties")}
              className="inline-flex items-center gap-2 rounded-full border border-day-border px-4 py-2 text-sm font-semibold text-day-primary transition hover:bg-day-panel/60 dark:border-night-border dark:text-night-primary dark:hover:bg-night-panel/60"
            >
              {t("common.view_all", "View all")}
              <ArrowRight className="h-4 w-4" strokeWidth={2.1} />
            </button>
          </div>

          <div className="space-y-3 px-5 py-5">
            {loadingProps ? (
              <>
                <LoadingBlock className="h-32" />
                <LoadingBlock className="h-32" />
                <LoadingBlock className="h-32" />
              </>
            ) : recentProperties.length === 0 ? (
              <EmptyState
                title={t("owner.no_properties", "No properties found")}
                copy="Create your first property record to start collecting investor interest and operational history."
                actionLabel={t("owner.add_property", "Add property")}
                onAction={() => navigate("/owner/properties/new")}
              />
            ) : (
              recentProperties.map((property) => (
                <PropertyRow
                  key={getPropertyId(property)}
                  property={property}
                  onOpen={() =>
                    navigate(`/owner/properties/${getPropertyId(property)}`)
                  }
                />
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="shell-surface overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-day-border/70 px-6 py-5 dark:border-night-border/70">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                  Rental ledger
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-day-text dark:text-night-text">
                  {t("owner.rental_payments", "Rental payments")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate("/owner/rental-payments")}
                className="inline-flex items-center gap-2 rounded-full border border-day-border px-4 py-2 text-sm font-semibold text-day-primary transition hover:bg-day-panel/60 dark:border-night-border dark:text-night-primary dark:hover:bg-night-panel/60"
              >
                {t("common.view_all", "View all")}
              </button>
            </div>

            <div className="space-y-3 px-5 py-5">
              {loadingPayments ? (
                <>
                  <LoadingBlock className="h-24" />
                  <LoadingBlock className="h-24" />
                  <LoadingBlock className="h-24" />
                </>
              ) : recentPayments.length === 0 ? (
                <EmptyState
                  title={t("owner.no_payments", "No rental payments yet")}
                  copy="Incoming rental payment lines will appear here once active investments begin producing rent."
                  actionLabel={t("owner.rental_payments", "Rental payments")}
                  onAction={() => navigate("/owner/rental-payments")}
                />
              ) : (
                recentPayments.map((payment, index) => (
                  <PaymentRow
                    key={payment._id || payment.id || `${payment.month}-${index}`}
                    payment={payment}
                    onOpen={() => {
                      const investmentId = getPaymentInvestmentId(payment);
                      if (investmentId) {
                        navigate(`/owner/investments/${investmentId}`);
                      }
                    }}
                  />
                ))
              )}
            </div>
          </div>

          <div className="shell-surface px-6 py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
              Next steps
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
              Keep listings investor-ready
            </h2>
            <p className="mt-3 text-sm leading-6 text-day-muted dark:text-night-muted">
              Review draft assets, respond to offers, and keep rental payment
              records up to date so investors see a clean operating history.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => navigate("/owner/properties/new")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark"
              >
                <FilePlus2 className="h-4 w-4" strokeWidth={2.1} />
                Add asset
              </button>
              <button
                type="button"
                onClick={() => navigate("/owner/offers")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel/60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel/60"
              >
                <ClipboardList className="h-4 w-4" strokeWidth={2.1} />
                Offers
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OwnerDashboard;
