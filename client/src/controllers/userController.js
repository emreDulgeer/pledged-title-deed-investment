// src/controllers/userController.js
import apiClient from "../api/client";

const userController = {
  // Profile endpoints
  getProfile: async () => {
    console.log("Fetching user profile... userController");
    return await apiClient.get("/users/profile");
  },

  updateProfile: async (data) => {
    return await apiClient.put("/users/profile", data);
  },

  updatePassword: async (passwords) => {
    return await apiClient.put("/users/profile/password", passwords);
  },

  uploadAvatar: async (formData) => {
    return await apiClient.post("/users/profile/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  deleteAvatar: async () => {
    return await apiClient.delete("/users/profile/avatar");
  },

  // Admin only - User management
  getAllUsers: async (params = {}) => {
    return await apiClient.get("/users", { params });
  },

  getUserById: async (id) => {
    return await apiClient.get(`/users/${id}`);
  },

  createUser: async (userData) => {
    return await apiClient.post("/users", userData);
  },

  updateUser: async (id, data) => {
    return await apiClient.put(`/users/${id}`, data);
  },

  deleteUser: async (id) => {
    return await apiClient.delete(`/users/${id}`);
  },

  updateUserStatus: async (id, status) => {
    return await apiClient.patch(`/users/${id}/status`, { status });
  },

  // Role management
  updateUserRole: async (id, role) => {
    return await apiClient.patch(`/users/${id}/role`, { role });
  },

  // Investor specific
  getAllInvestors: async (params = {}) => {
    return await apiClient.get("/investors", { params });
  },

  getInvestorById: async (id) => {
    return await apiClient.get(`/investors/${id}`);
  },

  updateInvestorKYC: async (id, kycData) => {
    return await apiClient.patch(`/investors/${id}/kyc`, kycData);
  },

  getInvestorInvestments: async (id, params = {}) => {
    return await apiClient.get(`/investors/${id}/investments`, { params });
  },

  updateInvestorLimit: async (id, limit) => {
    return await apiClient.patch(`/investors/${id}/limit`, { limit });
  },

  // Property Owner specific
  getAllPropertyOwners: async (params = {}) => {
    return await apiClient.get("/property-owners", { params });
  },

  getPropertyOwnerById: async (id) => {
    return await apiClient.get(`/property-owners/${id}`);
  },

  updatePropertyOwnerVerification: async (id, status) => {
    return await apiClient.patch(`/property-owners/${id}/verification`, {
      status,
    });
  },

  getPropertyOwnerProperties: async (id, params = {}) => {
    return await apiClient.get(`/property-owners/${id}/properties`, { params });
  },

  // Local Representative specific
  getAllRepresentatives: async (params = {}) => {
    return await apiClient.get("/local-representatives", { params });
  },

  getRepresentativeById: async (id) => {
    return await apiClient.get(`/local-representatives/${id}`);
  },

  assignRepresentativeArea: async (id, areas) => {
    return await apiClient.patch(`/local-representatives/${id}/areas`, {
      areas,
    });
  },

  // Statistics
  getUserStatistics: async (params = {}) => {
    return await apiClient.get("/users/statistics", { params });
  },

  // Export
  exportUsers: async (params = {}) => {
    return await apiClient.get("/users/export", {
      params,
      responseType: "blob",
    });
  },
};

export default userController;
