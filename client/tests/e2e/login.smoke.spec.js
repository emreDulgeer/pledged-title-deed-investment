import { expect, test } from "@playwright/test";

test("login page smoke renders the app shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "EstateLink" }).last(),
  ).toBeVisible();
  await expect(page.locator('input[name="email"]')).toHaveValue(
    "admin@admin.com",
  );
  await expect(page.locator('input[name="password"]')).toHaveValue(
    "Admin123!@#",
  );
});
