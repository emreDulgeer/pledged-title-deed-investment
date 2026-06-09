// src/views/admin/AdminMembershipPlans.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import {
  BarChart3,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  UsersRound,
} from "lucide-react";

import bridge from "../../controllers/bridge";
import MembershipPlanForm from "../../components/MembershipPlans/MembershipPlanForm";
import MembershipPlanList from "../../components/MembershipPlans/MembershipPlanList";
import DeleteConfirmModal from "../../components/common/DeleteConfirmModal";
import { showAlert } from "../../store/slices/uiSlice";

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

const getPlanRevenue = (statistics) =>
  Number(statistics?.statistics?.revenue?.totalRevenue || 0);

const getPlanUsers = (statistics) =>
  Number(statistics?.statistics?.activeUsers || 0);

const AdminMembershipPlans = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [statistics, setStatistics] = useState({});
  const [formModal, setFormModal] = useState({
    open: false,
    mode: "create",
    planData: null,
  });
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    planId: null,
    planName: "",
  });

  const fetchPlans = useCallback(async () => {
    setLoading(true);

    try {
      const response =
        await bridge.membershipPlans.getAllPlans(includeInactive);
      const nextPlans = response.data || [];
      setPlans(nextPlans);

      const statsResults = await Promise.all(
        nextPlans.map((plan) =>
          bridge.membershipPlans
            .getPlanStatistics(plan._id)
            .then((res) => ({ [plan._id]: res.data }))
            .catch(() => ({ [plan._id]: null })),
        ),
      );
      setStatistics(
        statsResults.reduce((acc, curr) => ({ ...acc, ...curr }), {}),
      );
    } catch (error) {
      console.error("Error fetching plans:", error);
      dispatch(
        showAlert({
          type: "error",
          message:
            t("admin.membership.fetch_error") ||
            "Failed to fetch membership plans",
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [dispatch, includeInactive, t]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const summary = useMemo(() => {
    const activePlans = plans.filter((plan) => plan.isActive).length;
    const highlightedPlans = plans.filter(
      (plan) => plan.isHighlighted || plan.isFeatured,
    ).length;
    const activeUsers = Object.values(statistics).reduce(
      (sum, item) => sum + getPlanUsers(item),
      0,
    );
    const revenue = Object.values(statistics).reduce(
      (sum, item) => sum + getPlanRevenue(item),
      0,
    );

    return {
      activePlans,
      highlightedPlans,
      activeUsers,
      revenue,
    };
  }, [plans, statistics]);

  const handleOpenForm = (mode = "create", plan = null) => {
    setFormModal({
      open: true,
      mode,
      planData: plan,
    });
  };

  const handleCloseForm = () => {
    setFormModal({
      open: false,
      mode: "create",
      planData: null,
    });
  };

  const handleSavePlan = async (planData) => {
    try {
      if (formModal.mode === "create") {
        await bridge.membershipPlans.createPlan(planData);
        dispatch(
          showAlert({
            type: "success",
            message:
              t("admin.membership.create_success") ||
              "Plan created successfully",
          }),
        );
      } else {
        await bridge.membershipPlans.updatePlan(
          formModal.planData._id,
          planData,
        );
        dispatch(
          showAlert({
            type: "success",
            message:
              t("admin.membership.update_success") ||
              "Plan updated successfully",
          }),
        );
      }

      handleCloseForm();
      fetchPlans();
    } catch (error) {
      console.error("Error saving plan:", error);
      dispatch(
        showAlert({
          type: "error",
          message:
            error.response?.data?.message ||
            t("admin.membership.save_error") ||
            "Failed to save plan",
        }),
      );
    }
  };

  const handleOpenDeleteModal = (plan) => {
    setDeleteModal({
      open: true,
      planId: plan._id,
      planName: plan.displayName,
    });
  };

  const handleCloseDeleteModal = () => {
    setDeleteModal({
      open: false,
      planId: null,
      planName: "",
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await bridge.membershipPlans.deletePlan(deleteModal.planId);
      dispatch(
        showAlert({
          type: "success",
          message:
            t("admin.membership.delete_success") || "Plan deleted successfully",
        }),
      );
      handleCloseDeleteModal();
      fetchPlans();
    } catch (error) {
      console.error("Error deleting plan:", error);
      dispatch(
        showAlert({
          type: "error",
          message:
            error.response?.data?.message ||
            t("admin.membership.delete_error") ||
            "Failed to delete plan",
        }),
      );
    }
  };

  const handleToggleStatus = async (plan) => {
    try {
      await bridge.membershipPlans.updatePlan(plan._id, {
        isActive: !plan.isActive,
      });
      dispatch(
        showAlert({
          type: "success",
          message:
            t("admin.membership.status_updated") || "Plan status updated",
        }),
      );
      fetchPlans();
    } catch (error) {
      console.error("Error toggling status:", error);
      dispatch(
        showAlert({
          type: "error",
          message:
            t("admin.membership.status_error") || "Failed to update status",
        }),
      );
    }
  };

  const handleReorder = async (reorderedPlans) => {
    try {
      const plansWithUpdatedTier = reorderedPlans.map((plan, index) => ({
        ...plan,
        order: index,
        tier: index + 1,
      }));

      const orders = plansWithUpdatedTier.map((plan, index) => ({
        planId: plan._id,
        order: index,
      }));

      await bridge.membershipPlans.updatePlanOrder(orders);
      dispatch(
        showAlert({
          type: "success",
          message:
            t("admin.membership.reorder_success") ||
            "Plans reordered successfully",
        }),
      );
      setPlans(plansWithUpdatedTier);
    } catch (error) {
      console.error("Error reordering plans:", error);
      dispatch(
        showAlert({
          type: "error",
          message:
            t("admin.membership.reorder_error") || "Failed to reorder plans",
        }),
      );
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 xl:p-8">
      <section className="shell-surface overflow-hidden">
        <div className="relative px-6 py-7 sm:px-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-r from-day-primary/10 via-day-panel to-day-accent/10 dark:from-night-primary/10 dark:via-night-panel/40 dark:to-night-accent/10" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-day-border/70 bg-day-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:border-night-border/70 dark:bg-night-surface dark:text-night-muted">
                  Plan operations
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {summary.highlightedPlans} promoted
                </span>
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-day-text dark:text-night-text sm:text-5xl">
                {t("admin.membership.title") || "Membership Plans"}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-day-muted dark:text-night-muted">
                {t("admin.membership.subtitle") ||
                  "Manage subscription tiers, pricing, feature limits, and visibility from one operating surface."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleOpenForm("create")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-day-primary px-5 py-3 text-sm font-semibold text-white shadow-accent transition hover:-translate-y-0.5 hover:opacity-95 dark:bg-night-primary dark:text-night-background"
              >
                <Plus className="h-4 w-4" strokeWidth={2.2} />
                {t("admin.membership.add_plan") || "Add New Plan"}
              </button>

              <button
                type="button"
                onClick={fetchPlans}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-day-border bg-day-surface px-5 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel disabled:cursor-not-allowed disabled:opacity-60 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  strokeWidth={2.2}
                />
                {t("common.refresh") || "Refresh"}
              </button>
            </div>
          </div>

          <div className="relative mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={CreditCard}
              label="Total plans"
              value={plans.length}
              helpText={`${summary.activePlans} active plans are available.`}
            />
            <SummaryCard
              icon={UsersRound}
              label="Active users"
              value={summary.activeUsers}
              helpText="Combined usage across loaded plan statistics."
            />
            <SummaryCard
              icon={BarChart3}
              label="Monthly revenue"
              value={formatCurrency(summary.revenue)}
              helpText="Reported by membership plan statistics."
            />
            <div className="rounded-3xl border border-day-border/70 bg-day-surface/80 px-4 py-4 dark:border-night-border/70 dark:bg-night-surface/80">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
                Visibility
              </p>
              <button
                type="button"
                onClick={() => setIncludeInactive((value) => !value)}
                className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-day-border bg-day-panel px-3 py-3 text-left transition hover:bg-day-panelStrong dark:border-night-border dark:bg-night-panel dark:hover:bg-night-panelStrong"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-day-text dark:text-night-text">
                  {includeInactive ? (
                    <Eye className="h-4 w-4" strokeWidth={2.1} />
                  ) : (
                    <EyeOff className="h-4 w-4" strokeWidth={2.1} />
                  )}
                  {t("admin.membership.show_inactive") ||
                    "Show Inactive Plans"}
                </span>
                <span
                  className={`h-6 w-11 rounded-full p-1 transition ${
                    includeInactive
                      ? "bg-day-primary dark:bg-night-primary"
                      : "bg-day-border dark:bg-night-border"
                  }`}
                >
                  <span
                    className={`block h-4 w-4 rounded-full bg-white transition ${
                      includeInactive ? "translate-x-5" : ""
                    }`}
                  />
                </span>
              </button>
              <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                {includeInactive
                  ? "Inactive plans are included in the list."
                  : "Only active catalog plans are shown."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="shell-surface px-6 py-8">
          <div className="flex items-center gap-3 text-sm font-semibold text-day-muted dark:text-night-muted">
            <Loader2 className="h-5 w-5 animate-spin text-day-primary dark:text-night-primary" />
            Loading membership plans...
          </div>
          <div className="mt-6 grid gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-3xl bg-day-panel dark:bg-night-panel"
              />
            ))}
          </div>
        </section>
      ) : (
        <MembershipPlanList
          plans={plans}
          statistics={statistics}
          onEdit={(plan) => handleOpenForm("edit", plan)}
          onDelete={handleOpenDeleteModal}
          onToggleStatus={handleToggleStatus}
          onReorder={handleReorder}
        />
      )}

      {formModal.open && (
        <MembershipPlanForm
          mode={formModal.mode}
          planData={formModal.planData}
          onSave={handleSavePlan}
          onClose={handleCloseForm}
        />
      )}

      {deleteModal.open && (
        <DeleteConfirmModal
          title={t("admin.membership.delete_title") || "Delete Membership Plan"}
          message={
            t("admin.membership.delete_message", {
              name: deleteModal.planName,
            }) ||
            `Are you sure you want to delete the "${deleteModal.planName}" plan? This action cannot be undone.`
          }
          onConfirm={handleConfirmDelete}
          onClose={handleCloseDeleteModal}
        />
      )}
    </div>
  );
};

const SummaryCard = ({ icon, label, value, helpText }) => (
  <div className="rounded-3xl border border-day-border/70 bg-day-surface/80 px-4 py-4 dark:border-night-border/70 dark:bg-night-surface/80">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
          {label}
        </p>
        <p className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
          {value}
        </p>
        <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
          {helpText}
        </p>
      </div>
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
        {React.createElement(icon, {
          className: "h-5 w-5",
          strokeWidth: 2.1,
        })}
      </div>
    </div>
  </div>
);

export default AdminMembershipPlans;
