import { test, expect, api, playHome, seekTo } from "./fixtures";

test("V06 Home and a new selection do not wait for an old queue restore", async ({
  page,
}) => {
  await playHome(page);
  let release!: () => void, arrived!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  let first = true;
  await page.route("**/v1/playback-sessions/*", async (route) => {
    if (route.request().method() !== "GET" || !first) return route.fallback();
    first = false;
    const response = await route.fetch({
      url: route.request().url().replace("http://localhost:4100", api),
    });
    arrived();
    await held;
    await route.fulfill({ response });
  });
  try {
    await page.goto("/home");
    await requested;
    await expect(
      page.getByRole("heading", { name: "Home", exact: true }),
    ).toBeVisible({ timeout: 2500 });
    await page
      .getByRole("button", { name: /Desert Hours.*Meridian Ensemble/ })
      .click();
    await page
      .getByRole("button", {
        name: "Play First Light Meridian Ensemble",
        exact: true,
      })
      .click();
    const player = page.getByRole("button", {
      name: "Open player for First Light Meridian Ensemble",
      exact: true,
    });
    await expect(player).toBeVisible({ timeout: 2500 });
    const restored = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes("/playback-sessions/"),
    );
    release();
    await restored;
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(player).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Pause", exact: true }),
    ).toBeVisible();
  } finally {
    release();
  }
});

test("V08 a stalled cursor response does not block shuffle or replace playback", async ({
  page,
}) => {
  await playHome(page);
  await page
    .getByRole("button", {
      name: "Open player for Open Road Meridian Ensemble",
      exact: true,
    })
    .click();
  let release!: () => void, arrived!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  await page.route("**/v1/playback-sessions/*/position", async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace("http://localhost:4100", api),
    });
    arrived();
    await held;
    await route.fulfill({ response });
  });
  try {
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await seekTo(page, 8);
    await requested;
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page
      .getByRole("button", { name: "Enable shuffle", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Disable shuffle", exact: true }),
    ).toBeVisible({ timeout: 2500 });
    await expect(
      page.getByRole("button", { name: "Pause", exact: true }),
    ).toBeVisible();
  } finally {
    release();
  }
});
