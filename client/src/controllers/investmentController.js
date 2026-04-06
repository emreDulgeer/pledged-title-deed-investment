// src/controllers/InvestmentController.jsx
import apiClient from "../api/client";

const InvestmentController = {
  // ===== ADMIN ENDPOINTS =====

  // Tüm yatırımları listele (Admin)
  getAllInvestments: async (params = {}) => {
    return await apiClient.get("/investments", { params });
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

  // ===== INVESTOR ENDPOINTS =====

  // Investor'ın yatırımlarını listele
  getMyInvestments: async (params = {}) => {
    return await apiClient.get("/investments/my", { params });
  },

  // Yeni yatırım teklifi oluştur
  createInvestmentOffer: async (propertyId, offerData) => {
    return await apiClient.post(
      `/investments/property/${propertyId}/offer`,
      offerData,
    );
  },

  // Investor'ın kira gelirlerini listele
  getInvestorRentalPayments: async (params = {}) => {
    return await apiClient.get("/investments/rental-payments/investor", {
      params,
    });
  },

  // Local representative talep et
  requestLocalRepresentative: async (id) => {
    return await apiClient.post(`/investments/${id}/request-representative`);
  },

  // ===== PROPERTY OWNER ENDPOINTS =====

  // Teklifi kabul et
  acceptOffer: async (id) => {
    return await apiClient.post(`/investments/${id}/accept`);
  },

  // Teklifi reddet
  rejectOffer: async (id, reason) => {
    return await apiClient.post(`/investments/${id}/reject`, { reason });
  },

  // Kira ödemesi kaydet
  makeRentalPayment: async (id, paymentData) => {
    return await apiClient.post(`/investments/${id}/payment`, paymentData);
  },

  // Property'ye ait yatırımları getir
  getPropertyInvestments: async (propertyId, params = {}) => {
    return await apiClient.get(`/investments/property/${propertyId}`, {
      params,
    });
  },

  // Property Owner'ın kira ödemelerini listele
  getPropertyOwnerRentalPayments: async (params = {}) => {
    return await apiClient.get("/investments/rental-payments/owner", {
      params,
    });
  },

  // ===== SHARED ENDPOINTS =====

  // Investment detayı
  getInvestmentById: async (id) => {
    return await apiClient.get(`/investments/${id}`);
  },

  // Investment dökümanlarını listele
  getInvestmentDocuments: async (id) => {
    return await apiClient.get(`/investments/${id}/documents`);
  },

  // Investment istatistikleri
  getInvestmentStatistics: async (id) => {
    return await apiClient.get(`/investments/${id}/statistics`);
  },

  // ===== FILE OPERATIONS =====

  // Kontrat yükle
  uploadContract: async (id, formData) => {
    return await apiClient.post(`/investments/${id}/contract`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Payment receipt yükle
  uploadPaymentReceipt: async (id, formData) => {
    return await apiClient.post(
      `/investments/${id}/payment-receipt`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
  },

  // Title deed yükle
  uploadTitleDeed: async (id, formData) => {
    return await apiClient.post(`/investments/${id}/title-deed`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Rental receipt yükle
  uploadRentalReceipt: async (id, formData) => {
    return await apiClient.post(`/investments/${id}/rental-receipt`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Ek döküman yükle
  uploadAdditionalDocument: async (id, formData) => {
    return await apiClient.post(`/investments/${id}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Investment dökümanı indir
  downloadDocument: async (investmentId, fileId) => {
    return await apiClient.get(
      `/investments/${investmentId}/documents/${fileId}/download`,
      { responseType: "blob" },
    );
  },

  // Investment dökümanı sil (Admin)
  deleteDocument: async (investmentId, fileId) => {
    return await apiClient.delete(
      `/investments/${investmentId}/documents/${fileId}`,
    );
  },

  // ===== REPORTS =====

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
};

export default InvestmentController;
