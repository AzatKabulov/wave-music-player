import type { Page } from "@playwright/test";
import { test, expect, a11y } from "./fixtures";

const field = (page: Page) =>
  page.getByRole("textbox", { name: "Search music", exact: true });
const openSearch = (page: Page) =>
  page
    .getByRole("tab", { name: "Search", exact: true })
    .or(page.getByRole("button", { name: "Search", exact: true }))
    .click();

test("V25 an exact artist leads the results once, above every song that mentions them", async ({
  page,
}) => {
  await openSearch(page);
  await field(page).fill("Meridian");
  await expect(
    page.getByRole("heading", { name: "Top result", exact: true }),
  ).toBeVisible();
  const artist = page.getByRole("button", {
    name: "Meridian Ensemble Artist",
    exact: true,
  });
  await expect(artist).toHaveCount(1);
  const firstSong = page
    .getByRole("button", { name: /^Play .* Meridian Ensemble$/ })
    .first();
  await expect(firstSong).toBeVisible();
  expect((await artist.boundingBox())!.y).toBeLessThan(
    (await firstSong.boundingBox())!.y,
  );
  await a11y(page);
  await artist.click();
  await expect(
    page.getByRole("heading", { name: "Meridian Ensemble", exact: true }),
  ).toBeVisible();
});

test("V25 an exact song title is the top result, shown once, and still plays in the ranked context", async ({
  page,
}) => {
  await openSearch(page);
  await field(page).fill("open road");
  await expect(
    page.getByRole("heading", { name: "Top result", exact: true }),
  ).toBeVisible();
  const song = page.getByRole("button", {
    name: "Play Open Road Meridian Ensemble",
    exact: true,
  });
  await expect(song).toHaveCount(1);
  const heading = page.getByRole("heading", {
    name: "Top result",
    exact: true,
  });
  expect((await heading.boundingBox())!.y).toBeLessThan(
    (await song.boundingBox())!.y,
  );
  await song.click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
});

test("V25 the Tracks filter has no top result and lists every matching song", async ({
  page,
}) => {
  await openSearch(page);
  await field(page).fill("open road");
  await expect(
    page.getByRole("heading", { name: "Top result", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tracks", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Top result", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Play Open Road Meridian Ensemble",
      exact: true,
    }),
  ).toHaveCount(1);
});
