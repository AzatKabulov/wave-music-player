import assert from "node:assert/strict";
import test from "node:test";
import { artworkSurface, colorContrast } from "./artworkColor.ts";

test("artwork surfaces retain the cover hue while protecting both text colors", () => {
  for (const color of [
    "#FFFFFF",
    "#000000",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FEB100",
    "#356578",
    "#41E2B1",
  ]) {
    const surface = artworkSurface(color);
    assert.ok(
      colorContrast(surface, "#B5B5BF") >= 4.5,
      `${surface}: secondary text`,
    );
    assert.ok(
      colorContrast(surface, "#FAFAFC") >= 4.5,
      `${surface}: main text`,
    );
  }
  assert.notEqual(artworkSurface("#FF0000"), artworkSurface("#0000FF"));
  assert.equal(artworkSurface(undefined), "#25252B");
  assert.equal(artworkSurface("not-a-color"), "#25252B");
});
