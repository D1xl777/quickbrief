/**
 * The MVP demo sequence, end to end:
 * Login → Dashboard → New submission (image + text, UK) → Run check → findings
 * → Submit → Compliance requests changes → Version 2 → Check → Submit → Approve
 * → Version history → Audit history → Approval record → PDF export.
 */
import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAs, logout } from "./helpers";

const IMAGES = path.join(__dirname, "../../scripts/demo/images");
const campaign = `Demo Flow Football ${Date.now().toString().slice(-6)}`;

test("complete compliance workflow", async ({ page }) => {
  // --- Marketing: create and submit version 1
  await loginAs(page, "marketing");
  await expect(page.getByRole("heading", { name: /Good to see you, Maya/ })).toBeVisible();
  await page.getByRole("link", { name: "New submission" }).first().click();
  await page.getByLabel("Campaign name").fill(campaign);
  await page.getByLabel("Brand").selectOption({ label: "NovaBet" });
  await page.getByLabel("Jurisdiction").selectOption({ label: "United Kingdom" });
  await page.getByLabel("Channel").selectOption({ label: "Display Advertising" });
  await page.getByLabel("Creative text").fill("NovaBet Weekend Football Specials. Guaranteed win on the biggest matches!");
  await page.locator('input[name="image"]').setInputFiles(path.join(IMAGES, "novabet-football-v1.png"));
  await page.getByRole("button", { name: "Run Check" }).click();

  await expect(page.getByTestId("check-summary")).toContainText("Potential issue detected");
  await expect(page.locator('[data-status="potential_issue"]').first()).toBeVisible();
  await expect(page.locator('[data-status="review_required"]').first()).toBeVisible();

  page.once("dialog", (d) => d.accept()); // "flagged potential issues, submit anyway?"
  await page.getByRole("button", { name: "Submit for Review" }).click();
  await expect(page.getByText("Waiting for compliance review")).toBeVisible();
  const submissionUrl = page.url();
  await logout(page);

  // --- Compliance: request changes (comment required)
  await loginAs(page, "compliance");
  await page.getByRole("link", { name: /Review Queue/ }).first().click();
  await page.getByRole("link", { name: campaign }).click();
  await expect(page.getByRole("heading", { name: "Compliance decision" })).toBeVisible();
  await page.getByText("Request Changes", { exact: true }).click();
  await expect(page.getByLabel(/Review comment/)).toHaveAttribute("required", "");
  await page
    .getByLabel(/Review comment/)
    .fill("Remove the guaranteed-win claim and add the 18+, safer gambling and T&Cs messages.");
  await page.getByRole("button", { name: "Record decision" }).click();
  await expect(page.getByText("Changes requested by compliance")).toBeVisible();
  await logout(page);

  // --- Marketing: upload version 2, check, submit
  await loginAs(page, "marketing");
  await page.goto(submissionUrl);
  await expect(page.getByText("Changes requested by compliance")).toBeVisible();
  await page
    .getByLabel("Creative text")
    .fill("NovaBet Weekend Football Specials. Odds boosts on selected matches.\n18+ | Please gamble responsibly | T&Cs apply");
  await page.getByLabel("Destination URL").fill("https://novabet.example.com/football");
  await page.getByLabel("What changed?").fill("Addressed compliance comments");
  await page.locator('input[name="image"]').setInputFiles(path.join(IMAGES, "novabet-football-v2.png"));
  await page.getByRole("button", { name: /Save version 2 & Run Check/ }).click();
  await expect(page.getByText("Creative · Version 2 (current)")).toBeVisible();
  await expect(page.locator('[data-status="potential_issue"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Submit for Review" }).click();
  await expect(page.getByText("Waiting for compliance review")).toBeVisible();
  await logout(page);

  // --- Compliance: approve
  await loginAs(page, "compliance");
  await page.goto(submissionUrl);
  await page.getByText("Approve", { exact: true }).click();
  await page.getByLabel(/Review comment/).fill("Approved for UK display placements.");
  await page.getByRole("button", { name: "Record decision" }).click();
  await expect(page.getByText(/^Approved · APR-/)).toBeVisible();

  // Version history: both versions with their outcomes and decisions
  const history = page.getByTestId("version-history");
  await expect(history.getByText("Version 1")).toBeVisible();
  await expect(history.getByText("Version 2")).toBeVisible();
  await expect(history.getByText("Changes Requested")).toBeVisible();
  await expect(history.getByText("Approved")).toBeVisible();
  await history.getByText("Version 1").click();
  await expect(page.getByTestId("creative-text")).toContainText("Guaranteed win");

  // Immutable audit history
  const audit = page.getByTestId("audit-history");
  for (const text of [
    "Created submission",
    "Uploaded version 1",
    "Ran automated check on version 1",
    "Submitted version 1 for compliance review",
    "Opened version 1 for review",
    "Changes Requested version 1",
    "Uploaded version 2",
    "Ran automated check on version 2",
    "Submitted version 2 for compliance review",
    "Approved version 2",
    "Generated approval record",
  ]) {
    await expect(audit.getByText(text).first()).toBeVisible();
  }
  await page.goto("/audit-log");
  await expect(page.getByText("Append-only · cannot be edited or deleted")).toBeVisible();
  await expect(page.getByRole("link", { name: campaign }).first()).toBeVisible();

  // Approval record + PDF
  await page.goto(submissionUrl);
  await page.getByRole("link", { name: "Approval record" }).click();
  const record = page.getByTestId("approval-record");
  await expect(record).toContainText("Northstar Gaming Group (Demo)");
  await expect(record).toContainText("NovaBet");
  await expect(record).toContainText("United Kingdom");
  await expect(record).toContainText("Display Advertising");
  await expect(record).toContainText("Version 2 of 2");
  await expect(record).toContainText("Chris Lindqvist");
  await expect(record).toContainText("Approved for UK display placements.");
  await expect(record).toContainText("DEMO UK Marketing Policy");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^APR-\d{8}-[0-9A-F]{6}\.pdf$/);
  const file = await download.path();
  const bytes = fs.readFileSync(file);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect(bytes.length).toBeGreaterThan(20_000); // includes the embedded creative image
  fs.copyFileSync(file, path.join(__dirname, "../../test-results/approval-record.pdf"));
});

test("reject requires a comment and marketing cannot review", async ({ page }) => {
  await loginAs(page, "marketing");
  await page.goto("/submissions/new");
  const name = `Reject Flow ${Date.now().toString().slice(-6)}`;
  await page.getByLabel("Campaign name").fill(name);
  await page.getByLabel("Brand").selectOption({ label: "Orbit Casino" });
  await page.getByLabel("Jurisdiction").selectOption({ label: "Sweden" });
  await page.getByLabel("Channel").selectOption({ label: "SMS" });
  await page.getByLabel("Creative text").fill("Orbit Casino: free money for students today!");
  await page.getByRole("button", { name: "Submit for Review" }).click();
  await expect(page.getByText("Waiting for compliance review")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Compliance decision" })).toHaveCount(0);
  await page.goto("/review-queue");
  await expect(page).toHaveURL(/error=forbidden/);
  await logout(page);

  await loginAs(page, "compliance");
  await page.goto("/review-queue");
  await page.getByRole("link", { name }).click();
  await page.getByText("Reject", { exact: true }).click();
  // Bypass the browser's required check to prove the server enforces it too.
  await page.getByLabel(/Review comment/).evaluate((el) => el.removeAttribute("required"));
  await page.getByRole("button", { name: "Record decision" }).click();
  await expect(page.getByText("A comment is required when requesting changes or rejecting.").first()).toBeVisible();
  await page.getByLabel(/Review comment/).fill("Prohibited wording; not suitable for this market.");
  await page.getByRole("button", { name: "Record decision" }).click();
  await expect(page.getByText("This submission is closed.")).toBeVisible();
});
