import { randomUUID } from "node:crypto";
import { test, expect, api } from "./fixtures";

test("C02 Home excludes protected fixtures while Liked tracks retains them", async ({
  page,
}) => {
  let fixtureTitle = "",
    fixtureArtist = "",
    fixtureAlbum = "";
  await page.route("http://localhost:4100/v1/snapshot", async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace("http://localhost:4100", api),
    });
    const value = await response.json();
    const recording = value.catalog.tracks[0];
    const fixture = value.catalog.tracks.find(
      (track: { albumId: string }) => track.albumId !== recording.albumId,
    );
    fixtureTitle = fixture.title;
    fixtureArtist = fixture.artist;
    fixtureAlbum = fixture.album;
    value.hideFixtures = true;
    value.catalog.tracks = value.catalog.tracks.map(
      (track: { id: string }) => ({
        ...track,
        contentKind: track.id === recording.id ? "recording" : "fixture",
      }),
    );
    value.library.tracks = [fixture.id];
    await route.fulfill({ response, json: value });
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
  expect(fixtureAlbum).not.toBe("");
  await expect(page.getByText(fixtureAlbum, { exact: true })).toHaveCount(0);
  await page.goto("/liked");
  await expect(
    page.getByRole("button", {
      name: `Play ${fixtureTitle} ${fixtureArtist}`,
      exact: true,
    }),
  ).toBeVisible();
});

test("V17 Home keeps large album and artist shelves virtualized", async ({
  page,
}) => {
  await page.route("http://localhost:4100/v1/snapshot", async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace("http://localhost:4100", api),
    });
    const value = await response.json();
    const album =
        value.catalog.albums.find(
          (item: { title: string }) => item.title === "Desert Hours",
        ) || value.catalog.albums[0],
      artist = value.catalog.artists[0];
    value.catalog.albums = [
      album,
      ...Array.from({ length: 200 }, (_, i) => ({
        ...album,
        id: randomUUID(),
        title: `Scale release ${i + 1}`,
      })),
    ];
    value.catalog.artists = [
      artist,
      ...Array.from({ length: 200 }, (_, i) => ({
        ...artist,
        id: randomUUID(),
        name: `Scale artist ${i + 1}`,
      })),
    ];
    await route.fulfill({ response, json: value });
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Scale release 1 / }),
  ).toHaveCount(1);
  expect(
    await page.getByRole("button", { name: /Scale release/ }).count(),
  ).toBeLessThanOrEqual(12);
  expect(
    await page.getByRole("button", { name: /Open Scale artist/ }).count(),
  ).toBeLessThanOrEqual(12);
  await expect(
    page.getByRole("button", { name: "Open Scale artist 1", exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: /Desert Hours.*Meridian Ensemble/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Desert Hours", exact: true }),
  ).toBeVisible();
});
