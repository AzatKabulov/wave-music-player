import assert from "node:assert/strict";
import test from "node:test";
import { createSnapshotCache, snapshotCacheKey } from "./snapshotCache.ts";
import type { Snapshot } from "./types.ts";
import { readFile } from "node:fs/promises";

const owner = "10000000-0000-4000-8000-000000000001";
const a = "a".repeat(64),
  b = "b".repeat(64);
const snapshot = (): Snapshot => ({
  profile: { id: owner, displayName: "Listener", email: "private@example.com" },
  catalog: { tracks: [], albums: [], artists: [], playlists: [] },
  library: { tracks: [], albums: [], artists: [], playlists: [] },
  preferences: { locale: "en", explicitAllowed: true, librarySort: "recent" },
  recents: [],
  playlists: [],
  hideFixtures: true,
});
function storage() {
  const values = new Map<string, string>();
  return {
    values,
    async getItem(key: string) {
      return values.get(key) || null;
    },
    async setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

test("cache preserves validated library dates and excludes extra entry properties", async () => {
  const store = storage(),
    cache = createSnapshotCache(store);
  const entry = {
    kind: "albums" as const,
    id: owner,
    addedAt: "2026-01-02T00:00:00Z",
    token: "secret-order-token",
  };
  const value = { ...snapshot(), libraryEntries: [entry] };
  assert.equal(await cache.write(a, value), true);
  assert.deepEqual((await cache.read(a))?.libraryEntries, [
    { kind: "albums", id: owner, addedAt: entry.addedAt },
  ]);
  assert.ok(
    !store.values.get(snapshotCacheKey)?.includes("secret-order-token"),
  );
  assert.equal(
    await cache.write(a, {
      ...value,
      libraryEntries: [{ ...entry, addedAt: "invalid date" }],
    }),
    false,
  );
});

test("the metadata cache binds to one session scope and excludes account secrets", async () => {
  const store = storage(),
    cache = createSnapshotCache(store);
  const value = { ...snapshot(), accessToken: "secret-access-token" };
  assert.equal(await cache.write(a, value), true);
  const restored = await cache.read(a);
  assert.equal(restored?.profile?.displayName, "Listener");
  assert.equal(restored?.profile?.email, undefined);
  assert.equal(restored?.hideFixtures, true);
  assert.ok(
    !store.values.get(snapshotCacheKey)?.includes("secret-access-token"),
  );
  assert.equal(await cache.read(b), null);
  assert.equal(store.values.get(snapshotCacheKey), "");
});

test("a populated catalog and saved references survive a process-style cache restore", async () => {
  const store = storage(),
    value = snapshot();
  value.catalog = JSON.parse(
    await readFile(new URL("./catalog.json", import.meta.url), "utf8"),
  );
  value.library.tracks = [value.catalog.tracks[0].id];
  value.library.albums = [value.catalog.albums[0].id];
  assert.equal(await createSnapshotCache(store).write(a, value), true);
  const restored = await createSnapshotCache(store).read(a);
  assert.deepEqual(restored?.catalog, value.catalog);
  assert.deepEqual(restored?.library, value.library);
});

test("expired, future-dated, schema-mismatched and corrupt cache entries recover as misses", async () => {
  const store = storage();
  let clock = 1000;
  const cache = createSnapshotCache(store, { now: () => clock, ttlMs: 100 });
  await cache.write(a, snapshot());
  clock = 1101;
  assert.equal(await cache.read(a), null);
  for (const mutate of [
    (value: any) => {
      value.version = 999;
    },
    (value: any) => {
      value.savedAt = clock + 86400000;
    },
    (value: any) => {
      value.ownerId = "10000000-0000-4000-8000-000000000002";
    },
  ]) {
    await cache.write(a, snapshot());
    const envelope = JSON.parse(store.values.get(snapshotCacheKey)!);
    mutate(envelope);
    store.values.set(snapshotCacheKey, JSON.stringify(envelope));
    assert.equal(await cache.read(a), null);
  }
  store.values.set(snapshotCacheKey, '{"unfinished":');
  assert.equal(await cache.read(a), null);
});

test("malformed nested data cannot become a cached UI snapshot", async () => {
  const store = storage(),
    cache = createSnapshotCache(store);
  for (const corrupt of [
    (value: any) => {
      value.catalog.tracks = [{ id: owner, title: 99 }];
    },
    (value: any) => {
      value.library.tracks = { length: 1 };
    },
    (value: any) => {
      value.playlists = [{ id: owner, items: null }];
    },
    (value: any) => {
      delete value.preferences;
    },
  ]) {
    await cache.write(a, snapshot());
    const envelope = JSON.parse(store.values.get(snapshotCacheKey)!);
    corrupt(envelope.snapshot);
    store.values.set(snapshotCacheKey, JSON.stringify(envelope));
    assert.equal(await cache.read(a), null);
  }
});

test("the UTF-8 quota clears oversize replacements without truncating library identities", async () => {
  const store = storage();
  await createSnapshotCache(store).write(a, snapshot());
  const bytes = Buffer.byteLength(store.values.get(snapshotCacheKey)!, "utf8");
  const limited = createSnapshotCache(store, { maxBytes: bytes + 20 });
  const value = snapshot();
  value.profile!.displayName = "界".repeat(20);
  assert.equal(await limited.write(a, value), false);
  assert.equal(await limited.read(a), null);
});

test("clear and account replacement remain ordered behind a slow disk write", async () => {
  const store = storage();
  store.values.set("saz.installation", "keep-this-installation");
  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  let first = true;
  const set = store.setItem.bind(store);
  store.setItem = async (key, value) => {
    if (first) {
      first = false;
      await hold;
    }
    await set(key, value);
  };
  const cache = createSnapshotCache(store);
  const old = cache.write(a, snapshot()),
    cleared = cache.clear();
  const next = snapshot();
  next.profile = {
    id: "10000000-0000-4000-8000-000000000002",
    displayName: "Next account",
  };
  const changed = cache.write(b, next);
  release();
  await Promise.all([old, cleared, changed]);
  assert.equal((await cache.read(b))?.profile?.displayName, "Next account");
  assert.equal(store.values.get("saz.installation"), "keep-this-installation");
});

test("storage failures fall back to live startup rather than breaking authentication", async () => {
  const cache = createSnapshotCache({
    async getItem() {
      throw Error("disk unavailable");
    },
    async setItem() {
      throw Error("disk full");
    },
  });
  assert.equal(await cache.read(a), null);
  assert.equal(await cache.write(a, snapshot()), false);
  await cache.clear();
});
