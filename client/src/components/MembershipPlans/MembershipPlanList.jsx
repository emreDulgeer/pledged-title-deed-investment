// src/components/MembershipPlans/MembershipPlanList.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Crown,
  Eye,
  EyeOff,
  GripVertical,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";

const SUPPORT_LABELS = {
  email: "Email",
  priority: "Priority",
  dedicated: "Dedicated",
  vip: "VIP",
};

const formatLimit = (value) => (value === -1 ? "Unlimited" : `${value || 0}`);

const MembershipPlanList = ({
  plans,
  statistics = {},
  onEdit,
  onDelete,
  onToggleStatus,
  onReorder,
}) => {
  const { t, i18n } = useTranslation();
  const [expandedPlan, setExpandedPlan] = useState(null);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(plans);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onReorder(items);
  };

  const formatCurrency = (amount, currency = "EUR") => {
    try {
      return new Intl.NumberFormat(i18n.language || "en", {
        style: "currency",
        currency,
      }).format(amount ?? 0);
    } catch {
      return `${amount ?? 0} ${currency}`;
    }
  };

  if (plans.length === 0) {
    return (
      <section className="shell-surface px-6 py-12 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
          <Crown className="h-8 w-8" strokeWidth={2.1} />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-day-text dark:text-night-text">
          No membership plans yet
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-day-muted dark:text-night-muted">
          Create the first plan to define pricing, limits, support levels, and
          user-facing upgrade paths.
        </p>
      </section>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="plans">
        {(provided) => (
          <section
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-4"
          >
            {plans.map((plan, index) => {
              const isExpanded = expandedPlan === plan._id;
              const monthlyPrice = formatCurrency(
                plan.pricing?.monthly?.amount,
                plan.pricing?.monthly?.currency || "EUR",
              );
              const yearlyPrice = formatCurrency(
                plan.pricing?.yearly?.amount,
                plan.pricing?.yearly?.currency || "EUR",
              );
              const stats = statistics[plan._id]?.statistics;

              return (
                <Draggable
                  key={plan._id}
                  draggableId={String(plan._id)}
                  index={index}
                >
                  {(dragProvided, snapshot) => (
                    <article
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={`shell-surface overflow-hidden transition-all ${
                        snapshot.isDragging
                          ? "scale-[1.01] shadow-shell ring-2 ring-day-primary/15 dark:ring-night-primary/20"
                          : ""
                      }`}
                    >
                      <div className="grid gap-4 px-5 py-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
                        <button
                          type="button"
                          {...dragProvided.dragHandleProps}
                          className="hidden h-12 w-12 cursor-grab place-items-center rounded-2xl border border-day-border bg-day-panel text-day-muted transition hover:text-day-text active:cursor-grabbing dark:border-night-border dark:bg-night-panel dark:text-night-muted dark:hover:text-night-text lg:grid"
                          title={t("admin.membership.list.reorder") || "Reorder"}
                        >
                          <GripVertical className="h-5 w-5" strokeWidth={2.1} />
                        </button>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-2xl font-semibold text-day-text dark:text-night-text">
                              {plan.displayName}
                            </h3>
                            <PlanBadge>Tier {plan.tier}</PlanBadge>
                            {plan.isDefault ? (
                              <PlanBadge tone="secondary">
                                {t("admin.membership.list.default_badge") ||
                                  "Default"}
                              </PlanBadge>
                            ) : null}
                            {plan.isHighlighted ? (
                              <PlanBadge tone="primary">
                                {t("admin.membership.list.popular_badge") ||
                                  "Popular"}
                              </PlanBadge>
                            ) : null}
                            {plan.isFeatured ? (
                              <PlanBadge tone="accent">
                                {t("admin.membership.list.featured_badge") ||
                                  "Featured"}
                              </PlanBadge>
                            ) : null}
                            {!plan.isActive ? (
                              <PlanBadge tone="muted">
                                {t("admin.membership.list.inactive_badge") ||
                                  "Inactive"}
                              </PlanBadge>
                            ) : null}
                          </div>

                          <p className="mt-2 max-w-3xl text-sm leading-6 text-day-muted dark:text-night-muted">
                            {plan.description || "No description provided."}
                          </p>

                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <PricePill
                              label={t("admin.membership.list.monthly") || "Monthly"}
                              value={monthlyPrice}
                            />
                            <PricePill
                              label={t("admin.membership.list.yearly") || "Yearly"}
                              value={yearlyPrice}
                              hint={
                                plan.pricing?.yearly?.discountPercentage > 0
                                  ? `-${plan.pricing.yearly.discountPercentage}%`
                                  : ""
                              }
                            />
                            <PricePill
                              label={t("admin.membership.list.trial") || "Trial"}
                              value={
                                plan.pricing?.trial?.enabled
                                  ? `${plan.pricing.trial.days} days`
                                  : "No trial"
                              }
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          <IconButton
                            onClick={() =>
                              setExpandedPlan(isExpanded ? null : plan._id)
                            }
                            label={
                              isExpanded
                                ? t("admin.membership.list.collapse") ||
                                  "Collapse"
                                : t("admin.membership.list.expand") || "Expand"
                            }
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" strokeWidth={2.1} />
                            ) : (
                              <ChevronDown
                                className="h-4 w-4"
                                strokeWidth={2.1}
                              />
                            )}
                          </IconButton>

                          <IconButton
                            onClick={() => onToggleStatus(plan)}
                            label={
                              plan.isActive
                                ? t("admin.membership.list.deactivate") ||
                                  "Deactivate"
                                : t("admin.membership.list.activate") ||
                                  "Activate"
                            }
                          >
                            {plan.isActive ? (
                              <Eye className="h-4 w-4" strokeWidth={2.1} />
                            ) : (
                              <EyeOff className="h-4 w-4" strokeWidth={2.1} />
                            )}
                          </IconButton>

                          <IconButton
                            onClick={() => onEdit(plan)}
                            label={t("admin.membership.list.edit") || "Edit"}
                          >
                            <Pencil className="h-4 w-4" strokeWidth={2.1} />
                          </IconButton>

                          <IconButton
                            onClick={() => onDelete(plan)}
                            disabled={plan.isDefault}
                            danger
                            label={t("admin.membership.list.delete") || "Delete"}
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={2.1} />
                          </IconButton>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="border-t border-day-border/70 bg-day-panel/40 px-5 py-5 dark:border-night-border/70 dark:bg-night-panel/30">
                          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                            <div>
                              <SectionLabel
                                icon={BarChart3}
                                label={
                                  t("admin.membership.list.statistics") ||
                                  "Statistics"
                                }
                              />
                              <div className="mt-3 grid grid-cols-2 gap-3">
                                <StatCard
                                  label={
                                    t("admin.membership.list.active_users") ||
                                    "Active Users"
                                  }
                                  value={stats?.activeUsers || 0}
                                />
                                <StatCard
                                  label={
                                    t("admin.membership.list.monthly_revenue") ||
                                    "Monthly Revenue"
                                  }
                                  value={formatCurrency(
                                    stats?.revenue?.totalRevenue || 0,
                                  )}
                                />
                                <StatCard
                                  label={
                                    t("admin.membership.list.churn_rate") ||
                                    "Churn Rate"
                                  }
                                  value={`${(stats?.churnRate || 0).toFixed(1)}%`}
                                />
                                <StatCard
                                  label={
                                    t("admin.membership.list.conversion_rate") ||
                                    "Conversion Rate"
                                  }
                                  value={`${(stats?.conversionRate || 0).toFixed(1)}%`}
                                />
                              </div>
                            </div>

                            <div>
                              <SectionLabel
                                icon={ShieldCheck}
                                label={
                                  t("admin.membership.list.key_features") ||
                                  "Key Features"
                                }
                              />
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <KeyRow
                                  label={
                                    t("admin.membership.list.max_investments") ||
                                    "Max Investments"
                                  }
                                  value={formatLimit(
                                    plan.features?.investments
                                      ?.maxActiveInvestments,
                                  )}
                                />
                                <KeyRow
                                  label={
                                    t("admin.membership.list.support_level") ||
                                    "Support Level"
                                  }
                                  value={
                                    SUPPORT_LABELS[
                                      plan.features?.support?.level || "email"
                                    ] || "Email"
                                  }
                                />
                                <KeyRow
                                  label={
                                    t(
                                      "admin.membership.list.commission_discount",
                                    ) || "Commission Discount"
                                  }
                                  value={`${plan.features?.commissions?.platformCommissionDiscount || 0}%`}
                                />
                                <KeyRow
                                  label={
                                    t("admin.membership.list.api_access") ||
                                    "API Access"
                                  }
                                  value={
                                    plan.features?.api?.hasAccess
                                      ? t("admin.membership.list.yes") || "Yes"
                                      : t("admin.membership.list.no") || "No"
                                  }
                                />
                                <KeyRow
                                  label={
                                    t("admin.membership.list.analytics") ||
                                    "Analytics"
                                  }
                                  value={
                                    plan.features?.analytics
                                      ?.hasAdvancedAnalytics
                                      ? t(
                                          "admin.membership.list.analytics_advanced",
                                        ) || "Advanced"
                                      : t(
                                          "admin.membership.list.analytics_basic",
                                        ) || "Basic"
                                  }
                                />
                              </div>

                              {plan.promotions?.currentPromotion ? (
                                <div className="mt-4 rounded-3xl border border-day-accent/25 bg-day-accent/10 p-4 dark:border-night-accent/25 dark:bg-night-accent/10">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-day-surface text-day-accent dark:bg-night-surface dark:text-night-accent">
                                        <Sparkles
                                          className="h-5 w-5"
                                          strokeWidth={2.1}
                                        />
                                      </div>
                                      <div>
                                        <p className="font-mono text-sm font-semibold text-day-accent dark:text-night-accent">
                                          {
                                            plan.promotions.currentPromotion
                                              .code
                                          }
                                        </p>
                                        <p className="text-sm text-day-muted dark:text-night-muted">
                                          {
                                            plan.promotions.currentPromotion
                                              .discountPercentage
                                          }
                                          % off
                                        </p>
                                      </div>
                                    </div>
                                    <p className="text-sm text-day-muted dark:text-night-muted">
                                      Valid until{" "}
                                      {new Date(
                                        plan.promotions.currentPromotion
                                          .validUntil,
                                      ).toLocaleDateString(i18n.language || "en")}
                                    </p>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </section>
        )}
      </Droppable>
    </DragDropContext>
  );
};

const PlanBadge = ({ children, tone = "neutral" }) => {
  const classes = {
    neutral:
      "border-day-border bg-day-panel text-day-muted dark:border-night-border dark:bg-night-panel dark:text-night-muted",
    primary:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200",
    secondary:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200",
    accent:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200",
    muted:
      "border-day-border bg-day-surface text-day-muted dark:border-night-border dark:bg-night-surface dark:text-night-muted",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${classes[tone]}`}
    >
      {children}
    </span>
  );
};

const PricePill = ({ label, value, hint = "" }) => (
  <div className="rounded-2xl border border-day-border/70 bg-day-panel/70 px-4 py-3 dark:border-night-border/70 dark:bg-night-panel/70">
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-day-muted dark:text-night-muted">
      {label}
    </p>
    <p className="mt-1 text-sm font-semibold text-day-text dark:text-night-text">
      {value} {hint ? <span className="text-day-accent dark:text-night-accent">{hint}</span> : null}
    </p>
  </div>
);

const IconButton = ({ children, onClick, label, disabled = false, danger = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    className={`grid h-11 w-11 place-items-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-40 ${
      danger
        ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200 dark:hover:bg-red-400/15"
        : "border-day-border bg-day-panel text-day-muted hover:bg-day-panelStrong hover:text-day-text dark:border-night-border dark:bg-night-panel dark:text-night-muted dark:hover:bg-night-panelStrong dark:hover:text-night-text"
    }`}
  >
    {children}
  </button>
);

const SectionLabel = ({ icon, label }) => (
  <div className="flex items-center gap-2 text-sm font-semibold text-day-text dark:text-night-text">
    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-day-surface text-day-primary dark:bg-night-surface dark:text-night-primary">
      {React.createElement(icon, {
        className: "h-4 w-4",
        strokeWidth: 2.1,
      })}
    </span>
    {label}
  </div>
);

const StatCard = ({ label, value }) => (
  <div className="rounded-3xl border border-day-border/70 bg-day-surface px-4 py-4 dark:border-night-border/70 dark:bg-night-surface">
    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-day-muted dark:text-night-muted">
      {label}
    </p>
    <p className="mt-2 text-xl font-semibold text-day-text dark:text-night-text">
      {value}
    </p>
  </div>
);

const KeyRow = ({ label, value }) => (
  <div className="rounded-2xl border border-day-border/70 bg-day-surface px-4 py-3 dark:border-night-border/70 dark:bg-night-surface">
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-day-muted dark:text-night-muted">
      {label}
    </p>
    <p className="mt-2 text-sm font-semibold text-day-text dark:text-night-text">
      {value}
    </p>
  </div>
);

MembershipPlanList.propTypes = {
  plans: PropTypes.array.isRequired,
  statistics: PropTypes.object,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onToggleStatus: PropTypes.func.isRequired,
  onReorder: PropTypes.func.isRequired,
};

PlanBadge.propTypes = {
  children: PropTypes.node.isRequired,
  tone: PropTypes.string,
};

PricePill.propTypes = {
  label: PropTypes.node.isRequired,
  value: PropTypes.node.isRequired,
  hint: PropTypes.node,
};

IconButton.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired,
  label: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
  danger: PropTypes.bool,
};

SectionLabel.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.node.isRequired,
};

StatCard.propTypes = {
  label: PropTypes.node.isRequired,
  value: PropTypes.node.isRequired,
};

KeyRow.propTypes = {
  label: PropTypes.node.isRequired,
  value: PropTypes.node.isRequired,
};

export default MembershipPlanList;
