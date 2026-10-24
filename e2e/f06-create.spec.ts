import { test, expect, a11y, api } from "./fixtures";
test("F06-H1/E1 blank and Unicode playlist, double submit", async ({
  page,
  context,
}) => {
  await page.goto("/create");
  await page
    .getByRole("button", { name: "Save playlist", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Start with a name for your playlist",
  );
  const title = "Ýol 🌙 " + "A".repeat(130);
  await page
    .getByRole("textbox", { name: "Playlist name", exact: true })
    .fill(title);
  await page
    .getByRole("textbox", { name: "Description (optional)", exact: true })
    .fill("Şäher, ýol, музыка 🎵");
  await a11y(page);
  await page
    .getByRole("button", { name: "Save playlist", exact: true })
    .dblclick();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  const snapshot = await (
    await context.request.get(`${api}/v1/snapshot`)
  ).json();
  expect(
    snapshot.playlists.filter((p: { title: string }) => p.title === title),
  ).toHaveLength(1);
  await a11y(page);
});
