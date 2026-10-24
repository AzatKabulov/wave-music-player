import { test, expect, a11y, playlist } from "./fixtures";
test("F07-H1 add and deliberately repeat a track", async ({
  page,
  context,
}) => {
  const p = await playlist(context.request);
  await page.reload();
  await page
    .getByRole("button", { name: /Desert Hours.*Meridian Ensemble/ })
    .click();
  await page
    .getByRole("button", { name: "Actions for Open Road", exact: true })
    .click();
  await a11y(page);
  await page
    .getByRole("button", { name: "Add to playlist", exact: true })
    .click();
  await a11y(page);
  await page
    .getByRole("button", { name: "QA ýol 🌙", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("button", {
      name: "Play Open Road Meridian Ensemble",
      exact: true,
    }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Actions for Open Road", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add to playlist", exact: true })
    .click();
  await page
    .getByRole("button", { name: "QA ýol 🌙 · add another copy", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Play Open Road Meridian Ensemble",
      exact: true,
    }),
  ).toHaveCount(2);
  await expect(page).toHaveURL(new RegExp(p.id));
});
