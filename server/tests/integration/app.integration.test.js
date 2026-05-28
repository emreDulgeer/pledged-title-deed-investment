const request = require("supertest");
const { createIntegrationApp } = require("../helpers/createIntegrationApp");

describe("app integration", () => {
  let app;

  beforeEach(() => {
    ({ app } = createIntegrationApp());
  });

  test("GET / returns API metadata", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Pledged Title Deed Investment Platform API",
    );
  });

  test("GET /api/v1 returns versioned endpoint index", async () => {
    const response = await request(app).get("/api/v1");

    expect(response.status).toBe(200);
    expect(response.body.endpoints.auth).toBe("/api/v1/auth");
    expect(response.body.endpoints.properties).toBe("/api/v1/properties");
    expect(response.body.endpoints.investments).toBe("/api/v1/investments");
  });
});
