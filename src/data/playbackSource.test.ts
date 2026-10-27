import test from "node:test";
import assert from "node:assert/strict";
import { parsePlaybackSource, playbackSourceLink } from "./playbackSource.ts";
import type { Snapshot } from "./types.ts";

test("source metadata rejects unknown routes and safely encodes search text", () => {
  for (const value of [
    null,
    { kind: "url", id: "https://example.com" },
    { kind: "album", id: "../settings" },
    { kind: "search", query: "x".repeat(161) },
  ])
    assert.equal(parsePlaybackSource(value), null);
  const source = parsePlaybackSource({ kind: "search", query: " A&B 🌙 " });
  assert.deepEqual(source, { kind: "search", query: "A&B 🌙" });
  assert.equal(
    playbackSourceLink(source, {} as Snapshot)?.path,
    "/search?q=A%26B%20%F0%9F%8C%99",
  );
});
test("collection links use current titles and disappear when their source is removed", () => {
  const id = "10000000-0000-4000-8000-000000000200";
  const snapshot = {
    catalog: { albums: [{ id, title: "Renamed" }], artists: [], playlists: [] },
    playlists: [],
  } as unknown as Snapshot;
  assert.equal(
    playbackSourceLink({ kind: "album", id }, snapshot)?.title,
    "Renamed",
  );
  assert.equal(playbackSourceLink({ kind: "playlist", id }, snapshot), null);
});
