import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Crown,
  Loader2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

import bridge from "../../controllers/bridge";
import { selectUser, setUser } from "../../store/slices/authSlice";
import { showAlert } from "../../store/slices/uiSlice";

const SUPPORT_LABELS = {
  email: "Email support",
  priority: "Priority support",
  dedicated: "Dedicated manager",
  vip: "VIP support",
};

const COMPARISON_ROWS = [
  {
    label: "Active investments",
    getValue: (plan) =>
      formatLimit(plan.features?.investments?.maxActiveInvestments ?? 1),
  },
  {
    label: "Active properties",
    getValue: (plan) =>
      formatLimit(plan.features?.properties?.maxActiveProperties ?? 0),
  },
  {
    label: "Support",
    getValue: (plan) => formatSupport(plan.features?.support?.level),
  },
  {
    label: "Advanced analytics",
    getValue: (plan) =>
      Boolean(plan.features?.analytics?.hasAdvancedAnalytics),
  },
  {
    label: "Priority listing",
    getValue: (plan) => Boolean(plan.features?.properties?.priorityListing),
  },
  {
    label: "API access",
    getValue: (plan) => Boolean(plan.features?.api?.hasAccess),
  },
];

const formatCurrency = (amount = 0, currency = "EUR") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: amount === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};

const formatLimit = (value) => (value === -1 ? "Unlimited" : `${value}`);

const formatSupport = (level) => SUPPORT_LABELS[level] || "Standard support";

const DashboardMembershipPlans = ({ role }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [plans, setPlans] = useState([]);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changingPlanId, setChangingPlanId] = useState(null);
  const [isPending, startTransition] = useTransition();

  const loadMembershipData = useCallback(async () => {
    try {
      setLoading(true);

      const [plansRes, statusRes] = await Promise.all([
        bridge.membershipPlans.getPublicPlans(),
        bridge.membership.getStatus(),
      ]);

      startTransition(() => {
        setPlans(plansRes.data || []);
        setMembership(statusRes.data || null);
      });
    } catch (error) {
      console.error("Membership dashboard data error:", error);
      dispatch(
        showAlert({
          type: "error",
          message:
            error.message || "Membership plans could not be loaded right now.",
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadMembershipData();
  }, [loadMembershipData]);

  const handleChangePlan = async (planId) => {
    try {
      setChangingPlanId(planId);
      await bridge.membership.changePlan(planId);

      const [plansRes, statusRes, currentUserRes] = await Promise.all([
        bridge.membershipPlans.getPublicPlans(),
        bridge.membership.getStatus(),
        bridge.auth.getCurrentUser(),
      ]);

      startTransition(() => {
        setPlans(plansRes.data || []);
        setMembership(statusRes.data || null);

        if (currentUserRes?.success) {
          dispatch(setUser(currentUserRes.data));
        }
      });

      dispatch(
        showAlert({
          type: "success",
          message: "Membership plan updated instantly.",
        }),
      );
    } catch (error) {
      console.error("Change membership plan error:", error);
      dispatch(
        showAlert({
          type: "error",
          message:
            error.message || "Membership plan could not be changed right now.",
        }),
      );
    } finally {
      setChangingPlanId(null);
    }
  };

  const currentPlanId = membership?.planId;
  const currentPlan = plans.find((plan) => plan._id === currentPlanId) || null;
  const currentPlanName =
    currentPlan?.displayName || membership?.plan || user?.membershipPlan || "Basic";
  const currentMaxInvestments = membership?.features?.maxActiveInvestments ?? 1;
  const activeInvestmentCount =
    user?.activeInvestmentCount ??
    membership?.usage?.currentActiveInvestments ??
    0;
  const overInvestmentLimit =
    role === "investor" &&
    currentMaxInvestments !== -1 &&
    activeInvestmentCount > currentMaxInvestments;

  const summary = useMemo(() => {
    const highlighted = plans.filter(
      (plan) => plan.isHighlighted || plan.isFeatured,
    ).length;
    const freePlan = plans.find(
      (plan) => Number(plan.pricing?.monthly?.amount || 0) === 0,
    );

    return {
      highlighted,
      freePlanName: freePlan?.displayName || "Basic",
    };
  }, [plans]);

  if (loading) {
    return (
      <section className="shell-surface px-6 py-8">
        <div className="flex items-center gap-3 text-sm font-semibold text-day-muted dark:text-night-muted">
          <Loader2 className="h-5 w-5 animate-spin text-day-primary dark:text-night-primary" />
          Loading membership options...
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-72 animate-pulse rounded-3xl bg-day-panel dark:bg-night-panel"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section data-testid="membership-dashboard" className="space-y-6">
      <div className="shell-surface overflow-hidden">
        <div className="relative px-6 py-7 sm:px-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-r from-day-primary/10 via-day-panel to-day-accent/10 dark:from-night-primary/10 dark:via-night-panel/40 dark:to-night-accent/10" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:border-night-border/70 dark:bg-night-surface dark:text-night-muted">
                  Membership plans
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {summary.highlighted} highlighted
                </span>
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
                Compare plans and switch instantly
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-day-muted dark:text-night-muted">
                Free access starts on {summary.freePlanName}. Plan changes are
                applied immediately and existing records stay preserved.
              </p>
            </div>

            <div
              data-testid="membership-current-plan"
              className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/70 text-emerald-700 dark:bg-night-surface/70 dark:text-emerald-200">
                  <Crown className="h-5 w-5" strokeWidth={2.1} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">
                    Current plan
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {currentPlanName}
                  </p>
                </div>
              </div>
              {membership?.expiresAt ? (
                <p className="mt-3 text-sm opacity-80">
                  Renews or expires on{" "}
                  {new Date(membership.expiresAt).toLocaleDateString("en-US")}
                </p>
              ) : (
                <p className="mt-3 text-sm opacity-80">
                  Free plan access stays active by default.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="shell-surface px-6 py-12 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
            <Crown className="h-8 w-8" strokeWidth={2.1} />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-day-text dark:text-night-text">
            No public plans available
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-day-muted dark:text-night-muted">
            Membership plans will appear here after an admin publishes active
            visible plans.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan._id === currentPlanId;
            const isChanging = changingPlanId === plan._id;
            const monthlyPrice = formatCurrency(
              plan.pricing?.monthly?.amount,
              plan.pricing?.monthly?.currency || "EUR",
            );
            const yearlyPrice = formatCurrency(
              plan.pricing?.yearly?.amount,
              plan.pricing?.yearly?.currency || "EUR",
            );

            return (
              <article
                key={plan._id}
                data-testid={`membership-plan-${plan.name}`}
                data-plan-name={plan.displayName}
                className={`shell-surface flex min-h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-shell ${
                  isCurrent
                    ? "ring-2 ring-emerald-400/60 dark:ring-emerald-300/50"
                    : ""
                }`}
              >
                <div className="flex flex-1 flex-col px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-2xl font-semibold text-day-text dark:text-night-text">
                          {plan.displayName}
                        </h3>
                        {isCurrent ? <PlanBadge>Current</PlanBadge> : null}
                        {plan.isHighlighted ? (
                          <PlanBadge tone="accent">Popular</PlanBadge>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-day-muted dark:text-night-muted">
                        {plan.description || "Plan details are being prepared."}
                      </p>
                    </div>
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
                      {plan.isHighlighted ? (
                        <Sparkles className="h-5 w-5" strokeWidth={2.1} />
                      ) : (
                        <ShieldCheck className="h-5 w-5" strokeWidth={2.1} />
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-4xl font-semibold tracking-tight text-day-text dark:text-night-text">
                      {monthlyPrice}
                    </p>
                    <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
                      or {yearlyPrice} yearly
                    </p>
                  </div>

                  <div className="mt-6 grid gap-3 rounded-3xl border border-day-border/70 bg-day-panel/70 p-4 dark:border-night-border/70 dark:bg-night-panel/70">
                    <FeatureLine
                      label="Active investments"
                      value={formatLimit(
                        plan.features?.investments?.maxActiveInvestments ?? 1,
                      )}
                    />
                    <FeatureLine
                      label="Active properties"
                      value={formatLimit(
                        plan.features?.properties?.maxActiveProperties ?? 0,
                      )}
                    />
                    <FeatureLine
                      label="Support"
                      value={formatSupport(plan.features?.support?.level)}
                    />
                    <FeatureLine
                      label="Priority listing"
                      value={
                        plan.features?.properties?.priorityListing
                          ? "Included"
                          : "Standard"
                      }
                    />
                  </div>

                  <button
                    type="button"
                    data-testid={`membership-switch-${plan.name}`}
                    onClick={() => handleChangePlan(plan._id)}
                    disabled={isCurrent || isChanging || isPending}
                    className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed ${
                      isCurrent
                        ? "bg-day-panel text-day-muted dark:bg-night-panel dark:text-night-muted"
                        : "bg-day-primary text-white shadow-accent hover:-translate-y-0.5 hover:opacity-95 dark:bg-night-primary dark:text-night-background"
                    }`}
                  >
                    {isChanging ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      <CheckCircle2 className="h-4 w-4" strokeWidth={2.1} />
                    ) : (
                      <Zap className="h-4 w-4" strokeWidth={2.1} />
                    )}
                    {isCurrent
                      ? "Current plan"
                      : isChanging
                        ? "Switching..."
                        : "Switch instantly"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="shell-surface overflow-hidden">
          <div className="border-b border-day-border/70 px-5 py-4 dark:border-night-border/70">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
                <BarChart3 className="h-5 w-5" strokeWidth={2.1} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-day-text dark:text-night-text">
                  Plan comparison
                </h3>
                <p className="text-sm text-day-muted dark:text-night-muted">
                  Scan the operational limits before switching.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-day-panel/70 dark:bg-night-panel/70">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold text-day-muted dark:text-night-muted">
                    Feature
                  </th>
                  {plans.map((plan) => (
                    <th
                      key={plan._id}
                      className="px-5 py-4 text-left font-semibold text-day-text dark:text-night-text"
                    >
                      {plan.displayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr
                    key={row.label}
                    className="border-t border-day-border/70 dark:border-night-border/70"
                  >
                    <td className="px-5 py-4 font-medium text-day-muted dark:text-night-muted">
                      {row.label}
                    </td>
                    {plans.map((plan) => {
                      const value = row.getValue(plan);
                      return (
                        <td key={`${plan._id}-${row.label}`} className="px-5 py-4">
                          <ComparisonCell
                            value={value}
                            positive={typeof value !== "boolean"}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="shell-surface px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
              <TrendingUp className="h-5 w-5" strokeWidth={2.1} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-day-text dark:text-night-text">
                Upgrade behavior
              </h3>
              <p className="text-sm text-day-muted dark:text-night-muted">
                Existing records stay safe.
              </p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-day-muted dark:text-night-muted">
            If a paid plan expires later, the user is moved back to the free
            Basic plan automatically. Existing investments stay untouched and
            only new actions respect the new plan limits.
          </p>

          {role === "investor" ? (
            <div className="mt-5 rounded-3xl border border-day-border/70 bg-day-panel/70 p-4 text-sm dark:border-night-border/70 dark:bg-night-panel/70">
              <p className="font-semibold text-day-text dark:text-night-text">
                Investment usage
              </p>
              <FeatureLine
                label="Active investments"
                value={activeInvestmentCount}
              />
              <FeatureLine
                label="Remaining new investments"
                value={membership?.remainingInvestments ?? "—"}
              />
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-day-border/70 bg-day-panel/70 p-4 text-sm dark:border-night-border/70 dark:bg-night-panel/70">
              <p className="font-semibold text-day-text dark:text-night-text">
                Owner access
              </p>
              <FeatureLine
                label="Priority listing"
                value={
                  currentPlan?.features?.properties?.priorityListing
                    ? "Included"
                    : "Standard"
                }
              />
            </div>
          )}

          {overInvestmentLimit ? (
            <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0"
                  strokeWidth={2.1}
                />
                <p>
                  You currently hold more active investments than this plan
                  allows. Existing portfolio records are preserved.
                </p>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
};

const PlanBadge = ({ children, tone = "primary" }) => {
  const classes = {
    primary:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200",
    accent:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${classes[tone]}`}
    >
      {children}
    </span>
  );
};

const FeatureLine = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 py-1 text-sm">
    <span className="text-day-muted dark:text-night-muted">{label}</span>
    <span className="font-semibold text-day-text dark:text-night-text">
      {value}
    </span>
  </div>
);

const ComparisonCell = ({ value, positive = false }) => {
  if (typeof value === "boolean") {
    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
          value
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200"
            : "bg-day-panel text-day-muted dark:bg-night-panel dark:text-night-muted"
        }`}
      >
        {value ? "Included" : "No"}
      </span>
    );
  }

  return (
    <span
      className={`text-sm font-semibold ${
        positive
          ? "text-emerald-700 dark:text-emerald-200"
          : "text-day-text dark:text-night-text"
      }`}
    >
      {value}
    </span>
  );
};

export default DashboardMembershipPlans;
