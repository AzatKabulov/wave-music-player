import type { Page } from "@playwright/test";
import { test, expect, a11y, playHome } from "./fixtures";

// The fake clock moves the client minutes ahead of the API, which rightly rejects
// listening events dated in the future. History is not under test here, so absorb them.
async function absorbListeningEvents(page: Page) {
  await page.route("http://localhost:4100/v1/listening-events", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
}

async function openPlayer(page: Page) {
  await playHome(page);
  await page
    .getByRole("button", {
      name: "Open player for Open Road Meridian Ensemble",
      exact: true,
    })
    .click();
  const surface = page.getByTestId("player-surface");
  await expect(
    surface.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  return surface;
}
const choose = async (
  page: Page,
  surface: ReturnType<Page["getByTestId"]>,
  option: string,
) => {
  await surface.getByRole("button", { name: /^Sleep timer/ }).click();
  await page.getByRole("button", { name: option, exact: true }).click();
};

test("V33 a duration timer pauses once at its deadline and never resumes", async ({
  page,
}) => {
  await page.clock.install();
  await absorbListeningEvents(page);
  const surface = await openPlayer(page);
  await surface
    .getByRole("button", { name: "Sleep timer", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sleep timer", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "15 minutes", exact: true }).click();
  await expect(
    surface.getByRole("button", { name: /^Sleep timer (1[45]|0):\d{2}$/ }),
  ).toBeVisible();

  await page.clock.fastForward("14:00");
  await expect(
    surface.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();

  await page.clock.fastForward("02:00");
  await expect(
    surface.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await expect(
    surface.getByRole("button", { name: "Sleep timer", exact: true }),
  ).toBeVisible();
  // Expiry is spent: later minutes and ticks must not restart or re-pause anything.
  await page.clock.fastForward("30:00");
  await page.waitForTimeout(1500);
  await expect(
    surface.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await surface.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    surface.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward("10:00");
  await page.waitForTimeout(1500);
  await expect(
    surface.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
});

test("V33 turning the timer off keeps playback going past the old deadline", async ({
  page,
}) => {
  await page.clock.install();
  await absorbListeningEvents(page);
  const surface = await openPlayer(page);
  await choose(page, surface, "5 minutes");
  await expect(
    surface.getByRole("button", { name: /^Sleep timer \d:\d{2}$/ }),
  ).toBeVisible();
  await surface.getByRole("button", { name: /^Sleep timer/ }).click();
  await page
    .getByRole("button", { name: "Turn off timer", exact: true })
    .click();
  await expect(
    surface.getByRole("button", { name: "Sleep timer", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward("06:00");
  await page.waitForTimeout(1500);
  await expect(
    surface.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
});

test("V33 end of track pauses on the same song before the next one starts", async ({
  page,
}) => {
  const surface = await openPlayer(page);
  await surface
    .getByRole("button", { name: "Sleep timer", exact: true })
    .click();
  // react-native-web gives the modal its dialog role once the fade finishes, and
  // contrast is only meaningful after that fade has stopped blending colors. This audit
  // runs without the fake clock, which would also stall the animation.
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(600);
  await a11y(page);
  await page.getByRole("button", { name: "End of track", exact: true }).click();
  await expect(
    surface.getByRole("button", { name: /^Sleep timer End of track$/ }),
  ).toBeVisible();
  // Audit the settled player, not the dialog while it is still fading out.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await a11y(page);
  const slider = page.getByRole("slider");
  const box = (await slider.boundingBox())!;
  // Fixture songs are 24 s long; jump to about 90% and let it run out.
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  await expect(
    surface.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    surface.getByRole("button", { name: "Sleep timer", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(
    surface.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  // Still on the song that was playing: the next one never started.
  await expect(
    surface.getByRole("button", { name: "Actions for Open Road", exact: true }),
  ).toBeVisible();
});
