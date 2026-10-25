import { test, expect, a11y, playlist, playHome } from "./fixtures";
const a = "10000000-0000-4000-8000-000000000301",
  b = "10000000-0000-4000-8000-000000000300";
test("F09-E1 selecting a duplicate starts that occurrence", async ({
  page,
  context,
}) => {
  const p = await playlist(context.request, [a, b, a]);
  await page.goto(`/playlist/${p.id}`);
  const ack = page.waitForResponse(
    (r) =>
      r.url().includes("/playback-sessions/") && r.request().method() === "PUT",
  );
  await page
    .getByRole("button", {
      name: "Play Open Road Meridian Ensemble",
      exact: true,
    })
    .nth(1)
    .click();
  const state = await (await ack).json();
  expect(state.currentEntryId).toBe(state.entries[2].id);
  await page
    .getByRole("button", {
      name: "Open player for Open Road Meridian Ensemble",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Queue", exact: true }).click();
  await a11y(page);
  await expect(
    page.getByRole("heading", { name: "Playing now", exact: true }),
  ).toBeVisible();
});
test("F09-H1 explicit requests can move and clear without deleting context", async ({
  page,
}) => {
  await playHome(page);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page
    .getByRole("button", { name: "Actions for Open Road", exact: true })
    .click();
  await page.getByRole("button", { name: "Play next", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Open player for Open Road Meridian Ensemble",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Queue", exact: true }).click();
  await expect(
    page.getByText("Your request", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Move Open Road up", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Clear requests", exact: true })
    .click();
  await expect(
    page.getByText("Your request", { exact: true }).filter({ visible: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Remove queue entry/ }),
  ).toHaveCount(2);
  await page
    .getByRole("button", { name: "Remove queue entry 1", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Remove queue entry/ }),
  ).toHaveCount(1);
  await a11y(page);
});
