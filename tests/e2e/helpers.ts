import { expect, type Page } from "@playwright/test";

export const PASSWORD = process.env.DEMO_USER_PASSWORD ?? "DemoPass123!";
export const USERS = {
  admin: "admin@northstar.example.com",
  marketing: "marketing@northstar.example.com",
  compliance: "compliance@northstar.example.com",
};

export async function loginAs(page: Page, who: keyof typeof USERS) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(USERS[who]);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function logout(page: Page) {
  const signOut = page.getByRole("button", { name: "Sign out" }).last();
  if (!(await signOut.isVisible())) {
    await page.getByRole("button", { name: "Open menu" }).click();
  }
  await page.getByRole("button", { name: "Sign out" }).last().click();
  await expect(page).toHaveURL(/\/login/);
}
