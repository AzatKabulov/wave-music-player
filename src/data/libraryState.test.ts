import assert from "node:assert/strict";
import test from "node:test";
import { savedIds, datedSave, orderedLibrary } from "./libraryState.ts";
test("saving is idempotent and keeps recent saves first", () => {
  assert.deepEqual(savedIds(["old"], "new", true), ["new", "old"]);
  assert.deepEqual(savedIds(["new", "old"], "new", true), ["new", "old"]);
});

test("mixed library kinds use real dates and deterministic missing/tied fallbacks", () => {
  const entries = [
    {
      id: "a",
      kind: "Albums",
      title: "Album 2",
      creator: "Z",
      addedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "b",
      kind: "Artists",
      title: "Artist",
      creator: "A",
      addedAt: "2026-01-03T00:00:00Z",
    },
    {
      id: "c",
      kind: "Playlists",
      title: "Mix",
      creator: "B",
      addedAt: "2026-01-02T00:00:00Z",
    },
    { id: "d", kind: "Albums", title: "Unknown date", creator: "C" },
  ];
  assert.deepEqual(
    orderedLibrary(entries, "recent").map((x) => x.id),
    ["b", "c", "a", "d"],
  );
  assert.deepEqual(
    orderedLibrary(entries, "creator").map((x) => x.id),
    ["b", "c", "d", "a"],
  );
  assert.equal(entries[0].id, "a");
  assert.deepEqual(
    orderedLibrary(
      [entries[0], { ...entries[0], id: "e", title: "Album 10" }],
      "title",
    ).map((x) => x.id),
    ["a", "e"],
  );
});

test("dated save and rollback preserve other kinds with the same ID and the confirmed date", () => {
  const confirmed = "2026-01-01T00:00:00Z";
  const initial = datedSave([], "artists", "same", true, confirmed);
  const saved = datedSave(
    initial,
    "albums",
    "same",
    true,
    "2026-01-03T00:00:00Z",
  );
  const removed = datedSave(saved, "albums", "same", false);
  assert.deepEqual(removed, initial);
  const restored = datedSave(removed, "albums", "same", true, confirmed);
  assert.equal(restored.find((x) => x.kind === "albums")?.addedAt, confirmed);
  assert.equal(
    datedSave(restored, "tracks", "new", true, "bad date").length,
    2,
  );
  assert.deepEqual(datedSave(undefined, "tracks", "missing", false), []);
});
test("unsaving changes only the selected item and preserves its input", () => {
  const previous = ["first", "second", "third"];
  assert.deepEqual(savedIds(previous, "second", false), ["first", "third"]);
  assert.deepEqual(previous, ["first", "second", "third"]);
});
