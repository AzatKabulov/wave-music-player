import { test, expect, a11y, playlist } from "./fixtures";
const a = "10000000-0000-4000-8000-000000000301",
  b = "10000000-0000-4000-8000-000000000300";
test("F08-H1 reorder, remove and rename", async ({ page, context }) => {
  const p = await playlist(context.request, [a, b]);
  await page.goto(`/playlist/${p.id}`);
  await page
    .getByRole("button", { name: "Edit playlist", exact: true })
    .click();
  await a11y(page);
  await page
    .getByRole("button", { name: "Move item 2 up", exact: true })
    .click();
  await expect(
    page.getByText("1. First Light", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove item 2", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Playlist name", exact: true })
    .fill("A changed mix");
  await page
    .getByRole("button", { name: "Save playlist", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A changed mix", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Play First Light Meridian Ensemble",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Play Open Road Meridian Ensemble",
      exact: true,
    }),
  ).toHaveCount(0);
});
test("F08-E2 remove the last item, cancel deletion, then delete only the QA fixture", async ({
  page,
  context,
}) => {
  const p = await playlist(context.request, [a]);
  await page.goto(`/edit/${p.id}`);
  await page
    .getByRole("button", { name: "Remove item 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save playlist", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Your next listen starts here",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit playlist", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete playlist", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Keep playlist", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Delete playlist", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete playlist", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete this playlist", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your library", exact: true }),
  ).toBeVisible();
});
