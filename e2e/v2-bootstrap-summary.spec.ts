import { test, expect, api, headers, playlist } from "./fixtures";
const a = "10000000-0000-4000-8000-000000000301",
  b = "10000000-0000-4000-8000-000000000300";

test("V04 cold summary edit waits for detail and preserves duplicate entry identities", async ({
  page,
  context,
}) => {
  const p = await playlist(context.request, [a, b, a]);
  const before = (
    await context.request.get(`${api}/v1/playlists/${p.id}`, { headers })
  ).json();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    `http://localhost:4100/v1/resolve/playlist/${p.id}`,
    async (route) => {
      await gate;
      await route.fallback();
    },
  );
  try {
    await page.goto(`/edit/${p.id}`);
    await expect(
      page.getByRole("heading", { name: "Edit playlist", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save playlist", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("textbox", { name: "Playlist name", exact: true }),
    ).toHaveCount(0);
    release();
    await expect(
      page.getByRole("textbox", { name: "Playlist name", exact: true }),
    ).toHaveValue(p.title);
    await page
      .getByRole("textbox", { name: "Playlist name", exact: true })
      .fill("Summary-safe mix");
    await page
      .getByRole("button", { name: "Save playlist", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Summary-safe mix", exact: true }),
    ).toBeVisible();
    const after = (
      await context.request.get(`${api}/v1/playlists/${p.id}`, { headers })
    ).json();
    expect((await after).items).toEqual((await before).items);
  } finally {
    release();
  }
});

test("V04 background refresh keeps the draft and its original revision after a remote edit", async ({
  page,
  context,
}) => {
  const p = await playlist(context.request, [a, b]);
  await page.goto(`/edit/${p.id}`);
  const name = page.getByRole("textbox", {
    name: "Playlist name",
    exact: true,
  });
  await expect(name).toHaveValue(p.title);
  const before = (
    await context.request.get(`${api}/v1/playlists/${p.id}`, { headers })
  ).json();
  const revision = (await before).revision;
  await name.fill("My unsaved draft");
  expect(
    (
      await context.request.patch(`${api}/v1/playlists/${p.id}`, {
        headers,
        data: { expectedRevision: revision, title: "Remote title" },
      })
    ).ok(),
  ).toBeTruthy();
  const refresh = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/v1/snapshot",
  );
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await refresh;
  await expect(name).toHaveValue("My unsaved draft");
  await page.evaluate((id) => {
    const transport = globalThis.fetch.bind(globalThis);
    globalThis.fetch = (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.endsWith(`/v1/playlists/${id}/items`) && init?.method === "PUT") {
        Reflect.set(
          globalThis,
          "__draftRevision",
          JSON.parse(String(init.body)).expectedRevision,
        );
        return Promise.resolve(
          new Response(
            JSON.stringify({
              error: {
                code: "conflict",
                message: "Playlist changed elsewhere.",
              },
            }),
            { status: 409, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return transport(input, init);
    };
  }, p.id);
  await page
    .getByRole("button", { name: "Save playlist", exact: true })
    .click();
  await expect(
    page.getByText("Playlist changed elsewhere.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => Reflect.get(globalThis, "__draftRevision")),
  ).toBe(revision);
  await expect(name).toHaveValue("My unsaved draft");
});

test("V04 adding to a cold summarized playlist appends without replacing its existing entries", async ({
  page,
  context,
}) => {
  const p = await playlist(context.request, [a, b, a]);
  const before = (
    await context.request.get(`${api}/v1/playlists/${p.id}`, { headers })
  ).json();
  await page.goto(`/add/${a}`);
  await page.getByRole("button", { name: p.title, exact: true }).last().click();
  await expect(
    page.getByRole("heading", { name: p.title, exact: true }),
  ).toBeVisible();
  const after = (
    await context.request.get(`${api}/v1/playlists/${p.id}`, { headers })
  ).json();
  const items = (await after).items;
  expect(items.slice(0, 3)).toEqual((await before).items);
  expect(items).toHaveLength(4);
  expect(items[3].trackId).toBe(a);
  expect(new Set(items.map((item: { id: string }) => item.id)).size).toBe(4);
});
