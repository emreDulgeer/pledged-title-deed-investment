import { useCallback, useEffect, useState, useTransition } from "react";
import { useDispatch, useSelector } from "react-redux";
import bridge from "../../controllers/bridge";
import { selectUser, setUser } from "../../store/slices/authSlice";
import { showAlert } from "../../store/slices/uiSlice";

const SUPPORT_LABELS = {
  email: "Email support",
  priority: "Priority support",
  dedicated: "Dedicated manager",
  vip: "VIP support",
};

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

const ComparisonCell = ({ value, positive = false }) => {
  if (typeof value === "boolean") {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
          value
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
        }`}
      >
        {value ? "Included" : "No"}
      </span>
    );
  }

  return (
    <span
      className={`text-sm font-medium ${
        positive
          ? "text-emerald-600 dark:text-emerald-300"
          : "text-slate-700 dark:text-slate-200"
      }`}
    >
      {value}
    </span>
  );
};

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
        })
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
        })
      );
    } catch (error) {
      console.error("Change membership plan error:", error);
      dispatch(
        showAlert({
          type: "error",
          message:
            error.message || "Membership plan could not be changed right now.",
        })
      );
    } finally {
      setChangingPlanId(null);
    }
  };

  const comparisonRows = [
    {
      label: "Active investments",
      getValue: (plan) => formatLimit(plan.features?.investments?.maxActiveInvestments ?? 1),
    },
    {
      label: "Active properties",
      getValue: (plan) => formatLimit(plan.features?.properties?.maxActiveProperties ?? 0),
    },
    {
      label: "Support",
      getValue: (plan) => formatSupport(plan.features?.support?.level),
    },
    {
      label: "Advanced analytics",
      getValue: (plan) => Boolean(plan.features?.analytics?.hasAdvancedAnalytics),
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

  const currentPlanId = membership?.planId;
  const currentPlan = plans.find((plan) => plan._id === currentPlanId) || null;
  const currentPlanName = currentPlan?.displayName || membership?.plan || user?.membershipPlan || "Basic";
  const currentMaxInvestments = membership?.features?.maxActiveInvestments ?? 1;
  const overInvestmentLimit =
    role === "investor" &&
    currentMaxInvestments !== -1 &&
    (user?.activeInvestmentCount ?? 0) > currentMaxInvestments;

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-56 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-700/70"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="membership-dashboard"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Membership plans
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            Compare plans and switch instantly
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Users are automatically placed on the free Basic plan. For now this
            section works in dummy mode, so plan changes happen with one click
            and no payment step.
          </p>
        </div>

        <div
          data-testid="membership-current-plan"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
        >
          <span className="font-semibold">Current plan:</span> {currentPlanName}
          {membership?.expiresAt ? (
            <span className="block text-xs text-emerald-700/80 dark:text-emerald-300/80">
              Renews or expires on{" "}
              {new Date(membership.expiresAt).toLocaleDateString("en-US")}
            </span>
          ) : (
            <span className="block text-xs text-emerald-700/80 dark:text-emerald-300/80">
              Free plan access stays active by default.
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan._id === currentPlanId;
          const isChanging = changingPlanId === plan._id;
          const monthlyPrice = formatCurrency(
            plan.pricing?.monthly?.amount,
            plan.pricing?.monthly?.currency || "EUR"
          );
          const yearlyPrice = formatCurrency(
            plan.pricing?.yearly?.amount,
            plan.pricing?.yearly?.currency || "EUR"
          );

          return (
            <article
              key={plan._id}
              data-testid={`membership-plan-${plan.name}`}
              data-plan-name={plan.displayName}
              className={`rounded-2xl border p-5 transition-all ${
                isCurrent
                  ? "border-emerald-400 bg-emerald-50/70 shadow-md dark:border-emerald-400/70 dark:bg-emerald-500/10"
                  : "border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                      {plan.displayName}
                    </h3>
                    {isCurrent ? (
                      <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">
                        Current
                      </span>
                    ) : null}
                    {plan.isHighlighted ? (
                      <span className="rounded-full bg-sky-600 px-2 py-1 text-xs font-semibold text-white">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {plan.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {monthlyPrice}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    or {yearlyPrice} yearly
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 rounded-xl bg-white/80 p-4 dark:bg-slate-800/80">
                <FeatureLine
                  label="Active investments"
                  value={formatLimit(
                    plan.features?.investments?.maxActiveInvestments ?? 1
                  )}
                />
                <FeatureLine
                  label="Active properties"
                  value={formatLimit(
                    plan.features?.properties?.maxActiveProperties ?? 0
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
                className={`mt-5 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  isCurrent
                    ? "cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                    : "bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                }`}
              >
                {isCurrent
                  ? "Current plan"
                  : isChanging
                    ? "Switching..."
                    : "Switch instantly"}
              </button>
            </article>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Plan comparison
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-300">
                    Feature
                  </th>
                  {plans.map((plan) => (
                    <th
                      key={plan._id}
                      className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white"
                    >
                      {plan.displayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr
                    key={row.label}
                    className="border-t border-slate-200 dark:border-slate-700"
                  >
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {row.label}
                    </td>
                    {plans.map((plan) => {
                      const value = row.getValue(plan);
                      return (
                        <td key={`${plan._id}-${row.label}`} className="px-4 py-3">
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

        <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Upgrade and downgrade behavior
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              If a paid plan expires later, the user is moved back to the free
              Basic plan automatically. Existing investments stay untouched and
              only new actions respect the new plan limits.
            </p>
          </div>

          {role === "investor" ? (
            <div className="rounded-xl bg-white/80 p-4 text-sm text-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
              <p className="font-semibold">Investment usage</p>
              <p className="mt-2">
                Active investments:{" "}
                <span className="font-semibold">
                  {user?.activeInvestmentCount ?? membership?.usage?.currentActiveInvestments ?? 0}
                </span>
              </p>
              <p>
                Remaining new investments:{" "}
                <span className="font-semibold">
                  {membership?.remainingInvestments ?? "—"}
                </span>
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-white/80 p-4 text-sm text-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
              <p className="font-semibold">Owner access</p>
              <p className="mt-2">
                Priority listing on current plan:{" "}
                <span className="font-semibold">
                  {currentPlan?.features?.properties?.priorityListing
                    ? "Included"
                    : "Standard"}
                </span>
              </p>
            </div>
          )}

          {overInvestmentLimit ? (
            <div className="rounded-xl border border-amber-300 bg-amber-100/80 p-4 text-sm text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/20 dark:text-amber-100">
              You currently hold more active investments than this plan allows.
              Your existing portfolio is preserved, but you will need to upgrade
              again before creating a new investment.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

const FeatureLine = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 text-sm">
    <span className="text-slate-500 dark:text-slate-400">{label}</span>
    <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
  </div>
);

export default DashboardMembershipPlans;
