import { test, expect, a11y } from "./fixtures";

test("F13 language overrides persist and preserve listener content", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Русский", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Настройки", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("profile-name")).toBeVisible();
  await a11y(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Настройки", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Türkmençe", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sazlamalar", exact: true }),
  ).toBeVisible();
  await a11y(page);
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
});
