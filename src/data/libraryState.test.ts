import assert from "node:assert/strict";
import test from "node:test";
import {
  savedIds,
  datedSave,
  orderedLibrary,
  libraryMatches,
  pinCount,
  withPin,
} from "./libraryState.ts";
test("saving is idempotent and keeps recent saves first", () => {
  assert.deepEqual(savedIds(["old"], "new", true), ["new", "old"]);
  assert.deepEqual(savedIds(["new", "old"], "new", true), ["new", "old"]);
});

test("library matching handles names, creators, accents and literal query punctuation", () => {
  assert.equal(libraryMatches("Ýol", "Şöhrat", "yol", "tk"), true);
  assert.equal(libraryMatches("Ýol", "Şöhrat", "SOHRAT", "tk"), true);
  assert.equal(libraryMatches("Плейлист", "Исполнитель", "исполн", "ru"), true);
  assert.equal(
    libraryMatches("Collection 001", "Listener", "Ｃｏｌｌｅｃｔｉｏｎ 001"),
    true,
  );
  assert.equal(libraryMatches("Collection", "Listener", ".*"), false);
  assert.equal(libraryMatches("Collection", "Listener", "   "), true);
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

test("pinned collections lead every sort, newest pin first, and unpinned rows keep their order", () => {
  const row = (
    id: string,
    title: string,
    addedAt: string,
    pinnedAt?: string,
  ) => ({
    id,
    kind: "Albums",
    title,
    creator: title,
    addedAt,
    ...(pinnedAt ? { pinnedAt } : {}),
  });
  const entries = [
    row("old", "Alpha", "2026-01-01T00:00:00Z"),
    row("new", "Bravo", "2026-01-09T00:00:00Z"),
    row("pinA", "Zulu", "2026-01-02T00:00:00Z", "2026-02-01T00:00:00Z"),
    row("pinB", "Yankee", "2026-01-03T00:00:00Z", "2026-02-05T00:00:00Z"),
    row("junk", "Charlie", "2026-01-04T00:00:00Z", "not a date"),
  ];
  assert.deepEqual(
    orderedLibrary(entries, "recent").map((x) => x.id),
    ["pinB", "pinA", "new", "junk", "old"],
  );
  assert.deepEqual(
    orderedLibrary(entries, "title").map((x) => x.id),
    ["pinB", "pinA", "old", "new", "junk"],
  );
  assert.deepEqual(
    orderedLibrary(entries, "creator").map((x) => x.id),
    ["pinB", "pinA", "old", "new", "junk"],
  );
  assert.equal(entries[0].id, "old");
});

test("saving keeps an existing pin and leaving the library drops it", () => {
  const pinnedAt = "2026-02-01T00:00:00Z";
  const entries = withPin(
    datedSave([], "albums", "a", true, "2026-01-01T00:00:00Z"),
    "albums",
    "a",
    pinnedAt,
  );
  assert.equal(entries[0].pinnedAt, pinnedAt);
  assert.equal(
    datedSave(entries, "albums", "a", true, "2026-01-01T00:00:00Z")[0].pinnedAt,
    pinnedAt,
  );
  const removed = datedSave(entries, "albums", "a", false);
  assert.deepEqual(removed, []);
  assert.equal(
    datedSave(removed, "albums", "a", true, "2026-01-05T00:00:00Z")[0].pinnedAt,
    undefined,
  );
});

test("pinning changes only the matching kind and identity without mutating its input", () => {
  const initial = [
    ...datedSave([], "albums", "same", true, "2026-01-01T00:00:00Z"),
    ...datedSave([], "artists", "same", true, "2026-01-02T00:00:00Z"),
  ];
  const pinned = withPin(initial, "artists", "same", "2026-02-01T00:00:00Z");
  assert.equal(pinned.find((x) => x.kind === "albums")?.pinnedAt, undefined);
  assert.equal(
    pinned.find((x) => x.kind === "artists")?.pinnedAt,
    "2026-02-01T00:00:00Z",
  );
  assert.equal(initial.find((x) => x.kind === "artists")?.pinnedAt, undefined);
  assert.equal(pinCount(pinned), 1);
  const cleared = withPin(pinned, "artists", "same");
  assert.equal(pinCount(cleared), 0);
  assert.ok(!("pinnedAt" in cleared.find((x) => x.kind === "artists")!));
  assert.deepEqual(
    withPin(undefined, "albums", "none", "2026-02-01T00:00:00Z"),
    [],
  );
  assert.equal(pinCount(withPin(pinned, "artists", "same", "bad date")), 0);
});
