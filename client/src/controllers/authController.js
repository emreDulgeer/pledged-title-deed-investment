// src/controllers/authController.js
import apiClient, { tokenManager } from "../api/client";

const authController = {
  // Existing methods
  login: async (credentials) => {
    const response = await apiClient.post("/auth/login", credentials);
    if (
      response.data?.user &&
      response.data?.accessToken &&
      response.data?.refreshToken
    ) {
      // Store tokens
      tokenManager.setAccessToken(response.data.accessToken);
      tokenManager.setRefreshToken(response.data.refreshToken);

      // Return normalized response
      return {
        ...response,
        data: {
          user: response.data.user,
          tokens: {
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
            expiresIn: response.data.expiresIn,
          },
        },
      };
    }
    return response;
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      tokenManager.clearTokens();
    }
  },

  register: async (userData) => {
    return await apiClient.post("/auth/register", userData);
  },

  forgotPassword: async (email) => {
    return await apiClient.post("/auth/forgot-password", { email });
  },

  resetPassword: async (token, password) => {
    return await apiClient.post("/auth/reset-password", { token, password });
  },

  refreshToken: async () => {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await apiClient.post("/auth/refresh-token", {
      refreshToken,
    });
    if (response.data?.accessToken) {
      tokenManager.setAccessToken(response.data.accessToken);
    }
    return response;
  },

  verifyToken: async () => {
    console.log("Verifying token...");
    return await apiClient.get("/auth/verify-token");
  },

  // Admin methods for KYC management
  getPendingKycUsers: async (params = {}) => {
    return await apiClient.get("/auth/admin/pending-kyc", { params });
  },

  getPendingKycUserById: async (userId) => {
    return await apiClient.get(`/auth/admin/pending-kyc/${userId}`);
  },

  approveKyc: async (userId) => {
    return await apiClient.post(`/auth/admin/users/${userId}/approve-kyc`);
  },

  rejectKyc: async (userId, data) => {
    return await apiClient.post(`/auth/admin/users/${userId}/reject-kyc`, data);
  },

  // Admin methods for user management
  getAllUsers: async (params = {}) => {
    return await apiClient.get("/auth/admin/users", { params });
  },

  getUserById: async (userId) => {
    return await apiClient.get(`/auth/admin/users/${userId}`);
  },

  updateUserStatus: async (userId, status) => {
    return await apiClient.patch(`/auth/admin/users/${userId}/status`, {
      status,
    });
  },

  updateUserRole: async (userId, role) => {
    return await apiClient.patch(`/auth/admin/users/${userId}/role`, { role });
  },

  // Admin methods for representatives
  getPendingRepresentatives: async () => {
    return await apiClient.get("/auth/admin/pending-representatives");
  },

  activateRepresentative: async (userId) => {
    return await apiClient.post(
      `/auth/admin/activate-representative/${userId}`
    );
  },

  // Admin methods for account deletion
  getAccountDeletionRequests: async (params = {}) => {
    return await apiClient.get("/auth/admin/account-deletion-requests", {
      params,
    });
  },

  getAccountDeletionRequestById: async (requestId) => {
    return await apiClient.get(
      `/auth/admin/account-deletion-requests/${requestId}`
    );
  },

  approveAccountDeletion: async (requestId) => {
    return await apiClient.post(`/auth/account/approve-deletion/${requestId}`);
  },

  rejectAccountDeletion: async (requestId, reason) => {
    return await apiClient.post(`/auth/account/reject-deletion/${requestId}`, {
      reason,
    });
  },

  // Admin methods for activity logs
  getActivityLogs: async (params = {}) => {
    return await apiClient.get("/auth/admin/activity-logs", { params });
  },

  getSecurityAlerts: async (params = {}) => {
    return await apiClient.get("/auth/admin/security-alerts", { params });
  },

  // User profile methods
  getCurrentUser: async () => {
    return await apiClient.get("/auth/me");
  },

  updateProfile: async (data) => {
    return await apiClient.patch("/auth/profile", data);
  },

  changePassword: async (data) => {
    return await apiClient.post("/auth/change-password", data);
  },

  // Email verification
  verifyEmail: async (token) => {
    return await apiClient.get(`/auth/verify-email/${token}`);
  },

  resendVerificationEmail: async (email) => {
    return await apiClient.post("/auth/resend-verification-email", { email });
  },

  // 2FA methods
  setup2FA: async (method) => {
    return await apiClient.post("/auth/2fa/setup", { method });
  },

  enable2FA: async (code) => {
    return await apiClient.post("/auth/2fa/enable", { code });
  },

  disable2FA: async (password, code) => {
    return await apiClient.post("/auth/2fa/disable", { password, code });
  },

  verify2FA: async (email, code) => {
    return await apiClient.post("/auth/2fa/verify", { email, code });
  },

  generateBackupCodes: async (password) => {
    return await apiClient.post("/auth/2fa/backup-codes", { password });
  },

  // Membership methods
  activateMembership: async (plan, paymentId, paymentMethod) => {
    return await apiClient.post("/auth/membership/activate", {
      plan,
      paymentId,
      paymentMethod,
    });
  },

  changeMembership: async (newPlan, paymentId) => {
    return await apiClient.post("/auth/membership/change", {
      newPlan,
      paymentId,
    });
  },

  cancelMembership: async (reason) => {
    return await apiClient.post("/auth/membership/cancel", { reason });
  },

  getMembershipStatus: async () => {
    return await apiClient.get("/auth/membership/status");
  },

  // Account deletion
  requestAccountDeletion: async (reason, password) => {
    return await apiClient.post("/auth/account/delete-request", {
      reason,
      password,
    });
  },

  cancelAccountDeletion: async () => {
    return await apiClient.post("/auth/account/cancel-deletion");
  },

  // Security methods
  getLoginHistory: async (limit = 20) => {
    return await apiClient.get("/auth/security/login-history", {
      params: { limit },
    });
  },

  getActiveSessions: async () => {
    return await apiClient.get("/auth/security/sessions");
  },

  revokeAllSessions: async (password) => {
    return await apiClient.post("/auth/security/revoke-all-sessions", {
      password,
    });
  },

  getTrustedIPs: async () => {
    return await apiClient.get("/auth/security/trusted-ip");
  },

  addTrustedIP: async (ip, name) => {
    return await apiClient.post("/auth/security/trusted-ip", { ip, name });
  },

  removeTrustedIP: async (ip) => {
    return await apiClient.delete(`/auth/security/trusted-ip/${ip}`);
  },
};

export default authController;
