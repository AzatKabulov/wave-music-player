import { test, expect, a11y } from "./fixtures";
test("F03-H1/E1 search, no result and Unicode input", async ({ page }) => {
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await a11y(page);
  await page
    .getByRole("textbox", { name: "Search music", exact: true })
    .fill("open road");
  await expect(
    page.getByRole("button", {
      name: "Play Open Road Meridian Ensemble",
      exact: true,
    }),
  ).toBeVisible();
  await a11y(page);
  await page
    .getByRole("textbox", { name: "Search music", exact: true })
    .fill("Ýol 🌙 ".repeat(30));
  await expect(
    page.getByRole("heading", {
      name: "Nothing matched this time",
      exact: true,
    }),
  ).toBeVisible();
  await a11y(page);
  await page
    .getByRole("textbox", { name: "Search music", exact: true })
    .fill("Meridian");
  await page.getByRole("button", { name: "Artists", exact: true }).click();
  await page
    .getByRole("button", { name: "Meridian Ensemble", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Meridian Ensemble", exact: true }),
  ).toBeVisible();
});
test("F03-E2 removed collections give a useful return path", async ({
  page,
}) => {
  await page.goto("/playlist/99999999-0000-4000-8000-000000000000");
  await expect(
    page.getByRole("heading", {
      name: "This collection is unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Return to library", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your library", exact: true }),
  ).toBeVisible();
  await a11y(page);
});
