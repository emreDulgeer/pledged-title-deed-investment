const request = require("supertest");
const { createIntegrationApp } = require("../helpers/createIntegrationApp");

describe("investment routes", () => {
  let app;
  let doubles;

  beforeEach(() => {
    ({ app, doubles } = createIntegrationApp());
  });

  test("allows investors to create investment offers", async () => {
    const response = await request(app)
      .post("/api/v1/investments/property/507f1f77bcf86cd799439012/offer")
      .set("x-test-role", "investor")
      .send({
        offerAmount: 25000,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.action).toBe("createInvestmentOffer");
    expect(response.body.data.user.role).toBe("investor");
    expect(doubles.investment.createInvestmentOffer).toHaveBeenCalledTimes(1);
  });

  test("blocks non-investors from investment offer creation", async () => {
    const response = await request(app)
      .post("/api/v1/investments/property/507f1f77bcf86cd799439012/offer")
      .set("x-test-role", "property_owner")
      .send({
        offerAmount: 25000,
      });

    expect(response.status).toBe(403);
    expect(doubles.investment.createInvestmentOffer).not.toHaveBeenCalled();
  });

  test("allows shared investment detail access for authorized roles", async () => {
    const response = await request(app)
      .get("/api/v1/investments/507f1f77bcf86cd799439013")
      .set("x-test-role", "local_representative");

    expect(response.status).toBe(200);
    expect(response.body.data.action).toBe("getInvestmentById");
    expect(response.body.data.user.role).toBe("local_representative");
    expect(doubles.investment.getInvestmentById).toHaveBeenCalledTimes(1);
  });
});
