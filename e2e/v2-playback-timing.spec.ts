import { test, expect, playHome, api } from "./fixtures";
import type { Page } from "@playwright/test";

type Trace = {
  action: string;
  marks: Record<string, number>;
};
const traces = (page: Page): Promise<Trace[]> =>
  page.evaluate(() => Reflect.get(globalThis, "__musifyPlaybackTimings")());

for (const delay of [0, 350])
  test(`V07 playback stages attribute a ${delay}ms queue response delay`, async ({
    page,
  }, testInfo) => {
    if (delay)
      await page.route("**/v1/playback-sessions/*", async (route) => {
        if (route.request().method() !== "PUT") return route.fallback();
        const response = await route.fetch({
          url: route.request().url().replace("http://localhost:4100", api),
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
        await route.fulfill({ response });
      });
    await playHome(page);
    await expect
      .poll(
        async () =>
          (await traces(page)).find((row) => row.action === "playSelection")
            ?.marks.playbackObserved,
      )
      .toBeDefined();
    const rows = await traces(page);
    const marks = rows.find((row) => row.action === "playSelection")!.marks;
    for (const key of [
      "commandStarted",
      "requestStarted",
      "serverAcknowledged",
      "grantStarted",
      "grantReady",
      "installStarted",
      "installed",
      "playbackObserved",
    ])
      expect(marks[key], key).toBeGreaterThanOrEqual(0);
    expect(marks.playbackObserved).toBeGreaterThanOrEqual(marks.installed);
    if (delay)
      expect(
        marks.serverAcknowledged - marks.requestStarted,
      ).toBeGreaterThanOrEqual(300);
    expect(JSON.stringify(rows)).not.toMatch(
      /https?:|bearer|refreshToken|accessToken/i,
    );
    await testInfo.attach("playback-timings", {
      body: JSON.stringify({ delay, traces: rows }, null, 2),
      contentType: "application/json",
    });
  });
