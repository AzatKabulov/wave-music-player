import { test, expect, a11y, playHome, seekTo } from "./fixtures";
test("F10-H1 resume queue paused after refresh", async ({ page }) => {
  await playHome(page);
  await page
    .getByRole("button", {
      name: "Open player for Open Road Meridian Ensemble",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const checkpoint = page.waitForResponse(
    (r) =>
      r.url().includes("/playback-sessions/") &&
      r.request().method() === "PATCH" &&
      r.request().postDataJSON().positionMs >= 8990,
  );
  await seekTo(page, 9);
  await checkpoint;
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Now playing", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("0:09", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await a11y(page);
});
