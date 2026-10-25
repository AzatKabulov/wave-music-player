import { test, expect } from "./fixtures";

test("F14 leaving a changed playlist offers keep-editing and discard", async ({
  page,
}) => {
  await page.goto("/create");
  await page
    .getByRole("textbox", { name: "Playlist name", exact: true })
    .fill("Unsaved mix");
  await page.getByRole("button", { name: "Go back", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Discard changes?", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Playlist name", exact: true }),
  ).toHaveValue("Unsaved mix");
  await page.getByRole("button", { name: "Go back", exact: true }).click();
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
});
