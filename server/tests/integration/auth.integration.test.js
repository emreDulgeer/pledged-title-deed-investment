const request = require("supertest");
const { createIntegrationApp } = require("../helpers/createIntegrationApp");

describe("auth routes", () => {
  let app;
  let doubles;

  beforeEach(() => {
    ({ app, doubles } = createIntegrationApp());
  });

  test("rejects invalid login payload before controller runs", async () => {
    const response = await request(app).post("/api/v1/auth/login").send({
      email: "not-an-email",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(doubles.auth.login).not.toHaveBeenCalled();
  });

  test("passes valid login payload to controller", async () => {
    const response = await request(app).post("/api/v1/auth/login").send({
      email: "investor@test.local",
      password: "Secret123!",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.action).toBe("login");
    expect(doubles.auth.login).toHaveBeenCalledTimes(1);
  });

  test("requires auth for current user profile", async () => {
    const unauthorized = await request(app).get("/api/v1/auth/me");
    const authorized = await request(app)
      .get("/api/v1/auth/me")
      .set("x-test-role", "investor");

    expect(unauthorized.status).toBe(401);
    expect(authorized.status).toBe(200);
    expect(authorized.body.data.action).toBe("getCurrentUser");
    expect(authorized.body.data.user.role).toBe("investor");
  });
});
