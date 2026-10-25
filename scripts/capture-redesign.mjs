import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const host = "http://192.168.0.4:8082";
const api = "http://192.168.0.4:4103";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const captures = [];
try {
  for (const [name, viewport] of [
    ["phone-web", { width: 390, height: 844 }],
    ["wide-web", { width: 1440, height: 900 }],
  ]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    const auth = await context.request.post(`${api}/auth/demo`, {
      headers: { origin: host, "x-saz-platform": "web" },
      data: {},
    });
    if (!auth.ok()) throw Error(`Capture login ${auth.status()}`);
    const page = await context.newPage();
    await mkdir(".impeccable/review", { recursive: true });
    const shot = async (screen) => {
      await expect
        .poll(() =>
          page.locator("img").evaluateAll((images) =>
            images
              .filter((image) => {
                const r = image.getBoundingClientRect();
                return (
                  r.width > 0 &&
                  r.height > 0 &&
                  r.top < innerHeight &&
                  r.bottom > 0 &&
                  r.left < innerWidth &&
                  r.right > 0
                );
              })
              .every((image) => image.complete && image.naturalWidth > 0),
          ),
        )
        .toBe(true);
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      const path = `.impeccable/review/${screen}-${name}.png`;
      await page.screenshot({ path, fullPage: true });
      captures.push({
        screen,
        viewport,
        path,
        surface: "React Native web preview; not native phone evidence",
      });
    };
    await page.goto(`${host}/home`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await expect(
      page.getByRole("heading", { name: "Home", exact: true }),
    ).toBeVisible({ timeout: 60000 });
    await page
      .getByRole("button", { name: "Open settings", exact: true })
      .waitFor();
    await shot("home");
    const response = await context.request.get(`${api}/v1/snapshot`, {
      headers: { origin: host, "x-saz-platform": "web" },
    });
    const snapshot = await response.json();
    const track =
      snapshot.catalog.tracks.find(
        (track) => track.title === "Blinding Lights",
      ) || snapshot.catalog.tracks[0];
    await page.goto(`${host}/album/${track.albumId}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { name: track.album, exact: true }),
    ).toBeVisible();
    await shot("collection");
    await page
      .getByRole("button", {
        name: `Play ${track.title} ${track.artist}`,
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: new RegExp(`Open player for ${track.title}`),
      })
      .click();
    await expect(
      page.getByRole("heading", { name: "Now playing", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await shot("player");
    await page.getByRole("button", { name: "Queue", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Your queue", exact: true }),
    ).toBeVisible();
    await shot("queue");
    await page.goto(`${host}/search`, { waitUntil: "domcontentloaded" });
    await page
      .getByRole("textbox", { name: "Search music", exact: true })
      .fill("The Weeknd");
    await expect(
      page.getByRole("button", {
        name: `Play ${track.title} ${track.artist}`,
        exact: true,
      }),
    ).toBeVisible();
    await shot("search");
    await page
      .getByRole("button", { name: `Actions for ${track.title}`, exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Play next", exact: true }),
    ).toBeVisible();
    await shot("sheet");
    await page.goto(`${host}/library`, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Your library", exact: true }),
    ).toBeVisible();
    await shot("library");
    await page.goto(`${host}/settings`, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Settings", exact: true }),
    ).toBeVisible();
    await shot("settings");
    await context.close();
  }
  await writeFile(
    ".impeccable/review/captures.json",
    JSON.stringify(captures, null, 2),
  );
  console.log(`Captured ${captures.length} screens`);
} finally {
  await browser.close();
}
