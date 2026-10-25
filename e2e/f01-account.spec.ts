import { test, expect, a11y } from "./fixtures";
test("F01-H1 account entry and validation", async ({ page }) => {
  await page
    .getByRole("button", { name: "Open settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Sign out everywhere", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Explore demo", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Join Musify", exact: true }).click();
  await page
    .getByRole("button", { name: "Create your account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Enter a valid email");
  await page.getByLabel("Your name", { exact: true }).fill("QA Türkmen 🌙");
  await page
    .getByLabel("Email", { exact: true })
    .filter({ visible: true })
    .fill(`qa-${Date.now()}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .filter({ visible: true })
    .fill("Test-only-password-2048!");
  await page
    .getByRole("button", { name: "Create your account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
  await a11y(page);
});
