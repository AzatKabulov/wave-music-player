import type { APIRequestContext, Locator, Page } from "@playwright/test";
import { test, expect, api, headers, a11y, playlist } from "./fixtures";

type Named = { id: string; title?: string; name?: string };

async function catalogOf(request: APIRequestContext) {
  const response = await request.get(`${api}/v1/snapshot`, { headers });
  expect(response.ok()).toBeTruthy();
  const { catalog } = await response.json();
  return catalog as { albums: Named[]; artists: Named[] };
}
const save = async (request: APIRequestContext, kind: string, id: string) =>
  expect(
    (
      await request.put(`${api}/v1/library/${kind}/${id}`, {
        headers,
        data: {},
      })
    ).ok(),
  ).toBeTruthy();
const labelOf = (item: Named) => (item.title ?? item.name) as string;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const row = (page: Page, item: Named) =>
  page
    .getByTestId("screen-library")
    .getByRole("button", {
      name: new RegExp(`^Open ${escape(labelOf(item))} `),
    });
const order = (page: Page) =>
  page
    .getByTestId("screen-library")
    .getByRole("button", { name: /^Open / })
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("aria-label")),
    );

async function longPress(page: Page, target: Locator) {
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // Pressable's long-press delay is 500 ms.
  await page.waitForTimeout(700);
  await page.mouse.up();
}

test("V24 a pinned collection leads every sort, survives a reload and unpins from the same menu", async ({
  page,
  context,
}) => {
  const { albums, artists } = await catalogOf(context.request);
  const [first, second] = albums;
  const [artist] = artists;
  await save(context.request, "albums", first.id);
  await save(context.request, "albums", second.id);
  await save(context.request, "artists", artist.id);
  await page.goto("/library");
  await expect(row(page, first)).toBeVisible();
  const recent = await order(page);
  expect(recent[0]).toContain(`Open ${labelOf(artist)} `);
  expect(recent.every((label) => !label?.endsWith(", Pinned"))).toBeTruthy();

  await longPress(page, row(page, first));
  await page
    .getByRole("button", { name: "Pin to top of library", exact: true })
    .click();
  await expect(row(page, first)).toBeVisible();
  const pinned = await order(page);
  expect(pinned[0]).toContain(`Open ${labelOf(first)} `);
  expect(pinned[0]).toMatch(/, Pinned$/);
  expect(pinned.slice(1).every((label) => !label?.endsWith(", Pinned"))).toBe(
    true,
  );

  await page.reload();
  await expect(row(page, first)).toBeVisible();
  expect((await order(page))[0]).toContain(`Open ${labelOf(first)} `);

  await page
    .getByRole("button", { name: "Recently added", exact: true })
    .click();
  await page.getByRole("button", { name: "Title", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Title", exact: true }),
  ).toBeVisible();
  expect((await order(page))[0]).toContain(`Open ${labelOf(first)} `);
  await a11y(page);

  await longPress(page, row(page, first));
  await page
    .getByRole("button", { name: "Unpin from top of library", exact: true })
    .click();
  await expect(row(page, first)).toBeVisible();
  expect(
    (await order(page)).every((label) => !label?.endsWith(", Pinned")),
  ).toBe(true);
});

test("V24 the ninth pin is refused with a clear message and changes nothing", async ({
  page,
  context,
}) => {
  const { albums } = await catalogOf(context.request);
  const [album] = albums;
  for (let index = 0; index < 8; index += 1) {
    const created = await playlist(context.request);
    const pin = await context.request.put(
      `${api}/v1/library/pins/playlists/${created.id}`,
      { headers, data: {} },
    );
    expect(pin.ok(), await pin.text()).toBeTruthy();
  }
  await save(context.request, "albums", album.id);
  await page.goto(`/actions/${album.id}?collection=album`);
  await page
    .getByRole("button", { name: "Pin to top of library", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({
      hasText: "You can pin up to 8 Library items.",
    }),
  ).toBeVisible();
  await page.goto("/library");
  await expect(row(page, album)).toBeVisible();
  expect(
    (await order(page)).filter((label) => label?.endsWith(", Pinned")),
  ).toHaveLength(8);
  expect(await row(page, album).getAttribute("aria-label")).not.toMatch(
    /, Pinned$/,
  );
});

test("V24 a rejected pin write restores the confirmed state and explains why", async ({
  page,
  context,
}) => {
  const { albums } = await catalogOf(context.request);
  const [album] = albums;
  await save(context.request, "albums", album.id);
  await page.goto("/library");
  await expect(row(page, album)).toBeVisible();
  await page.evaluate(() => {
    const transport = globalThis.fetch.bind(globalThis);
    globalThis.fetch = (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.includes("/v1/library/pins/") && init?.method === "PUT")
        return Promise.resolve(
          new Response(
            JSON.stringify({
              error: {
                code: "pin_limit",
                message: "You can pin up to 8 Library items.",
              },
            }),
            { status: 409, headers: { "Content-Type": "application/json" } },
          ),
        );
      return transport(input, init);
    };
  });
  await longPress(page, row(page, album));
  await page
    .getByRole("button", { name: "Pin to top of library", exact: true })
    .click();
  await expect(
    page.getByText("You can pin up to 8 Library items.", { exact: true }),
  ).toBeVisible();
  await expect(row(page, album)).toBeVisible();
  expect(await row(page, album).getAttribute("aria-label")).not.toMatch(
    /, Pinned$/,
  );
});
