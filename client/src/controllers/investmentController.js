// src/controllers/investmentController.js
import apiClient from "../api/client";

const investmentController = {
  // Admin - Tüm yatırımları listele
  getAllInvestments: async (params = {}) => {
    return await apiClient.get("/investments", { params });
  },

  // Investment detayı
  getInvestmentById: async (id) => {
    return await apiClient.get(`/investments/${id}`);
  },

  // Property'ye ait yatırımları getir
  getPropertyInvestments: async (propertyId, params = {}) => {
    return await apiClient.get(`/investments/property/${propertyId}`, {
      params,
    });
  },

  // Investment dökümanlarını listele
  getInvestmentDocuments: async (id) => {
    return await apiClient.get(`/investments/${id}/documents`);
  },

  // Investment istatistikleri
  getInvestmentStatistics: async (id) => {
    return await apiClient.get(`/investments/${id}/statistics`);
  },

  // Yaklaşan ödemeler
  getUpcomingPayments: async (params = {}) => {
    return await apiClient.get("/investments/reports/upcoming-payments", {
      params,
    });
  },

  // Geciken ödemeler
  getDelayedPayments: async (params = {}) => {
    return await apiClient.get("/investments/reports/delayed-payments", {
      params,
    });
  },

  // Title deed onayla (Admin)
  approveTitleDeed: async (id) => {
    return await apiClient.post(`/investments/${id}/approve-title-deed`);
  },

  // Local representative ata (Admin)
  assignLocalRepresentative: async (id, representativeId) => {
    return await apiClient.post(`/investments/${id}/assign-representative`, {
      representativeId,
    });
  },

  // İade işlemi (Admin)
  processRefund: async (id, refundData) => {
    return await apiClient.post(`/investments/${id}/refund`, refundData);
  },

  // Mülk transferi (Admin)
  transferProperty: async (id, transferData) => {
    return await apiClient.post(`/investments/${id}/transfer`, transferData);
  },

  // Investment dökümanı indir
  downloadDocument: async (investmentId, fileId) => {
    return await apiClient.get(
      `/investments/${investmentId}/documents/${fileId}/download`,
      { responseType: "blob" }
    );
  },
};

export default investmentController;
