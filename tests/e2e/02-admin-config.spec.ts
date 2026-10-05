import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

const suffix = Date.now().toString().slice(-6);

test("dashboard shows the four status tiles", async ({ page }) => {
  await loginAs(page, "compliance");
  for (const label of ["Pending Reviews", "Changes Requested", "Approved This Month", "Rejected"]) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Recent audit activity" })).toBeVisible();
});

test("admin manages brands, jurisdictions and policy rules", async ({ page }) => {
  await loginAs(page, "admin");

  // Jurisdiction
  await page.goto("/settings");
  await page.getByLabel("Code").fill(`T${suffix.slice(-4)}`);
  await page.getByLabel("Name", { exact: true }).fill(`Testland ${suffix}`);
  await page.getByRole("button", { name: "Add jurisdiction" }).click();
  await expect(page.getByText(`Testland ${suffix} added.`)).toBeVisible();

  // Brand
  await page.goto("/brands");
  await expect(page.getByText("NovaBet")).toBeVisible();
  await expect(page.getByText("Orbit Casino").first()).toBeVisible();
  await page.getByRole("link", { name: "New brand" }).click();
  await page.getByLabel("Brand name").fill(`Comet Play ${suffix}`);
  await page.getByLabel("Description").fill("Fictional test brand");
  await page.getByLabel("United Kingdom (UK)").check();
  await page.getByRole("button", { name: "Create brand" }).click();
  await expect(page.getByRole("heading", { name: `Comet Play ${suffix}` })).toBeVisible();

  // Policy rule → version bump
  await page.goto("/policies");
  await expect(page.getByText("DEMO POLICY RULES").first()).toBeVisible();
  await page.getByRole("link", { name: "DEMO UK Marketing Policy" }).click();
  const versionBadge = page.locator("h1").getByText(/^v\d+$/);
  const before = Number((await versionBadge.textContent())!.slice(1));
  await page.getByLabel("Code").fill(`TEST-${suffix}`);
  await page.getByLabel("Title").fill("Test rule");
  await page.getByLabel("Rule type").selectOption("prohibited_phrase");
  await page.getByLabel(/Phrases/).fill("test phrase");
  await page.getByLabel(/Explanation/).fill("Created by automated test");
  await page.getByRole("button", { name: "Add rule" }).click();
  await expect(page.getByText(`Rule TEST-${suffix} added. Policy is now version ${before + 1}.`)).toBeVisible();

  // Deactivate it again so it doesn't affect other tests
  const row = page.getByRole("row", { name: new RegExp(`TEST-${suffix}`) });
  await row.getByRole("button", { name: "Deactivate" }).click();
  await expect(row.getByText("Inactive")).toBeVisible();
});

test("marketing cannot manage configuration", async ({ page }) => {
  await loginAs(page, "marketing");
  await page.goto("/brands");
  await expect(page.getByRole("link", { name: "New brand" })).toHaveCount(0);
  await page.goto("/brands/new");
  await expect(page).toHaveURL(/\/dashboard\?error=forbidden/);
  await expect(page.getByText("You do not have access to that page.")).toBeVisible();
  await page.goto("/policies");
  await expect(page.getByRole("link", { name: "New policy" })).toHaveCount(0);
  await page.goto("/settings");
  await expect(page.getByRole("button", { name: "Add user" })).toHaveCount(0);
});
