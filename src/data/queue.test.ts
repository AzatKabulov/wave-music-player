import assert from "node:assert/strict";
import { test } from "node:test";
import { insertExplicit, moveEntry, shuffleEntries } from "./queue.ts";
const entries = ["a", "b", "c", "d"].map((id) => ({
  id,
  trackId: id,
  origin: "context" as const,
}));
test("reordering preserves identity and is bounded", () => {
  assert.deepEqual(
    moveEntry(entries, "b", 1).map((e) => e.id),
    ["a", "c", "b", "d"],
  );
  assert.deepEqual(moveEntry(entries, "a", -1), entries);
  assert.deepEqual(moveEntry(entries, "missing", 1), entries);
});
test("shuffle keeps current track first and retains every duplicate entry", () => {
  const result = shuffleEntries(entries, "b", () => 0);
  assert.equal(result[0].id, "b");
  assert.deepEqual(
    result.map((e) => e.id).sort(),
    entries.map((e) => e.id).sort(),
  );
});
test("explicit requests retain insertion order before remaining context", () => {
  const e = { id: "x", trackId: "a", origin: "explicit" as const };
  const result = insertExplicit(insertExplicit(entries, "a", e), "a", {
    ...e,
    id: "y",
  });
  assert.deepEqual(
    result.map((e) => e.id),
    ["a", "x", "y", "b", "c", "d"],
  );
});
