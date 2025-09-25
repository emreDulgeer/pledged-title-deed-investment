// src/controllers/bridge.js
import authController from "./authController";
import propertyController from "./propertyController";
import investmentController from "./investmentController";
import userController from "./userController";
import fileController from "./fileController";
import membershipPlanController from "./membershipPlanController";
import { tokenManager } from "../api/client";

// Bridge pattern - Single point of access for all API operations
const bridge = {
  auth: authController,
  properties: propertyController,
  investments: investmentController,
  users: userController,
  files: fileController,
  membershipPlans: membershipPlanController,

  // Utility methods
  utils: {
    isAuthenticated: () => !!tokenManager.getAccessToken(),
    getCurrentUser: async () => {
      if (!bridge.utils.isAuthenticated()) return null;
      try {
        const response = await userController.getProfile();
        console.log("Current bridge.js user fetched:", response);
        return response.data;
      } catch (error) {
        console.error("Failed to get current user:", error);
        return null;
      }
    },
    clearAuth: () => tokenManager.clearTokens(),
  },
};

export default bridge;
