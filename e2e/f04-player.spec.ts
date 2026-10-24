import { test, expect, a11y, playHome, seekTo } from "./fixtures";
test("F04-H1 transport, seek, repeat and shuffle", async ({ page }) => {
  await playHome(page);
  await page
    .getByRole("button", {
      name: "Open player for Open Road Meridian Ensemble",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Now playing", exact: true }),
  ).toBeVisible();
  await a11y(page);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await seekTo(page, 8);
  for (const mode of ["none", "all", "single"])
    await page
      .getByRole("button", { name: `Repeat: ${mode}`, exact: true })
      .click();
  await expect(
    page.getByRole("button", { name: "Repeat: none", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Enable shuffle", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Disable shuffle", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next track", exact: true }).click();
  await expect(
    page.getByText("First Light", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
});
