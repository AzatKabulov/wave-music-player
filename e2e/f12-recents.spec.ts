import { test, expect, a11y, playHome } from "./fixtures";
test("F12-H1 history returns to a permitted track", async ({ page }) => {
  await playHome(page);
  await page
    .getByRole("button", { name: "Open settings", exact: true })
    .click();
  await a11y(page);
  await page
    .getByRole("button", { name: "Recently played", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Play Open Road Meridian Ensemble",
      exact: true,
    }),
  ).toBeVisible();
  await a11y(page);
});
