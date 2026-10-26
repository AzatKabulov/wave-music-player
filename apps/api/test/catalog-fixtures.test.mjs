import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../src/database.mjs";
import { createApp } from "../src/app.mjs";

test("personal discovery hides fixtures while saved and queued fixture identities remain usable", async () => {
  const db = await createDatabase({ memory: true });
  const app = await createApp({ db, personalTest: true });
  const ordinary = await createApp({ db });
  try {
    const auth = (
      await app.inject({
        method: "POST",
        url: "/auth/demo",
        payload: {},
        headers: { "x-saz-platform": "native" },
      })
    ).json();
    const headers = { authorization: `Bearer ${auth.accessToken}` };
    const get = async (server, url) => {
      const r = await server.inject({ method: "GET", url, headers });
      assert.equal(r.statusCode, 200, r.body);
      return r.json();
    };
    const original = await get(ordinary, "/v1/snapshot");
    assert.equal(original.catalog.tracks.length, 12);
    const recording = original.catalog.tracks[0],
      saved = original.catalog.tracks.find(
        (track) => track.albumId !== recording.albumId,
      );
    await db.admin((c) =>
      c.query("update music.tracks set content_kind='recording' where id=$1", [
        recording.id,
      ]),
    );
    const discover = await get(app, "/v1/snapshot");
    assert.deepEqual(
      discover.catalog.tracks.map((t) => t.id),
      [recording.id],
    );
    assert.ok(discover.catalog.albums.every((a) => a.id === recording.albumId));
    assert.ok(
      discover.catalog.artists.every((a) => a.id === recording.artistId),
    );
    const search = await get(
      app,
      `/v1/search?q=${encodeURIComponent(saved.title)}&type=track&limit=30`,
    );
    assert.equal(search.data.length, 0);
    const save = await app.inject({
      method: "PUT",
      url: `/v1/library/tracks/${saved.id}`,
      headers,
      payload: {},
    });
    assert.equal(save.statusCode, 200, save.body);
    const entry = { id: randomUUID(), trackId: saved.id, origin: "context" };
    const queue = await app.inject({
      method: "PUT",
      url: `/v1/playback-sessions/${randomUUID()}`,
      headers,
      payload: {
        expectedRevision: null,
        entries: [entry],
        currentEntryId: entry.id,
        positionMs: 0,
        repeatMode: "none",
        shuffle: false,
      },
    });
    assert.equal(queue.statusCode, 200, queue.body);
    const personal = await get(app, "/v1/snapshot");
    assert.ok(personal.library.tracks.includes(saved.id));
    assert.ok(
      personal.catalog.tracks.some(
        (t) => t.id === saved.id && t.contentKind === "fixture",
      ),
    );
    const detail = await get(app, `/v1/resolve/album/${saved.albumId}`);
    assert.ok(detail.tracks.some((t) => t.id === saved.id));
    const home = await get(app, "/v1/home");
    assert.ok(
      home.collections[0].items.every(
        (entry) => entry.item.id === recording.albumId,
      ),
    );
    assert.equal(
      (await get(ordinary, "/v1/snapshot")).catalog.tracks.length,
      12,
    );
  } finally {
    await app.close();
    await ordinary.close();
    await db.close();
  }
});
