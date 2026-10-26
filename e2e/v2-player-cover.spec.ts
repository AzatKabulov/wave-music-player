import { test, expect, api, playHome } from "./fixtures";

test("V20 real cover images leave horizontal and vertical drags to the player", async ({
  page,
}) => {
  const artwork = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#3d6654"/></svg>')}`;
  await page.route(
    /^http:\/\/localhost:4100\/v1\/(snapshot|resolve\/)/,
    async (route) => {
      const response = await route.fetch({
        url: route.request().url().replace("http://localhost:4100", api),
      });
      const value = await response.json();
      const catalog = value.catalog || value;
      catalog.tracks = catalog.tracks.map((track: { id: string }) => ({
        ...track,
        artworkUrl: artwork,
      }));
      await route.fulfill({ response, json: value });
    },
  );
  await page.reload();
  await playHome(page);
  await page
    .getByRole("button", {
      name: "Play First Light Meridian Ensemble",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Open player for First Light Meridian Ensemble",
      exact: true,
    })
    .click();
  const surface = page.getByTestId("player-surface");
  await expect
    .poll(async () => (await surface.boundingBox())?.y)
    .toBeLessThan(2);
  await surface.getByRole("button", { name: "Pause", exact: true }).click();
  await expect
    .poll(() =>
      page
        .getByTestId("player-cover-0")
        .locator("img")
        .evaluateAll(
          (images) =>
            images.length > 0 &&
            images.every(
              (img) =>
                img instanceof HTMLImageElement &&
                img.complete &&
                img.naturalWidth > 0,
            ),
        ),
    )
    .toBe(true);
  const artworkBox = (await page.getByTestId("player-artwork").boundingBox())!;
  const x = artworkBox.x + artworkBox.width / 2,
    y = artworkBox.y + artworkBox.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 130, y, { steps: 14 });
  await page.mouse.up();
  await expect(surface.getByText("Open Road", { exact: true })).toBeVisible();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 230, { steps: 16 });
  await page.mouse.up();
  await expect(surface).toHaveCount(0);
});
