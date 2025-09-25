// src/components/MembershipPlans/MembershipPlanList.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const MembershipPlanList = ({
  plans,
  statistics,
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

  const tierBadgeClass = (tier) => {
    // Marka renklerine göre rozet rengi
    if (tier >= 3) return "bg-day-primary dark:bg-night-primary";
    if (tier === 2) return "bg-day-secondary dark:bg-night-secondary";
    return "bg-day-accent dark:bg-night-accent";
  };

  const pill = (text, extra = "") => (
    <span className={`px-2 py-1 text-xs rounded-full text-white ${extra}`}>
      {text}
    </span>
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="plans">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-4"
          >
            {plans.map((plan, index) => (
              <Draggable key={plan._id} draggableId={plan._id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`bg-day-surface dark:bg-night-surface rounded-lg shadow-lg transition-all ${
                      snapshot.isDragging ? "shadow-2xl scale-105" : ""
                    }`}
                  >
                    {/* Plan Header */}
                    <div className="p-4 border-b border-day-border dark:border-night-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-move text-day-text/50 dark:text-night-text/50 hover:text-day-text dark:hover:text-night-text"
                            title={
                              t("admin.membership.list.reorder") || "Reorder"
                            }
                          >
                            <DragIcon />
                          </div>

                          {/* Plan Info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-day-text dark:text-night-text">
                                {plan.displayName}
                              </h3>

                              {pill(
                                `${t("admin.membership.list.tier") || "Tier"} ${
                                  plan.tier
                                }`,
                                `${tierBadgeClass(plan.tier)}`
                              )}

                              {plan.isDefault &&
                                pill(
                                  t("admin.membership.list.default_badge") ||
                                    "Default",
                                  "bg-day-secondary dark:bg-night-secondary"
                                )}

                              {plan.isHighlighted &&
                                pill(
                                  t("admin.membership.list.popular_badge") ||
                                    "Popular",
                                  "bg-day-primary dark:bg-night-primary"
                                )}

                              {plan.isFeatured &&
                                pill(
                                  t("admin.membership.list.featured_badge") ||
                                    "Featured",
                                  "bg-day-accent dark:bg-night-accent"
                                )}

                              {!plan.isActive && (
                                <span className="px-2 py-1 text-xs rounded-full bg-day-border dark:bg-night-border text-day-text dark:text-night-text">
                                  {t("admin.membership.list.inactive_badge") ||
                                    "Inactive"}
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-day-text/70 dark:text-night-text/70 mt-1">
                              {plan.description}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setExpandedPlan(
                                expandedPlan === plan._id ? null : plan._id
                              )
                            }
                            className="p-2 text-day-text/70 dark:text-night-text/70 hover:text-day-text dark:hover:text-night-text transition-colors"
                            title={
                              expandedPlan === plan._id
                                ? t("admin.membership.list.collapse") ||
                                  "Collapse"
                                : t("admin.membership.list.expand") || "Expand"
                            }
                          >
                            {expandedPlan === plan._id ? (
                              <ChevronUpIcon />
                            ) : (
                              <ChevronDownIcon />
                            )}
                          </button>

                          <button
                            onClick={() => onToggleStatus(plan)}
                            className="p-2 text-day-text/70 dark:text-night-text/70 hover:text-day-text dark:hover:text-night-text transition-colors"
                            title={
                              plan.isActive
                                ? t("admin.membership.list.deactivate") ||
                                  "Deactivate"
                                : t("admin.membership.list.activate") ||
                                  "Activate"
                            }
                          >
                            {plan.isActive ? <EyeIcon /> : <EyeOffIcon />}
                          </button>

                          <button
                            onClick={() => onEdit(plan)}
                            className="p-2 text-day-secondary dark:text-night-secondary hover:opacity-80 transition-opacity"
                            title={t("admin.membership.list.edit") || "Edit"}
                          >
                            <EditIcon />
                          </button>

                          <button
                            onClick={() => onDelete(plan)}
                            className="p-2 text-day-accent dark:text-night-accent hover:opacity-80 transition-opacity"
                            title={
                              t("admin.membership.list.delete") || "Delete"
                            }
                            disabled={plan.isDefault}
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </div>

                      {/* Pricing Summary */}
                      <div className="mt-3 flex flex-wrap items-center gap-6 text-sm">
                        <div>
                          <span className="text-day-text/70 dark:text-night-text/70">
                            {t("admin.membership.list.monthly") || "Monthly"}:
                          </span>
                          <span className="ml-2 font-semibold text-day-text dark:text-night-text">
                            {formatCurrency(
                              plan.pricing?.monthly?.amount,
                              plan.pricing?.monthly?.currency || "EUR"
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-day-text/70 dark:text-night-text/70">
                            {t("admin.membership.list.yearly") || "Yearly"}:
                          </span>
                          <span className="ml-2 font-semibold text-day-text dark:text-night-text">
                            {formatCurrency(
                              plan.pricing?.yearly?.amount,
                              plan.pricing?.yearly?.currency || "EUR"
                            )}
                          </span>
                          {plan.pricing?.yearly?.discountPercentage > 0 && (
                            <span className="ml-1 text-xs text-day-accent dark:text-night-accent">
                              (-{plan.pricing.yearly.discountPercentage}%)
                            </span>
                          )}
                        </div>
                        {plan.pricing?.trial?.enabled && (
                          <div>
                            <span className="text-day-text/70 dark:text-night-text/70">
                              {t("admin.membership.list.trial") || "Trial"}:
                            </span>
                            <span className="ml-2 font-semibold text-day-text dark:text-night-text">
                              {plan.pricing.trial.days}{" "}
                              {t("admin.membership.list.days_suffix") || "days"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedPlan === plan._id && (
                      <div className="p-4 space-y-4">
                        {/* Statistics */}
                        {statistics[plan._id] && (
                          <div>
                            <h4 className="text-sm font-semibold text-day-text dark:text-night-text mb-2">
                              {t("admin.membership.list.statistics") ||
                                "Statistics"}
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <StatCard
                                label={
                                  t("admin.membership.list.active_users") ||
                                  "Active Users"
                                }
                                value={
                                  statistics[plan._id].statistics
                                    ?.activeUsers || 0
                                }
                              />
                              <StatCard
                                label={
                                  t("admin.membership.list.monthly_revenue") ||
                                  "Monthly Revenue"
                                }
                                value={formatCurrency(
                                  statistics[plan._id].statistics?.revenue
                                    ?.totalRevenue || 0
                                )}
                              />
                              <StatCard
                                label={
                                  t("admin.membership.list.churn_rate") ||
                                  "Churn Rate"
                                }
                                value={`${(
                                  statistics[plan._id].statistics?.churnRate ||
                                  0
                                ).toFixed(1)}%`}
                              />
                              <StatCard
                                label={
                                  t("admin.membership.list.conversion_rate") ||
                                  "Conversion Rate"
                                }
                                value={`${(
                                  statistics[plan._id].statistics
                                    ?.conversionRate || 0
                                ).toFixed(1)}%`}
                              />
                            </div>
                          </div>
                        )}

                        {/* Key Features */}
                        <div>
                          <h4 className="text-sm font-semibold text-day-text dark:text-night-text mb-2">
                            {t("admin.membership.list.key_features") ||
                              "Key Features"}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <KeyRow
                              k={
                                t("admin.membership.list.max_investments") ||
                                "Max Investments"
                              }
                              v={
                                plan.features?.investments
                                  ?.maxActiveInvestments === -1
                                  ? t("common.all") || "All"
                                  : plan.features?.investments
                                      ?.maxActiveInvestments || 0
                              }
                            />
                            <KeyRow
                              k={
                                t("admin.membership.list.support_level") ||
                                "Support Level"
                              }
                              v={(
                                plan.features?.support?.level || "email"
                              ).toString()}
                            />
                            <KeyRow
                              k={
                                t(
                                  "admin.membership.list.commission_discount"
                                ) || "Commission Discount"
                              }
                              v={`${
                                plan.features?.commissions
                                  ?.platformCommissionDiscount || 0
                              }%`}
                            />
                            <KeyRow
                              k={
                                t("admin.membership.list.api_access") ||
                                "API Access"
                              }
                              v={
                                plan.features?.api?.hasAccess
                                  ? t("admin.membership.list.yes") || "Yes"
                                  : t("admin.membership.list.no") || "No"
                              }
                            />
                            <KeyRow
                              k={
                                t("admin.membership.list.analytics") ||
                                "Analytics"
                              }
                              v={
                                plan.features?.analytics?.hasAdvancedAnalytics
                                  ? t(
                                      "admin.membership.list.analytics_advanced"
                                    ) || "Advanced"
                                  : t(
                                      "admin.membership.list.analytics_basic"
                                    ) || "Basic"
                              }
                            />
                          </div>
                        </div>

                        {/* Promotion */}
                        {plan.promotions?.currentPromotion && (
                          <div>
                            <h4 className="text-sm font-semibold text-day-text dark:text-night-text mb-2">
                              {t("admin.membership.list.promotion_title") ||
                                "Active Promotion"}
                            </h4>
                            <div className="p-3 rounded bg-day-accent/10 dark:bg-night-accent/10 border border-day-border dark:border-night-border">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-mono text-day-accent dark:text-night-accent">
                                    {plan.promotions.currentPromotion.code}
                                  </span>
                                  <span className="ml-3 text-sm text-day-text dark:text-night-text">
                                    {
                                      plan.promotions.currentPromotion
                                        .discountPercentage
                                    }
                                    % OFF
                                  </span>
                                </div>
                                <div className="text-sm text-day-text/70 dark:text-night-text/70">
                                  {t("admin.membership.list.valid_until") ||
                                    "Valid until"}{" "}
                                  {new Date(
                                    plan.promotions.currentPromotion.validUntil
                                  ).toLocaleDateString(i18n.language || "en")}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

const StatCard = ({ label, value }) => (
  <div className="bg-day-background dark:bg-night-background p-3 rounded border border-day-border dark:border-night-border">
    <div className="text-xs text-day-text/70 dark:text-night-text/70">
      {label}
    </div>
    <div className="text-lg font-semibold text-day-text dark:text-night-text">
      {value}
    </div>
  </div>
);

const KeyRow = ({ k, v }) => (
  <div>
    <span className="text-day-text/70 dark:text-night-text/70">{k}:</span>
    <span className="ml-2 text-day-text dark:text-night-text">{v}</span>
  </div>
);

// Icons
const DragIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);
const ChevronDownIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);
const ChevronUpIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 15l7-7 7 7"
    />
  </svg>
);
const EyeIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);
const EyeOffIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
    />
  </svg>
);
const EditIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);
const DeleteIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

MembershipPlanList.propTypes = {
  plans: PropTypes.array.isRequired,
  statistics: PropTypes.object,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onToggleStatus: PropTypes.func.isRequired,
  onReorder: PropTypes.func.isRequired,
};

export default MembershipPlanList;
