import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

const IMAGES = path.join(__dirname, "../../scripts/demo/images");
const campaign = `E2E Weekend Football ${Date.now().toString().slice(-6)}`;

test("marketing creates a submission, checks it and uploads version 2", async ({ page }) => {
  await loginAs(page, "marketing");
  await page.getByRole("link", { name: "New submission" }).first().click();
  await expect(page.getByRole("heading", { name: "New Submission" })).toBeVisible();

  await page.getByLabel("Campaign name").fill(campaign);
  await page.getByLabel("Brand").selectOption({ label: "NovaBet" });
  await page.getByLabel("Jurisdiction").selectOption({ label: "United Kingdom" });
  await page.getByLabel("Channel").selectOption({ label: "Social Media" });
  await page
    .getByLabel("Creative text")
    .fill("NovaBet Weekend Football Specials. Risk-free bets on the biggest matches. Act now!");
  await page.locator('input[name="image"]').setInputFiles(path.join(IMAGES, "novabet-football-v1.png"));
  await page.getByRole("button", { name: "Run Check" }).click();

  await expect(page.getByRole("heading", { name: campaign })).toBeVisible();
  await expect(page.getByTestId("check-summary")).toContainText(
    "Potential issue detected. Human compliance review required.",
  );
  // All three finding statuses are shown.
  await expect(page.locator('[data-testid="finding"][data-status="potential_issue"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="finding"][data-status="review_required"]').first()).toBeVisible();
  await expect(page.getByText("Prohibited phrase present: No guaranteed-outcome wording")).toBeVisible();
  await expect(page.getByText("Required disclaimer missing: Age restriction notice (18+)")).toBeVisible();
  await expect(page.getByText("Image content requires human review")).toBeVisible();
  await page.locator("summary", { hasText: "passed check" }).click();
  await expect(page.locator('[data-testid="finding"][data-status="pass"]').first()).toBeVisible();
  await expect(page.getByText("PASS").first()).toBeVisible();
  // Never claims legal compliance.
  await expect(page.getByText(/legally compliant/i)).toHaveCount(0);

  // Version 2
  await page
    .getByLabel("Creative text")
    .fill(
      "NovaBet Weekend Football Specials. Odds boosts on selected matches.\n18+ | Please gamble responsibly | T&Cs apply",
    );
  await page.getByLabel("Destination URL").fill("https://novabet.example.com/football");
  await page.getByLabel("What changed?").fill("Removed prohibited wording, added safer gambling message");
  await page.locator('input[name="image"]').setInputFiles(path.join(IMAGES, "novabet-football-v2.png"));
  await page.getByRole("button", { name: /Save version 2 & Run Check/ }).click();

  await expect(page.getByText("Creative · Version 2 (current)")).toBeVisible();
  await expect(page.getByTestId("check-summary")).toContainText("Human compliance review required");
  await expect(page.locator('[data-testid="finding"][data-status="potential_issue"]')).toHaveCount(0);
  const history = page.getByTestId("version-history");
  await expect(history.getByText("Version 2")).toBeVisible();
  await expect(history.getByText("Version 1")).toBeVisible();

  // Old version is preserved unchanged.
  await history.getByText("Version 1").click();
  await expect(page.getByText("You are viewing version 1")).toBeVisible();
  await expect(page.getByTestId("creative-text")).toContainText("Risk-free bets");

  // Submit for review
  await page.getByRole("link", { name: /Back to the current version/ }).click();
  await page.getByRole("button", { name: "Submit for Review" }).click();
  await expect(page.getByText("Waiting for compliance review")).toBeVisible();
  await expect(page.getByTestId("audit-history")).toContainText("Submitted version 2 for compliance review");
  await expect(page.getByTestId("audit-history")).toContainText("Uploaded version 2");
});

test("validation errors are shown", async ({ page }) => {
  await loginAs(page, "marketing");
  await page.goto("/submissions/new");
  await page.getByLabel("Campaign name").fill("Validation test");
  await page.getByLabel("Brand").selectOption({ label: "NovaBet" });
  await page.getByLabel("Jurisdiction").selectOption({ label: "United Kingdom" });
  await page.getByLabel("Channel").selectOption({ label: "Email" });
  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(page.getByText("Add creative text, an image, or both.")).toBeVisible();
});
