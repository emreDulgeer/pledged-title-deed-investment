import apiClient from "../api/client";

const profileController = {
  getByUserId: async (userId) => {
    return await apiClient.get(`/auth/profiles/${userId}`);
  },
};

export default profileController;
