import test from "node:test";
import assert from "node:assert/strict";
import { sizedArtwork } from "./artworkSource.ts";
const uri = "http://local/v1/artwork/00000000-0000-4000-8000-000000000001";
test("artwork chooses bounded row, shelf and player resolutions by pixel density", () => {
  assert.equal(sizedArtwork(uri, 48, 2), uri + "?w=128");
  assert.equal(sizedArtwork(uri, 160, 2), uri + "?w=320");
  assert.equal(sizedArtwork(uri, 400, 3), uri + "?w=768");
  assert.equal(
    sizedArtwork("https://example.com/cover.jpg", 48, 2),
    "https://example.com/cover.jpg",
  );
  assert.equal(sizedArtwork(undefined, 48, 2), undefined);
});
