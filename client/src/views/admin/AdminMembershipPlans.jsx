// src/views/admin/AdminMembershipPlans.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { showAlert } from "../../store/slices/uiSlice";
import bridge from "../../controllers/bridge";
import MembershipPlanList from "../../components/MembershipPlans/MembershipPlanList";
import MembershipPlanForm from "../../components/MembershipPlans/MembershipPlanForm";
import DeleteConfirmModal from "../../components/common/DeleteConfirmModal";

const AdminMembershipPlans = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  // State
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formModal, setFormModal] = useState({
    open: false,
    mode: "create", // create | edit
    planData: null,
  });
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    planId: null,
    planName: "",
  });
  const [includeInactive, setIncludeInactive] = useState(false);
  const [statistics, setStatistics] = useState({});

  // Fetch plans
  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await bridge.membershipPlans.getAllPlans(
        includeInactive
      );
      setPlans(response.data || []);

      // Fetch statistics for each plan
      const statsPromises = response.data.map((plan) =>
        bridge.membershipPlans
          .getPlanStatistics(plan._id)
          .then((res) => ({ [plan._id]: res.data }))
          .catch(() => ({ [plan._id]: null }))
      );
      const statsResults = await Promise.all(statsPromises);
      const statsObj = statsResults.reduce(
        (acc, curr) => ({ ...acc, ...curr }),
        {}
      );
      setStatistics(statsObj);
    } catch (error) {
      console.error("Error fetching plans:", error);
      dispatch(
        showAlert({
          type: "error",
          message:
            t("admin.membership.fetch_error") ||
            "Failed to fetch membership plans",
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [includeInactive]);

  // Handle create/edit
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
          })
        );
      } else {
        await bridge.membershipPlans.updatePlan(
          formModal.planData._id,
          planData
        );
        dispatch(
          showAlert({
            type: "success",
            message:
              t("admin.membership.update_success") ||
              "Plan updated successfully",
          })
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
        })
      );
    }
  };

  // Handle delete
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
        })
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
        })
      );
    }
  };

  // Handle toggle status
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
        })
      );
      fetchPlans();
    } catch (error) {
      console.error("Error toggling status:", error);
      dispatch(
        showAlert({
          type: "error",
          message:
            t("admin.membership.status_error") || "Failed to update status",
        })
      );
    }
  };

  // Handle reorder
  const handleReorder = async (reorderedPlans) => {
    try {
      const orders = reorderedPlans.map((plan, index) => ({
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
        })
      );
      setPlans(reorderedPlans);
    } catch (error) {
      console.error("Error reordering plans:", error);
      dispatch(
        showAlert({
          type: "error",
          message:
            t("admin.membership.reorder_error") || "Failed to reorder plans",
        })
      );
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-day-text dark:text-night-text">
          {t("admin.membership.title") || "Membership Plans"}
        </h1>
        <p className="text-sm text-day-text/70 dark:text-night-text/70 mt-1">
          {t("admin.membership.subtitle") ||
            "Manage subscription plans and pricing"}
        </p>
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-day-surface dark:bg-night-surface p-4 rounded-lg shadow">
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenForm("create")}
            className="px-4 py-2 bg-day-primary dark:bg-night-primary text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <PlusIcon />
            {t("admin.membership.add_plan") || "Add New Plan"}
          </button>

          <button
            onClick={fetchPlans}
            className="p-2 text-day-text/70 dark:text-night-text/70 hover:text-day-text dark:hover:text-night-text transition-colors"
            title={t("common.refresh")}
          >
            <RefreshIcon />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="w-4 h-4 text-day-primary dark:text-night-primary rounded focus:ring-2 focus:ring-day-primary dark:focus:ring-night-primary"
            />
            <span className="text-sm text-day-text dark:text-night-text">
              {t("admin.membership.show_inactive") || "Show Inactive Plans"}
            </span>
          </label>
        </div>
      </div>

      {/* Plans List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-day-primary dark:border-night-primary"></div>
        </div>
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

      {/* Form Modal */}
      {formModal.open && (
        <MembershipPlanForm
          mode={formModal.mode}
          planData={formModal.planData}
          onSave={handleSavePlan}
          onClose={handleCloseForm}
        />
      )}

      {/* Delete Confirmation Modal */}
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

// Icons
const PlusIcon = () => (
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
      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
    />
  </svg>
);

const RefreshIcon = () => (
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
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

export default AdminMembershipPlans;
