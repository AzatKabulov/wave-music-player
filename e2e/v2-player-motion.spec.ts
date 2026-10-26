import { test, expect, playHome, seekTo } from "./fixtures";

test("V20 player dismissal moves one surface and restores the unchanged browse layout", async ({
  page,
}) => {
  await playHome(page);
  const album = page.getByTestId("screen-album");
  const before = await album.boundingBox();
  const open = () =>
    page
      .getByRole("button", {
        name: "Open player for Open Road Meridian Ensemble",
        exact: true,
      })
      .click();
  await open();
  const surface = page.getByTestId("player-surface");
  await expect
    .poll(async () => (await surface.boundingBox())?.y)
    .toBeLessThan(2);
  expect((await album.boundingBox())?.height).toBe(before?.height);
  const area = (await page.getByTestId("player-drag-area").boundingBox())!;
  const x = area.x + area.width / 2,
    y = area.y + 90;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 50, { steps: 8 });
  await page.mouse.move(x, y, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => (await surface.boundingBox())?.y)
    .toBeLessThan(2);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 220, { steps: 15 });
  await page.mouse.up();
  await expect(surface).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  expect((await album.boundingBox())?.height).toBe(before?.height);
  await open();
  await page.getByRole("button", { name: "Close player", exact: true }).click();
  await expect(surface).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Desert Hours", exact: true }),
  ).toBeVisible();
});

test("V20 artwork swipes right-next and left-previous without restarting the current song", async ({
  page,
}) => {
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
  const swipe = async (direction: number) => {
    await expect
      .poll(async () => (await surface.boundingBox())?.y)
      .toBeLessThan(2);
    const box = (await page.getByTestId("player-artwork").boundingBox())!;
    const start = box.x + box.width / 2,
      y = box.y + box.height / 2;
    await page.mouse.move(start, y);
    await page.mouse.down();
    await page.mouse.move(start + direction * 130, y, { steps: 14 });
    await page.mouse.up();
  };
  await swipe(1);
  await expect(surface.getByText("Open Road", { exact: true })).toBeVisible();
  await surface.getByRole("button", { name: "Pause", exact: true }).click();
  await seekTo(page, 10);
  await swipe(-1);
  await expect(surface.getByText("First Light", { exact: true })).toBeVisible();
  await expect(
    surface.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await swipe(-1);
  await expect(surface.getByText("First Light", { exact: true })).toBeVisible();
});
