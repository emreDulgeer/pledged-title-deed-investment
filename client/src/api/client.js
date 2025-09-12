// src/api/client.js
import axios from "axios";

// Base configuration
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const TIMEOUT = 30000; // 30 seconds

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Token management
export const tokenManager = {
  getAccessToken: () => localStorage.getItem("accessToken"),
  getRefreshToken: () => localStorage.getItem("refreshToken"),
  setAccessToken: (token) => localStorage.setItem("accessToken", token),
  setRefreshToken: (token) => localStorage.setItem("refreshToken", token),
  clearTokens: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },
};

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Normalize response
    return {
      success: response.data.success,
      data: response.data.data,
      message: response.data.message,
      statusCode: response.data.statusCode,
      timestamp: response.data.timestamp,
      pagination: response.data.pagination,
    };
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - Token refresh logic
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = tokenManager.getRefreshToken();
        if (refreshToken) {
          const response = await axios.post(`${BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          tokenManager.setAccessToken(accessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        tokenManager.clearTokens();
        //window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // Normalize error response
    const normalizedError = {
      success: false,
      message:
        error.response?.data?.message || error.message || "An error occurred",
      statusCode: error.response?.status || 500,
      errors: error.response?.data?.errors || [],
    };

    return Promise.reject(normalizedError);
  }
);

export default apiClient;
