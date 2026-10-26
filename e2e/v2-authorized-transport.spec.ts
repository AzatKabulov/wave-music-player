import { test, expect, api, playHome } from "./fixtures";

for (const expired of [false, true])
  test(`V09 first play uses inline authorization with expired=${expired}`, async ({
    page,
  }) => {
    let separateGrants = 0;
    let inline = false;
    await page.route("**/v1/playback-sessions/*/grants", async (route) => {
      if (route.request().method() === "POST") separateGrants++;
      return route.fallback();
    });
    await page.route("**/v1/playback-sessions/*", async (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      expect(route.request().postDataJSON().includeGrant).toBe(true);
      const response = await route.fetch({
        url: route.request().url().replace("http://localhost:4100", api),
      });
      const payload = await response.json();
      inline = !!payload.playbackGrant?.token;
      if (expired) payload.playbackGrant.expiresAt = "2000-01-01T00:00:00.000Z";
      await route.fulfill({ response, json: payload });
    });
    await playHome(page);
    expect(inline).toBe(true);
    expect(separateGrants).toBe(expired ? 1 : 0);
    await page
      .getByRole("button", {
        name: "Open player for Open Road Meridian Ensemble",
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Play", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Pause", exact: true }),
    ).toBeVisible();
    expect(separateGrants).toBe(expired ? 1 : 0);
  });
