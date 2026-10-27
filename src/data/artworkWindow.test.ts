import test from "node:test";
import assert from "node:assert/strict";
import { advanceArtworkWindow } from "./artworkWindow.ts";

test("a two-entry repeat window preserves the requested previous direction", () => {
  const old = {
    id: "a",
    previous: "b",
    next: "b",
    coordinate: 0,
    pending: { id: "b", direction: -1 as const },
  };
  const next = advanceArtworkWindow(old, "b", "a", "a");
  assert.equal(next.coordinate, -1);
  assert.equal(next.pending, undefined);
  assert.equal(
    advanceArtworkWindow(
      { ...next, pending: { id: "a", direction: 1 } },
      "a",
      "b",
      "b",
    ).coordinate,
    0,
  );
});

test("acknowledgement preserves cover coordinates across slot changes", () => {
  const old = { id: "a", next: "b", coordinate: 4 };
  const next = advanceArtworkWindow(old, "b", "a", "c");
  assert.equal(next.coordinate, 5);
  assert.equal(next.coordinate - 1, old.coordinate);
  assert.equal(
    advanceArtworkWindow(next, "b", "a", "new-neighbor").coordinate,
    5,
  );
  assert.equal(
    advanceArtworkWindow(next, "unrelated", undefined, "d").coordinate,
    5,
  );
});
