import {
  test as base,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
export let api = "http://localhost:4101";
export const headers = {
  origin: "http://localhost:8081",
  "x-saz-platform": "web",
};
export const test = base.extend<{ listener: void }>({
  listener: [
    async ({ context, page }, use, testInfo) => {
      api = `http://localhost:${testInfo.project.name === "desktop-web" ? 4102 : 4101}`;
      await page.route("http://localhost:4100/**", async (route) => {
        const response = await route.fetch({
          url: route.request().url().replace("http://localhost:4100", api),
        });
        await route.fulfill({ response });
      });
      const failures: string[] = [];
      page.on("pageerror", (e) => failures.push(e.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") failures.push(msg.text());
      });
      page.on("response", (r) => {
        if (r.status() >= 500) failures.push(`${r.status()} ${r.url()}`);
      });
      const response = await context.request.post(`${api}/auth/demo`, {
        headers,
        data: {},
      });
      expect(
        response.ok(),
        `${response.status()} ${await response.text()}`,
      ).toBeTruthy();
      await page.goto("/home");
      await expect(
        page.getByRole("heading", { name: "Find your rhythm", exact: true }),
      ).toBeVisible();
      await use();
      expect(failures).toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
export async function a11y(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
export async function playlist(
  request: APIRequestContext,
  tracks: string[] = [],
) {
  const created = await request.post(`${api}/v1/playlists`, {
    headers: { ...headers, "idempotency-key": randomUUID() },
    data: { title: "QA ýol 🌙", description: "Disposable QA fixture" },
  });
  expect(created.status()).toBe(201);
  const p = await created.json();
  if (tracks.length) {
    const edited = await request.put(`${api}/v1/playlists/${p.id}/items`, {
      headers,
      data: {
        expectedRevision: p.revision,
        items: tracks.map((trackId) => ({ id: randomUUID(), trackId })),
      },
    });
    expect(edited.ok(), await edited.text()).toBeTruthy();
  }
  return p;
}
export async function playHome(page: Page) {
  await page
    .getByRole("button", { name: /Desert Hours.*Meridian Ensemble/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Desert Hours", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Play Open Road Meridian Ensemble",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
}
export async function seekTo(page: Page, seconds: number) {
  const slider = page.getByRole("slider");
  await slider.press("Home");
  for (let i = 0; i < seconds * 10; i++) await slider.press("ArrowRight");
  await expect(
    page
      .getByText(`0:${String(seconds).padStart(2, "0")}`, { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
}
