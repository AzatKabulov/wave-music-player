import assert from "node:assert/strict";
import test from "node:test";
import { sourcePatch } from "./sourcePatch.ts";
const entry = (id: string) => ({ id, trackId: `song-${id}` });
test("queue edits retain the playing source object and identity", () => {
  for (const [before, after, playing] of [
    [["a", "b", "c"], ["c", "b", "a", "d"], "b"],
    [["a", "b", "c"], ["b", "c"], "b"],
    [["a", "b", "c"], ["d", "a", "b"], "a"],
    [["a", "b", "c"], ["a", "d", "c"], "c"],
  ] as [string[], string[], string][]) {
    const original = before.map(entry);
    const next = after.map(entry);
    const anchor = original.find((item) => item.id === playing);
    const plan = sourcePatch(original, next, playing)!;
    assert.ok(plan);
    const sources = [...original];
    for (const index of plan.remove) sources.splice(index, 1);
    for (const insertion of plan.insert)
      sources.splice(insertion.index, 0, insertion.entry);
    assert.deepEqual(sources, next);
    assert.equal(
      sources.find((item) => item.id === playing),
      anchor,
    );
  }
});
test("changed or removed current source requires replacement", () => {
  assert.equal(sourcePatch([entry("a")], [entry("b")], "a"), null);
  assert.equal(
    sourcePatch([entry("a")], [{ id: "a", trackId: "different" }], "a"),
    null,
  );
});
