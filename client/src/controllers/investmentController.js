// src/controllers/investmentController.js
import apiClient from "../api/client";

const investmentController = {
  // Admin endpoints
  getAll: async (params = {}) => {
    return await apiClient.get("/investments", { params });
  },

  getById: async (id) => {
    return await apiClient.get(`/investments/${id}`);
  },

  updateStatus: async (id, status) => {
    return await apiClient.patch(`/investments/${id}/status`, { status });
  },

  // Document management
  uploadDocument: async (id, type, formData) => {
    return await apiClient.post(
      `/investments/${id}/documents/${type}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
  },

  deleteDocument: async (id, type) => {
    return await apiClient.delete(`/investments/${id}/documents/${type}`);
  },

  // Payment management
  updatePayment: async (investmentId, paymentId, data) => {
    return await apiClient.patch(
      `/investments/${investmentId}/payments/${paymentId}`,
      data
    );
  },

  uploadPaymentReceipt: async (investmentId, paymentId, formData) => {
    return await apiClient.post(
      `/investments/${investmentId}/payments/${paymentId}/receipt`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
  },

  // Refund operations
  initiateRefund: async (id, reason) => {
    return await apiClient.post(`/investments/${id}/refund`, { reason });
  },

  uploadRefundReceipt: async (id, formData) => {
    return await apiClient.post(`/investments/${id}/refund/receipt`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Transfer operations
  initiateTransfer: async (id, data) => {
    return await apiClient.post(`/investments/${id}/transfer`, data);
  },

  uploadTransferDocument: async (id, formData) => {
    return await apiClient.post(
      `/investments/${id}/transfer/document`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
  },

  // Investor specific endpoints
  getMyInvestments: async (params = {}) => {
    return await apiClient.get("/investments/my", { params });
  },

  createInvestment: async (propertyId, data) => {
    return await apiClient.post(`/properties/${propertyId}/invest`, data);
  },

  getInvestmentDetails: async (id) => {
    return await apiClient.get(`/investments/my/${id}`);
  },

  // Statistics
  getStatistics: async (params = {}) => {
    return await apiClient.get("/investments/statistics", { params });
  },

  getPaymentStatistics: async (id) => {
    return await apiClient.get(`/investments/${id}/payment-statistics`);
  },

  // Export
  exportInvestments: async (params = {}) => {
    return await apiClient.get("/investments/export", {
      params,
      responseType: "blob",
    });
  },

  exportInvestmentReport: async (id) => {
    return await apiClient.get(`/investments/${id}/report`, {
      responseType: "blob",
    });
  },
};

export default investmentController;
