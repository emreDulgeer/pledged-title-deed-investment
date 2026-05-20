import api from "../api/client";

const membershipController = {
  async getStatus() {
    return api.get("/membership/status");
  },

  async changePlan(planId, interval = "monthly", promoCode = null) {
    return api.post("/membership/change-plan", {
      planId,
      interval,
      promoCode,
    });
  },

  async cancel(reason) {
    return api.post("/membership/cancel", { reason });
  },
};

export default membershipController;
