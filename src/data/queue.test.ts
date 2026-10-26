import assert from "node:assert/strict";
import { test } from "node:test";
import {
  contextQueue,
  insertExplicit,
  moveEntry,
  shuffleEntries,
} from "./queue.ts";
import type { Track } from "./types.ts";
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

test("collection shuffle uses the player model and keeps an unmodified canonical order", () => {
  let counter = 0;
  const tracks = ["a", "b", "a", "blocked"].map((id) => ({
    id,
    available: true,
    explicit: id === "blocked",
  })) as Track[];
  const result = contextQueue(
    tracks,
    { revision: "7", start: 0, shuffle: true, explicitAllowed: false },
    () => String(++counter),
    () => 0,
  );
  assert.equal(result.state.shuffle, true);
  assert.equal(result.state.revision, "7");
  assert.deepEqual(
    result.canonical.map((e) => e.trackId),
    ["a", "b", "a"],
  );
  assert.deepEqual(
    result.state.entries.map((e) => e.id),
    ["2", "3", "1"],
  );
  assert.equal(result.state.currentId, "2");
  assert.equal(new Set(result.state.entries.map((e) => e.id)).size, 3);
  assert.equal(tracks.length, 4);
});

test("collection playback maps a requested row through unavailable and explicit filters", () => {
  let counter = 0;
  const tracks = [
    { id: "a", available: false },
    { id: "b", available: true },
    { id: "c", available: true },
  ] as Track[];
  const start = (index: number, values = tracks) =>
    contextQueue(
      values,
      { revision: "0", start: index, shuffle: false, explicitAllowed: true },
      () => String(++counter),
    );
  const selected = start(2);
  assert.equal(
    selected.state.entries.find((e) => e.id === selected.state.currentId)
      ?.trackId,
    "c",
  );
  const fallback = start(0);
  assert.equal(fallback.state.currentId, fallback.state.entries[0].id);
  assert.equal(start(0, []).state.currentId, null);
});
