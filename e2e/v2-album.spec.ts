import { test, expect, playHome, api, headers, a11y } from "./fixtures";

test("V18/V21 album controls save the release and queue its tracks without replacing the current entry", async ({
  page,
  context,
}) => {
  await playHome(page);
  const installation = await page.evaluate(() =>
    localStorage.getItem("saz.installation"),
  );
  const readQueue = async () =>
    (
      await context.request.get(`${api}/v1/playback-sessions/${installation}`, {
        headers,
      })
    ).json();
  const before = await readQueue();
  await page
    .getByRole("button", { name: "Collection options", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Album options", exact: true }),
  ).toBeVisible();
  await a11y(page);
  await page.getByRole("button", { name: "Save album", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Collection options", exact: true })
    .click();
  await page.getByRole("button", { name: "Add to queue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Album options", exact: true }),
  ).not.toBeVisible();
  const after = await readQueue();
  expect(after.currentEntryId).toBe(before.currentEntryId);
  expect(after.entries.length).toBe(before.entries.length * 2);
  expect(
    after.entries.filter(
      (entry: { origin: string }) => entry.origin === "explicit",
    ).length,
  ).toBe(before.entries.length);
  expect(
    new Set(after.entries.map((entry: { id: string }) => entry.id)).size,
  ).toBe(after.entries.length);
  await a11y(page);
});
