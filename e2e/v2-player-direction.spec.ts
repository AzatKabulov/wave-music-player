import { test, expect, playlist, seekTo, playHome } from "./fixtures";

test("V20 transport buttons select the distinct previous/next entry even after seeking", async ({
  page,
  context,
}) => {
  const p = await playlist(context.request, [
    "10000000-0000-4000-8000-000000000300",
    "10000000-0000-4000-8000-000000000301",
    "10000000-0000-4000-8000-000000000302",
  ]);
  await page.goto(`/playlist/${p.id}`);
  await page
    .getByRole("button", {
      name: "Play Open Road Meridian Ensemble",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Open player for Open Road Meridian Ensemble",
      exact: true,
    })
    .click();
  const surface = page.getByTestId("player-surface");
  await expect
    .poll(async () => (await surface.boundingBox())?.y)
    .toBeLessThan(2);
  await surface.getByRole("button", { name: "Pause", exact: true }).click();
  const previous = surface.getByRole("button", {
    name: "Previous track",
    exact: true,
  });
  const next = surface.getByRole("button", { name: "Next track", exact: true });
  expect((await previous.boundingBox())!.x).toBeLessThan(
    (await next.boundingBox())!.x,
  );
  await next.click();
  await expect(
    surface.getByText("Blue Current", { exact: true }),
  ).toBeVisible();
  await previous.click();
  await expect(surface.getByText("Open Road", { exact: true })).toBeVisible();
  await seekTo(page, 10);
  await previous.click();
  await expect(surface.getByText("First Light", { exact: true })).toBeVisible();
  await expect(
    surface.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
});

test("V20 two-entry repeat previous animates left and keeps the incoming cover mounted", async ({
  page,
  context,
}) => {
  const p = await playlist(context.request, [
    "10000000-0000-4000-8000-000000000300",
    "10000000-0000-4000-8000-000000000301",
  ]);
  await page.goto(`/playlist/${p.id}`);
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
  await surface
    .getByRole("button", { name: "Repeat: none", exact: true })
    .click();
  await expect(
    surface.getByRole("button", { name: "Repeat: all", exact: true }),
  ).toBeVisible();
  const art = (await page.getByTestId("player-artwork").boundingBox())!;
  await page.getByTestId("player-cover-1").evaluate((element) => {
    Reflect.set(globalThis, "__incomingCover", element);
  });
  // Sample the newly active cover every frame: previous must enter from the right.
  await page.evaluate(() => {
    const samples: { time: number; x: number }[] = [];
    Reflect.set(globalThis, "__coverSamples", samples);
    const start = performance.now();
    const sample = () => {
      const cover = Reflect.get(globalThis, "__incomingCover") as HTMLElement;
      const bounds = document.querySelector('[data-testid="player-artwork"]');
      if (cover && bounds)
        samples.push({
          time: performance.now() - start,
          x: cover.getBoundingClientRect().x - bounds.getBoundingClientRect().x,
        });
      if (performance.now() - start < 1000) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await surface
    .getByRole("button", { name: "Previous track", exact: true })
    .click();
  await expect(surface.getByText("Open Road", { exact: true })).toBeVisible();
  expect(
    await page
      .getByTestId("player-cover-0")
      .evaluate(
        (element) => element === Reflect.get(globalThis, "__incomingCover"),
      ),
  ).toBe(true);
  await expect
    .poll(async () =>
      Math.abs(
        (await page.getByTestId("player-cover-0").boundingBox())!.x - art.x,
      ),
    )
    .toBeLessThan(2);
  const samples = await page.evaluate(
    () =>
      Reflect.get(globalThis, "__coverSamples") as {
        time: number;
        x: number;
      }[],
  );
  expect(samples.filter((sample) => sample.x > 10).length).toBeGreaterThan(2);
  expect(samples.every((sample) => sample.x >= -2)).toBe(true);
  const moving = samples.filter((sample) => sample.x > 10);
  expect(moving.at(-1)!.time - moving[0].time).toBeGreaterThan(180);
});

test("V20 player header respects simulated notch insets in portrait and landscape", async ({
  page,
  context,
}) => {
  const cdp = await context.newCDPSession(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await cdp.send("Emulation.setSafeAreaInsetsOverride", {
    insets: { top: 59, bottom: 34, left: 0, right: 0 },
  });
  await page.reload();
  await playHome(page);
  await page
    .getByRole("button", {
      name: "Open player for Open Road Meridian Ensemble",
      exact: true,
    })
    .click();
  const surface = page.getByTestId("player-surface");
  await expect
    .poll(async () => (await surface.boundingBox())?.y)
    .toBeLessThan(2);
  const header = page.getByTestId("player-header");
  await expect
    .poll(async () => (await header.boundingBox())?.y)
    .toBeGreaterThanOrEqual(67);
  await cdp.send("Emulation.setSafeAreaInsetsOverride", {
    insets: { top: 0, bottom: 21, left: 59, right: 59 },
  });
  await page.setViewportSize({ width: 852, height: 393 });
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await expect
    .poll(async () => (await header.boundingBox())?.x)
    .toBeGreaterThanOrEqual(59);
  const close = await surface
    .getByRole("button", { name: "Close player", exact: true })
    .boundingBox();
  expect(close!.x).toBeGreaterThanOrEqual(59);
  await surface
    .getByRole("button", { name: "Close player", exact: true })
    .click();
  await expect(surface).toHaveCount(0);
  await cdp.detach();
});

test("V20 consecutive next taps preserve cover coverage during interruption", async ({
  page,
  context,
}) => {
  const p = await playlist(
    context.request,
    [300, 301, 302, 303, 304].map(
      (n) => `10000000-0000-4000-8000-000000000${n}`,
    ),
  );
  await page.goto(`/playlist/${p.id}`);
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
  await page.evaluate(() => {
    const samples: number[] = [];
    Reflect.set(globalThis, "__coverCoverage", samples);
    const start = performance.now();
    const sample = () => {
      const art = document
        .querySelector('[data-testid="player-artwork"]')!
        .getBoundingClientRect();
      const intervals = [
        ...document.querySelectorAll('[data-testid^="player-cover-"]'),
      ]
        .map((node) => node.getBoundingClientRect())
        .map((r) => [Math.max(art.left, r.left), Math.min(art.right, r.right)])
        .filter(([a, b]) => b > a)
        .sort((a, b) => a[0] - b[0]);
      let right = art.left,
        covered = 0;
      for (const [a, b] of intervals) {
        covered += Math.max(0, b - Math.max(a, right));
        right = Math.max(right, b);
      }
      samples.push(art.width - covered);
      if (performance.now() - start < 2400) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  const next = surface.getByRole("button", { name: "Next track", exact: true });
  await next.click();
  await expect(surface.getByText("Open Road", { exact: true })).toBeVisible();
  await next.click();
  await expect(
    surface.getByText("Blue Current", { exact: true }),
  ).toBeVisible();
  const box = (await page.getByTestId("player-artwork").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 22, box.y + box.height / 2, {
    steps: 8,
  });
  // Hold the interrupted gesture beyond the ordinary cover-cleanup interval.
  await page.waitForTimeout(650);
  await page.mouse.up();
  await expect
    .poll(async () =>
      Math.abs(
        (await page.getByTestId("player-cover-0").boundingBox())!.x -
          (await page.getByTestId("player-artwork").boundingBox())!.x,
      ),
    )
    .toBeLessThan(1);
  const uncovered = await page.evaluate(
    () => Reflect.get(globalThis, "__coverCoverage") as number[],
  );
  expect(Math.max(...uncovered)).toBeLessThanOrEqual(26);
  await expect
    .poll(() => page.locator('[data-testid^="player-cover-"]').count())
    .toBeLessThanOrEqual(3);
});
