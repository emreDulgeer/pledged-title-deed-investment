// src/controllers/fileController.js
import axios from "axios";
import apiClient from "../api/client";
import { tokenManager } from "../api/client";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api/v1";

const fileController = {
  upload: async (formData, type = "document") => {
    return await apiClient.post(`/files/upload/${type}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  uploadMultiple: async (formData, type = "document") => {
    return await apiClient.post(`/files/upload-multiple/${type}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getUrl: (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${BASE_URL}${path}`;
  },

  getDownloadUrl: (fileId) => {
    if (!fileId) return "";

    const token = tokenManager.getAccessToken();
    const downloadUrl = new URL(`${BASE_URL}/files/download/${fileId}`);

    if (token) {
      downloadUrl.searchParams.set("token", token);
    }

    return downloadUrl.toString();
  },

  download: async (fileId) => {
    const token = tokenManager.getAccessToken();

    return await axios.get(`${BASE_URL}/files/download/${fileId}`, {
      responseType: "blob",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  delete: async (fileId) => {
    return await apiClient.delete(`/files/${fileId}`);
  },

  getFileInfo: async (fileId) => {
    return await apiClient.get(`/files/${fileId}/info`);
  },

  // Utility functions
  downloadBlob: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  triggerBrowserDownload: (url, filename) => {
    if (!url) return;

    const link = document.createElement("a");
    link.href = url;

    if (filename) {
      link.download = filename;
    }

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  validateFile: (file, options = {}) => {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = [],
      allowedExtensions = [],
    } = options;

    const errors = [];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    // Check file extension
    if (allowedExtensions.length > 0) {
      const extension = file.name.split(".").pop().toLowerCase();
      if (!allowedExtensions.includes(extension)) {
        errors.push(`File extension .${extension} is not allowed`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

export default fileController;
