import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Coins,
  Landmark,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import InvestmentController from "../../controllers/investmentController";
import { selectUser } from "../../store/slices/authSlice";
import {
  getPropertyImageStyle,
  getPropertyImageUrl,
} from "../../utils/propertyImages";
import { APP_CURRENCY_SYMBOL } from "../../utils/currency";

const INVESTMENT_FETCH_LIMIT = 100;
const RECENT_INVESTMENT_LIMIT = 5;
const PAYMENT_FETCH_LIMIT = 12;
const UPCOMING_PAYMENT_LIMIT = 4;

const initialStats = {
  totalInvestments: 0,
  activeInvestments: 0,
  totalInvested: 0,
  monthlyIncome: 0,
  totalEarnings: 0,
  averageTicket: 0,
  upcomingIncome: 0,
};

const statusToneMap = {
  offer_sent:
    "bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20",
  contract_signed:
    "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
  title_deed_pending:
    "bg-yellow-500/10 text-yellow-700 ring-1 ring-yellow-500/20 dark:bg-yellow-400/10 dark:text-yellow-300 dark:ring-yellow-400/20",
  active:
    "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  completed:
    "bg-slate-500/10 text-slate-700 ring-1 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20",
  refunded:
    "bg-violet-500/10 text-violet-700 ring-1 ring-violet-500/20 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/20",
  defaulted:
    "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20",
};

const paymentToneMap = {
  pending:
    "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
  paid: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  delayed:
    "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20",
};

const formatMoney = (value) => {
  const numericValue = Number(value || 0);
  return `${numericValue.toLocaleString()} ${APP_CURRENCY_SYMBOL}`;
};

const formatCompactMoney = (value) => {
  const numericValue = Number(value || 0);

  return `${new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(numericValue)} ${APP_CURRENCY_SYMBOL}`;
};

const formatMonthLabel = (value) => {
  if (!value) return "Pending schedule";

  if (/^\d{4}-\d{2}$/.test(value)) {
    const date = new Date(`${value}-01T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
      }).format(date);
    }
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  return value;
};

const formatStatusFallback = (status) =>
  status
    ?.split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";

const getStatusTone = (status) =>
  statusToneMap[status] ||
  "bg-slate-500/10 text-slate-700 ring-1 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20";

const getPaymentTone = (status) =>
  paymentToneMap[status] ||
  "bg-slate-500/10 text-slate-700 ring-1 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20";

const getPaymentSummary = (investment) =>
  investment?.rentalPaymentsSummary || investment?.paymentStatistics || {};

const getPropertyHeadline = (property) => {
  const location = [property?.city, property?.country].filter(Boolean).join(", ");
  return location || property?.title || property?.fullAddress || "Property";
};

const getPropertySubline = (property) =>
  property?.propertyType || property?.fullAddress || "Asset details available";

const getUserFirstName = (user) => {
  if (user?.fullName) {
    return user.fullName.trim().split(/\s+/)[0];
  }

  if (user?.email) {
    return user.email.split("@")[0];
  }

  return "Investor";
};

const StatCard = ({ icon, label, value, supporting, accentClass }) => {
  const IconComponent = icon;

  return (
    <article className="rounded-[28px] border border-day-border/70 bg-day-surface/80 px-5 py-5 dark:border-night-border/70 dark:bg-night-surface/80 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
            {label}
          </p>
          <p className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
            {value}
          </p>
          <p className="mt-2 text-sm text-day-muted dark:text-night-muted">
            {supporting}
          </p>
        </div>

        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${accentClass}`}
        >
          <IconComponent className="h-5 w-5" strokeWidth={2.2} />
        </div>
      </div>
    </article>
  );
};

const EmptyPanel = ({ title, description, actionLabel, onAction }) => (
  <div className="grid min-h-[240px] place-items-center px-6 py-10 text-center">
    <div className="max-w-sm">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
        <Building2 className="h-6 w-6" strokeWidth={2.2} />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-day-text dark:text-night-text">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
        {description}
      </p>
      <button
        type="button"
        onClick={onAction}
        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-day-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
      >
        {actionLabel}
        <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
      </button>
    </div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="space-y-6 p-4 sm:p-6 xl:p-8">
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <div className="shell-surface h-64 animate-pulse bg-day-panel/60 dark:bg-night-panel/60" />
      <div className="shell-surface h-64 animate-pulse bg-day-panel/60 dark:bg-night-panel/60" />
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="shell-surface h-40 animate-pulse bg-day-panel/60 dark:bg-night-panel/60"
        />
      ))}
    </div>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
      <div className="shell-surface h-[420px] animate-pulse bg-day-panel/60 dark:bg-night-panel/60" />
      <div className="space-y-6">
        <div className="shell-surface h-[240px] animate-pulse bg-day-panel/60 dark:bg-night-panel/60" />
        <div className="shell-surface h-[160px] animate-pulse bg-day-panel/60 dark:bg-night-panel/60" />
      </div>
    </div>
  </div>
);

const InvestorDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useSelector(selectUser);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [stats, setStats] = useState(initialStats);
  const [recentInvestments, setRecentInvestments] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState([]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    const [investmentsResult, paymentsResult] = await Promise.allSettled([
      InvestmentController.getMyInvestments({
        status:
          "contract_signed,title_deed_pending,active,completed,refunded,defaulted",
        page: 1,
        limit: INVESTMENT_FETCH_LIMIT,
        sort: "-createdAt",
      }),
      InvestmentController.getInvestorRentalPayments({
        page: 1,
        limit: PAYMENT_FETCH_LIMIT,
        status: "pending",
        sort: "month",
      }),
    ]);

    let nextInvestments = [];
    let nextPayments = [];
    let nextStats = initialStats;
    const errors = [];

    if (investmentsResult.status === "fulfilled" && investmentsResult.value?.success) {
      nextInvestments = investmentsResult.value.data ?? [];

      const activeInvestments = nextInvestments.filter(
        (investment) => investment.status === "active",
      );
      const totalInvested = nextInvestments.reduce(
        (sum, investment) => sum + Number(investment.amountInvested || 0),
        0,
      );
      const monthlyIncome = activeInvestments.reduce(
        (sum, investment) =>
          sum +
          Number(
            investment.offerTerms?.desiredMonthlyRent ||
              investment.property?.rentOffered ||
              0,
          ),
        0,
      );
      const totalEarnings = nextInvestments.reduce((sum, investment) => {
        const paymentSummary = getPaymentSummary(investment);
        return sum + Number(paymentSummary.totalPaidAmount || paymentSummary.paid || 0);
      }, 0);

      nextStats = {
        ...nextStats,
        totalInvestments:
          investmentsResult.value.pagination?.totalItems ?? nextInvestments.length,
        activeInvestments: activeInvestments.length,
        totalInvested,
        monthlyIncome,
        totalEarnings,
        averageTicket:
          nextInvestments.length > 0 ? totalInvested / nextInvestments.length : 0,
      };
    } else {
      errors.push("We could not load your latest investment data.");
    }

    if (paymentsResult.status === "fulfilled" && paymentsResult.value?.success) {
      nextPayments = paymentsResult.value.data ?? [];
      nextStats = {
        ...nextStats,
        upcomingIncome: nextPayments.reduce(
          (sum, payment) => sum + Number(payment.amount || 0),
          0,
        ),
      };
    } else {
      errors.push("Upcoming rental payments are temporarily unavailable.");
    }

    setRecentInvestments(nextInvestments.slice(0, RECENT_INVESTMENT_LIMIT));
    setUpcomingPayments(nextPayments.slice(0, UPCOMING_PAYMENT_LIMIT));
    setStats(nextStats);
    setLoadError(errors[0] || "");
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboardData().catch((error) => {
      console.error("Investor dashboard data load failed:", error);
      setLoadError("We could not load your dashboard right now.");
      setLoading(false);
    });
  }, [loadDashboardData]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const firstName = getUserFirstName(user);
  const hasInvestments = recentInvestments.length > 0;
  const hasUpcomingPayments = upcomingPayments.length > 0;
  const portfolioHealthMessage =
    stats.activeInvestments > 0
      ? `${stats.activeInvestments} active position${stats.activeInvestments > 1 ? "s are" : " is"} currently projecting ${formatMoney(stats.monthlyIncome)} in monthly rent.`
      : "Your portfolio is ready for its next allocation. Review the marketplace to open your first active position.";

  return (
    <div className="space-y-6 p-4 sm:p-6 xl:p-8">
      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="shell-surface relative overflow-hidden px-6 py-7 sm:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,53,39,0.08),_transparent_38%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(149,211,186,0.08),_transparent_32%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-day-primary dark:border-night-border/70 dark:bg-night-surface dark:text-night-primary">
                Investor overview
              </span>
              <span className="rounded-full border border-day-border/70 bg-day-panel/70 px-3 py-1 text-xs font-medium text-day-muted dark:border-night-border/70 dark:bg-night-panel/70 dark:text-night-muted">
                Welcome back, {firstName}
              </span>
            </div>

            <div className="mt-6 max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
                Portfolio performance
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-day-muted dark:text-night-muted">
                Monitor exposure, rental cadence, and newly published opportunities
                from one investor workspace.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-day-border/70 bg-day-surface px-4 py-3 dark:border-night-border/70 dark:bg-night-surface">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                  Total positions
                </p>
                <p className="mt-2 text-lg font-semibold text-day-text dark:text-night-text">
                  {stats.totalInvestments}
                </p>
              </div>
              <div className="rounded-2xl border border-day-border/70 bg-day-surface px-4 py-3 dark:border-night-border/70 dark:bg-night-surface">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                  Active deals
                </p>
                <p className="mt-2 text-lg font-semibold text-day-text dark:text-night-text">
                  {stats.activeInvestments}
                </p>
              </div>
              <div className="rounded-2xl border border-day-border/70 bg-day-surface px-4 py-3 dark:border-night-border/70 dark:bg-night-surface">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                  Upcoming income
                </p>
                <p className="mt-2 text-lg font-semibold text-day-text dark:text-night-text">
                  {formatCompactMoney(stats.upcomingIncome)}
                </p>
              </div>
            </div>

            <div className="shell-subtle-surface mt-6 px-5 py-4">
              <p className="text-sm font-medium text-day-text dark:text-night-text">
                {portfolioHealthMessage}
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              <StatCard
                icon={Landmark}
                label="Total invested"
                value={formatMoney(stats.totalInvested)}
                supporting={`${stats.totalInvestments} recorded position${stats.totalInvestments === 1 ? "" : "s"}`}
                accentClass="bg-day-primary-light text-day-primary dark:bg-night-primary/20 dark:text-night-primary"
              />
              <StatCard
                icon={WalletCards}
                label="Active investments"
                value={stats.activeInvestments}
                supporting="Contracts and title-deed stages already in motion."
                accentClass="bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300"
              />
              <StatCard
                icon={Coins}
                label="Monthly income"
                value={formatMoney(stats.monthlyIncome)}
                supporting="Projected recurring rent from active positions."
                accentClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"
              />
              <StatCard
                icon={CalendarClock}
                label="Total earnings"
                value={formatMoney(stats.totalEarnings)}
                supporting="Recorded rent already paid into the portfolio."
                accentClass="bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300"
              />
            </div>
          </div>
        </div>

        <aside className="shell-surface relative overflow-hidden px-6 py-7 sm:px-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(92,100,122,0.08),_transparent_42%)] dark:bg-[radial-gradient(circle_at_top,_rgba(190,198,224,0.08),_transparent_42%)]" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-day-muted dark:text-night-muted">
                  Next step
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
                  Review the marketplace
                </h2>
              </div>

              <button
                type="button"
                onClick={loadDashboardData}
                className="shell-icon-button"
                aria-label="Refresh dashboard"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-day-muted dark:text-night-muted">
              Browse newly published properties, compare rent targets, and widen
              portfolio coverage when the fit is right.
            </p>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => navigate("/investor/properties")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
              >
                {t("investor.browseProperties", "Browse Properties")}
                <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
              </button>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <button
                  type="button"
                  onClick={() => navigate("/investor/investments")}
                  className="shell-chip-button justify-between rounded-2xl border border-day-border/70 bg-day-surface px-4 py-3 text-left dark:border-night-border/70 dark:bg-night-surface"
                >
                  <span>View investments</span>
                  <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/investor/rental-payments")}
                  className="shell-chip-button justify-between rounded-2xl border border-day-border/70 bg-day-surface px-4 py-3 text-left dark:border-night-border/70 dark:bg-night-surface"
                >
                  <span>Rental payments</span>
                  <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-2xl border border-day-border/70 bg-day-surface px-4 py-3 dark:border-night-border/70 dark:bg-night-surface">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
                  Avg. ticket
                </p>
                <p className="mt-2 text-lg font-semibold text-day-text dark:text-night-text">
                  {formatCompactMoney(stats.averageTicket)}
                </p>
              </div>

              <div className="rounded-2xl border border-day-border/70 bg-day-surface px-4 py-3 dark:border-night-border/70 dark:bg-night-surface">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
                  Projected rent
                </p>
                <p className="mt-2 text-lg font-semibold text-day-text dark:text-night-text">
                  {formatCompactMoney(stats.monthlyIncome)}
                </p>
              </div>

              <div className="rounded-2xl border border-day-border/70 bg-day-surface px-4 py-3 dark:border-night-border/70 dark:bg-night-surface">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
                  Upcoming payouts
                </p>
                <p className="mt-2 text-lg font-semibold text-day-text dark:text-night-text">
                  {upcomingPayments.length}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {loadError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          {loadError}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
        <div className="shell-surface overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-day-border/70 px-6 py-5 dark:border-night-border/70 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-day-muted dark:text-night-muted">
                Portfolio activity
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-day-text dark:text-night-text">
                {t("investor.recentInvestments", "Recent investments")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                Review your latest allocations, deal status, and projected monthly
                income from one list.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/investor/investments")}
              className="shell-chip-button justify-between self-start rounded-2xl border border-day-border/70 bg-day-surface px-4 py-3 dark:border-night-border/70 dark:bg-night-surface"
            >
              <span>{t("investor.viewAll", "View all")}</span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>

          {!hasInvestments ? (
            <EmptyPanel
              title={t("investor.noInvestmentsYet", "No investments yet")}
              description="Start with the marketplace to compare active properties and send your first offer."
              actionLabel={t("investor.startInvesting", "Start investing")}
              onAction={() => navigate("/investor/properties")}
            />
          ) : (
            <div className="divide-y divide-day-border/70 dark:divide-night-border/70">
              {recentInvestments.map((investment) => {
                const property = investment.property;
                const propertyHeadline = getPropertyHeadline(property);
                const propertySubline = getPropertySubline(property);
                const monthlyRent =
                  investment.offerTerms?.desiredMonthlyRent || property?.rentOffered || 0;
                const ownershipPercent = investment.offerTerms?.ownershipPercent;

                return (
                  <button
                    key={investment.id}
                    type="button"
                    onClick={() => navigate(`/investor/investments/${investment.id}`)}
                    className="grid w-full gap-5 px-6 py-5 text-left transition hover:bg-day-panel/50 dark:hover:bg-night-panel/40"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex min-w-0 items-center gap-4">
                        {property?.thumbnail ? (
                          <img
                            src={getPropertyImageUrl(property.thumbnail)}
                            alt={propertyHeadline}
                            className="h-16 w-16 rounded-2xl object-cover"
                            style={getPropertyImageStyle(property.thumbnail)}
                          />
                        ) : (
                          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
                            <Building2 className="h-6 w-6" strokeWidth={2.2} />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-lg font-semibold text-day-text dark:text-night-text">
                            {propertyHeadline}
                          </p>
                          <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
                            {propertySubline}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(investment.status)}`}
                            >
                              {t(
                                `investor.${investment.status}`,
                                formatStatusFallback(investment.status),
                              )}
                            </span>
                            <span className="text-xs font-medium text-day-muted dark:text-night-muted">
                              {ownershipPercent
                                ? `${ownershipPercent}% share`
                                : "Share details on record"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3 xl:min-w-[420px] xl:gap-5">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
                            Invested
                          </p>
                          <p className="mt-2 text-base font-semibold text-day-text dark:text-night-text">
                            {formatMoney(investment.amountInvested)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
                            Monthly rent
                          </p>
                          <p className="mt-2 text-base font-semibold text-day-text dark:text-night-text">
                            {formatMoney(monthlyRent)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
                            Opened
                          </p>
                          <p className="mt-2 text-base font-semibold text-day-text dark:text-night-text">
                            {formatMonthLabel(investment.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="shell-surface overflow-hidden">
            <div className="border-b border-day-border/70 px-6 py-5 dark:border-night-border/70">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-day-muted dark:text-night-muted">
                    Income queue
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-day-text dark:text-night-text">
                    {t("investor.upcomingPayments", "Upcoming payments")}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/investor/rental-payments")}
                  className="shell-chip-button rounded-2xl border border-day-border/70 bg-day-surface px-4 py-3 dark:border-night-border/70 dark:bg-night-surface"
                >
                  {t("investor.viewAll", "View all")}
                </button>
              </div>
            </div>

            {!hasUpcomingPayments ? (
              <div className="px-6 py-10">
                <div className="rounded-3xl border border-dashed border-day-border bg-day-panel/40 px-5 py-8 text-center dark:border-night-border dark:bg-night-panel/40">
                  <p className="text-base font-semibold text-day-text dark:text-night-text">
                    {t("investor.noUpcomingPayments", "No upcoming payments")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                    Pending rent distributions will appear here as soon as your active
                    investments start generating payouts.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 px-4 py-4">
                {upcomingPayments.map((payment, index) => (
                  <div
                    key={payment._id || `${payment.month}-${index}`}
                    className="shell-subtle-surface px-4 py-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-day-surface text-day-primary dark:bg-night-surface dark:text-night-primary">
                        <CalendarClock className="h-4 w-4" strokeWidth={2.2} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-base font-semibold text-day-text dark:text-night-text">
                              {getPropertyHeadline(payment.property)}
                            </p>
                            <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
                              Expected in {formatMonthLabel(payment.month)}
                            </p>
                          </div>

                          <div className="sm:text-right">
                            <p className="text-base font-semibold text-day-text dark:text-night-text">
                              {formatMoney(payment.amount)}
                            </p>
                            <span
                              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentTone(payment.status)}`}
                            >
                              {t(
                                `investor.${payment.status}`,
                                formatStatusFallback(payment.status),
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="shell-surface px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-day-muted dark:text-night-muted">
              Portfolio rhythm
            </p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-day-muted dark:text-night-muted">
                  Average ticket
                </span>
                <span className="text-sm font-semibold text-day-text dark:text-night-text">
                  {formatMoney(stats.averageTicket)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-day-muted dark:text-night-muted">
                  Upcoming income pipeline
                </span>
                <span className="text-sm font-semibold text-day-text dark:text-night-text">
                  {formatMoney(stats.upcomingIncome)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-day-muted dark:text-night-muted">
                  Recorded earnings
                </span>
                <span className="text-sm font-semibold text-day-text dark:text-night-text">
                  {formatMoney(stats.totalEarnings)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[32px] bg-day-primary px-6 py-7 text-white shadow-accent dark:border dark:border-night-border/70 dark:bg-[#0f2a22] sm:px-8">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
              Market opportunity
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Open the marketplace for your next allocation.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/78">
              Compare active listings, review rent targets, and decide whether your
              next move should deepen yield, diversify country exposure, or build
              cash-flow consistency.
            </p>

            <div className="mt-6 flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-white/60">Active deals</p>
                <p className="mt-2 text-xl font-semibold">{stats.activeInvestments}</p>
              </div>
              <div>
                <p className="text-white/60">Upcoming income</p>
                <p className="mt-2 text-xl font-semibold">
                  {formatCompactMoney(stats.upcomingIncome)}
                </p>
              </div>
              <div>
                <p className="text-white/60">Average ticket</p>
                <p className="mt-2 text-xl font-semibold">
                  {formatCompactMoney(stats.averageTicket)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate("/investor/properties")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-day-primary transition hover:bg-white/90 focus:outline-none focus:ring-4 focus:ring-white/20 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark"
            >
              Analyze deals
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/investor/investments")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/14 focus:outline-none focus:ring-4 focus:ring-white/15"
            >
              View portfolio
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InvestorDashboard;
