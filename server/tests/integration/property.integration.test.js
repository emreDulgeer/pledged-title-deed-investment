const request = require("supertest");
const { createIntegrationApp } = require("../helpers/createIntegrationApp");

describe("property routes", () => {
  let app;
  let doubles;

  beforeEach(() => {
    ({ app, doubles } = createIntegrationApp());
  });

  test("serves public property list", async () => {
    const response = await request(app).get("/api/v1/properties");

    expect(response.status).toBe(200);
    expect(response.body.data.action).toBe("getProperties");
    expect(doubles.property.getProperties).toHaveBeenCalledTimes(1);
  });

  test("allows property owners to create properties", async () => {
    const response = await request(app)
      .post("/api/v1/properties")
      .set("x-test-role", "property_owner")
      .send({
        title: "Lisbon Apartment",
        country: "Portugal",
      });

    expect(response.status).toBe(201);
    expect(response.body.data.action).toBe("createProperty");
    expect(response.body.data.user.role).toBe("property_owner");
    expect(doubles.property.createProperty).toHaveBeenCalledTimes(1);
  });

  test("blocks investors from owner-only property creation", async () => {
    const response = await request(app)
      .post("/api/v1/properties")
      .set("x-test-role", "investor")
      .send({
        title: "Should Fail",
      });

    expect(response.status).toBe(403);
    expect(doubles.property.createProperty).not.toHaveBeenCalled();
  });
});
