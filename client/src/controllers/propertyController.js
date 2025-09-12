// src/controllers/propertyController.js
import apiClient from "../api/client";

const propertyController = {
  // Public endpoints
  getAll: async (params = {}) => {
    return await apiClient.get("/properties", { params });
  },

  getById: async (id) => {
    return await apiClient.get(`/properties/${id}`);
  },

  getBySlug: async (slug) => {
    return await apiClient.get(`/properties/slug/${slug}`);
  },

  getFeatured: async (params = {}) => {
    return await apiClient.get("/properties/featured", { params });
  },

  getForMap: async (params = {}) => {
    return await apiClient.get("/properties/map", { params });
  },

  // Admin endpoints
  adminGetAll: async (params = {}) => {
    return await apiClient.get("/properties/admin/all", { params });
  },

  create: async (data) => {
    return await apiClient.post("/properties", data);
  },

  update: async (id, data) => {
    return await apiClient.put(`/properties/${id}`, data);
  },

  delete: async (id) => {
    return await apiClient.delete(`/properties/${id}`);
  },

  // Status management - Admin only
  updateStatus: async (id, status, reviewNotes = null) => {
    const data = { status };
    if (reviewNotes) {
      data.reviewNotes = reviewNotes;
    }
    return await apiClient.patch(`/properties/${id}/status`, data);
  },

  // Flag property for issues - Admin only
  flagProperty: async (id, issues, action = "add") => {
    return await apiClient.post(`/properties/${id}/flag`, { issues, action });
  },

  // Property owner endpoints
  getMyProperties: async (params = {}) => {
    return await apiClient.get("/properties/my/properties", { params });
  },

  getMyPropertyById: async (id) => {
    return await apiClient.get(`/properties/my/properties/${id}`);
  },

  getMyPropertiesStatistics: async () => {
    return await apiClient.get("/properties/my/statistics");
  },

  // Statistics
  getStatistics: async (id) => {
    return await apiClient.get(`/properties/${id}/statistics`);
  },

  incrementView: async (id) => {
    return await apiClient.post(`/properties/${id}/view`);
  },

  // Featured property operations
  featureProperty: async (id, weeks) => {
    return await apiClient.post(`/properties/${id}/feature`, {
      duration: weeks,
    });
  },

  setFeatured: async (id, weeks) => {
    return await apiClient.post(`/properties/${id}/featured`, { weeks });
  },

  removeFeatured: async (id) => {
    return await apiClient.delete(`/properties/${id}/featured`);
  },

  // Investor operations
  toggleFavorite: async (id) => {
    return await apiClient.post(`/properties/${id}/favorite`);
  },

  getFavoriteProperties: async (params = {}) => {
    return await apiClient.get("/properties/my/favorites", { params });
  },

  // Image operations
  uploadImage: async (id, formData) => {
    return await apiClient.post(`/properties/${id}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  setPrimaryImage: async (propertyId, imageId) => {
    return await apiClient.patch(
      `/properties/${propertyId}/images/${imageId}/primary`
    );
  },

  deleteImage: async (propertyId, imageId) => {
    return await apiClient.delete(
      `/properties/${propertyId}/images/${imageId}`
    );
  },

  reorderImages: async (propertyId, imageOrders) => {
    return await apiClient.patch(`/properties/${propertyId}/images/reorder`, {
      imageOrders,
    });
  },

  // Document operations
  uploadDocument: async (id, formData) => {
    return await apiClient.post(`/properties/${id}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  deleteDocument: async (propertyId, documentId) => {
    return await apiClient.delete(
      `/properties/${propertyId}/documents/${documentId}`
    );
  },

  verifyDocument: async (propertyId, documentId) => {
    return await apiClient.post(
      `/properties/${propertyId}/documents/${documentId}/verify`
    );
  },

  // Search and filters
  search: async (query) => {
    return await apiClient.get("/properties/search", { params: { q: query } });
  },

  getFilterOptions: async () => {
    return await apiClient.get("/properties/filter-options");
  },

  // Batch operations for admin
  batchUpdateStatus: async (propertyIds, status) => {
    return await apiClient.post("/properties/batch/status", {
      propertyIds,
      status,
    });
  },

  batchDelete: async (propertyIds) => {
    return await apiClient.post("/properties/batch/delete", {
      propertyIds,
    });
  },
};

export default propertyController;
