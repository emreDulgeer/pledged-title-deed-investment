// src/store/slices/uiSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  sidebarOpen: true,
  theme: "light",
  notifications: [],
  modals: {
    deleteConfirm: {
      open: false,
      title: "",
      message: "",
      onConfirm: null,
    },
    propertyForm: {
      open: false,
      mode: "create", // 'create' or 'edit'
      propertyId: null,
    },
    investmentStatusUpdate: {
      open: false,
      investmentId: null,
    },
  },
  alerts: [],
  loading: {
    global: false,
    components: {},
  },
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },

    // Notifications
    addNotification: (state, action) => {
      const notification = {
        id: Date.now(),
        ...action.payload,
        createdAt: new Date().toISOString(),
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },

    // Alerts
    showAlert: (state, action) => {
      const alert = {
        id: Date.now(),
        type: "info", // info, success, warning, error
        duration: 5000,
        ...action.payload,
      };
      state.alerts.push(alert);
    },
    removeAlert: (state, action) => {
      state.alerts = state.alerts.filter((a) => a.id !== action.payload);
    },

    // Modal controls
    openDeleteConfirm: (state, action) => {
      state.modals.deleteConfirm = {
        open: true,
        ...action.payload,
      };
    },
    closeDeleteConfirm: (state) => {
      state.modals.deleteConfirm = initialState.modals.deleteConfirm;
    },

    openPropertyForm: (state, action) => {
      state.modals.propertyForm = {
        open: true,
        mode: action.payload.mode || "create",
        propertyId: action.payload.propertyId || null,
      };
    },
    closePropertyForm: (state) => {
      state.modals.propertyForm = initialState.modals.propertyForm;
    },

    openInvestmentStatusModal: (state, action) => {
      state.modals.investmentStatusUpdate = {
        open: true,
        investmentId: action.payload,
      };
    },
    closeInvestmentStatusModal: (state) => {
      state.modals.investmentStatusUpdate =
        initialState.modals.investmentStatusUpdate;
    },

    // Loading states
    setGlobalLoading: (state, action) => {
      state.loading.global = action.payload;
    },
    setComponentLoading: (state, action) => {
      const { component, loading } = action.payload;
      state.loading.components[component] = loading;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  addNotification,
  removeNotification,
  clearNotifications,
  showAlert,
  removeAlert,
  openDeleteConfirm,
  closeDeleteConfirm,
  openPropertyForm,
  closePropertyForm,
  openInvestmentStatusModal,
  closeInvestmentStatusModal,
  setGlobalLoading,
  setComponentLoading,
} = uiSlice.actions;

export default uiSlice.reducer;

// Selectors
export const selectSidebarOpen = (state) => state.ui.sidebarOpen;
export const selectNotifications = (state) => state.ui.notifications;
export const selectAlerts = (state) => state.ui.alerts;
export const selectModals = (state) => state.ui.modals;
export const selectGlobalLoading = (state) => state.ui.loading.global;
export const selectComponentLoading = (component) => (state) =>
  state.ui.loading.components[component] || false;
