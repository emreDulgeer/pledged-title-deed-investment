// src/controllers/geocodingController.js
import apiClient from "../api/client";

const geocodingController = {
  getProviderInfo: async () => {
    return await apiClient.get("/geocoding/provider-info");
  },

  geocode: async (address) => {
    return await apiClient.post("/geocoding/geocode", { address });
  },

  search: async ({ query, countryCode, limit = 5 }) => {
    return await apiClient.post("/geocoding/search", {
      query,
      countryCode,
      limit,
    });
  },

  reverseGeocode: async (lat, lng) => {
    return await apiClient.post("/geocoding/reverse", { lat, lng });
  },
};

export default geocodingController;
