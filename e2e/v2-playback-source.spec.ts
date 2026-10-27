import {
  test,
  expect,
  playHome,
  api,
  headers,
  playlist,
  a11y,
} from "./fixtures";
const openRoad = "10000000-0000-4000-8000-000000000301";
const firstLight = "10000000-0000-4000-8000-000000000300";
const open = async (
  page: import("@playwright/test").Page,
  title = "Open Road Meridian Ensemble",
) => {
  await page
    .getByRole("button", { name: `Open player for ${title}`, exact: true })
    .click();
  await expect
    .poll(
      async () => (await page.getByTestId("player-surface").boundingBox())?.y,
    )
    .toBeLessThan(2);
};

test("V19 album source survives cold player restore and returns without resuming audio", async ({
  page,
}) => {
  await playHome(page);
  await open(page);
  await page
    .getByTestId("player-surface")
    .getByRole("button", { name: "Pause", exact: true })
    .click();
  await page.reload();
  const link = page.getByRole("button", {
    name: "Return to Desert Hours",
    exact: true,
  });
  await expect(link).toBeVisible();
  await a11y(page);
  await link.click();
  await expect(page.getByTestId("player-surface")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Desert Hours", exact: true }),
  ).toBeVisible();
  await open(page);
  await expect(
    page
      .getByTestId("player-surface")
      .getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
});

test("V19 playlist header uses its current title and a deleted source falls back safely", async ({
  page,
  context,
}) => {
  const p = await playlist(context.request, [firstLight, openRoad]);
  await page.goto(`/playlist/${p.id}`);
  await page
    .getByRole("button", {
      name: "Play Open Road Meridian Ensemble",
      exact: true,
    })
    .click();
  await open(page);
  await expect(
    page.getByRole("button", {
      name: `Return to ${p.title}`,
      exact: true,
    }),
  ).toBeVisible();
  let current = await (
    await context.request.get(`${api}/v1/playlists/${p.id}`, { headers })
  ).json();
  expect(
    (
      await context.request.patch(`${api}/v1/playlists/${p.id}`, {
        headers,
        data: { expectedRevision: current.revision, title: "Renamed source" },
      })
    ).ok(),
  ).toBe(true);
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(
    page.getByRole("button", {
      name: "Return to Renamed source",
      exact: true,
    }),
  ).toBeVisible();
  current = await (
    await context.request.get(`${api}/v1/playlists/${p.id}`, { headers })
  ).json();
  expect(
    (
      await context.request.delete(`${api}/v1/playlists/${p.id}`, {
        headers: { ...headers, "idempotency-key": crypto.randomUUID() },
        data: { expectedRevision: current.revision },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Now playing", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Return to / })).toHaveCount(0);
  await expect(
    page.getByTestId("player-surface").getByText("Open Road", { exact: true }),
  ).toBeVisible();
});

test("V19 search source restores the original query even after the search input changed", async ({
  page,
}) => {
  await page.goto("/search");
  const input = page.getByRole("textbox", {
    name: "Search music",
    exact: true,
  });
  await input.fill("open road");
  await page
    .getByRole("button", {
      name: "Play Open Road Meridian Ensemble",
      exact: true,
    })
    .click();
  await input.fill("first light");
  await open(page);
  await page
    .getByRole("button", {
      name: "Return to open road",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("player-surface")).toHaveCount(0);
  await expect(input).toHaveValue("open road");
  await input.fill("blue");
  await open(page);
  await page
    .getByRole("button", {
      name: "Return to open road",
      exact: true,
    })
    .click();
  await expect(input).toHaveValue("open road");
});

test("V19 artist and liked-track selections report their actual sources", async ({
  page,
  context,
}) => {
  await page.goto("/artist/10000000-0000-4000-8000-000000000100");
  await page
    .getByRole("button", {
      name: "Play First Light Meridian Ensemble",
      exact: true,
    })
    .click();
  await open(page, "First Light Meridian Ensemble");
  await page
    .getByRole("button", {
      name: "Return to Meridian Ensemble",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/artist\//);
  expect(
    (
      await context.request.put(`${api}/v1/library/tracks/${firstLight}`, {
        headers,
        data: {},
      })
    ).ok(),
  ).toBe(true);
  await page.goto("/liked");
  await page
    .getByRole("button", {
      name: "Play First Light Meridian Ensemble",
      exact: true,
    })
    .click();
  await open(page, "First Light Meridian Ensemble");
  await page
    .getByRole("button", {
      name: "Return to Liked tracks",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/liked$/);
});
