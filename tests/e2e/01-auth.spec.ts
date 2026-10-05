import { expect, test } from "@playwright/test";
import { loginAs, logout } from "./helpers";

test("logged-out visitors are sent to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("wrong password shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("marketing@northstar.example.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Incorrect email or password.")).toBeVisible();
});

test("marketing user sees marketing navigation only", async ({ page }) => {
  await loginAs(page, "marketing");
  await expect(page.getByTestId("current-user").last()).toHaveText("Maya Patel");
  const nav = page.getByRole("navigation", { name: "Main" }).last();
  await expect(nav.getByRole("link", { name: "Submissions" })).toBeVisible();
  await expect(nav.getByRole("link", { name: /Review Queue/ })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Audit Log" })).toHaveCount(0);
  await logout(page);
});

test("compliance reviewer sees review queue and audit log", async ({ page }) => {
  await loginAs(page, "compliance");
  const nav = page.getByRole("navigation", { name: "Main" }).last();
  await expect(nav.getByRole("link", { name: /Review Queue/ })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Audit Log" })).toBeVisible();
  await logout(page);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
