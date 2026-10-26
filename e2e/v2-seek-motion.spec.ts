import { test, expect, playHome } from "./fixtures";

test("V19 scrubbing previews locally and commits one seek on release", async ({
  page,
}) => {
  await page.evaluate(() => {
    const property = Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      "currentTime",
    )!;
    Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
      ...property,
      set(value: number) {
        const values = Reflect.get(globalThis, "__seekValues");
        if (Array.isArray(values)) values.push(value);
        property.set!.call(this, value);
      },
    });
  });
  await playHome(page);
  await page
    .getByRole("button", {
      name: "Open player for Open Road Meridian Ensemble",
      exact: true,
    })
    .click();
  const surface = page.getByTestId("player-surface");
  await surface.getByRole("button", { name: "Pause", exact: true }).click();
  const slider = page.getByRole("slider");
  const box = (await slider.boundingBox())!;
  await page.evaluate(() => Reflect.set(globalThis, "__seekValues", []));
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2, {
    steps: 15,
  });
  expect(
    await page.evaluate(() => Reflect.get(globalThis, "__seekValues").length),
  ).toBe(0);
  const preview = Number(await slider.inputValue());
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(globalThis, "__seekValues").length),
    )
    .toBe(1);
  await expect
    .poll(async () => Math.abs(Number(await slider.inputValue()) - preview))
    .toBeLessThan(0.2);
  await slider.press("Home");
  await expect(slider).toHaveValue("0");
});
