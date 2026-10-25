import assert from "node:assert/strict";
import test from "node:test";
import { sourceUpdate } from "./sourceUpdate.ts";

const first = { id: "entry-1", trackId: "song-1" };
const second = { id: "entry-2", trackId: "song-2" };
test("repeat and cursor updates reuse the loaded sources", () => {
  assert.equal(sourceUpdate([first], [{ ...first }], true), "reuse");
});
test("appending a future song preserves the current native source", () => {
  assert.equal(sourceUpdate([first], [first, second], true), "append");
});
test("a new lease replaces even identical sources", () => {
  assert.equal(sourceUpdate([first], [first], false), "replace");
});
test("a reorder or changed track cannot reuse old source positions", () => {
  assert.equal(sourceUpdate([first, second], [second, first], true), "replace");
  assert.equal(
    sourceUpdate([first], [{ ...first, trackId: "other" }], true),
    "replace",
  );
});
test("duplicate recordings keep distinct entry identities", () => {
  assert.equal(
    sourceUpdate([first], [{ ...first, id: "copy" }], true),
    "replace",
  );
});
test("empty initial and shrinking queues require reconciliation", () => {
  assert.equal(sourceUpdate([], [first], true), "replace");
  assert.equal(sourceUpdate([first, second], [first], true), "replace");
});
