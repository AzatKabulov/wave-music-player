import { test, expect, api, headers } from "./fixtures";

test("V13 a retained search row plays the latest paginated context and keeps independent save state", async ({
  page,
  context,
}) => {
  const snapshot = (
    await context.request.get(`${api}/v1/snapshot`, { headers })
  ).json();
  const value = await snapshot;
  const first = value.catalog.tracks.find(
    (track: { title: string }) => track.title === "First Light",
  );
  const second = value.catalog.tracks.find(
    (track: { title: string }) => track.title === "Open Road",
  );
  expect(first).toBeTruthy();
  expect(second).toBeTruthy();
  await page.route("http://localhost:4100/v1/search?**", async (route) => {
    const more = new URL(route.request().url()).searchParams.has("cursor");
    await route.fulfill({
      json: {
        data: [{ kind: "track", item: more ? second : first }],
        catalog: value.catalog,
        nextCursor: more ? null : "qa-next-page",
        truncated: false,
      },
    });
  });
  await page.goto("/search");
  await page
    .getByRole("textbox", { name: "Search music", exact: true })
    .fill("Meridian");
  const firstRow = page.getByRole("button", {
    name: "Play First Light Meridian Ensemble",
    exact: true,
  });
  await expect(firstRow).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Play Open Road Meridian Ensemble",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Load more", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Play Open Road Meridian Ensemble",
      exact: true,
    }),
  ).toBeVisible();
  const acknowledged = page.waitForResponse(
    (response) =>
      response.url().includes("/playback-sessions/") &&
      response.request().method() === "PUT",
  );
  await firstRow.click();
  const queue = await (await acknowledged).json();
  expect(
    queue.entries.map((entry: { trackId: string }) => entry.trackId),
  ).toEqual([first.id, second.id]);
  expect(queue.currentEntryId).toBe(queue.entries[0].id);
  await page
    .getByRole("button", { name: "Save First Light", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unsave First Light", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save Open Road", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Unsave First Light", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save First Light", exact: true }),
  ).toBeVisible();
});
