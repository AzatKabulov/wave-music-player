import { test, expect, a11y, playHome, api } from "./fixtures";
test("F02-H1 home collection, album and artist", async ({ page }) => {
  await a11y(page);
  await playHome(page);
  await a11y(page);
  await page
    .getByRole("button", { name: "Visit Meridian Ensemble", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Meridian Ensemble", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Follow", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Following", exact: true }),
  ).toBeVisible();
  await a11y(page);
});
test("F02-E1 an empty catalog offers refresh", async ({ page }) => {
  await page.route("http://localhost:4100/v1/snapshot", async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace("http://localhost:4100", api),
    });
    const data = await response.json();
    data.catalog = { tracks: [], artists: [], albums: [], playlists: [] };
    data.playlists = [];
    await route.fulfill({ response, json: data });
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "The music is on its way", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The music is on its way", exact: true }),
  ).toBeVisible();
  await a11y(page);
});
