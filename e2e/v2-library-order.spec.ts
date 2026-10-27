import { test, expect, api, headers, playlist } from "./fixtures";

test("V23 mixed recently-added order survives grid reload and layout does not leak to another account", async ({
  page,
  context,
}) => {
  const own = await playlist(context.request);
  const snapshot = (
    await context.request.get(`${api}/v1/snapshot`, { headers })
  ).json();
  const value = await snapshot;
  const album = value.catalog.albums[0],
    artist = value.catalog.artists[0],
    editorial = value.catalog.playlists[0];
  for (const [kind, id] of [
    ["albums", album.id],
    ["artists", artist.id],
    ["playlists", editorial.id],
  ]) {
    expect(
      (
        await context.request.put(`${api}/v1/library/${kind}/${id}`, {
          headers,
          data: {},
        })
      ).ok(),
    ).toBeTruthy();
  }
  await page.goto("/library");
  const rows = page
    .getByTestId("screen-library")
    .getByRole("button", { name: /^Open / });
  const order = () =>
    rows.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("aria-label")),
    );
  await expect(rows).toHaveCount(4);
  let labels = await order();
  for (const [index, title] of [
    editorial.title,
    artist.name,
    album.title,
    own.title,
  ].entries()) {
    expect(labels[index]).toContain(`Open ${title} `);
  }
  await page.getByRole("button", { name: "Show grid", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Show list", exact: true }),
  ).toBeVisible();
  await expect(rows).toHaveCount(4);
  expect(await order()).toEqual(labels);
  await page
    .getByRole("button", { name: "Recently added", exact: true })
    .click();
  await page.getByRole("button", { name: "Title", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Title", exact: true }),
  ).toBeVisible();
  labels = await order();
  const expected = [editorial.title, artist.name, album.title, own.title].sort(
    (a, b) => a.localeCompare(b, "en", { sensitivity: "base", numeric: true }),
  );
  expected.forEach((title, index) =>
    expect(labels[index]).toContain(`Open ${title} `),
  );
  expect(
    (
      await context.request.post(`${api}/auth/demo`, { headers, data: {} })
    ).ok(),
  ).toBeTruthy();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Show grid", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Recently added", exact: true }),
  ).toBeVisible();
  await expect(rows).toHaveCount(0);
});

test("V23 a failed sort write restores the confirmed Library choice", async ({
  page,
}) => {
  await page.goto("/library");
  await page.evaluate(() => {
    const transport = globalThis.fetch.bind(globalThis);
    globalThis.fetch = (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.endsWith("/v1/preferences") && init?.method === "PATCH")
        return Promise.resolve(
          new Response(
            JSON.stringify({
              error: { code: "conflict", message: "Please retry this choice." },
            }),
            {
              status: 409,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      return transport(input, init);
    };
  });
  await page
    .getByRole("button", { name: "Recently added", exact: true })
    .click();
  await page.getByRole("button", { name: "Title", exact: true }).click();
  await expect(
    page.getByText("Please retry this choice.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Recently added", exact: true }),
  ).toBeVisible();
});
