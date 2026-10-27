import { randomUUID } from "node:crypto";
import { test, expect, api, a11y } from "./fixtures";

test("V24 Library search finds a collection outside the visible window and clears cleanly", async ({
  page,
}) => {
  await page.route("http://localhost:4100/v1/snapshot*", async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace("http://localhost:4100", api),
    });
    const value = await response.json();
    value.playlists = Array.from({ length: 150 }, (_, index) => ({
      id: randomUUID(),
      title: `Collection ${String(index + 1).padStart(3, "0")}`,
      description: "Saved mix",
      owner: true,
      palette: "sea",
      revision: "0",
      items: [],
    }));
    value.libraryEntries = value.playlists.map(
      (item: { id: string }, index: number) => ({
        kind: "playlists",
        id: item.id,
        addedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
      }),
    );
    await route.fulfill({ response, json: value });
  });
  await page.goto("/library");
  const library = page.getByTestId("screen-library");
  await expect(
    library.getByRole("button", { name: /^Open Collection 001 / }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Search library", exact: true })
    .click();
  const search = page.getByRole("textbox", {
    name: "Search your library",
    exact: true,
  });
  await search.fill("Collection 001");
  await expect(
    library.getByRole("button", { name: /^Open Collection 001 / }),
  ).toBeVisible();
  await expect(
    library.getByRole("button", { name: /^Open Collection / }),
  ).toHaveCount(1);
  await a11y(page);
  await search.fill("missing 🔎");
  await expect(
    page.getByRole("heading", { name: "No matching collections", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear search", exact: true })
    .first()
    .click();
  await expect(search).toHaveValue("");
  await expect(
    library.getByRole("button", { name: /^Open Collection / }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close library search", exact: true })
    .click();
  await expect(search).toHaveCount(0);
});
