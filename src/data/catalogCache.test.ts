import assert from "node:assert/strict";
import test from "node:test";
import { mergeCatalog, refreshCatalog } from "./catalogCache.ts";
import type { Catalog, Snapshot, Track, Playlist } from "./types.ts";
const empty = (): Catalog => ({
  tracks: [],
  albums: [],
  artists: [],
  playlists: [],
});
const track = (id: string) => ({ id, title: id }) as Track;
const playlist = (id: string, owner = true) =>
  ({
    id,
    owner,
    title: id,
    items: [{ id: "entry", trackId: "playing" }],
  }) as Playlist;
const snapshot = (): Snapshot => ({
  profile: { id: "listener", displayName: "Listener" },
  catalog: empty(),
  library: { tracks: [], albums: [], artists: [], playlists: [] },
  playlists: [],
  recents: [],
  preferences: { locale: "en", explicitAllowed: true, librarySort: "recent" },
});
test("summaries preserve detailed playlist items and details can replace them", () => {
  const state = snapshot();
  state.playlists = [playlist("owned")];
  const graph = {
    ...empty(),
    playlists: [{ ...playlist("owned"), items: [] }],
  };
  assert.equal(mergeCatalog(state, graph, false).playlists[0].items.length, 1);
  assert.equal(mergeCatalog(state, graph, true).playlists[0].items.length, 0);
});
test("bounded metadata retains queue and saved tracks", () => {
  const state = snapshot();
  state.catalog.tracks = [track("playing"), track("saved")];
  state.library.tracks = ["saved"];
  const merged = mergeCatalog(
    state,
    {
      ...empty(),
      tracks: Array.from({ length: 5100 }, (_, i) => track(String(i))),
    },
    false,
    ["playing"],
  );
  assert.equal(merged.catalog.tracks.length, 5002);
  assert.ok(merged.catalog.tracks.some((t) => t.id === "playing"));
  assert.ok(merged.catalog.tracks.some((t) => t.id === "saved"));
});

test("summary refresh preserves same-revision detail and invalidates a changed revision", () => {
  const old = snapshot();
  old.playlists = [
    { ...playlist("owned"), revision: "3", itemsComplete: true },
  ];
  const fresh = snapshot();
  fresh.playlists = [
    {
      ...playlist("owned"),
      revision: "3",
      items: [],
      itemsComplete: false,
      trackCount: 1,
    },
  ];
  let next = refreshCatalog(old, fresh);
  assert.equal(next.playlists[0].items.length, 1);
  assert.equal(next.playlists[0].itemsComplete, true);
  fresh.playlists[0].revision = "4";
  next = refreshCatalog(old, fresh);
  assert.equal(next.playlists[0].items.length, 0);
  assert.equal(next.playlists[0].itemsComplete, false);
  fresh.playlists = [];
  assert.deepEqual(refreshCatalog(old, fresh).playlists, []);
});
test("refresh retains same-listener remote metadata without resurrecting deleted owned playlists", () => {
  const old = snapshot();
  old.catalog.tracks = [track("playing")];
  old.playlists = [playlist("deleted")];
  const fresh = snapshot();
  fresh.catalog.tracks = [track("new")];
  const next = refreshCatalog(old, fresh, ["playing"]);
  assert.deepEqual(
    next.catalog.tracks.map((t) => t.id),
    ["playing", "new"],
  );
  assert.deepEqual(next.playlists, []);
  fresh.profile = { id: "different", displayName: "Other" };
  assert.deepEqual(
    refreshCatalog(old, fresh, ["playing"]).catalog.tracks.map((t) => t.id),
    ["new"],
  );
});
