const request = require("supertest");
const { createIntegrationApp } = require("../helpers/createIntegrationApp");

describe("membership routes", () => {
  let app;
  let doubles;

  beforeEach(() => {
    ({ app, doubles } = createIntegrationApp());
  });

  test("serves membership plans publicly", async () => {
    const response = await request(app).get("/api/v1/membership/plans");

    expect(response.status).toBe(200);
    expect(response.body.data.action).toBe("getPlans");
    expect(doubles.membership.getPlans).toHaveBeenCalledTimes(1);
  });

  test("rejects invalid plan id before change-plan controller runs", async () => {
    const response = await request(app)
      .post("/api/v1/membership/change-plan")
      .set("x-test-role", "investor")
      .send({
        planId: "not-a-mongo-id",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(doubles.membership.changePlanNow).not.toHaveBeenCalled();
  });

  test("passes valid plan change requests to controller", async () => {
    const response = await request(app)
      .post("/api/v1/membership/change-plan")
      .set("x-test-role", "investor")
      .send({
        planId: "507f1f77bcf86cd799439099",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.action).toBe("changePlanNow");
    expect(response.body.data.user.role).toBe("investor");
    expect(doubles.membership.changePlanNow).toHaveBeenCalledTimes(1);
  });
});
