const request = require("supertest");
const { createIntegrationApp } = require("../helpers/createIntegrationApp");

describe("file routes", () => {
  let app;
  let doubles;

  beforeEach(() => {
    ({ app, doubles } = createIntegrationApp());
  });

  test("keeps file preview public", async () => {
    const response = await request(app).get(
      "/api/v1/files/preview/507f1f77bcf86cd799439021",
    );

    expect(response.status).toBe(200);
    expect(response.body.data.action).toBe("preview");
    expect(doubles.file.preview).toHaveBeenCalledTimes(1);
  });

  test("requires auth for generic file uploads", async () => {
    const response = await request(app)
      .post("/api/v1/files/upload")
      .attach("file", Buffer.from("hello world"), "hello.txt");

    expect(response.status).toBe(401);
    expect(doubles.file.uploadSingle).not.toHaveBeenCalled();
  });

  test("enforces owner/admin access for property-document uploads", async () => {
    const forbidden = await request(app)
      .post("/api/v1/files/property-document")
      .set("x-test-role", "investor")
      .attach("file", Buffer.from("hello world"), "title-deed.pdf");

    const allowed = await request(app)
      .post("/api/v1/files/property-document")
      .set("x-test-role", "property_owner")
      .attach("file", Buffer.from("hello world"), "title-deed.pdf");

    expect(forbidden.status).toBe(403);
    expect(allowed.status).toBe(201);
    expect(allowed.body.data.action).toBe("uploadPropertyDocument");
    expect(allowed.body.data.user.role).toBe("property_owner");
    expect(doubles.file.uploadPropertyDocument).toHaveBeenCalledTimes(1);
  });
});
