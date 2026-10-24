import { test, expect, a11y, playHome } from "./fixtures";
test("F05-H1 likes are separate from album saves", async ({ page }) => {
  await playHome(page);
  await page
    .getByRole("button", { name: "Save Open Road", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unsave Open Road", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await a11y(page);
  await page.getByRole("button", { name: /Liked tracks/ }).click();
  await expect(
    page.getByRole("button", {
      name: "Play Open Road Meridian Ensemble",
      exact: true,
    }),
  ).toBeVisible();
  await a11y(page);
  await page
    .getByRole("button", { name: "Unsave Open Road", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Play Open Road Meridian Ensemble",
      exact: true,
    }),
  ).toHaveCount(0);
});
