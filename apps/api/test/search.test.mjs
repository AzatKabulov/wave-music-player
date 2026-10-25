import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../src/database.mjs";
import { createApp } from "../src/app.mjs";

test("full-catalog search pages beyond the snapshot and binds cursors to the listener/query", async () => {
  const db = await createDatabase({ memory: true });
  const app = await createApp({
    db,
    mode: "local",
    origin: "http://localhost:8081",
  });
  const call = (method, url, payload, token) =>
    app.inject({
      method,
      url,
      payload,
      headers: {
        origin: "http://localhost:8081",
        "x-saz-platform": "native",
        "idempotency-key": randomUUID(),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });
  try {
    const owner = (await call("POST", "/auth/demo", {})).json().accessToken;
    const other = (await call("POST", "/auth/demo", {})).json().accessToken;
    await db.admin(async (client) => {
      const source = (
        await client.query("select audio_asset_id from music.tracks limit 1")
      ).rows[0];
      const artist = (
        await client.query("select id from music.artists limit 1")
      ).rows[0];
      const inserted = (
        await client.query(
          `insert into music.tracks(title,search_text,duration_ms,audio_asset_id,status,created_at)
        select 'Paged Tune ' || lpad(i::text,3,'0'),'Paged Tune ' || i,24000,$1,'published',now()+interval '1 day' from generate_series(1,150) i returning id`,
          [source.audio_asset_id],
        )
      ).rows;
      for (const row of inserted)
        await client.query(
          "insert into music.track_artists(track_id,artist_id,credit_role,position) values($1,$2,'primary',0)",
          [row.id, artist.id],
        );
    });
    const snapshot = (
      await call("GET", "/v1/snapshot", undefined, owner)
    ).json();
    const seen = new Set();
    let cursor, firstCursor;
    do {
      const response = await call(
        "GET",
        `/v1/search?q=${encodeURIComponent("Ｐａｇｅｄ")}&type=track&limit=17${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
        undefined,
        owner,
      );
      assert.equal(response.statusCode, 200, response.body);
      const page = response.json();
      for (const result of page.data) {
        assert.equal(result.kind, "track");
        assert.ok(!seen.has(result.item.id));
        seen.add(result.item.id);
      }
      cursor = page.nextCursor;
      firstCursor ||= cursor;
    } while (cursor);
    assert.equal(seen.size, 150);
    assert.ok(
      [...seen].some(
        (id) => !snapshot.catalog.tracks.some((track) => track.id === id),
      ),
    );
    const [remoteTrack, queuedTrack, recentTrack] = [...seen].filter(
      (id) => !snapshot.catalog.tracks.some((track) => track.id === id),
    );
    assert.ok(remoteTrack);
    assert.equal(
      (await call("PUT", `/v1/library/tracks/${remoteTrack}`, {}, owner))
        .statusCode,
      200,
    );
    const installation = randomUUID(),
      entry = randomUUID();
    const queueWrite = await call(
      "PUT",
      `/v1/playback-sessions/${installation}`,
      {
        expectedRevision: null,
        entries: [{ id: entry, trackId: queuedTrack, origin: "context" }],
        currentEntryId: entry,
        positionMs: 0,
        repeatMode: "none",
        shuffle: false,
      },
      owner,
    );
    assert.equal(queueWrite.statusCode, 200, queueWrite.body);
    assert.equal(
      (
        await call(
          "POST",
          "/v1/listening-events",
          {
            events: [
              {
                id: randomUUID(),
                trackId: recentTrack,
                occurredAt: new Date().toISOString(),
                playedMs: 1000,
              },
            ],
          },
          owner,
        )
      ).statusCode,
      200,
    );
    const cold = (await call("GET", "/v1/snapshot", undefined, owner)).json();
    assert.ok(cold.library.tracks.includes(remoteTrack));
    assert.ok(cold.recents.includes(recentTrack));
    assert.ok(
      cold.catalog.tracks.some((track) => track.id === queuedTrack),
      "queue-only identity is hydrated",
    );
    assert.ok(
      cold.catalog.tracks.some((track) => track.id === recentTrack),
      "history-only identity is hydrated",
    );
    assert.ok(
      cold.catalog.tracks.some((track) => track.id === remoteTrack),
      "cold snapshot hydrates a saved/recent/queued result beyond the first feed page",
    );
    const stranger = (
      await call("GET", "/v1/snapshot", undefined, other)
    ).json();
    assert.ok(!stranger.library.tracks.includes(remoteTrack));
    assert.ok(
      !stranger.catalog.tracks.some((track) => track.id === remoteTrack),
      "private listening references do not affect another listener's initial feed",
    );
    for (const [q, token, value] of [
      ["Ｐａｇｅｄ", other, firstCursor],
      ["other", owner, firstCursor],
      ["Ｐａｇｅｄ", owner, `${firstCursor}bad`],
    ]) {
      const response = await call(
        "GET",
        `/v1/search?q=${encodeURIComponent(q)}&type=track&limit=17&cursor=${encodeURIComponent(value)}`,
        undefined,
        token,
      );
      assert.equal(response.statusCode, 422, response.body);
    }
    const privatePlaylist = await call(
      "POST",
      "/v1/playlists",
      { title: "Unique private search title" },
      owner,
    );
    assert.equal(privatePlaylist.statusCode, 201);
    const foreign = await call(
      "GET",
      "/v1/search?q=Unique%20private&type=playlist",
      undefined,
      other,
    );
    assert.equal(foreign.json().data.length, 0);
    const ownDetail = await call(
      "GET",
      `/v1/resolve/playlist/${privatePlaylist.json().id}`,
      undefined,
      owner,
    );
    assert.equal(ownDetail.statusCode, 200, ownDetail.body);
    assert.equal(ownDetail.json().playlists[0].owner, true);
    const foreignDetail = await call(
      "GET",
      `/v1/resolve/playlist/${privatePlaylist.json().id}`,
      undefined,
      other,
    );
    assert.equal(foreignDetail.statusCode, 200, foreignDetail.body);
    assert.deepEqual(foreignDetail.json().playlists, []);
    const album = snapshot.catalog.albums[0];
    const albumDetail = await call(
      "GET",
      `/v1/resolve/album/${album.id}`,
      undefined,
      owner,
    );
    assert.equal(albumDetail.statusCode, 200, albumDetail.body);
    assert.deepEqual(
      albumDetail.json().albums.find((item) => item.id === album.id).trackIds,
      album.trackIds,
    );
    assert.equal(
      (await call("GET", `/v1/resolve/invalid/${album.id}`, undefined, owner))
        .statusCode,
      422,
    );
  } finally {
    await app.close();
    await db.close();
  }
});
