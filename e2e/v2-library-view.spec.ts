import { test, expect, api, headers, playlist } from "./fixtures";

test("V23 library filter and layout restore together without leaking across accounts", async ({
  page,
  context,
}) => {
  await playlist(context.request);
  const response = await context.request.get(`${api}/v1/snapshot`, { headers });
  const snapshot = await response.json();
  for (const [kind, id] of [
    ["albums", snapshot.catalog.albums[0].id],
    ["artists", snapshot.catalog.artists[0].id],
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
  const firstAccountCookies = await context.cookies();
  await page.goto("/library");
  const rows = page
    .getByTestId("screen-library")
    .getByRole("button", { name: /^Open / });
  await expect(rows).toHaveCount(3);
  await page.getByRole("button", { name: "Albums", exact: true }).click();
  await page.getByRole("button", { name: "Show grid", exact: true }).click();
  await expect(rows).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Show list", exact: true }),
  ).toBeVisible();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAccessibleName(
    new RegExp(`^Open ${snapshot.catalog.albums[0].title} `),
  );

  expect(
    (
      await context.request.post(`${api}/auth/demo`, { headers, data: {} })
    ).ok(),
  ).toBeTruthy();
  await playlist(context.request);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Show grid", exact: true }),
  ).toBeVisible();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAccessibleName(/^Open QA/);

  await context.addCookies(firstAccountCookies);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Show list", exact: true }),
  ).toBeVisible();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAccessibleName(
    new RegExp(`^Open ${snapshot.catalog.albums[0].title} `),
  );
  for (const name of ["Artists", "Albums", "Playlists", "All"])
    await page.getByRole("button", { name, exact: true }).click();
  await page.reload();
  await expect(rows).toHaveCount(3);
});
