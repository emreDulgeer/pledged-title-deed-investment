import fs from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { expect, test } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadFixturePath = path.join(__dirname, "fixtures", "smoke-upload.pdf");

const roles = [
  {
    label: "admin",
    email: "admin@admin.com",
    password: "Admin123!@#",
    expectedPath: "/admin/dashboard",
  },
  {
    label: "investor",
    email: "emre@investor.com",
    password: "Test123!@#",
    expectedPath: "/investor/dashboard",
  },
  {
    label: "owner",
    email: "ayse@owner.com",
    password: "Owner123!@#",
    expectedPath: "/owner/dashboard",
  },
  {
    label: "representative",
    email: "joao@rep.com",
    password: "Rep123!@#",
    expectedPath: "/rep/dashboard",
  },
];

const ownerMehmet = {
  email: "mehmet@owner.com",
  password: "Mehmet123!@#",
  expectedPath: "/owner/dashboard",
};

const membershipInvestor = {
  email: "lara@investor.com",
  password: "Lara123!@#",
  expectedPath: "/investor/dashboard",
};

const clearSession = async (page) => {
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto("/login");
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const loginAs = async (page, account) => {
  await clearSession(page);
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegex(account.expectedPath)}$`));
};

const expectAnonymousRouteRedirect = async (page, targetPath) => {
  await clearSession(page);
  await page.goto(targetPath);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('input[name="email"]')).toBeVisible();
};

const expectAccessDeniedForRole = async (page, account, targetPath) => {
  await loginAs(page, account);
  await page.goto(targetPath);
  await expect(page).toHaveURL(new RegExp(`${escapeRegex(targetPath)}$`));
  await expect(page.getByTestId("access-denied-screen")).toBeVisible();
  await expect(page.getByTestId("access-denied-title")).toHaveText(
    "Access Denied",
  );
};

const acceptDialogIfPresent = async (page, action, timeout = 5000) => {
  const dialogPromise = page
    .waitForEvent("dialog", { timeout })
    .then((dialog) => dialog.accept())
    .catch(() => null);

  await action();
  await dialogPromise;
};

const fillOwnerPropertyForm = async (
  page,
  {
    country = "Georgia",
    city,
    address,
    estimatedValue = "250000",
    requestedInvestment = "50000",
    monthlyRent = "600",
    annualYieldPercent = "7.5",
    contractPeriodMonths = "18",
    description = "Critical smoke property detail validation.",
    latitude = "41.647178",
    longitude = "41.636932",
  },
) => {
  await page.getByLabel("Country").selectOption(country);
  await page.getByLabel("City").fill(city);
  await page.getByLabel("Title Deed Address").fill(address);
  await page.getByLabel("Estimated Value").fill(estimatedValue);
  await page.getByLabel("Requested Investment").fill(requestedInvestment);
  await page.getByLabel("Monthly Rent Offered").fill(monthlyRent);
  await page.getByLabel("Annual Yield Percent").fill(annualYieldPercent);
  await page.getByLabel("Contract Period (Months)").fill(contractPeriodMonths);
  await page
    .getByRole("textbox", { name: "Description", exact: true })
    .fill(description);
  await page.getByLabel("Latitude").fill(latitude);
  await page.getByLabel("Longitude").fill(longitude);
};

const createOwnerProperty = async (
  page,
  { city, address, description, document = null },
) => {
  await page.goto("/owner/properties/new");
  await fillOwnerPropertyForm(page, { city, address, description });

  if (document) {
    await page.getByTestId("owner-property-document-input").setInputFiles({
      name: document.fileName,
      mimeType: document.mimeType,
      buffer: document.buffer,
    });

    const documentEntry = page
      .getByTestId("owner-property-document-entry")
      .filter({ hasText: document.fileName })
      .first();
    await expect(documentEntry).toBeVisible();
    await documentEntry
      .getByTestId("owner-property-document-type")
      .selectOption(document.type);

    if (document.description) {
      await documentEntry
        .getByTestId("owner-property-document-description")
        .fill(document.description);
    }
  }

  await page.getByTestId("owner-property-create-submit").click();
  await expect(page).toHaveURL(/\/owner\/properties\/[^/]+$/);

  return page.url().split("/").pop();
};

test("login redirects each seeded role to its dashboard", async ({ page }) => {
  for (const role of roles) {
    await test.step(role.label, async () => {
      await loginAs(page, role);
    });
  }
});

test("protected routes block anonymous and wrong-role access", async ({
  page,
}) => {
  const fakePropertyId = "unauthorized-property-smoke";
  const fakeUserId = "unauthorized-kyc-smoke";

  await expectAnonymousRouteRedirect(page, `/owner/properties/${fakePropertyId}`);
  await expectAnonymousRouteRedirect(
    page,
    `/properties/my/properties/${fakePropertyId}`,
  );

  await expectAccessDeniedForRole(
    page,
    roles[1],
    `/owner/properties/${fakePropertyId}`,
  );
  await expectAccessDeniedForRole(
    page,
    roles[1],
    `/auth/admin/pending-kyc/${fakeUserId}`,
  );
  await expectAccessDeniedForRole(page, roles[2], "/admin/dashboard");
});

test("owner can create a property and lands on its detail page", async ({ page }) => {
  const suffix = `${Date.now()}`.slice(-6);
  const city = `Smoke${suffix}`;
  const address = `QA Street ${suffix}, Block A`;

  await loginAs(page, roles[2]);
  await createOwnerProperty(page, { city, address });
  await expect(page.getByText(`${city}, Georgia`)).toBeVisible();
  await expect(page.getByText(address).first()).toBeVisible();
  await expect(page.getByTestId("document-list")).toHaveCount(0);
});

test("owner can upload property documents and preview/download them from detail", async ({
  page,
}) => {
  const suffix = `${Date.now()}`.slice(-6);
  const city = `Docs${suffix}`;
  const address = `QA Document Street ${suffix}, Block B`;
  const fileName = `property-smoke-${Date.now()}.pdf`;
  const uploadBuffer = await fs.readFile(uploadFixturePath);

  await loginAs(page, roles[2]);
  const propertyId = await createOwnerProperty(page, {
    city,
    address,
    description: "Critical smoke property document validation.",
    document: {
      fileName,
      mimeType: "application/pdf",
      buffer: uploadBuffer,
      type: "title_deed",
      description: "Critical smoke property title deed.",
    },
  });

  await expect(page).toHaveURL(
    new RegExp(`/owner/properties/${escapeRegex(propertyId)}$`),
  );
  await expect(page.getByText(`${city}, Georgia`)).toBeVisible();

  const documentRow = page
    .locator('[data-testid^="document-row-"]')
    .filter({ hasText: fileName })
    .first();
  await expect(documentRow).toBeVisible();

  const previewResponsePromise = page.context().waitForEvent(
    "response",
    (response) =>
      /\/api\/v1\/files\/preview\/[^?]+/.test(response.url()) &&
      response.status() === 200,
  );
  const previewPopupPromise = page.waitForEvent("popup");
  await page.getByLabel(`Preview ${fileName}`).click();
  const [previewPopup, previewResponse] = await Promise.all([
    previewPopupPromise,
    previewResponsePromise,
  ]);
  expect(previewResponse.headers()["content-type"] || "").toContain(
    "application/pdf",
  );
  await previewPopup.close();

  const downloadPromise = page.waitForEvent("download");
  await page.getByLabel(`Download ${fileName}`).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(fileName);
});

test("investor can switch membership plans from the dashboard", async ({ page }) => {
  await loginAs(page, membershipInvestor);
  await page.goto("/investor/membership-plans");

  const currentPlanBanner = page.getByTestId("membership-current-plan");
  await expect(page.getByTestId("membership-dashboard")).toBeVisible();
  await expect(currentPlanBanner).toBeVisible();

  const currentPlanText = (await currentPlanBanner.textContent()) || "";
  const targetPlan = /current plan:\s*basic/i.test(currentPlanText)
    ? { key: "pro", label: "Pro" }
    : { key: "basic", label: "Basic" };

  const switchButton = page.getByTestId(`membership-switch-${targetPlan.key}`);
  await expect(switchButton).toBeVisible();
  await switchButton.click();

  await expect(currentPlanBanner).toContainText(targetPlan.label, {
    timeout: 15000,
  });
});

test("investment detail supports document upload, download, and owner approval", async ({
  page,
}) => {
  const fileName = `smoke-upload-${Date.now()}.pdf`;
  const uploadBuffer = await fs.readFile(uploadFixturePath);

  await loginAs(page, roles[1]);
  await page.goto("/investor/investments");

  const barcelonaRow = page.locator("tr").filter({ hasText: "Barcelona, Spain" }).first();
  await expect(barcelonaRow).toBeVisible();
  await barcelonaRow.getByRole("button", { name: /view details/i }).click();
  await expect(page).toHaveURL(/\/investor\/investments\/[^/]+$/);

  const investmentId = page.url().split("/").pop();
  await page.getByRole("button", { name: "Documents" }).click();

  await acceptDialogIfPresent(page, () =>
    page
      .getByTestId("investment-upload-additional-document")
      .setInputFiles({
        name: fileName,
        mimeType: "application/pdf",
        buffer: uploadBuffer,
      }),
  );

  await expect(page.getByText(fileName)).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByLabel(`Download ${fileName}`).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(fileName);

  await loginAs(page, ownerMehmet);
  await page.goto(`/owner/investments/${investmentId}`);
  await expect(page).toHaveURL(
    new RegExp(`/owner/investments/${escapeRegex(investmentId)}$`),
  );

  const reviewCard = page
    .getByTestId("investment-review-card")
    .filter({ hasText: fileName })
    .first();
  await expect(reviewCard).toBeVisible();
  await reviewCard.locator("textarea").fill("Smoke approval note");

  await acceptDialogIfPresent(page, () =>
    reviewCard.getByRole("button", { name: /approve document/i }).click(),
  );

  await expect(
    page.getByTestId("investment-review-card").filter({ hasText: fileName }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Documents" }).click();
  const approvedRow = page
    .locator('[data-testid^="document-row-"]')
    .filter({ hasText: fileName })
    .first();
  await expect(approvedRow).toBeVisible();
  await expect(approvedRow).toContainText("Approved");
});
