import { test, expect, api, a11y, playHome } from "./fixtures";

test("F15 a delayed search cannot replace a newer query", async ({ page }) => {
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  let reached!: () => void;
  const started = new Promise<void>((resolve) => {
    reached = resolve;
  });
  await page.route("http://localhost:4100/v1/search?**", async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace("http://localhost:4100", api),
    });
    if (new URL(route.request().url()).searchParams.get("q") === "open") {
      reached();
      await delayed;
    }
    await route.fulfill({ response }).catch(() => {});
  });
  await page
    .getByRole("tab", { name: "Search", exact: true })
    .or(page.getByRole("button", { name: "Search", exact: true }))
    .click();
  const field = page.getByRole("textbox", {
    name: "Search music",
    exact: true,
  });
  await field.fill("open");
  await started;
  await field.fill("Blue");
  await expect(
    page.getByRole("button", { name: /Play Blue Current/ }),
  ).toBeVisible();
  release();
  await expect(
    page.getByRole("button", { name: /Play Open Road/ }),
  ).toHaveCount(0);
  await expect(field).toHaveValue("Blue");
  await a11y(page);
});

test("F15 removing a queued occurrence can be undone without replacing its identity", async ({
  page,
}) => {
  await playHome(page);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: /Open player for Open Road/ }).click();
  await page.getByRole("button", { name: "Queue", exact: true }).click();
  const remove = page.getByRole("button", { name: /Remove queue entry/ });
  const count = await remove.count();
  await page
    .getByRole("button", { name: "Remove queue entry 1", exact: true })
    .click();
  await expect(remove).toHaveCount(count - 1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(remove).toHaveCount(count);
  await expect(
    page.getByText("Removed from queue", { exact: true }),
  ).toHaveCount(0);
  await a11y(page);
});

test("F15 action sheets retain the source screen without allowing background focus", async ({
  page,
}) => {
  await page
    .getByRole("tab", { name: "Search", exact: true })
    .or(page.getByRole("button", { name: "Search", exact: true }))
    .click();
  await page
    .getByRole("textbox", { name: "Search music", exact: true })
    .fill("Open Road");
  await page
    .getByRole("button", { name: "Actions for Open Road", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Play next", exact: true }),
  ).toBeVisible();
  const background = page.getByTestId("screen-search");
  await expect(background).toHaveCSS("display", "flex");
  await expect(background).toHaveAttribute("inert", "");
  const bounds = await background.boundingBox();
  expect(bounds?.width).toBeGreaterThan(200);
  expect(bounds?.height).toBeGreaterThan(300);
  await expect(
    page.getByRole("textbox", { name: "Search music", exact: true }),
  ).toHaveCount(0);
  await a11y(page);
});
