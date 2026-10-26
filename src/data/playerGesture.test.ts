import test from "node:test";
import assert from "node:assert/strict";
import { artworkSwipe, dismissPlayer, seekPosition } from "./playerGesture.ts";

test("artwork follows the owner's right-next / left-previous direction and ignores tentative gestures", () => {
  assert.equal(artworkSwipe(120, 0, 340), 1);
  assert.equal(artworkSwipe(-120, 0, 340), -1);
  assert.equal(artworkSwipe(18, 800, 340), 1);
  assert.equal(artworkSwipe(-18, -800, 340), -1);
  assert.equal(artworkSwipe(8, 900, 340), 0);
  assert.equal(artworkSwipe(30, 0, 340), 0);
  assert.equal(artworkSwipe(40, -900, 340), 0);
});
test("vertical dismissal uses positive projected movement and has a deliberate flick threshold", () => {
  assert.equal(dismissPlayer(150, 0, 844), true);
  assert.equal(dismissPlayer(40, 900, 844), true);
  assert.equal(dismissPlayer(40, 0, 844), false);
  assert.equal(dismissPlayer(-100, -1200, 844), false);
  assert.equal(dismissPlayer(2, 1500, 844), false);
});
test("seek coordinates clamp to the actual rail without division by zero or invalid positions", () => {
  assert.equal(seekPosition(50, 200, 180), 45);
  assert.equal(seekPosition(-50, 200, 180), 0);
  assert.equal(seekPosition(300, 200, 180), 180);
  assert.equal(seekPosition(50, 0, 180), 0);
  assert.equal(seekPosition(50, 200, 0), 0);
  assert.equal(seekPosition(NaN, 200, 180), 0);
});
