import assert from "node:assert/strict";
import test from "node:test";
import { savedIds } from "./libraryState.ts";
test("saving is idempotent and keeps recent saves first", () => {
  assert.deepEqual(savedIds(["old"], "new", true), ["new", "old"]);
  assert.deepEqual(savedIds(["new", "old"], "new", true), ["new", "old"]);
});
test("unsaving changes only the selected item and preserves its input", () => {
  const previous = ["first", "second", "third"];
  assert.deepEqual(savedIds(previous, "second", false), ["first", "third"]);
  assert.deepEqual(previous, ["first", "second", "third"]);
});
